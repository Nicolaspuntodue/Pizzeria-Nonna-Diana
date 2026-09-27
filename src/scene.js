import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Teglia 3:2, cut 4 x 3 = 12 tranci (like the real "Teglia 12 pezzi").
const W = 3;
const D = 2;
const COLS = 4;
const ROWS = 3;
const H = 0.13;
const STRIP = 256; // crumb strip height in the atlas, px
const FEATURED = 6; // row 1, col 2

/**
 * Builds the texture atlas: the top-down photo of the teglia on top,
 * a procedural strip of crumb and browned base underneath (used by the cut faces).
 */
function buildAtlas(img, renderer) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height + STRIP;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const y0 = img.height;
  const g = ctx.createLinearGradient(0, y0, 0, y0 + STRIP);
  g.addColorStop(0, "#b8301c");
  g.addColorStop(0.09, "#c9432a");
  g.addColorStop(0.13, "#f1dcae");
  g.addColorStop(0.2, "#e8c98f");
  g.addColorStop(0.7, "#dcb576");
  g.addColorStop(0.86, "#b27434");
  g.addColorStop(1, "#6e3f1a");
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, c.width, STRIP);

  // alveoli: the open crumb you get from a long fermentation
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * c.width;
    const y = y0 + STRIP * (0.2 + rnd() * 0.6);
    const rx = 2 + rnd() * rnd() * 16;
    const ry = rx * (0.5 + rnd() * 0.5);
    ctx.fillStyle = `rgba(${120 + rnd() * 40}, ${78 + rnd() * 30}, 38, ${0.25 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return { tex, topV0: STRIP / c.height };
}

/** Remaps a piece's UVs so that the 12 tranci share one continuous photo. */
function remapUV(geo, cx, cz, topV0) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  const inset = 0.002;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const y = pos.getY(i);
    const z = pos.getZ(i) + cz;
    const ny = nor.getY(i);
    let u;
    let v;
    if (ny > 0.55) {
      u = THREE.MathUtils.clamp((x + W / 2) / W, inset, 1 - inset);
      v = topV0 + (1 - THREE.MathUtils.clamp((z + D / 2) / D, inset, 1 - inset)) * (1 - topV0);
    } else if (ny < -0.55) {
      u = (x + W / 2) / W;
      v = topV0 * 0.04;
    } else {
      const along =
        Math.abs(nor.getX(i)) > Math.abs(nor.getZ(i)) ? (z + D / 2) / D : (x + W / 2) / W;
      u = 0.04 + along * 0.92;
      const hy = THREE.MathUtils.clamp((y + H / 2) / H, 0, 1);
      v = (0.06 + hy * 0.9) * topV0;
    }
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
}

function flourSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,250,240,1)");
  g.addColorStop(1, "rgba(255,250,240,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createScene(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "Una teglia di pizza margherita in 3D che si divide in dodici tranci mentre scorri la pagina."
  );

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // warm, low evening light like the shop counter
  scene.add(new THREE.HemisphereLight(0xfff1dd, 0x3b2a1a, 0.7));
  const key = new THREE.DirectionalLight(0xffe1bc, 2.4);
  key.position.set(0.9, 7, 1.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -3.5;
  key.shadow.camera.right = 3.5;
  key.shadow.camera.top = 3.5;
  key.shadow.camera.bottom = -3.5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9d63, 0.9);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.16 })
  );
  ground.position.y = -H / 2 - 0.045;
  ground.receiveShadow = true;

  const root = new THREE.Group();
  root.add(ground);
  scene.add(root);

  // --- the steel teglia ---
  const steel = new THREE.MeshStandardMaterial({
    color: 0x2c2926,
    metalness: 0.7,
    roughness: 0.42,
  });
  const pan = new THREE.Group();
  const rimW = W + 0.14;
  const rimD = D + 0.14;
  const wallH = 0.2;
  const base = new THREE.Mesh(new RoundedBoxGeometry(rimW, 0.03, rimD, 2, 0.012), steel);
  base.position.y = -H / 2 - 0.02;
  pan.add(base);
  const wallY = base.position.y + wallH / 2;
  [
    [rimW, wallH, 0.022, 0, rimD / 2],
    [rimW, wallH, 0.022, 0, -rimD / 2],
    [0.022, wallH, rimD, rimW / 2, 0],
    [0.022, wallH, rimD, -rimW / 2, 0],
  ].forEach(([w, h, d, x, z]) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.008), steel);
    m.position.set(x, wallY, z);
    pan.add(m);
  });
  pan.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  root.add(pan);

  // --- the 12 tranci ---
  const piecesGroup = new THREE.Group();
  root.add(piecesGroup);
  const pieces = [];
  const pieceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.58,
    metalness: 0,
  });
  const pw = W / COLS;
  const pd = D / ROWS;

  // --- flour in the air ---
  const FLOUR = reducedMotion ? 0 : 420;
  const flourGeo = new THREE.BufferGeometry();
  const fp = new Float32Array(FLOUR * 3);
  const fs = new Float32Array(FLOUR);
  for (let i = 0; i < FLOUR; i++) {
    fp[i * 3] = (Math.random() - 0.5) * 7;
    fp[i * 3 + 1] = Math.random() * 3.2 - 0.2;
    fp[i * 3 + 2] = (Math.random() - 0.5) * 5;
    fs[i] = 0.3 + Math.random();
  }
  flourGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3));
  const flour = new THREE.Points(
    flourGeo,
    new THREE.PointsMaterial({
      size: 0.035,
      map: flourSprite(),
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  root.add(flour);

  // --- state driven by GSAP from main.js ---
  const state = {
    rotY: -0.55,
    phi: 0.98, // camera elevation (rad)
    dist: 8.8,
    x: 1.75,
    y: 0,
    rise: 1,
    explode: 0,
    feature: 0,
    fade: 1,
    flourAmt: 0.6,
  };
  // responsive layout multipliers
  const layout = { xMul: 1, distMul: 1, yOff: 0 };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reducedMotion && matchMedia("(pointer: fine)").matches) {
    window.addEventListener(
      "pointermove",
      (e) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      },
      { passive: true }
    );
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const aspect = w / h;
    if (w < 1100) {
      // stacked layout: copy on top, teglia in the lower half
      layout.xMul = 0;
      layout.distMul = THREE.MathUtils.clamp(0.95 / aspect, 1.05, 2.2);
      layout.yOff = w < 768 ? -2.3 : -1.4;
    } else {
      layout.xMul = 1;
      layout.distMul = 1;
      layout.yOff = 0;
    }
  }
  resize();

  const ready = new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const { tex, topV0 } = buildAtlas(img, renderer);
      pieceMat.map = tex;
      pieceMat.needsUpdate = true;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const geo = new RoundedBoxGeometry(pw - 0.006, H, pd - 0.006, 2, 0.02);
          const cx = -W / 2 + pw * (c + 0.5);
          const cz = -D / 2 + pd * (r + 0.5);
          remapUV(geo, cx, cz, topV0);
          const m = new THREE.Mesh(geo, pieceMat);
          m.position.set(cx, 0, cz);
          m.castShadow = true;
          m.receiveShadow = true;
          m.userData.home = new THREE.Vector3(cx, 0, cz);
          m.userData.seed = Math.random() * Math.PI * 2;
          piecesGroup.add(m);
          pieces.push(m);
        }
      }
      renderer.compile(scene, camera);
      resolve();
    };
    img.src = `${import.meta.env.BASE_URL}img/teglia-top.jpg`;
  });

  const clock = new THREE.Clock();

  function render() {
    const t = clock.getElapsedTime();
    const S = state;
    const fade = THREE.MathUtils.clamp(S.fade, 0, 1);
    canvas.style.opacity = canvas.classList.contains("is-ready") ? String(fade) : "";
    if (fade < 0.01) return;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    const idle = reducedMotion ? 0 : 1;
    root.position.set(S.x * layout.xMul, S.y + layout.yOff, 0);
    root.rotation.y = S.rotY + pointer.x * 0.14 + Math.sin(t * 0.35) * 0.03 * idle;
    root.rotation.x = pointer.y * 0.05;

    const dist = S.dist * layout.distMul;
    camera.position.set(0, Math.sin(S.phi) * dist, Math.cos(S.phi) * dist);
    camera.lookAt(0, 0, 0);

    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const h = p.userData.home;
      const e = S.explode;
      const breathe = Math.sin(t * 1.2 + p.userData.seed) * 0.012 * e * idle;
      p.scale.y = S.rise;
      p.position.x = h.x + h.x * e * 0.2;
      p.position.z = h.z + h.z * e * 0.3;
      p.position.y = (S.rise - 1) * (H / 2) + e * 0.16 + breathe;
      p.rotation.set(0, 0, 0);
      if (i === FEATURED) {
        const f = S.feature;
        p.position.y += f * 0.75;
        p.position.z += f * 0.55;
        p.rotation.x = f * 0.55;
        p.rotation.z = -f * 0.12;
        p.rotation.y = f * 0.25;
      }
    }
    pan.position.y = -S.explode * 0.04;

    if (FLOUR) {
      const a = flourGeo.attributes.position.array;
      for (let i = 0; i < FLOUR; i++) {
        a[i * 3 + 1] -= 0.0025 * fs[i];
        a[i * 3] += Math.sin(t * 0.5 + i) * 0.0008;
        if (a[i * 3 + 1] < -0.2) a[i * 3 + 1] = 3;
      }
      flourGeo.attributes.position.needsUpdate = true;
      flour.material.opacity = 0.75 * S.flourAmt;
    }

    renderer.render(scene, camera);
  }

  return { state, render, resize, ready, renderer };
}
