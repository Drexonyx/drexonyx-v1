# DREXONYX Play App — Production Setup Guide

## 1. Environment Variables (server-side)

These must be set in Vercel (or your production environment). **Never** commit these values.

| Variable | Description |
|---|---|
| `MOBILE_JWT_SECRET` | Secret key for signing mobile JWTs. Generate with: `openssl rand -base64 48`. Minimum 32 chars. |
| `DATABASE_URL` | Neon PostgreSQL connection string (already set in your Vercel project) |

### Setting MOBILE_JWT_SECRET in Vercel

```bash
vercel env add MOBILE_JWT_SECRET production
# Paste the generated secret when prompted
```

Or via Vercel dashboard: Project → Settings → Environment Variables → Add.

---

## 2. Deploy Mobile API Routes

The mobile API routes are in `app/api/mobile/`. Deploy to production:

```bash
vercel --prod
```

Test the routes:
```bash
# Health check (should return 401)
curl https://www.drexonyx.com/api/mobile/session

# Login
curl -X POST https://www.drexonyx.com/api/mobile/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"login","email":"test@example.com","password":"yourpassword"}'
```

---

## 3. CORS

The mobile API routes return `Access-Control-Allow-Origin: *` to allow requests from the WebView `file://` origin. This is intentional and secure because:
- Authentication uses Bearer tokens in Authorization header (not cookies)
- No CSRF vulnerability with token-based auth
- The API only accepts structured JSON requests

---

## 4. Release Keystore (Production APK)

**NEVER commit the production keystore.**

Generate once and store securely (password manager, CI secrets):

```bash
keytool -genkey -v \
  -keystore drexonyx-release.keystore \
  -alias drexonyx \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=DREXONYX,O=Drexonyx Studio,C=AE"
```

Build release APK:

```bash
cd android-play
KEYSTORE=/path/to/drexonyx-release.keystore \
KEY_ALIAS=drexonyx \
STORE_PASS=YOUR_STORE_PASSWORD \
KEY_PASS=YOUR_KEY_PASSWORD \
OUT_NAME=drexonyx-play \
bash build.sh release
```

The signed release APK will be at `build/drexonyx-play-release.apk`.

---

## 5. AAB (Android App Bundle) for Play Store

Play Store prefers AAB over APK. With the current manual toolchain, only APK can be generated. For AAB:
- Use Android Studio (import `android-play/` as a project with a manual setup, or migrate to Gradle)
- Or use the bundletool after building APK: `java -jar bundletool.jar build-bundle --modules=base.zip --output=drexonyx.aab`

The signed APK is valid for direct Play Store upload if AAB is not available.

---

## 6. Google Play Console Setup

1. Create a new app in Play Console (package: `com.drexonyx.app`)
2. Set up the app content answers (see `data-safety.md`)
3. Upload `store/privacy-policy.html` to `https://www.drexonyx.com/privacy-policy`
4. Upload `store/account-deletion.html` to `https://www.drexonyx.com/account-deletion`
5. Fill in the listing details from `store/listing.md`
6. Upload the signed release APK to the internal test track first
7. Test with at least 2 real Android devices
8. Submit for review

---

## 7. Play Console — Review Access

For Google Play review team access (required for apps with login):
- Create a demo account: demo@drexonyx.com / DrexonyxDemo2025#
- This account can browse all public pages and the dashboard (with demo project data)
- Add this to the Play Console "App content → Reviewer notes" section

---

## 8. Deep Links (Optional)

For payment redirect back to the app, configure the `drexonyx://` scheme handler in the payment provider (Ziina) with the callback URL `drexonyx://payment-success`.

---

## 9. Push Notifications (Future)

Currently not implemented. When ready:
- Add Firebase `google-services.json` to `android-play/`
- Implement `FirebaseMessagingService`
- Add `POST_NOTIFICATIONS` permission handling (already in manifest)

---

## 10. API Base URL in the SPA

The SPA at `assets/index.html` uses:
```javascript
const API = 'https://www.drexonyx.com/api/mobile';
```

If the domain changes, regenerate the SPA:
```bash
# Edit API constant in gen_play_spa.py, then:
python3 /path/to/gen_play_spa.py
cd android-play && bash build.sh release
```
