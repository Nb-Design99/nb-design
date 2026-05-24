param([int]$Port = 4173)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webm' = 'video/webm'
  '.mp4'  = 'video/mp4'
  '.ogv'  = 'video/ogg'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.woff2'= 'font/woff2'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    try {
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
      $full = Join-Path $root $rel

      if ((Test-Path $full -PathType Container)) {
        $full = Join-Path $full 'index.html'
      }

      if (-not (Test-Path $full -PathType Leaf)) {
        $res.StatusCode = 404
        $body = [Text.Encoding]::UTF8.GetBytes("404 Not Found: $rel")
        $res.OutputStream.Write($body, 0, $body.Length)
        Write-Host "404 $rel"
        continue
      }

      $ext = [IO.Path]::GetExtension($full).ToLower()
      $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $res.ContentType = $type
      $bytes = [IO.File]::ReadAllBytes($full)

      $rangeHeader = $req.Headers['Range']
      if ($rangeHeader -and $rangeHeader -match 'bytes=(\d+)-(\d*)') {
        $start = [int64]$Matches[1]
        $end = if ($Matches[2]) { [int64]$Matches[2] } else { $bytes.Length - 1 }
        if ($end -ge $bytes.Length) { $end = $bytes.Length - 1 }
        $len = $end - $start + 1
        $res.StatusCode = 206
        $res.Headers.Add('Accept-Ranges', 'bytes')
        $res.Headers.Add('Content-Range', "bytes $start-$end/$($bytes.Length)")
        $res.ContentLength64 = $len
        $res.OutputStream.Write($bytes, [int]$start, [int]$len)
        Write-Host "206 $rel ($start-$end)"
      } else {
        $res.Headers.Add('Accept-Ranges', 'bytes')
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host "200 $rel ($($bytes.Length) bytes)"
      }
    } catch {
      Write-Host "ERROR: $_"
      try {
        $res.StatusCode = 500
        $body = [Text.Encoding]::UTF8.GetBytes("500: $_")
        $res.OutputStream.Write($body, 0, $body.Length)
      } catch {}
    } finally {
      try { $res.OutputStream.Close() } catch {}
    }
  }
} finally {
  $listener.Stop()
}
