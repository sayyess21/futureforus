# Future For Us — Design notes

## Colors
| Token | Value | Use |
|---|---|---|
| Red (accent) | #E3221A | Cover type, focus ring, links |
| Bright red | #FF4B3E | Accent on dark pages |
| Brand red | #C1281C | theme-color, Hire panel |
| Deep red | #7A140D | Form error background |
| Cream | #FCEBD2 | Text on dark/red pages |
| Ink | #231F20 | Text on light pages, dark page background |

## Fonts
- Shree Devanagari 714 (caps) — cover lines
- Roboto Flex — "FUTURE FOR US" with TextPressure (moves on hover only)
- Winter Sunday — tagline "For you for all of us"
- Bodoni Moda italic — page / section headings
- Inter — UI labels and body

## Type scale
- Display: clamp() fluid, cover only
- Heading: ~2rem italic serif
- Body: 1rem / 1.6
- Label: .72rem, uppercase, letter-spacing .2em

## Spacing & shape
- Page side gutter 60px desktop, 16px mobile
- Pills: radius 999px, min-height 44px (38px in room bar)
- Images: square corners, faint tint placeholder while loading

## Buttons (two kinds only)
1. Pill (secondary): 1px currentColor border, transparent, fills on hover — Back, Hire, Copy message, Copy email, Resume, poster bar
2. Text link: underline, used inline

## Background
Grainient (WebGL) on every page, grain fixed (not animated), amount .045.

## Focus & errors
- Focus: 2px solid red outline, offset 3px (cream on red/dark areas)
- Field errors: cream text on deep red under the field
