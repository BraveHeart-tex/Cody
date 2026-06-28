## Styling

Use NativeWind `className`, semantic tokens, shared `cn`.

No hardcoded theme values. Inline styles only for animation/native/layout edge cases.

## Safe Area

Expo Router provides provider.

Use `pt-safe` for custom top UI, `pb-safe` for bottom UI, `px-safe` rarely, `p-safe` almost never.

Do not stack `SafeAreaView` with `*-safe`.

Scroll screens: put bottom safe on content/footer.

## Third-Party

Wrap styled third-party components. No styling bypass imports.

## NativeWind

Preview-versioned. No `remapProps` / `cssInterop`; use `styled(...)`.

Raw tokens only when classes cannot work.

No global `lineHeight` tokens.

Use shared text primitive.
