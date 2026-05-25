/**
 * Démo NB-Design — Burger 3D scroll hero
 *
 * - Burger 3D codé en primitives Three.js (placeholder en attendant le .glb)
 * - Rotation continue selon scroll position
 * - Léger flottement (idle)
 * - Lighting cinéma (key + rim + fill chaud)
 * - Quand le .glb est dispo : remplacer makePlaceholderBurger() par loadBurgerGLB()
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// ============ CONFIG ============
// burger.glb : version compressée via gltfpack (Meshopt + WebP, 125 Mo → 19,6 Mo)
// Texture max 1024 px, géométrie quantifiée. Aucun loader externe requis,
// Three.js charge nativement le format WebP dans le GLB.
const GLB_URL = 'burger.glb';
const SHOW_PLACEHOLDER_WHILE_LOADING = false;
const LOAD_GLB = true;

// ============ THREE.JS SCENE ============
const canvas = document.getElementById('burger-canvas');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0.2, 6);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Pas de tonemapping cinéma : ACESFilmic tirait toutes les couleurs vers le doré
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;

function resize() {
  // Fallback sur window dims si le canvas n'a pas encore reçu son CSS
  const w = canvas.clientWidth  || Math.round(window.innerWidth * 0.7);
  const h = canvas.clientHeight || window.innerHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
// 1er resize après que le layout soit appliqué
resize();
requestAnimationFrame(resize);
window.addEventListener('resize', resize);
window.addEventListener('load', resize);
// Sécurise si le viewport bouge (orientation, splash, etc.)
if (window.ResizeObserver) {
  new ResizeObserver(resize).observe(canvas);
}

// ============ LIGHTING ============
// Tout en blanc neutre pour révéler les vraies couleurs du modèle
scene.add(new THREE.AmbientLight(0xffffff, 1.2));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
keyLight.position.set(4, 5, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-4, 2, 3);
scene.add(fillLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
backLight.position.set(0, 3, -5);
scene.add(backLight);

// Rim chaude légère — juste un soupçon
const rimLight = new THREE.PointLight(0xff8a3a, 0.4, 8);
rimLight.position.set(-3, 1, -3);
scene.add(rimLight);

// Aliases pour la boucle d'animation (compat)
const bottomLight = rimLight;

// ============ BURGER (placeholder en primitives) ============
const burger = new THREE.Group();
scene.add(burger);

function makePlaceholderBurger() {
  // Matériaux
  const bunMat = new THREE.MeshStandardMaterial({
    color: 0xd9954a,
    roughness: 0.7,
    metalness: 0.05,
  });
  const meatMat = new THREE.MeshStandardMaterial({
    color: 0x4a2818,
    roughness: 0.6,
    metalness: 0.05,
  });
  const cheeseMat = new THREE.MeshStandardMaterial({
    color: 0xffb13a,
    roughness: 0.4,
    metalness: 0.1,
    emissive: 0xffb13a,
    emissiveIntensity: 0.08,
  });
  const lettuceMat = new THREE.MeshStandardMaterial({
    color: 0x6ba84a,
    roughness: 0.55,
    metalness: 0,
  });
  const tomatoMat = new THREE.MeshStandardMaterial({
    color: 0xc8241c,
    roughness: 0.5,
    metalness: 0.1,
  });
  const sesameMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c2,
    roughness: 0.6,
    metalness: 0.1,
  });

  // === PAIN BAS ===
  // Forme sphère aplatie
  const bunBottomGeo = new THREE.SphereGeometry(1.3, 48, 32, 0, Math.PI * 2, Math.PI / 2.2, Math.PI / 2);
  bunBottomGeo.scale(1, 0.55, 1);
  const bunBottom = new THREE.Mesh(bunBottomGeo, bunMat);
  bunBottom.position.y = -1;
  burger.add(bunBottom);

  // === STEAK ===
  const meatGeo = new THREE.CylinderGeometry(1.15, 1.2, 0.4, 48);
  // Bord irrégulier (légère déformation)
  const meatPos = meatGeo.attributes.position;
  for (let i = 0; i < meatPos.count; i++) {
    const y = meatPos.getY(i);
    if (Math.abs(y) > 0.15) {
      meatPos.setX(i, meatPos.getX(i) * (1 + Math.sin(i) * 0.04));
      meatPos.setZ(i, meatPos.getZ(i) * (1 + Math.cos(i * 0.7) * 0.04));
    }
  }
  meatPos.needsUpdate = true;
  meatGeo.computeVertexNormals();
  const meat = new THREE.Mesh(meatGeo, meatMat);
  meat.position.y = -0.5;
  burger.add(meat);

  // === FROMAGE (carré fondu débordant) ===
  const cheeseGeo = new THREE.BoxGeometry(2.5, 0.1, 2.5);
  // Coins arrondis via subdivision et déformation
  const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
  cheese.position.y = -0.25;
  cheese.rotation.y = Math.PI / 8;
  burger.add(cheese);

  // Coulures de fromage
  for (let i = 0; i < 5; i++) {
    const dripGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.3 + Math.random() * 0.2, 12);
    const drip = new THREE.Mesh(dripGeo, cheeseMat);
    const angle = (i / 5) * Math.PI * 2 + 0.3;
    drip.position.set(
      Math.cos(angle) * 1.2,
      -0.45 - Math.random() * 0.1,
      Math.sin(angle) * 1.2
    );
    drip.rotation.z = (Math.random() - 0.5) * 0.3;
    burger.add(drip);
  }

  // === SALADE (anneau froissé) ===
  const lettuceGeo = new THREE.TorusGeometry(1.15, 0.15, 16, 64);
  const lettucePos = lettuceGeo.attributes.position;
  for (let i = 0; i < lettucePos.count; i++) {
    lettucePos.setY(i, lettucePos.getY(i) + (Math.random() - 0.5) * 0.18);
    lettucePos.setX(i, lettucePos.getX(i) + (Math.random() - 0.5) * 0.06);
    lettucePos.setZ(i, lettucePos.getZ(i) + (Math.random() - 0.5) * 0.06);
  }
  lettucePos.needsUpdate = true;
  lettuceGeo.computeVertexNormals();
  const lettuce = new THREE.Mesh(lettuceGeo, lettuceMat);
  lettuce.position.y = -0.1;
  lettuce.rotation.x = Math.PI / 2;
  burger.add(lettuce);

  // === TOMATE (rondelle) ===
  const tomatoGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.15, 32);
  const tomato = new THREE.Mesh(tomatoGeo, tomatoMat);
  tomato.position.y = 0.1;
  burger.add(tomato);

  // === PAIN HAUT (dôme) ===
  const bunTopGeo = new THREE.SphereGeometry(1.3, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  bunTopGeo.scale(1, 0.85, 1);
  const bunTop = new THREE.Mesh(bunTopGeo, bunMat);
  bunTop.position.y = 0.3;
  burger.add(bunTop);

  // === GRAINES DE SÉSAME ===
  for (let i = 0; i < 20; i++) {
    const sesGeo = new THREE.SphereGeometry(0.06, 8, 8);
    sesGeo.scale(1, 0.6, 1);
    const sesame = new THREE.Mesh(sesGeo, sesameMat);
    // Distribution sphérique sur le dôme du pain haut
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI / 2.5;
    const r = 1.28;
    sesame.position.set(
      Math.cos(theta) * Math.sin(phi) * r,
      0.3 + Math.cos(phi) * r * 0.85,
      Math.sin(theta) * Math.sin(phi) * r
    );
    sesame.rotation.x = (Math.random() - 0.5) * 0.5;
    sesame.rotation.z = (Math.random() - 0.5) * 0.5;
    burger.add(sesame);
  }
}

let burgerLoaded = false;
let placeholderMeshes = [];
let glbModel = null;

// Track placeholder meshes so we can remove them when GLB arrives
function trackPlaceholder() {
  placeholderMeshes = burger.children.slice();
}

function removePlaceholder() {
  for (const m of placeholderMeshes) {
    burger.remove(m);
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
      else m.material.dispose();
    }
  }
  placeholderMeshes = [];
}

function loadBurgerGLB() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    // GLB compressé avec gltfpack → géométrie Meshopt, nécessite MeshoptDecoder
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      GLB_URL,
      (gltf) => {
        glbModel = gltf.scene;
        const box = new THREE.Box3().setFromObject(glbModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const targetSize = 2.8;
        const scale = targetSize / Math.max(size.x, size.y, size.z);
        glbModel.scale.setScalar(scale);
        glbModel.position.x = -center.x * scale;
        glbModel.position.y = -center.y * scale;
        glbModel.position.z = -center.z * scale;
        // Approche radicale : on REMPLACE les matériaux par des MeshBasicMaterial
        // (non éclairés). Comme ça la couleur affichée = exactement la texture
        // diffuse, sans interaction avec metalRough/emissive/envMap.
        // Si Meshy a baked l'éclairage dans la diffuse, on aura le rendu Meshy natif.
        glbModel.traverse((obj) => {
          if (obj.isMesh && obj.material) {
            const old = obj.material;
            if (old.map) {
              old.map.colorSpace = THREE.SRGBColorSpace;
              old.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
            }
            const newMat = new THREE.MeshBasicMaterial({
              map: old.map || null,
              color: old.color ? old.color.clone() : new THREE.Color(0xffffff),
              side: old.side ?? THREE.FrontSide,
              transparent: !!old.transparent,
              opacity: old.opacity ?? 1,
            });
            obj.material = newMat;
            old.dispose();
          }
        });

        // Swap : retire le placeholder éventuel, ajoute le GLB
        removePlaceholder();
        burger.add(glbModel);
        burgerLoaded = true;

        // Hide loader avec un petit fade
        const loaderEl = document.getElementById('burgerLoader');
        if (loaderEl) {
          loaderEl.classList.add('is-hidden');
          setTimeout(() => loaderEl.remove(), 800);
        }
        resolve();
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          // Cap à 100 car gzip/brotli côté serveur fausse le ratio loaded/total
          const pct = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
          const progressEl = document.getElementById('glbProgress');
          if (progressEl) progressEl.textContent = pct + '%';
        }
      },
      reject
    );
  });
}

// Affiche TOUJOURS le placeholder immédiatement (visible dès le 1er frame)
if (SHOW_PLACEHOLDER_WHILE_LOADING) {
  makePlaceholderBurger();
  trackPlaceholder();
  burgerLoaded = true;
}

// Charge le GLB en arrière-plan (swap dès qu'il arrive)
if (LOAD_GLB) {
  loadBurgerGLB().catch(err => {
    console.warn('GLB introuvable, on garde le placeholder', err);
    const progressEl = document.getElementById('glbProgress');
    if (progressEl) progressEl.remove();
    const loaderEl = document.getElementById('burgerLoader');
    if (loaderEl) {
      loaderEl.classList.add('is-hidden');
      setTimeout(() => loaderEl.remove(), 800);
    }
  });
} else {
  // Pas de GLB à charger : le placeholder est déjà à l'écran, on masque le loader tout de suite
  const loaderEl = document.getElementById('burgerLoader');
  if (loaderEl) {
    loaderEl.classList.add('is-hidden');
    setTimeout(() => loaderEl.remove(), 800);
  }
}

// ============ PARTICULES (vapeur chaude qui monte) ============
const steamCount = 40;
const steamGeo = new THREE.BufferGeometry();
const steamPos = new Float32Array(steamCount * 3);
for (let i = 0; i < steamCount; i++) {
  steamPos[i * 3]     = (Math.random() - 0.5) * 3;
  steamPos[i * 3 + 1] = Math.random() * 4 - 1;
  steamPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
}
steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
const steam = new THREE.Points(
  steamGeo,
  new THREE.PointsMaterial({
    color: 0xfff0d0,
    size: 0.06,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
scene.add(steam);

// ============ SCROLL CONTROLLER ============
let scrollY = 0;
let smoothedScroll = 0;

function updateScroll() {
  scrollY = window.scrollY || window.pageYOffset;
}
window.addEventListener('scroll', updateScroll, { passive: true });

// Hint disparait au premier scroll
const scrollHint = document.getElementById('scrollHint');
let hintHidden = false;
function maybeHideHint() {
  if (!hintHidden && scrollY > 50) {
    hintHidden = true;
    scrollHint?.classList.add('is-hidden');
  }
}

// ============ ANIMATION LOOP ============
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  // Smooth le scroll pour des animations plus fluides
  smoothedScroll += (scrollY - smoothedScroll) * 0.08;
  maybeHideHint();

  if (burgerLoaded && burger) {
    // ROTATION SCROLL : Y proportionnel au scroll, X léger
    // 1000px de scroll = 1 tour complet
    burger.rotation.y = smoothedScroll / 1000 * Math.PI * 2;
    // Léger basculement X au scroll
    burger.rotation.x = Math.sin(smoothedScroll / 800) * 0.2;

    // Flottement idle (en plus du scroll)
    burger.position.y = Math.sin(t * 1.3) * 0.08;

    // Léger zoom in au scroll (ou out, selon préférence)
    const scale = 1 + Math.min(0.15, smoothedScroll / 4000);
    burger.scale.setScalar(scale);
  }

  // Particules vapeur — montent et reset
  const sPos = steam.geometry.attributes.position.array;
  for (let i = 0; i < steamCount; i++) {
    sPos[i * 3 + 1] += 0.008;
    sPos[i * 3]     += Math.sin(t * 0.7 + i * 0.5) * 0.003;
    if (sPos[i * 3 + 1] > 3) {
      sPos[i * 3 + 1] = -2;
      sPos[i * 3]     = (Math.random() - 0.5) * 3;
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
  }
  steam.geometry.attributes.position.needsUpdate = true;
  steam.material.opacity = 0.15 + Math.sin(t * 0.5) * 0.1;

  // Key light pulse
  keyLight.intensity = 2.0 + Math.sin(t * 1.2) * 0.1;
  // Bottom light (chaude flicker)
  bottomLight.intensity = 0.8 + Math.sin(t * 4) * 0.15;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
