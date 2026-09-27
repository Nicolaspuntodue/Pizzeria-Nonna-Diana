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
- Three.js (teglia procedurale: 12 `RoundedBoxGeometry` con UV rimappate su un'unica foto dall'alto + striscia di mollica procedurale)
- GSAP ScrollTrigger (pin, scrub, pan orizzontale) + Lenis (smooth scroll)
- Bricolage Grotesque + Karla (Fontsource), icone Phosphor inlinate in build
- `prefers-reduced-motion` e tema chiaro/scuro supportati

## Sezioni

1. Hero con teglia 3D
2. Nastro dei gusti
3. Storia dell'impasto (pin 3D in tre capitoli: lievitazione, stesura, tranci)
4. Manifesto "leggerezza" (rivelazione parola per parola)
5. Box e teglie con prezzi reali (pan orizzontale)
6. Fritti
7. La famiglia
8. Recensioni
9. Dove siamo, orari, contatti

## Note per la consegna

- Le foto in `public/img/` sono **generate con AI (Higgsfield, 5 crediti)** a scopo illustrativo: vanno sostituite con foto reali del locale.
- Orari e sede di Pescara vanno confermati con il cliente (vedi `docs/research.md`).
- Ricerca e fonti: [`docs/research.md`](docs/research.md). Design system: [`design-system/pizzeria-nonna-diana/MASTER.md`](design-system/pizzeria-nonna-diana/MASTER.md).
