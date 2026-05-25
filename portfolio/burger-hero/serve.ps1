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
  '.glb'  = 'model/gltf-binary'
  '.gltf' = 'model/gltf+json'
  '.bin'  = 'application/octet-stream'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/ (streamed, async)"

$bufferSize = 1048576  # 1 MB

function Handle-Request {
  param($ctx)
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
      return
    }

    $ext = [IO.Path]::GetExtension($full).ToLower()
    $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
    $res.ContentType = $type
    $res.Headers.Add('Accept-Ranges', 'bytes')

    $fileInfo = Get-Item $full
    $fileSize = $fileInfo.Length

    $rangeHeader = $req.Headers['Range']
    $start = 0
    $end = $fileSize - 1

    if ($rangeHeader -and $rangeHeader -match 'bytes=(\d+)-(\d*)') {
      $start = [int64]$Matches[1]
      if ($Matches[2]) { $end = [int64]$Matches[2] }
      if ($end -ge $fileSize) { $end = $fileSize - 1 }
      $res.StatusCode = 206
      $res.Headers.Add('Content-Range', "bytes $start-$end/$fileSize")
    } else {
      $res.StatusCode = 200
    }

    $length = $end - $start + 1
    $res.ContentLength64 = $length

    # STREAM the file in chunks (don't load all into RAM)
    $stream = [IO.File]::OpenRead($full)
    try {
      $stream.Seek($start, 'Begin') | Out-Null
      $buffer = New-Object byte[] $bufferSize
      $remaining = $length

      while ($remaining -gt 0) {
        $toRead = [Math]::Min($bufferSize, $remaining)
        $read = $stream.Read($buffer, 0, $toRead)
        if ($read -le 0) { break }
        $res.OutputStream.Write($buffer, 0, $read)
        $remaining -= $read
      }
    } finally {
      $stream.Dispose()
    }

    $sizeMb = [Math]::Round($length / 1MB, 2)
    if ($res.StatusCode -eq 206) {
      Write-Host "206 $rel ($sizeMb MB)"
    } else {
      Write-Host "200 $rel ($sizeMb MB)"
    }
  } catch {
    Write-Host "ERROR on $($req.Url.AbsolutePath) : $_"
    try {
      $res.StatusCode = 500
      $body = [Text.Encoding]::UTF8.GetBytes("500: $_")
      $res.OutputStream.Write($body, 0, $body.Length)
    } catch {}
  } finally {
    try { $res.OutputStream.Close() } catch {}
  }
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    Handle-Request -ctx $ctx
  }
} finally {
  $listener.Stop()
}
