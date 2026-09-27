# Pizzeria Nonna Diana: homepage demo

Homepage scroll-driven per la Pizzeria Nonna Diana di Santa Teresa di Spoltore (PE): pizza in teglia della famiglia Canale, dal 2014.

La teglia di margherita è una scena **Three.js / WebGL**: mentre scorri, la camera gira intorno alla teglia d'acciaio, l'impasto "respira" e alla fine la teglia si apre nei suoi 12 tranci, e uno viene verso di te.

## Avvio

```bash
npm install
npm run dev
```

Build statica in `dist/` con `npm run build` (percorsi relativi, pubblicabile su GitHub Pages, Netlify o Vercel).

## Stack

- Vite, JavaScript vanilla
- Three.js (teglia procedurale, vedi sotto)
- GSAP ScrollTrigger (pin, scrub, snap, pan orizzontale) + Lenis (smooth scroll su desktop)
- Bricolage Grotesque + Karla (Fontsource), icone Phosphor inlinate in build
- `prefers-reduced-motion` e tema chiaro/scuro supportati

## Il modello 3D

- 12 tranci costruiti come heightfield: cornicione rialzato sul bordo della teglia, rilievo della mozzarella ricavato dalla foto, tagli con sugo, mollica alveolata e base bruna.
- Teglia d'acciaio con angoli arrotondati e bordo arrotolato; ombre di contatto "baked" (niente shadow map).
- Shader: `uBake` (impasto crudo -> cotto) e `uGlow` (bagliore del forno); fili di mozzarella piegati nel vertex shader.
- Storia in 3 capitoli: impasto crudo che lievita, cottura, taglio in 12 tranci con il trancio che viene verso di te.

## Performance su iPhone

- Three.js caricato in lazy (bundle iniziale ~52 KB gzip), texture 1k su mobile.
- Render solo quando lo stato cambia, DPR max 2 con riduzione automatica se il frame rate cala.
- Canvas a `100lvh` e pin a `100svh`: nessun resize quando la barra di Safari si chiude.
- Niente Lenis sul touch (scroll nativo iOS) e snap sui capitoli; niente `backdrop-filter` sui blocchi che scorrono.

## Sezioni

1. Hero con teglia 3D
2. Nastro dei gusti
3. Storia dell'impasto (pin 3D in tre capitoli: lievitazione, stesura, tranci)
4. Manifesto "leggerezza" (rivelazione parola per parola)
5. Box e teglie con prezzi reali (pan orizzontale)
6. Fritti
7. La famiglia
8. Recensioni
9. **Nonna Diana Card**: tessera fedeltà digitale con QR, timbri (10 tranci + 1 in omaggio), offerte e vantaggi
10. Dove siamo, orari, contatti

## Note per la consegna

- Le foto in `public/img/` sono **generate con AI (Higgsfield, 5 crediti)** a scopo illustrativo: vanno sostituite con foto reali del locale.
- Orari e sede di Pescara vanno confermati con il cliente (vedi `docs/research.md`).
- Nonna Diana Card: da dove viene e come presentarla al cliente in [`docs/nonna-diana-card.md`](docs/nonna-diana-card.md).
- Ricerca e fonti: [`docs/research.md`](docs/research.md). Design system: [`design-system/pizzeria-nonna-diana/MASTER.md`](design-system/pizzeria-nonna-diana/MASTER.md).
