#!/usr/bin/env bash
set -euo pipefail

ARCHITECTURE="${1:-arm64-v8a}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"
EXPO_BIN="$PROJECT_ROOT/node_modules/.bin/expo"

if [[ ! -x "$EXPO_BIN" ]]; then
  echo "Expected executable Expo CLI at $EXPO_BIN" >&2
  exit 1
fi

"$EXPO_BIN" prebuild --clean --platform android

if [[ ! -x "$ANDROID_DIR/gradlew" ]]; then
  echo "Expected executable Gradle wrapper at $ANDROID_DIR/gradlew" >&2
  exit 1
fi

cd "$ANDROID_DIR"

./gradlew clean
./gradlew :app:assembleRelease \
  -PreactNativeArchitectures="$ARCHITECTURE" \
  -Pandroid.enableMinifyInReleaseBuilds=true \
  -Pandroid.enableShrinkResourcesInReleaseBuilds=true