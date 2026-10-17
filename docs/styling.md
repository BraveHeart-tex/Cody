## Styling

`className` + semantic tokens + shared `cn`. No hardcoded values.
Inline styles: Reanimated, `fontVariant`, `textShadow`, layout edge cases only.

## Safe Area

Expo Router provides provider — don't add another.
`pt-safe` top UI, `pb-safe` bottom UI. Never `px-safe`/`p-safe`.
No `SafeAreaView` + `*-safe` stacking.
Scroll screens: `pb-safe` on content/footer, not ScrollView.

## Third-Party

1. Component spreads `...props` → className works, nothing needed.
2. Multiple style props → `remapProps`.
3. Reads `style` directly → `cssInterop` (last resort, has perf cost).

## NativeWind v5

No `tailwind.config.js` — tokens in `global.css` via `@theme`.
After editing color tokens, run `pnpm theme:generate`.
No `styled()`, no Babel plugin, no `remapProps`/`cssInterop` unless tier 2/3 above.
No global `lineHeight` tokens. Use shared Text primitive.

## Fonts

Families, face names, and loading assets live in `src/theme/fonts.ts`.
Use `appFonts.faces` / `monoFonts.faces` for native font references and
`appFontAssets` for loading. Keep `--font-sans` / `--font-mono` in
`src/global.css` aligned with the corresponding default faces.
