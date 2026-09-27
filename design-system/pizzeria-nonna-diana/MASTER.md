# Pizzeria Nonna Diana: design system (MASTER)

Fonte di verità per le pagine del sito. Le regole in `pages/<pagina>.md` sovrascrivono questo file.

> Nota: l'output automatico `ui-ux-pro-max --design-system` era finito su un profilo "enterprise/finance"
> (navy, IBM Plex). È stato scartato e sostituito con le scelte qui sotto, derivate da query mirate
> (`--domain product "restaurant food traditional"`, `--domain color`, `--domain typography`) e dalle regole taste-skill.

## Design read

Landing di una pizzeria di famiglia (pizza al trancio in teglia) per clienti di quartiere a Spoltore e Pescara.
Linguaggio caldo e popolare, **non gourmet**. Dial: variance 7, motion 8, density 4.

## Colori

Famiglia "Olive + Brick + Paper": pomodoro come unico accento, oliva come superficie, carta come fondo.

| Token | Light | Dark | Uso |
| --- | --- | --- | --- |
| `--paper` | `#F1ECE2` | `#16140F` | fondo pagina |
| `--paper-2` | `#E8E1D3` | `#211E17` | superfici secondarie, card |
| `--ink` | `#1E1F1A` | `#F0E9DC` | testo principale |
| `--ink-soft` | `#4B4A42` | `#BDB5A5` | testo secondario |
| `--tomato` | `#B3261E` | `#C7392A` | unico accento: CTA, prezzi, enfasi |
| `--olive` | `#3D4726` | `#2B331B` | manifesto, card alternate |

Regole: un solo accento su tutta la pagina; niente gradienti decorativi; ombre tinte di marrone, mai nere pure.

## Tipografia

- **Display:** Bricolage Grotesque Variable (wght + wdth), `font-stretch` 88-92%, tracking negativo. Richiama le insegne di bottega senza scivolare nel "gourmet serif".
- **Body:** Karla Variable, 17px, line-height 1.6, max 65ch.
- Enfasi solo con peso/colore della stessa famiglia (es. "*leggera*" nel titolo hero).
- Scala: display `clamp(2.6rem, 5.6vw, 5.25rem)`, h2 `clamp(2rem, 4vw, 3.4rem)`, lead `clamp(1.0625rem, 1.3vw, 1.25rem)`.
- Font self-hosted via Fontsource (niente `<link>` a Google Fonts).

## Spaziatura

Scala 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 144 px. Sezioni `clamp(96px, 12vw, 144px)` in verticale, gutter `clamp(16px, 4vw, 48px)`, container max 1320px.

## Forme

Bottoni pill (999px). Card e immagini 14px. Nient'altro.

## Motion

- Lenis per lo smooth scroll, GSAP ScrollTrigger per scrub/pin, Three.js per la teglia 3D.
- Ogni animazione ha uno scopo: la storia dell'impasto (pin + camera), la rivelazione parola per parola del manifesto, il pan orizzontale delle teglie, reveal all'ingresso.
- `prefers-reduced-motion`: niente Lenis, niente pin, teglia statica, marquee fermo.

## Icone

Phosphor (SVG ufficiali di `@phosphor-icons/core`, inlinati in build). Niente emoji.
