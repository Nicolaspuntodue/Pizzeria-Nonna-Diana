import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource-variable/karla";
import "./style.css";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createScene } from "./scene.js";

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduced) document.documentElement.classList.add("rm");

/* ---------- smooth scroll (Lenis drives ScrollTrigger, no scroll listeners) ---------- */
let lenis = null;
if (!reduced) {
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
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else (target === 0 ? document.body : target).scrollIntoView();
  });
});

/* ---------- WebGL teglia ---------- */
const canvas = document.getElementById("webgl");
const three = createScene(canvas, { reducedMotion: reduced });
const S = three.state;
gsap.ticker.add(three.render);
window.addEventListener("resize", () => {
  three.resize();
});

three.ready.then(() => {
  canvas.classList.add("is-ready");
  if (!reduced) {
    // the teglia settles into the pan on load
    gsap.from(S, { rise: 0.35, duration: 2.2, ease: "expo.out" });
    gsap.from(S, { rotY: -1.6, dist: 13, duration: 2.6, ease: "expo.out" });
  }
});

/* ---------- hero intro ---------- */
if (!reduced) {
  gsap.from("[data-intro]", {
    y: 28,
    autoAlpha: 0,
    duration: 1.1,
    stagger: 0.09,
    ease: "expo.out",
    delay: 0.15,
  });
}

/* ---------- nav turns solid once the hero is behind us ---------- */
ScrollTrigger.create({
  trigger: ".hero",
  start: "bottom 90%",
  end: "max",
  toggleClass: { targets: "#nav", className: "is-solid" },
});

/* ---------- scroll story: camera + tranci ---------- */
const chapters = gsap.utils.toArray(".chapter");

if (reduced) {
  // static: show the cut teglia, no pinning
  Object.assign(S, { explode: 0.6, rotY: -0.4 });
} else {
  // camera keyframes (explicit so scrubbing both ways is deterministic)
  const K = {
    hero: { rotY: -0.55, phi: 0.98, dist: 8.8, x: 1.75 },
    ch1: { rotY: 0.25, phi: 0.62, dist: 6.4, x: 1.45 },
    ch1b: { rotY: 0.75, phi: 0.5, dist: 5.2, x: 1.3 },
    ch2: { rotY: 2.3, phi: 0.9, dist: 7.8, x: 1.6 },
    ch3: { rotY: Math.PI * 2 - 0.3, phi: 1.1, dist: 8.6, x: 1.6 },
  };
  const go = (tl, from, to, duration, at, ease = "none") =>
    tl.fromTo(S, { ...from }, { ...to, duration, ease, immediateRender: false }, at);

  // hero -> story: the teglia turns to face the first chapter
  go(
    gsap.timeline({
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
    }),
    K.hero,
    K.ch1,
    1,
    0
  );

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: ".story",
      start: "top top",
      end: "+=300%",
      pin: ".story-stage",
      scrub: 1,
      anticipatePin: 1,
    },
  });

  // chapter 1: close to the crumb, the dough "breathes"
  tl.fromTo(chapters[0], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0);
  go(tl, K.ch1, K.ch1b, 1, 0);
  go(tl, { rise: 1 }, { rise: 0.72 }, 0.35, 0.05, "sine.inOut");
  go(tl, { rise: 0.72 }, { rise: 1.12 }, 0.35, 0.4, "sine.inOut");
  go(tl, { rise: 1.12 }, { rise: 1 }, 0.2, 0.75);
  tl.to(chapters[0], { autoAlpha: 0, y: -30, duration: 0.15 }, 0.9);

  // chapter 2: pull back, turn around the steel pan
  tl.fromTo(chapters[1], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.15 }, 1.02);
  go(tl, K.ch1b, K.ch2, 1, 1);
  go(tl, { flourAmt: 0.6 }, { flourAmt: 1 }, 0.5, 1);
  tl.to(chapters[1], { autoAlpha: 0, y: -30, duration: 0.15 }, 1.9);

  // chapter 3: from above, the teglia opens into 12 tranci and one comes to you
  tl.fromTo(chapters[2], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.15 }, 2.02);
  go(tl, K.ch2, K.ch3, 0.7, 2);
  go(tl, { explode: 0 }, { explode: 1 }, 0.45, 2.2, "power2.inOut");
  go(tl, { feature: 0 }, { feature: 1 }, 0.45, 2.5, "power2.inOut");
  tl.to({}, { duration: 0.1 }, 2.95);

  // the 3D layer bows out as the olive manifesto slides in
  gsap.to(S, {
    fade: 0,
    ease: "none",
    scrollTrigger: { trigger: ".manifesto", start: "top 85%", end: "top 25%", scrub: true },
  });

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
    scrollTrigger: { trigger: ".manifesto", start: "top 70%", end: "bottom 70%", scrub: true },
  });

  /* ---------- teglie: vertical scroll pans the cards sideways (desktop) ---------- */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 768px)", () => {
    const track = document.getElementById("teglie-track");
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: ".teglie",
        start: "top top",
        end: () => `+=${distance()}`,
        pin: ".teglie-pin",
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
  });

  /* ---------- reveals ---------- */
  gsap.set("[data-reveal]", { autoAlpha: 0, y: 36 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    onEnter: (els) =>
      gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.07, ease: "expo.out" }),
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
