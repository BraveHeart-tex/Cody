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

Use the shared `Text` and `Input` components for app-owned text. Use weight
utilities (`font-medium`, `font-semibold`, `font-bold`, `font-extrabold`) on
these components instead of setting `fontWeight` in a style. Their shared
`fontClassName` resolver selects the corresponding Hanken Grotesk face and
resets native weight to `normal`. The weight is already part of the font file;
combining a regular face with a numeric weight can select the wrong face or
fall back to a system font on Android.

Passcodes intentionally use `font-mono` (JetBrains Mono SemiBold). Keep this
exception. `font-normal` and `font-medium` select its regular and medium faces.

Keep weight utilities unprefixed. If adding conditional/responsive weights or
new families/weights, extend the resolver and the matching `--font-*` tokens.
Third-party text primitives that bypass `Text` must use `fontClassName` too.
Do not set font families on a parent `View` and expect native text to inherit.

Navigation theme fonts must use `appFonts.faces` with `fontWeight: 'normal'`
in both themes, including back labels. Explicit header font styles must follow
the same rule. OS-owned alerts and permission dialogs retain system fonts.
