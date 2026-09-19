# Google Play Store Publishing Checklist (Capacitor + Phaser)

## A) Before you build
- [ ] Have a **Google Play Console** developer account (one-time **$25 USD**)
- [ ] Confirm the appId in `capacitor.config.json` matches your Play Console package name

## B) Generate production Android build (AAB)
- [ ] Ensure your web app builds: `npm run build`
- [ ] Sync Capacitor project: `npx cap sync android`
- [ ] Open Android Studio: `npx cap open android`
- [ ] In `android/app/build.gradle` (or variables):
  - [ ] set `versionCode` (must increase every release)
  - [ ] set `versionName`
- [ ] In Android Studio: **Build > Generate Signed Bundle / APK > Android App Bundle**
- [ ] Upload the resulting **.aab** to Play Console

## C) App icons & store assets
- [ ] **Store icon**: 512×512 PNG (alpha allowed)
- [ ] **Feature graphic**: 1024×500 JPEG/PNG
- [ ] **Screenshots** (min 2, recommended 4+):
  - [ ] Landscape: 1920×1080 (16:9)
  - [ ] Portrait: 1080×1920 (9:16)

## D) Capacitor launcher/splash images
- [ ] Provide `assets/icon.png` (1024×1024 recommended)
- [ ] Provide `assets/splash.png` (2732×2732 recommended)
- [ ] Generate adaptive icons: `npx capacitor-assets generate --android`

## E) Play Console required forms
- [ ] **Content rating** (IARC questionnaire)
- [ ] **Data safety** section (disclose what you collect)
- [ ] **Privacy policy URL** (host publicly; even if you collect little)
- [ ] Declare **ads** usage (yes/no)

## F) Testing requirements
- [ ] If your account is new (personal accounts created after **Nov 13, 2023**):
  - [ ] run **Closed testing** with **20 testers** for **14 days** before production release

## G) Release
- [ ] Upload to **Internal testing** first
- [ ] Promote to **Closed testing**
- [ ] Promote to **Production** once approved
