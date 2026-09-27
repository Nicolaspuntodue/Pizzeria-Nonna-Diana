import qrcode from "qrcode-generator";
import gsap from "gsap";
import "./tessera.css";

// Nonna Diana Card: the classic pizzeria stamp card in the phone. One stamp per trancio, every 10 one is free.
// Demo only: state lives in this browser (localStorage), nothing is sent anywhere.
const KEY = "nonna-diana-tessera";
const N = 10;
const ID = /^ND-\d{4}-[A-Z0-9]{3}$/;

export function initTessera({ reduced = false, lenis = null } = {}) {
  const $ = (s) => document.getElementById(s);
  const root = $("tessera");
  if (!root) return;

  let st = { name: "", id: "", stamps: 0, wa: false, made: false };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (saved && typeof saved === "object") {
      if (typeof saved.name === "string") st.name = saved.name.slice(0, 22);
      if (typeof saved.id === "string" && ID.test(saved.id)) st.id = saved.id;
      if (Number.isInteger(saved.stamps)) st.stamps = Math.max(0, Math.min(N, saved.stamps));
      st.wa = saved.wa === true;
      st.made = saved.made === true && !!st.id;
    }
  } catch {
    /* storage unavailable: the card still works for this visit */
  }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
      /* ignore */
    }
  };
  const say = (t) => {
    $("t-status").textContent = t;
  };

  // invitation link: accept only our own code format, rendered as text
  const inv = new URLSearchParams(location.search).get("invito");
  if (inv && ID.test(inv)) {
    const b = $("t-invite");
    b.textContent = `Ti ha invitato ${inv}. Crea la tua Card: al primo ordine un supplì è offerto.`;
    b.hidden = false;
  }

  const mkId = () =>
    `ND-${1000 + Math.floor(Math.random() * 9000)}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()
      .padEnd(3, "X")}`;
  const base = location.origin + location.pathname;

  function qrSvg(text) {
    const q = qrcode(0, "M");
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" role="img" aria-label="QR code personale della Nonna Diana Card"><path d="${d}" fill="#1E1F1A"/></svg>`;
  }

  // the ten stamp slots, each stamp lands at its own slightly crooked angle like a rubber stamp
  const stampsEl = $("t-stamps");
  stampsEl.innerHTML = Array.from({ length: N }, (_, i) => {
    const rot = ((i * 37) % 23) - 11;
    return i === N - 1
      ? `<i class="slot gift" style="--r:${rot}deg"><b>ND</b><span>Pizza<br>omaggio</span></i>`
      : `<i class="slot" style="--r:${rot}deg"><b>ND</b></i>`;
  }).join("");
  const slots = [...stampsEl.children];

  const card = $("t-card"); // CSS: tilt + flip
  const lift = $("t-lift"); // GSAP: landing + stamp hit
  const stage = $("t-stage");

  function render(popIndex) {
    const nameEl = $("t-card-name");
    nameEl.textContent = st.name || "Il tuo nome";
    nameEl.classList.toggle("ph", !st.name);
    const id = st.made ? st.id : "ND-0000";
    $("t-card-id").textContent = id;
    $("t-back-id").textContent = id;
    $("t-qr").innerHTML = qrSvg(`${base}#${id}`);
    $("t-qr").classList.toggle("dim", !st.made);
    slots.forEach((el, i) => el.classList.toggle("on", i < st.stamps));
    $("t-actions").hidden = !st.made;
    $("t-make").textContent = st.made ? "Aggiorna il nome" : "Crea la Card";
    $("t-stamp").textContent = st.stamps >= N ? "Ritira il premio" : "Simula un timbro";
    const left = N - st.stamps;
    $("t-progress-text").textContent = !st.made
      ? "Ogni trancio un timbro: al decimo, uno è in omaggio."
      : left <= 0
        ? "10 su 10: hai vinto una pizza in omaggio."
        : `${st.stamps} su ${N}: ancora ${left} ${left === 1 ? "trancio" : "tranci"} e uno è in omaggio.`;
    $("t-card-sr").textContent = `Nonna Diana Card di ${st.name || "nessun nome"}, ${st.stamps} timbri su ${N}.`;
    $("t-wa").setAttribute("aria-pressed", String(st.wa));
    $("t-wa").textContent = st.wa ? "Avviso attivo (demo)" : "Avviso disattivato";
    root.classList.toggle("is-full", st.stamps >= N);

    if (popIndex != null && slots[popIndex] && !reduced) {
      const el = slots[popIndex];
      // rubber stamp: comes down big, lands, the card takes the hit
      gsap.fromTo(
        el,
        { scale: 1.9, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.42, ease: "back.out(2.2)", clearProps: "transform,opacity,visibility" }
      );
      gsap.fromTo(
        lift,
        { y: 0 },
        { y: 5, duration: 0.07, yoyo: true, repeat: 1, ease: "power1.out", delay: 0.12, clearProps: "transform" }
      );
    }
  }

  $("t-name").value = st.name;
  $("t-name").addEventListener("input", (e) => {
    st.name = e.target.value.trim().slice(0, 22);
    render();
  });

  $("t-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (st.name.length < 2) {
      say("Scrivi il tuo nome per creare la Card.");
      $("t-name").focus();
      return;
    }
    const first = !st.made;
    if (first) st.id = mkId();
    st.made = true;
    save();
    render();
    say(first ? "Card creata. Toccala per vedere il tuo QR." : "Nome aggiornato.");
    if (first && !reduced) {
      gsap.fromTo(lift, { y: 24, scale: 0.94 }, { y: 0, scale: 1, duration: 0.9, ease: "expo.out", clearProps: "transform" });
    }
    if (window.innerWidth < 900) stage.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  });

  $("t-reset").addEventListener("click", () => {
    st = { name: "", id: "", stamps: 0, wa: false, made: false };
    $("t-name").value = "";
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setFlip(false);
    render();
    say("Card azzerata.");
  });

  $("t-stamp").addEventListener("click", () => {
    if (!st.made) return;
    if (st.stamps >= N) {
      st.stamps = 0;
      save();
      render();
      say("Premio ritirato. Si riparte da zero.");
      return;
    }
    setFlip(false);
    st.stamps++;
    save();
    render(st.stamps - 1);
    say(st.stamps >= N ? "Decimo timbro: hai vinto una pizza in omaggio." : `Timbro aggiunto: ${st.stamps} su ${N}.`);
    if (st.stamps >= N) {
      // tenth stamp: the winning ticket, a WebGL scene loaded only now
      const serial = st.id;
      setTimeout(
        () =>
          import("./win.js")
            .then(({ showWin }) => showWin({ serial, reduced, lenis, onClose: () => $("t-stamp").focus() }))
            .catch(() => say("Hai vinto una pizza in omaggio! Mostra la Card alla cassa.")),
        reduced ? 0 : 650
      );
    }
  });

  $("t-wa").addEventListener("click", () => {
    st.wa = !st.wa;
    save();
    render();
  });

  const copy = async (text, ok) => {
    try {
      await navigator.clipboard.writeText(text);
      say(ok);
    } catch {
      say(`Copia non disponibile su questo browser: ${text}`);
    }
  };
  root.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", () => copy(b.dataset.copy, `Codice ${b.dataset.copy} copiato.`))
  );
  $("t-invite-btn").addEventListener("click", () => {
    if (!st.made) {
      say("Crea prima la Card: il link porta il tuo codice.");
      $("t-name").focus();
      return;
    }
    copy(`${base}?invito=${encodeURIComponent(st.id)}#tessera`, "Invito copiato. Mandalo a chi non ha mai ordinato da noi.");
  });

  /* flip + tilt */
  function setFlip(back) {
    card.classList.toggle("is-back", back);
    $("t-flip").setAttribute("aria-pressed", String(back));
    $("t-flip").textContent = back ? "Mostra i timbri" : "Mostra il QR";
    $("t-back").setAttribute("aria-hidden", String(!back));
    $("t-front").setAttribute("aria-hidden", String(back));
  }
  $("t-flip").addEventListener("click", () => setFlip(!card.classList.contains("is-back")));
  // tap the card itself to flip it (phones)
  card.addEventListener("click", () => st.made && setFlip(!card.classList.contains("is-back")));

  if (!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    stage.addEventListener("pointermove", (e) => {
      const b = stage.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width;
      const y = (e.clientY - b.top) / b.height;
      stage.style.setProperty("--ry", `${((x - 0.5) * 22).toFixed(2)}deg`);
      stage.style.setProperty("--rx", `${((0.5 - y) * 14).toFixed(2)}deg`);
      stage.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      stage.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    });
    stage.addEventListener("pointerleave", () => {
      stage.style.removeProperty("--rx");
      stage.style.removeProperty("--ry");
    });
  }

  render();
}
