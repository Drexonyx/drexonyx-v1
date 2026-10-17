#!/usr/bin/env bash
# DREXONYX Play Store App — production build script
# Usage: ./build.sh [debug|release]
# Release requires KEYSTORE, KEY_ALIAS, STORE_PASS, KEY_PASS env vars
set -euo pipefail

MODE="${1:-debug}"
ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
R8_JAR="${R8_JAR:-/opt/android-tools/r8.jar}"
OUT_NAME="${OUT_NAME:-drexonyx-play}"

# Release keystore (NEVER committed — loaded from env)
KEYSTORE="${KEYSTORE:-}"
KEY_ALIAS="${KEY_ALIAS:-}"
STORE_PASS="${STORE_PASS:-}"
KEY_PASS="${KEY_PASS:-}"

# Debug fallback keystore
DEBUG_KS="debug.keystore"

mkdir -p gen obj build

echo "=== [1/8] Generate R.java ==="
aapt package -f -m \
  -J gen/ \
  -S res/ \
  -M AndroidManifest.xml \
  -I "$ANDROID_JAR"

echo "=== [2/8] Compile Java ==="
javac -source 1.8 -target 1.8 \
  -classpath "$ANDROID_JAR" \
  -d obj/ \
  gen/com/drexonyx/app/R.java \
  src/com/drexonyx/app/DrexonyxBridge.java \
  src/com/drexonyx/app/MainActivity.java

echo "=== [3/8] DEX (R8/D8) ==="
java -cp "$R8_JAR" com.android.tools.r8.D8 \
  --lib "$ANDROID_JAR" \
  --min-api 23 \
  --output build/ \
  $(find obj/ -name "*.class")

echo "=== [4/8] Package resources ==="
aapt package -f \
  -M AndroidManifest.xml \
  -S res/ \
  -I "$ANDROID_JAR" \
  -F build/resources.apk

echo "=== [5/8] Assemble APK ==="
cp build/resources.apk build/app-unsigned.apk
(cd build && zip -j app-unsigned.apk classes.dex)
if [ -d assets ]; then
  zip -r build/app-unsigned.apk assets/
fi

echo "=== [6/8] Zipalign ==="
zipalign -p -f -v 4 build/app-unsigned.apk build/app-aligned.apk

if [ "$MODE" = "release" ]; then
  echo "=== [7/8] Sign (release) ==="
  if [ -z "$KEYSTORE" ] || [ -z "$KEY_ALIAS" ] || [ -z "$STORE_PASS" ] || [ -z "$KEY_PASS" ]; then
    echo "ERROR: Release mode requires KEYSTORE, KEY_ALIAS, STORE_PASS, KEY_PASS env vars."
    exit 1
  fi
  apksigner sign \
    --ks "$KEYSTORE" \
    --ks-pass "pass:$STORE_PASS" \
    --ks-key-alias "$KEY_ALIAS" \
    --key-pass "pass:$KEY_PASS" \
    --out "build/${OUT_NAME}-release.apk" \
    build/app-aligned.apk
  echo "=== [8/8] Verify ==="
  apksigner verify --verbose "build/${OUT_NAME}-release.apk"
  echo ""
  echo "Release APK: build/${OUT_NAME}-release.apk"
else
  echo "=== [7/8] Sign (debug) ==="
  if [ ! -f "$DEBUG_KS" ]; then
    keytool -genkey -v \
      -keystore "$DEBUG_KS" \
      -storepass android -alias androiddebugkey -keypass android \
      -keyalg RSA -keysize 2048 -validity 10000 \
      -dname "CN=DREXONYX Debug,O=Drexonyx Studio,C=AE" 2>/dev/null
  fi
  apksigner sign \
    --ks "$DEBUG_KS" --ks-pass "pass:android" \
    --ks-key-alias androiddebugkey --key-pass "pass:android" \
    --out "build/${OUT_NAME}-debug.apk" \
    build/app-aligned.apk
  echo "=== [8/8] Verify ==="
  apksigner verify --verbose "build/${OUT_NAME}-debug.apk"
  echo ""
  echo "Debug APK: build/${OUT_NAME}-debug.apk"
fi

echo ""
echo "=== Build complete ==="
ls -lh build/*.apk
