import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource-variable/karla";
import "./style.css";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { initTessera } from "./tessera.js";

// start fetching three.js right away, but never block the first paint on it
const sceneModule = import("./scene.js");

gsap.registerPlugin(ScrollTrigger);
// iOS: the toolbar collapsing must not re-measure every pin mid-scroll
ScrollTrigger.config({ ignoreMobileResize: true });

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const touch = matchMedia("(pointer: coarse)").matches;
if (reduced) document.documentElement.classList.add("rm");

/* ---------- shared 3D state: GSAP writes it, the scene reads it ---------- */
const S = {
  rotY: -0.55,
  phi: 0.98,
  dist: 8.8,
  x: 1.75,
  y: 0,
  vy: 0.9, // phones only: vertical position of the teglia, as a fraction of the visible screen
  rise: 1,
  explode: 0,
  feature: 0,
  fade: 1,
  bake: 1,
  glow: 0,
  intro: 0,
  exit: 0,
};

if (import.meta.env.DEV) window.__S = S;

// camera keyframes, explicit so scrubbing both ways is deterministic
const K = {
  // phones: low in the hero so it never sits behind the copy, then up under the chapter text
  hero: { rotY: -0.55, phi: 0.98, dist: 8.8, x: 1.75, vy: 0.9 },
  ch1: { rotY: 0.3, phi: 0.36, dist: 6.3, x: 1.4, vy: 0.71 }, // low, along the side: you see the thickness
  ch1b: { rotY: 0.62, phi: 0.3, dist: 5.6, x: 1.35, vy: 0.71 },
  ch2: { rotY: 2.25, phi: 0.82, dist: 7.6, x: 1.55, vy: 0.71 }, // three quarters on the steel pan
  ch3: { rotY: Math.PI * 2 - 0.28, phi: 1.12, dist: 8.9, x: 1.45, vy: 0.71 }, // from above for the cut
};

/* ---------- smooth scroll on desktop only (touch keeps native iOS momentum) ---------- */
let lenis = null;
if (!reduced && !touch) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id === "#top" ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });
});

/* ---------- word masks for headline reveals ---------- */
function splitWords(el) {
  const wrap = (node) => {
    const m = document.createElement("span");
    m.className = "wm";
    const i = document.createElement("span");
    i.className = "wi";
    i.append(node);
    m.append(i);
    return m;
  };
  const frag = document.createDocumentFragment();
  [...el.childNodes].forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        frag.append(/^\s+$/.test(part) ? " " : wrap(document.createTextNode(part)));
      });
    } else {
      frag.append(wrap(n));
    }
  });
  el.textContent = "";
  el.append(frag);
  return el.querySelectorAll(".wi");
}

/* ---------- digital stamp card ---------- */
initTessera({ reduced, lenis });

/* ---------- WebGL teglia ---------- */
const canvas = document.getElementById("webgl");
sceneModule
  .then(({ createScene }) => {
    const three = createScene(canvas, { state: S, reducedMotion: reduced });
    if (import.meta.env.DEV) window.__three = three;
    gsap.ticker.add(three.render);
    return three.ready;
  })
  .then(() => {
    canvas.classList.add("is-ready");
    if (reduced) S.intro = 1;
    // the dough rises in a ripple while the camera settles
    else gsap.to(S, { intro: 1, duration: 2.6, ease: "power2.out", delay: 0.1 });
  })
  .catch(() => document.documentElement.classList.add("no-webgl"));

/* ---------- hero intro ---------- */
const heroWords = splitWords(document.querySelector(".hero .display"));
if (!reduced) {
  gsap
    .timeline({ defaults: { ease: "expo.out" }, delay: 0.1 })
    .from(".nav-inner", { y: -20, autoAlpha: 0, duration: 1 }, 0)
    .from(".hero .eyebrow", { y: 16, autoAlpha: 0, duration: 0.9 }, 0.05)
    .from(heroWords, { yPercent: 110, duration: 1.1, stagger: 0.05 }, 0.12)
    .from(".hero .lead", { y: 20, autoAlpha: 0, duration: 1 }, 0.45)
    .from(".hero-ctas > *", { y: 20, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.55);
}

/* ---------- nav turns solid as soon as the page moves (text never slides under a bare nav) ---------- */
ScrollTrigger.create({
  start: 8,
  end: "max",
  toggleClass: { targets: "#nav", className: "is-solid" },
});

/* ---------- the story: raw dough, baking, cutting ---------- */
const chapters = gsap.utils.toArray(".chapter");
const chapterWords = chapters.map((c) => splitWords(c.querySelector("h2")));

if (reduced) {
  Object.assign(S, { explode: 0.6, rotY: -0.4, intro: 1 });
} else {
  const go = (tl, from, to, duration, at, ease = "none") =>
    tl.fromTo(S, { ...from }, { ...to, duration, ease, immediateRender: false }, at);

  const chapterIn = (tl, i, at) => {
    const c = chapters[i];
    tl.set(c, { autoAlpha: 1, y: 0 }, at)
      .fromTo(c.querySelector(".stat"), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.1 }, at)
      .fromTo(chapterWords[i], { yPercent: 110 }, { yPercent: 0, duration: 0.14, stagger: 0.015 }, at + 0.02)
      .fromTo(c.querySelector("p:last-child"), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.12 }, at + 0.08);
  };
  const chapterOut = (tl, i, at) => tl.to(chapters[i], { autoAlpha: 0, y: -24, duration: 0.1 }, at);

  // hero -> story: the teglia turns and drops to eye level.
  // This only drives a progress value; the camera is written in one place (below) so the
  // hero and story timelines can never fight over it while scrubbing.
  const heroP = { v: 0 };
  gsap.to(heroP, {
    v: 1,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: touch ? 0.3 : true },
  });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: ".story",
      start: "top top",
      end: touch ? "+=240%" : "+=300%",
      pin: ".story-stage",
      scrub: touch ? 0.4 : 0.8,
      anticipatePin: 1,
      // on the phone each chapter lands cleanly under the thumb
      snap: touch
        ? { snapTo: "labels", duration: { min: 0.3, max: 0.8 }, delay: 0.15, ease: "power2.inOut", inertia: false }
        : false,
    },
  });

  // 1. back to raw dough, which then rises: "poco lievito, tanto tempo"
  chapterIn(tl, 0, 0.02);
  go(tl, K.ch1, K.ch1b, 0.95, 0.001);
  go(tl, { bake: 1 }, { bake: 0.12 }, 0.22, 0.02, "power1.inOut");
  go(tl, { rise: 1 }, { rise: 0.55 }, 0.22, 0.02, "power1.inOut");
  go(tl, { rise: 0.55 }, { rise: 1.12 }, 0.5, 0.28, "sine.inOut");
  tl.addLabel("c1", 0.6);
  chapterOut(tl, 0, 0.9);

  // 2. into the oven: colour comes back, the glow peaks, the crust settles
  chapterIn(tl, 1, 1.02);
  go(tl, K.ch1b, K.ch2, 0.85, 1, "power1.inOut");
  go(tl, { bake: 0.12 }, { bake: 1 }, 0.55, 1.12, "power1.inOut");
  go(tl, { glow: 0 }, { glow: 1 }, 0.28, 1.08, "power1.out");
  go(tl, { glow: 1 }, { glow: 0 }, 0.35, 1.5, "power1.in");
  go(tl, { rise: 1.12 }, { rise: 1 }, 0.4, 1.3, "sine.out");
  tl.addLabel("c2", 1.62);
  chapterOut(tl, 1, 1.9);

  // 3. cut into 12 tranci, and one comes up to you with its mozzarella
  chapterIn(tl, 2, 2.02);
  go(tl, K.ch2, K.ch3, 0.6, 2, "power1.inOut");
  go(tl, { explode: 0 }, { explode: 1 }, 0.4, 2.15, "power2.inOut");
  go(tl, { feature: 0 }, { feature: 1 }, 0.42, 2.5, "power2.inOut");
  tl.addLabel("c3", 2.95);
  tl.to({}, { duration: 0.05 }, 2.95);

  // while the story has not started, the hero scroll owns the camera
  const lerp = (a, b, t) => a + (b - a) * t;
  gsap.ticker.add(() => {
    if (tl.progress() > 0.0002) return;
    for (const k in K.hero) S[k] = lerp(K.hero[k], K.ch1[k], heroP.v);
  });

  // the teglia rises away as the olive manifesto slides over it
  gsap.fromTo(
    S,
    { fade: 1, exit: 0 },
    {
      fade: 0,
      exit: 1,
      ease: "none",
      immediateRender: false,
      scrollTrigger: { trigger: ".manifesto", start: "top 90%", end: "top 20%", scrub: true },
    }
  );

  /* ---------- manifesto: words light up as you read ---------- */
  const mt = document.getElementById("manifesto-text");
  mt.innerHTML = mt.textContent
    .trim()
    .split(/\s+/)
    .map((w) => `<span class="w">${w}</span>`)
    .join(" ");
  gsap.to("#manifesto-text .w", {
    opacity: 1,
    stagger: 0.08,
    ease: "none",
    scrollTrigger: { trigger: ".manifesto", start: "top 70%", end: "bottom 75%", scrub: true },
  });

  /* ---------- teglie: vertical scroll pans the cards sideways (desktop) ---------- */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 768px)", () => {
    const track = document.getElementById("teglie-track");
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const pan = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: ".teglie",
        start: "top top",
        end: () => `+=${distance()}`,
        pin: ".teglie-pin",
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });
    // each card settles as it slides in, like a box put down on the counter
    gsap.utils.toArray(".tcard", track).forEach((card) => {
      gsap.fromTo(
        card,
        { yPercent: 14, rotate: 3.5 },
        {
          yPercent: 0,
          rotate: 0,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            containerAnimation: pan,
            start: "left 100%",
            end: "left 60%",
            scrub: true,
          },
        }
      );
    });
  });
  mm.add("(max-width: 767px)", () => {
    gsap.from(".tcard", {
      y: 40,
      autoAlpha: 0,
      duration: 0.9,
      stagger: 0.08,
      ease: "expo.out",
      scrollTrigger: { trigger: ".teglie-track", start: "top 85%" },
    });
  });

  /* ---------- tessera: the card lands on the counter as you arrive ---------- */
  gsap.fromTo(
    "#t-stage",
    { yPercent: 18, rotate: -7, autoAlpha: 0 },
    {
      yPercent: 0,
      rotate: 0,
      autoAlpha: 1,
      ease: "none",
      scrollTrigger: { trigger: "#tessera", start: "top 85%", end: "top 35%", scrub: 0.6 },
    }
  );
  gsap.from(".offer", {
    y: 30,
    rotate: (i) => [-2, 1.5, -1][i % 3],
    autoAlpha: 0,
    duration: 0.9,
    stagger: 0.08,
    ease: "expo.out",
    scrollTrigger: { trigger: ".offers", start: "top 88%" },
  });
  gsap.from(".perk", {
    y: 40,
    autoAlpha: 0,
    duration: 0.9,
    stagger: 0.08,
    ease: "expo.out",
    scrollTrigger: { trigger: ".perks", start: "top 85%" },
  });

  /* ---------- reveals ---------- */
  gsap.set("[data-reveal]", { autoAlpha: 0, y: 36 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.07, ease: "expo.out" }),
  });

  /* ---------- gentle parallax on photos ---------- */
  gsap.utils.toArray("[data-parallax] img").forEach((img) => {
    gsap.fromTo(
      img,
      { yPercent: -8 },
      {
        yPercent: 0,
        ease: "none",
        scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true },
      }
    );
  });
  gsap.fromTo(
    ".dove-bg img",
    { yPercent: -6, scale: 1.08 },
    {
      yPercent: 6,
      scale: 1,
      ease: "none",
      scrollTrigger: { trigger: ".dove", start: "top bottom", end: "bottom top", scrub: true },
    }
  );
}

if (reduced) {
  gsap.to(S, {
    fade: 0,
    ease: "none",
    scrollTrigger: { trigger: ".manifesto", start: "top 85%", end: "top 25%", scrub: true },
  });
}

// fonts change metrics; recalc pins once everything is in
document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => ScrollTrigger.refresh());
