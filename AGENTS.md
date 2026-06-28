# agents.md

## Expo

SDK 56. Docs at https://docs.expo.dev/versions/v56.0.0/
Fetch versioned docs only when the task involves:

- A specific Expo SDK module (Camera, SecureStore, Router APIs, etc.)
- Installation or config (app.json, metro.config, babel.config)
- A deprecation or API you're uncertain about
  Do NOT fetch for general React Native, TypeScript, or component logic.

## SecureStore

Keys: alphanumeric, `.`, `-`, `_` only. No `:` or `/`.

## Styling

→ See docs/styling.md (load only when writing or reviewing UI code)

## Tests

Put tests under **tests** dir, never under app dir.
