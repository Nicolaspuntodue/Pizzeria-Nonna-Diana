import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Teglia 3:2 cut 4 x 3 = 12 tranci (like the real "Teglia 12 pezzi").
const W = 3;
const D = 2;
const COLS = 4;
const ROWS = 3;
const PW = W / COLS;
const PD = D / ROWS;
const H = 0.13; // dough thickness at the centre
const GAP = 0.0035; // half the knife cut
const STRIP = 256; // crumb strip height in the atlas, px
const FEATURED = 6; // row 1, col 2: the slice that comes to you
const LEFT = 5;
const RIGHT = 7;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const backOut = (t) => {
  const s = 1.4;
  return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
};

/* ------------------------------------------------------------------ */
/* Textures                                                            */
/* ------------------------------------------------------------------ */

/** Photo on top, procedural crumb and browned base strip underneath (for the cut faces). */
function buildAtlas(img, renderer) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height + STRIP;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const y0 = img.height;
  const g = ctx.createLinearGradient(0, y0, 0, y0 + STRIP);
  g.addColorStop(0, "#6e2414");
  g.addColorStop(0.07, "#a63a22");
  g.addColorStop(0.11, "#f3e2b8");
  g.addColorStop(0.16, "#ecd09a");
  g.addColorStop(0.68, "#dfba7c");
  g.addColorStop(0.84, "#b67a38");
  g.addColorStop(1, "#6a3c18");
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, c.width, STRIP);

  // alveoli: the open crumb of a long fermentation
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 1600; i++) {
    const x = rnd() * c.width;
    const y = y0 + STRIP * (0.18 + rnd() * 0.6);
    const rx = 1.5 + rnd() * rnd() * 15;
    const ry = rx * (0.45 + rnd() * 0.45);
    ctx.fillStyle = `rgba(${118 + rnd() * 40}, ${76 + rnd() * 30}, 36, ${0.28 + rnd() * 0.32})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (rnd() - 0.5) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return { tex, topV0: STRIP / c.height };
}

/** Low-res copy of the photo used to raise the mozzarella above the sauce. */
function makeCheeseSampler(img) {
  const cw = 128;
  const ch = Math.round((cw * img.height) / img.width);
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, cw, ch);
  const d = ctx.getImageData(0, 0, cw, ch).data;
  // mozzarella = bright on every channel; basil and sauce stay low
  const at = (x, y) => {
    const i = (y * cw + x) * 4;
    return Math.min(d[i], d[i + 1], d[i + 2]) / 255;
  };
  // bilinear, u/v in 0..1 with v = 0 at the top of the photo
  return (u, v) => {
    const fx = clamp01(u) * (cw - 1);
    const fy = clamp01(v) * (ch - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(cw - 1, x0 + 1);
    const y1 = Math.min(ch - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const a = at(x0, y0) * (1 - tx) + at(x1, y0) * tx;
    const b = at(x0, y1) * (1 - tx) + at(x1, y1) * tx;
    return a * (1 - ty) + b * ty;
  };
}

/** Soft rounded-rect shadow, drawn once and reused for every contact shadow. */
function softShadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.shadowColor = "rgba(58, 30, 10, 1)";
  ctx.shadowBlur = 44;
  ctx.shadowOffsetX = 1000;
  ctx.fillStyle = "#000";
  ctx.fillRect(64 - 1000, 64, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function flourSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,246,228,1)");
  g.addColorStop(1, "rgba(255,246,228,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** Surface height at world (x, z): cornicione against the pan + mozzarella relief. */
function makeHeight(sample) {
  return (x, z) => {
    const t = Math.min(x + W / 2, W / 2 - x, z + D / 2, D / 2 - z); // distance to the pan edge
    const rim = 0.075 * smooth(0.0, 0.055, t) * (1 - smooth(0.06, 0.2, t));
    const lip = -0.035 * (1 - smooth(0.0, 0.028, t)); // rounds down against the steel
    const cheese = (sample((x + W / 2) / W, (z + D / 2) / D) - 0.5) * 0.034 * smooth(0.07, 0.2, t);
    const bubbles = Math.sin(x * 21 + z * 6) * Math.sin(z * 17 - x * 4) * 0.0035;
    return H / 2 + rim + lip + cheese + bubbles;
  };
}

/** One trancio: displaced top grid, three-row cut faces, flat base. */
function buildPiece(c, r, heightAt, topV0, segX, segZ) {
  const x0 = -W / 2 + PW * c + GAP;
  const x1 = -W / 2 + PW * (c + 1) - GAP;
  const z0 = -D / 2 + PD * r + GAP;
  const z1 = -D / 2 + PD * (r + 1) - GAP;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;

  const pos = [];
  const uv = [];
  const idx = [];
  const topU = (x) => clamp01((x + W / 2) / W);
  const topV = (z) => topV0 + (1 - clamp01((z + D / 2) / D)) * (1 - topV0);
  const push = (x, y, z, u, v) => {
    pos.push(x - cx, y, z - cz);
    uv.push(u, v);
    return pos.length / 3 - 1;
  };
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  // triangle wound so its face normal points along `out`
  const tri = (a, b, c2, out) => {
    va.fromArray(pos, a * 3);
    vb.fromArray(pos, b * 3).sub(va);
    vc.fromArray(pos, c2 * 3).sub(va);
    if (vb.cross(vc).dot(out) >= 0) idx.push(a, b, c2);
    else idx.push(a, c2, b);
  };

  // top
  const row = segX + 1;
  for (let j = 0; j <= segZ; j++) {
    for (let i = 0; i <= segX; i++) {
      const x = x0 + ((x1 - x0) * i) / segX;
      const z = z0 + ((z1 - z0) * j) / segZ;
      push(x, heightAt(x, z), z, topU(x), topV(z));
    }
  }
  for (let j = 0; j < segZ; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * row + i;
      const b = a + 1;
      const cc = a + row;
      const d = cc + 1;
      idx.push(a, cc, b, b, cc, d);
    }
  }

  // cut faces: sauce line, crumb, browned base
  const side = (pts, out) => {
    const start = pos.length / 3;
    pts.forEach(([x, z]) => {
      const yt = heightAt(x, z);
      const u = 0.03 + clamp01(((x + W / 2) / W) * 0.55 + ((z + D / 2) / D) * 0.45) * 0.94;
      push(x, yt, z, u, topV0 * 0.985);
      push(x, yt - 0.016, z, u, topV0 * 0.86);
      push(x, -H / 2, z, u, topV0 * 0.02);
    });
    for (let k = 0; k < pts.length - 1; k++) {
      const a = start + k * 3;
      const b = a + 3;
      for (let l = 0; l < 2; l++) {
        tri(a + l, a + l + 1, b + l, out);
        tri(b + l, a + l + 1, b + l + 1, out);
      }
    }
  };
  const along = (n, f) => Array.from({ length: n + 1 }, (_, k) => f(k / n));
  side(along(segX, (t) => [x0 + (x1 - x0) * t, z0]), new THREE.Vector3(0, 0, -1));
  side(along(segX, (t) => [x0 + (x1 - x0) * t, z1]), new THREE.Vector3(0, 0, 1));
  side(along(segZ, (t) => [x0, z0 + (z1 - z0) * t]), new THREE.Vector3(-1, 0, 0));
  side(along(segZ, (t) => [x1, z0 + (z1 - z0) * t]), new THREE.Vector3(1, 0, 0));

  // base
  const b0 = push(x0, -H / 2, z0, 0.5, topV0 * 0.01);
  const b1 = push(x1, -H / 2, z0, 0.6, topV0 * 0.01);
  const b2 = push(x0, -H / 2, z1, 0.5, topV0 * 0.01);
  const b3 = push(x1, -H / 2, z1, 0.6, topV0 * 0.01);
  const down = new THREE.Vector3(0, -1, 0);
  tri(b0, b1, b2, down);
  tri(b1, b3, b2, down);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return { geo, cx, cz };
}

function roundedRect(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Blue-steel teglia: rounded corners, thin walls, rolled rim. */
function buildPan(steel, curve) {
  const pan = new THREE.Group();
  const inW = W + 0.03;
  const inD = D + 0.03;
  const wall = 0.02;
  const wallH = 0.2;
  const baseTop = -H / 2 - 0.003;
  const bottom = baseTop - 0.022;

  const base = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(inW + wall * 2, inD + wall * 2, 0.05), {
      depth: 0.022,
      bevelEnabled: false,
      curveSegments: curve,
    }).rotateX(-Math.PI / 2),
    steel
  );
  base.position.y = bottom;
  pan.add(base);

  const ring = roundedRect(inW + wall * 2, inD + wall * 2, 0.05);
  ring.holes.push(roundedRect(inW, inD, 0.03));
  const walls = new THREE.Mesh(
    new THREE.ExtrudeGeometry(ring, {
      depth: wallH,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.003,
      bevelSegments: 2,
      curveSegments: curve,
    }).rotateX(-Math.PI / 2),
    steel
  );
  walls.position.y = bottom;
  pan.add(walls);

  const rimPts = roundedRect(inW + wall, inD + wall, 0.04)
    .getPoints(curve * 2)
    .map((p) => new THREE.Vector3(p.x, bottom + wallH, -p.y));
  const rim = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true, "centripetal"), 160, 0.016, 8, true),
    steel
  );
  pan.add(rim);
  return { pan, baseTop };
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export function createScene(canvas, { state, reducedMotion = false } = {}) {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const quality = coarse || window.innerWidth < 1100 ? "mobile" : "high";

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    stencil: false,
  });
  // fixed resolution, chosen once: resizing the canvas mid-scroll blanked it in WebKit
  // and forces a buffer reallocation on iPhone. 1.75x keeps Retina edges crisp.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "Una teglia di pizza margherita in 3D: lievita, si cuoce e si divide in dodici tranci mentre scorri la pagina."
  );

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  // warm counter light; no shadow maps, contact shadows are baked textures (cheap on iPhone)
  scene.add(new THREE.HemisphereLight(0xfff1dd, 0x3b2a1a, 0.75));
  const key = new THREE.DirectionalLight(0xffe1bc, 2.3);
  key.position.set(1.2, 6, 2.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9d63, 0.9);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  const shadowTex = softShadowTexture();
  const shadowMat = (opacity) =>
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false });

  // --- pan ---
  const steel = new THREE.MeshStandardMaterial({
    color: 0x3b3632,
    metalness: 0.85,
    roughness: 0.34,
    envMapIntensity: 1.7,
  });
  const { pan, baseTop } = buildPan(steel, quality === "high" ? 8 : 5);
  root.add(pan);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry((W + 0.1) * 2, (D + 0.1) * 2).rotateX(-Math.PI / 2),
    shadowMat(0.55)
  );
  ground.position.y = baseTop - 0.026;
  ground.renderOrder = -1;
  root.add(ground);

  // --- pizza: how baked it is and the oven glow are shader uniforms ---
  const uniforms = { uBake: { value: 1 }, uGlow: { value: 0 } };
  const pieceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.56, metalness: 0 });
  pieceMat.onBeforeCompile = (sh) => {
    sh.uniforms.uBake = uniforms.uBake;
    sh.uniforms.uGlow = uniforms.uGlow;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uBake;\nuniform float uGlow;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec3 rawDough = mix(vec3(0.93, 0.85, 0.7), diffuseColor.rgb, 0.4);
        diffuseColor.rgb = mix(rawDough, diffuseColor.rgb, uBake);`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.36, 0.06) * uGlow * 1.1 * diffuseColor.rgb;`
      );
  };

  const piecesGroup = new THREE.Group();
  root.add(piecesGroup);
  const pieces = [];
  const pieceShadows = [];

  // --- mozzarella strands: a bent cylinder driven by a bezier in the vertex shader ---
  const strands = [];
  const strandGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 18, true);
  for (let i = 0; i < 4; i++) {
    const u = {
      uA: { value: new THREE.Vector3() },
      uB: { value: new THREE.Vector3() },
      uC: { value: new THREE.Vector3() },
      uR: { value: 0 },
    };
    const m = new THREE.MeshStandardMaterial({
      color: 0xfff0cc,
      roughness: 0.4,
      emissive: 0x6b4a1c,
      emissiveIntensity: 0.35,
    });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uR;
          vec3 sBez(float t) { float s = 1.0 - t; return s * s * uA + 2.0 * s * t * uC + t * t * uB; }
          vec3 sTan(float t) { return normalize(2.0 * (1.0 - t) * (uC - uA) + 2.0 * t * (uB - uC)); }`
        )
        .replace(
          "#include <beginnormal_vertex>",
          `float st = position.y + 0.5;
          vec3 sT = sTan(st);
          vec3 sN = normalize(cross(sT, vec3(0.0, 1.0, 0.0)) + vec3(0.0001));
          vec3 sB = normalize(cross(sT, sN));
          vec3 objectNormal = normalize(position.x * sN + position.z * sB);`
        )
        .replace(
          "#include <begin_vertex>",
          `float taper = 0.45 + 0.55 * abs(st * 2.0 - 1.0);
          vec3 transformed = sBez(st) + (position.x * sN + position.z * sB) * uR * taper;`
        );
    };
    const mesh = new THREE.Mesh(strandGeo, m);
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.userData.u = u;
    root.add(mesh);
    strands.push(mesh);
  }

  // --- flour in the air (desktop only: it needs continuous frames) ---
  const FLOUR = quality === "high" && !reducedMotion ? 360 : 0;
  let flour = null;
  let flourSpeed = null;
  if (FLOUR) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(FLOUR * 3);
    flourSpeed = new Float32Array(FLOUR);
    for (let i = 0; i < FLOUR; i++) {
      p[i * 3] = (Math.random() - 0.5) * 7;
      p[i * 3 + 1] = Math.random() * 3.2 - 0.2;
      p[i * 3 + 2] = (Math.random() - 0.5) * 5;
      flourSpeed[i] = 0.3 + Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    flour = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        size: 0.03,
        map: flourSprite(),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        color: 0xf2dfbc,
      })
    );
    root.add(flour);
  }

  // --- responsive framing ---
  const layout = { xMul: 1, distMul: 1, yOff: 0, portrait: false, visible: 1, w: 1, h: 1 };
  const host = canvas.parentElement;
  // the smallest visible viewport (Safari with its toolbars showing): the teglia is framed inside it
  const svhProbe = document.createElement("div");
  svhProbe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none";
  document.body.append(svhProbe);
  let lastW = 0;
  let lastH = 0;
  let dirty = true;
  function resize(force = false) {
    const w = host.clientWidth;
    const h = host.clientHeight;
    // host is 100lvh: ignore the iOS toolbar collapsing, react only to real changes
    if (!force && w === lastW && Math.abs(h - lastH) < 160) return;
    lastW = w;
    lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w < 1100) {
      // stacked layout: copy on top, teglia centred at ~71% of the *visible* height,
      // whatever the phone's height or toolbar state (was a fixed world offset before)
      const visible = Math.min(h, svhProbe.offsetHeight || h);
      Object.assign(layout, { portrait: true, visible, w, h });
      layout.xMul = 0;
      layout.distMul = THREE.MathUtils.clamp(0.95 / (w / visible), 1.05, 2.2);
      layout.yOff = 0;
    } else {
      camera.clearViewOffset();
      layout.portrait = false;
      layout.xMul = 1;
      layout.distMul = 1;
      layout.yOff = 0;
    }
    camera.updateProjectionMatrix();
    dirty = true;
  }
  new ResizeObserver(() => resize()).observe(host);
  resize(true);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const continuous = quality === "high" && !reducedMotion;
  if (continuous) {
    window.addEventListener(
      "pointermove",
      (e) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      },
      { passive: true }
    );
  }

  const ready = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const { tex, topV0 } = buildAtlas(img, renderer);
      pieceMat.map = tex;
      pieceMat.needsUpdate = true;
      const heightAt = makeHeight(makeCheeseSampler(img));
      const [sx, sz] = quality === "high" ? [34, 28] : [22, 18];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const { geo, cx, cz } = buildPiece(c, r, heightAt, topV0, sx, sz);
          const m = new THREE.Mesh(geo, pieceMat);
          m.position.set(cx, 0, cz);
          m.userData.home = new THREE.Vector3(cx, 0, cz);
          // intro ripple starts from the centre of the teglia
          m.userData.delay = Math.hypot(cx / (W / 2), cz / (D / 2)) / Math.SQRT2;
          piecesGroup.add(m);
          pieces.push(m);

          const s = new THREE.Mesh(new THREE.PlaneGeometry(PW * 2, PD * 2).rotateX(-Math.PI / 2), shadowMat(0));
          s.position.set(cx, baseTop + 0.002, cz);
          s.renderOrder = -1;
          piecesGroup.add(s);
          pieceShadows.push(s);
        }
      }
      renderer.compile(scene, camera);
      dirty = true;
      resolve();
    };
    img.onerror = reject;
    img.src = `${import.meta.env.BASE_URL}img/${quality === "high" ? "teglia-top.jpg" : "teglia-top-1k.jpg"}`;
  });

  /* ---------------- per frame ---------------- */
  const KEYS = ["rotY", "phi", "dist", "x", "y", "vy", "rise", "explode", "feature", "fade", "bake", "glow", "intro", "exit"];
  const last = new Float32Array(KEYS.length).fill(NaN);
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const t0 = performance.now();

  function changed() {
    let c = false;
    for (let i = 0; i < KEYS.length; i++) {
      const v = state[KEYS[i]];
      if (!(Math.abs(v - last[i]) <= 1e-5)) {
        last[i] = v;
        c = true;
      }
    }
    return c;
  }

  const STRANDS = [
    // neighbour, side, z offset on the cut, sag
    [LEFT, -1, -0.12, 0.05],
    [LEFT, -1, 0.1, 0.09],
    [RIGHT, 1, -0.06, 0.07],
    [RIGHT, 1, 0.13, 0.04],
  ];
  function updateStrands() {
    const f = state.feature;
    const r = 0.019 * smooth(0.03, 0.18, f) * (1 - smooth(0.62, 0.92, f));
    const featured = pieces[FEATURED];
    featured.updateMatrix();
    STRANDS.forEach(([ni, dir, zo, sag], i) => {
      const s = strands[i];
      s.visible = r > 0.0005;
      if (!s.visible) return;
      const n = pieces[ni];
      const top = H / 2 + 0.01;
      tmpA.set((dir * PW) / 2 - dir * 0.02, top, zo).applyMatrix4(featured.matrix);
      tmpB.set(n.position.x - (dir * PW) / 2 + dir * 0.02, n.position.y + top * n.scale.y, n.position.z + zo);
      const u = s.userData.u;
      u.uA.value.copy(tmpA);
      u.uB.value.copy(tmpB);
      u.uC.value.addVectors(tmpA, tmpB).multiplyScalar(0.5);
      u.uC.value.y -= sag * (1 - f * 0.6);
      u.uR.value = r * (i % 2 ? 0.8 : 1);
    });
  }

  function render() {
    const S = state;
    const fade = clamp01(S.fade);
    if (canvas.classList.contains("is-ready")) canvas.style.opacity = String(fade);
    if (fade < 0.01) return;

    const moving = changed();
    if (continuous) {
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
    }
    if (!continuous && !moving && !dirty) return; // phones: render only when something changed
    dirty = false;
    const t = (performance.now() - t0) / 1000;

    // intro camera settle, eased here so scroll tweens never fight it
    const ci = 1 - Math.pow(1 - clamp01(S.intro), 3);
    root.position.set(S.x * layout.xMul, S.y + layout.yOff + S.exit * 0.9, 0);
    root.rotation.y =
      S.rotY - (1 - ci) * 1.1 + pointer.x * 0.12 + (continuous ? Math.sin(t * 0.35) * 0.025 : 0);
    root.rotation.x = pointer.y * 0.05;
    const dist = S.dist * layout.distMul * (1 + (1 - ci) * 0.45);
    if (layout.portrait) {
      // phones: centre the teglia at a fraction (S.vy) of the visible height, below the copy
      const targetY = layout.visible * S.vy;
      camera.setViewOffset(layout.w, layout.h, 0, -(targetY - layout.h / 2), layout.w, layout.h);
    }
    camera.position.set(0, Math.sin(S.phi) * dist, Math.cos(S.phi) * dist);
    camera.lookAt(0, 0, 0);

    uniforms.uBake.value = S.bake;
    uniforms.uGlow.value = S.glow;

    const e = S.explode;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const h = p.userData.home;
      // intro: the dough rises in a ripple from the centre, with a little overshoot
      const local = clamp01(S.intro * 1.7 - p.userData.delay * 0.7);
      const s = S.rise * (0.2 + 0.8 * backOut(local));
      p.scale.y = s;
      p.position.x = h.x + h.x * e * 0.2;
      p.position.z = h.z + h.z * e * 0.3;
      let lift = e * 0.16;
      p.rotation.set(0, 0, 0);
      p.scale.x = p.scale.z = 1;
      if (i === FEATURED) {
        const f = S.feature;
        lift += f * 1.05;
        p.position.z += f * 0.85;
        p.rotation.x = f * 0.72;
        p.scale.x = p.scale.z = 1 + f * 0.1;
        p.rotation.z = -f * 0.1;
        p.rotation.y = f * 0.22 + S.exit * 1.2;
      }
      p.position.y = (s - 1) * (H / 2) + lift;

      const sh = pieceShadows[i];
      sh.position.x = p.position.x;
      sh.position.z = p.position.z - (i === FEATURED ? S.feature * 0.2 : 0);
      sh.material.opacity = smooth(0.01, 0.12, lift) * (0.5 - Math.min(0.3, lift * 0.3));
      const spread = 1 + lift * 0.6;
      sh.scale.set(spread, 1, spread);
    }
    if (pieces.length) updateStrands();
    pan.position.y = -e * 0.03;

    if (flour) {
      const a = flour.geometry.attributes.position.array;
      for (let i = 0; i < FLOUR; i++) {
        a[i * 3 + 1] -= 0.0025 * flourSpeed[i];
        a[i * 3] += Math.sin(t * 0.5 + i) * 0.0008;
        if (a[i * 3 + 1] < -0.2) a[i * 3 + 1] = 3;
      }
      flour.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  return { render, ready, quality, renderer, camera, root };
}
