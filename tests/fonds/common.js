// Injecte le header, le contenu du hero et le sélecteur de variante dans chaque page de test.
(function () {
  var pages = [
    ['1-mur.html', '1 · Mur de réalisations'],
    ['2-neon.html', '2 · Néon vivant'],
    ['3-aurore.html', '3 · Aurore'],
    ['4-grille.html', '4 · Grille'],
    ['5-torche.html', '5 · Lampe torche']
  ];
  var here = location.pathname.split('/').pop() || 'index.html';

  document.body.insertAdjacentHTML('afterbegin',
    '<header class="hdr">' +
      '<a class="hdr-logo" href="#"><b>NB</b>DESIGN</a>' +
      '<nav><a>À propos</a><a>Services</a><a>Portfolio</a><a>Pourquoi nous</a><a>Témoignages</a><a>Contact</a></nav>' +
      '<a class="btn btn-primary" href="#">Nous contacter</a>' +
    '</header>');

  document.querySelector('.hero').insertAdjacentHTML('beforeend',
    '<div class="hero-content">' +
      '<div class="badge"><i></i>Webdesigner suisse · Spécialiste restaurants</div>' +
      '<h1 class="title"><span>Des sites qui font</span><span><em>envie</em><span class="dot" style="display:inline">.</span></span></h1>' +
      '<p class="sub">Webdesigner basé en Valais, nous créons des sites web sur mesure pour les restaurants et PME de toute la Suisse romande qui veulent se démarquer en ligne.</p>' +
      '<div class="ctas"><a class="btn btn-primary" href="#">Découvrir nos services →</a><a class="btn btn-ghost" href="#">Nous contacter</a></div>' +
    '</div>');

  document.body.insertAdjacentHTML('beforeend',
    '<nav class="switch">' + pages.map(function (p) {
      return '<a href="' + p[0] + '"' + (p[0] === here ? ' class="on"' : '') + '>' + p[1] + '</a>';
    }).join('') + '</nav>');
})();
