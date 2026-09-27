import * as THREE from "three";
import gsap from "gsap";

// Winning lottery ticket, shown when the Nonna Diana Card reaches 10 stamps.
// A WebGL scene that only exists while the overlay is open: built on demand, fully disposed on close.

const TICKET_W = 2;
const TICKET_H = 1;
// prize box on the ticket, in uv (x0, y0, x1, y1), v = 0 at the bottom
const BOX = [0.33, 0.25, 0.94, 0.74];
const FONT = '"Bricolage Grotesque Variable", "Bricolage Grotesque", system-ui, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The printed ticket: cream paper, red sunburst, perforated stub, the prize. */
function drawTicket(serial) {
  const W = 1400;
  const H = 700;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");

  roundRect(ctx, 0, 0, W, H, 44);
  ctx.fillStyle = "#f7f0e2";
  ctx.fill();
  ctx.save();
  ctx.clip();

  // sunburst behind the prize
  const cx = W * ((BOX[0] + BOX[2]) / 2);
  const cy = H * (1 - (BOX[1] + BOX[3]) / 2);
  for (let i = 0; i < 36; i++) {
    const a0 = (i / 36) * Math.PI * 2;
    const a1 = a0 + Math.PI / 36;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, W, a0, a1);
    ctx.closePath();
    ctx.fillStyle = "rgba(179, 38, 30, 0.07)";
    ctx.fill();
  }
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.45);
  glow.addColorStop(0, "rgba(255, 214, 120, 0.55)");
  glow.addColorStop(1, "rgba(255, 214, 120, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // stub on the left, split by a perforation
  const stubX = W * 0.27;
  ctx.fillStyle = "#b3261e";
  ctx.fillRect(0, 0, stubX, H);
  ctx.setLineDash([14, 12]);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(247, 240, 226, 0.9)";
  ctx.beginPath();
  ctx.moveTo(stubX, 30);
  ctx.lineTo(stubX, H - 30);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // punched holes (transparent in the texture)
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  [
    [stubX, 0],
    [stubX, H],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // frame
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#b3261e";
  roundRect(ctx, stubX + 26, 26, W - stubX - 52, H - 52, 24);
  ctx.stroke();
  ctx.lineWidth = 2;
  roundRect(ctx, stubX + 40, 40, W - stubX - 80, H - 80, 16);
  ctx.stroke();

  // stub text
  ctx.fillStyle = "#f7f0e2";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 58px ${FONT}`;
  ctx.fillText("BIGLIETTO", stubX / 2, H * 0.38);
  ctx.fillText("VINCENTE", stubX / 2, H * 0.38 + 64);
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText("Nonna Diana", stubX / 2, H * 0.62);
  ctx.font = `700 26px ${FONT}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText(`N. ${serial}`, stubX / 2, H * 0.72);
  ctx.globalAlpha = 1;

  // prize
  const px = W * ((BOX[0] + BOX[2]) / 2);
  ctx.fillStyle = "#b3261e";
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText("NONNA DIANA CARD", px, H * 0.16);
  ctx.fillStyle = "#1e1f1a";
  ctx.font = `800 118px ${FONT}`;
  ctx.fillText("HAI VINTO", px, H * 0.38);
  ctx.fillStyle = "#b3261e";
  ctx.font = `800 70px ${FONT}`;
  ctx.fillText("una pizza in omaggio!", px, H * 0.56);
  ctx.fillStyle = "#4b4a42";
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText("Mostra la Card alla cassa per ritirarla.", px, H * 0.84);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Silver scratch-off coating. */
function drawCoating() {
  const W = 1024;
  const H = 400;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#a9adb4");
  g.addColorStop(0.35, "#e9ebee");
  g.addColorStop(0.55, "#b9bdc4");
  g.addColorStop(0.8, "#eef0f2");
  g.addColorStop(1, "#9fa4ab");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // metallic grain
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "60,64,70"}, ${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  ctx.fillStyle = "rgba(70, 74, 82, 0.55)";
  ctx.font = `800 64px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GRATTA QUI", W / 2, H / 2);
  ctx.font = `700 26px ${FONT}`;
  for (let y = 40; y < H; y += 90) {
    for (let x = (y / 90) % 2 ? 60 : 150; x < W; x += 230) {
      if (Math.abs(y - H / 2) < 60) continue;
      ctx.fillText("ND", x, y);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const vertexShader = /* glsl */ `
  uniform float uCurl;
  uniform float uFlutter;
  uniform float uTime;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vec3 p = position;
    // paper: a soft curl along the length, and a flutter while it flies
    float bend = p.x * p.x * uCurl;
    float wave = sin(p.x * 3.2 + uTime * 9.0) * 0.06 * uFlutter + sin(p.y * 4.0 + uTime * 7.0) * 0.03 * uFlutter;
    p.z += bend + wave;
    vShade = 1.0 - (bend + wave) * 0.9;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTicket;
  uniform sampler2D uCoat;
  uniform float uReveal;
  uniform float uShine;
  uniform vec4 uBox;
  varying vec2 vUv;
  varying float vShade;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec4 ticket = texture2D(uTicket, vUv);
    if (ticket.a < 0.5) discard;
    vec3 col = ticket.rgb;

    // scratch-off coating over the prize box
    vec2 local = (vUv - uBox.xy) / (uBox.zw - uBox.xy);
    float inBox = step(0.0, local.x) * step(local.x, 1.0) * step(0.0, local.y) * step(local.y, 1.0);
    if (inBox > 0.5) {
      // sweeps left to right like a coin, with ragged edges
      float n = local.x * 0.62 + noise(local * vec2(9.0, 4.0)) * 0.26 + noise(local * 38.0) * 0.12;
      float covered = smoothstep(uReveal * 1.08 - 0.03, uReveal * 1.08, n);
      vec3 coat = texture2D(uCoat, local).rgb;
      // a thin dark rim where the coating was scratched
      float rim = smoothstep(0.0, 0.03, abs(n - uReveal * 1.08));
      col = mix(col, coat, covered);
      col *= mix(0.8, 1.0, max(rim, covered));
    }

    // foil glint passing across
    float d = vUv.x * 0.8 + vUv.y * 0.35 - uShine;
    col += vec3(1.0, 0.92, 0.75) * smoothstep(0.09, 0.0, abs(d)) * 0.35;

    col *= clamp(vShade, 0.82, 1.08);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

let open = false;

export async function showWin({ serial = "ND-0000", reduced = false, lenis = null, onClose } = {}) {
  if (open) return;
  open = true;

  // fonts must be ready before we paint them into the canvas textures
  try {
    await document.fonts.load(`800 60px ${FONT}`);
  } catch {
    /* fall back to system font */
  }

  const prevFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "win";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "win-h");
  overlay.innerHTML = `
    <div class="win-backdrop"></div>
    <canvas class="win-canvas" aria-hidden="true"></canvas>
    <div class="win-ui">
      <h2 id="win-h" class="win-h">Hai vinto una pizza in omaggio!</h2>
      <p class="win-sub">Dieci timbri sulla tua Nonna Diana Card. Mostra la Card alla cassa per ritirarla.</p>
      <button class="btn btn-primary btn-lg win-close" type="button">Ritira il premio</button>
    </div>`;
  document.body.append(overlay);
  const canvas = overlay.querySelector(".win-canvas");
  const closeBtn = overlay.querySelector(".win-close");
  lenis?.stop();
  document.documentElement.classList.add("win-open");

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    overlay.classList.add("no-gl");
  }

  const cleanups = [];
  let raf = 0;

  const close = () => {
    if (!open) return;
    open = false;
    gsap.to(overlay, {
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.in",
      onComplete: () => {
        cancelAnimationFrame(raf);
        cleanups.forEach((f) => f());
        if (renderer) {
          renderer.dispose();
          renderer.forceContextLoss(); // free the GL context right away on iOS
        }
        overlay.remove();
        document.documentElement.classList.remove("win-open");
        lenis?.start();
        prevFocus?.focus?.();
        onClose?.();
      },
    });
  };
  closeBtn.addEventListener("click", close);
  overlay.querySelector(".win-backdrop").addEventListener("click", close);
  const onKey = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      e.preventDefault(); // one control in the dialog: keep focus on it
      closeBtn.focus();
    }
  };
  document.addEventListener("keydown", onKey);
  cleanups.push(() => document.removeEventListener("keydown", onKey));

  gsap.fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
  closeBtn.focus({ preventScroll: true });

  if (!renderer) {
    gsap.from(".win-ui > *", { y: 20, autoAlpha: 0, stagger: 0.08, duration: 0.6 });
    return;
  }

  /* ---------------- scene ---------------- */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);

  const ticketTex = drawTicket(serial);
  const coatTex = drawCoating();
  const uniforms = {
    uTicket: { value: ticketTex },
    uCoat: { value: coatTex },
    uReveal: { value: reduced ? 1.2 : 0 },
    uShine: { value: -0.6 },
    uCurl: { value: 0.07 },
    uFlutter: { value: reduced ? 0 : 1 },
    uTime: { value: 0 },
    uBox: { value: new THREE.Vector4(...BOX) },
  };
  const ticket = new THREE.Mesh(
    new THREE.PlaneGeometry(TICKET_W, TICKET_H, 48, 24),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.DoubleSide })
  );
  const pivot = new THREE.Group();
  pivot.add(ticket);
  scene.add(pivot);

  /* ---------------- layout ---------------- */
  let fitY = 0;
  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // fit the ticket: most of the width on phones, less on big screens, at most 46% of the height
    const dW = TICKET_W / (w < 768 ? 0.86 : w < 1100 ? 0.8 : 0.62) / (2 * t * camera.aspect);
    const dH = TICKET_H / 0.46 / (2 * t);
    const d = Math.max(dW, dH);
    camera.position.set(0, 0, d);
    // leave room for the text and button under the ticket
    fitY = 2 * t * d * 0.14;
    camera.lookAt(0, -fitY, 0);
  };
  resize();
  window.addEventListener("resize", resize);
  cleanups.push(() => window.removeEventListener("resize", resize));

  const pointer = { x: 0, y: 0 };
  const onMove = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  cleanups.push(() => window.removeEventListener("pointermove", onMove));

  /* ---------------- choreography ---------------- */
  const S = { idle: 0 };
  const tl = gsap.timeline();
  cleanups.push(() => tl.kill());
  if (reduced) {
    pivot.rotation.set(0.1, 0, -0.04);
    S.idle = 0;
    gsap.set(".win-ui > *", { autoAlpha: 1 });
  } else {
    gsap.set(".win-ui > *", { autoAlpha: 0, y: 20 });
    tl.fromTo(pivot.position, { y: -3.2, z: -1.5 }, { y: 0, z: 0, duration: 1.3, ease: "power3.out" }, 0)
      .fromTo(
        pivot.rotation,
        { x: 0.9, y: -Math.PI * 4, z: 0.6 },
        { x: 0.12, y: 0, z: -0.05, duration: 1.5, ease: "power3.out" },
        0
      )
      .fromTo(pivot.scale, { x: 0.35, y: 0.35, z: 0.35 }, { x: 1, y: 1, z: 1, duration: 1.3, ease: "back.out(1.6)" }, 0)
      .to(uniforms.uFlutter, { value: 0, duration: 1.2, ease: "power2.out" }, 0.3)
      // the coin goes to work
      .to(uniforms.uReveal, { value: 1.2, duration: 1.5, ease: "power1.inOut" }, 1.35)
      .to(pivot.rotation, { z: 0.03, duration: 0.18, yoyo: true, repeat: 7, ease: "sine.inOut" }, 1.35)
      .fromTo(pivot.scale, { x: 1, y: 1, z: 1 }, { x: 1.07, y: 1.07, z: 1.07, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }, 2.7)
      .to(".win-ui > *", { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.7, ease: "expo.out" }, 2.8)
      .to(S, { idle: 1, duration: 1 }, 2.9)
      .fromTo(uniforms.uShine, { value: -0.6 }, { value: 1.8, duration: 1.2, ease: "power2.inOut", repeat: -1, repeatDelay: 1.6 }, 2.8);
  }

  const t0 = performance.now();
  const loop = () => {
    raf = requestAnimationFrame(loop);
        const t = (performance.now() - t0) / 1000;
    uniforms.uTime.value = t;

    // idle float + follow the pointer a little once it has landed
    ticket.position.y = Math.sin(t * 1.4) * 0.03 * S.idle;
    ticket.rotation.y = (Math.sin(t * 0.7) * 0.1 + pointer.x * 0.25) * S.idle;
    ticket.rotation.x = pointer.y * 0.15 * S.idle;

    renderer.render(scene, camera);
  };
  loop();

  cleanups.push(() => {
    ticketTex.dispose();
    coatTex.dispose();
    ticket.geometry.dispose();
    ticket.material.dispose();
  });
}
