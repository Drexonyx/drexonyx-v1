#!/usr/bin/env bash
# DREXONYX Android APK build script
# Requirements: Java 8+, aapt (android-sdk-build-tools), apksigner, zipalign
# R8/D8 JAR must be present at /opt/android-tools/r8.jar (or set R8_JAR below)
# android.jar must be at ANDROID_JAR path below

set -euo pipefail

ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
R8_JAR="${R8_JAR:-/opt/android-tools/r8.jar}"
KEYSTORE="${KEYSTORE:-debug.keystore}"
KEY_ALIAS="${KEY_ALIAS:-androiddebugkey}"
STORE_PASS="${STORE_PASS:-android}"
KEY_PASS="${KEY_PASS:-android}"
OUT="${OUT:-drexonyx-debug.apk}"

mkdir -p gen obj build

echo "=== Step 1: Generate R.java ==="
aapt package -f -m -J gen/ -S res/ -M AndroidManifest.xml -I "$ANDROID_JAR"

echo "=== Step 2: Compile Java ==="
javac -source 1.8 -target 1.8 \
  -classpath "$ANDROID_JAR" \
  -d obj/ \
  gen/com/drexonyx/studio/R.java \
  src/com/drexonyx/studio/MainActivity.java

echo "=== Step 3: DEX conversion ==="
java -cp "$R8_JAR" com.android.tools.r8.D8 \
  --lib "$ANDROID_JAR" \
  --min-api 21 \
  --output build/ \
  $(find obj/ -name "*.class")

echo "=== Step 4: Package resources ==="
aapt package -f \
  -M AndroidManifest.xml \
  -S res/ \
  -I "$ANDROID_JAR" \
  -F build/resources.apk

echo "=== Step 5: Add DEX ==="
cp build/resources.apk build/app-unsigned.apk
cd build && zip -j app-unsigned.apk classes.dex && cd ..

echo "=== Step 6: Align ==="
zipalign -p -f -v 4 build/app-unsigned.apk build/app-aligned.apk

echo "=== Step 7: Create debug keystore (if needed) ==="
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkey -v -keystore "$KEYSTORE" \
    -storepass "$STORE_PASS" -alias "$KEY_ALIAS" -keypass "$KEY_PASS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=DREXONYX Debug,O=Drexonyx Studio,C=AE"
fi

echo "=== Step 8: Sign ==="
apksigner sign \
  --ks "$KEYSTORE" --ks-pass "pass:$STORE_PASS" \
  --ks-key-alias "$KEY_ALIAS" --key-pass "pass:$KEY_PASS" \
  --out "build/$OUT" \
  build/app-aligned.apk

echo "=== Step 9: Verify ==="
apksigner verify --verbose "build/$OUT"

echo ""
echo "✓ APK ready: build/$OUT ($(du -sh "build/$OUT" | cut -f1))"
