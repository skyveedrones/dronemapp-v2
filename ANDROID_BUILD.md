# MapIt Android App - Build & Deploy Guide

This guide explains how to build, test, and deploy the MapIt Android app to Google Play Store.

## Overview

Your MapIt web app has been wrapped with **Capacitor** to create a native Android application. The Android app loads your web app and provides access to native device features like camera and GPS.

## Prerequisites

### Required Software

1. **Android Studio** (Latest version)
   - Download: https://developer.android.com/studio
   - Includes Android SDK and emulator

2. **Java Development Kit (JDK) 17+**
   - Check version: `java -version`
   - Download: https://adoptium.net/

3. **Node.js & pnpm** (Already installed)
   - Used for building the web app

### Google Play Requirements

- Google Play Developer account ($25 one-time fee)
- Privacy policy URL
- App icon and screenshots
- App description and metadata

## Project Structure

```
dronemapp-v2/
├── android/                    # Native Android project
│   ├── app/                   # Android app module
│   │   ├── src/main/         # Android source code
│   │   ├── build.gradle      # App-level build config
│   │   └── AndroidManifest.xml
│   ├── build.gradle          # Project-level build config
│   └── gradle/               # Gradle wrapper
├── capacitor.config.ts       # Capacitor configuration
├── dist/client/              # Built web app (generated)
└── client/                   # Web app source code
```

## Building the Android App

### Step 1: Build the Web App

First, build your web application:

```bash
cd /home/ubuntu/dronemapp-v2
pnpm run build
```

This creates the `dist/client/` directory with your compiled web app.

### Step 2: Sync Web App to Android

Copy the built web app to the Android project:

```bash
npx cap sync android
```

This command:
- Copies `dist/client/` to `android/app/src/main/assets/public/`
- Updates native plugins
- Syncs configuration changes

### Step 3: Open in Android Studio

```bash
npx cap open android
```

This opens the Android project in Android Studio.

## Testing the App

### Option 1: Android Emulator (Recommended for Development)

1. **Create an emulator** in Android Studio:
   - Tools → Device Manager → Create Device
   - Choose a phone (e.g., Pixel 6)
   - Select system image (API 33+ recommended)
   - Finish setup

2. **Run the app**:
   - Click the green "Run" button in Android Studio
   - Or press `Shift + F10`
   - Select your emulator from the device list

### Option 2: Physical Android Device

1. **Enable Developer Options** on your phone:
   - Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → Developer Options → Enable USB Debugging

2. **Connect via USB**:
   - Connect phone to computer
   - Allow USB debugging when prompted
   - Phone should appear in Android Studio device list

3. **Run the app**:
   - Click "Run" and select your device

### Option 3: Development Server (Live Reload)

For rapid development with live reload:

1. **Start your Manus dev server** (already running)

2. **Update `capacitor.config.ts`**:
   ```typescript
   server: {
     url: 'https://3000-ic0x5fdz6r81npaqxfs3v-7994301f.us1.manus.computer',
     cleartext: true
   }
   ```

3. **Sync and run**:
   ```bash
   npx cap sync android
   npx cap open android
   ```

Now the Android app loads from your dev server with live reload!

**Remember to remove the `server.url` before building for production.**

## App Configuration

### App Identity

Edit `capacitor.config.ts`:

```typescript
{
  appId: 'com.skyveedrones.mapit',  // Unique app ID (reverse domain)
  appName: 'MapIt',                  // App name shown to users
  webDir: 'dist/client'              // Built web app location
}
```

### Android-Specific Settings

Edit `android/app/build.gradle`:

```gradle
android {
    namespace "com.skyveedrones.mapit"
    compileSdk 34
    
    defaultConfig {
        applicationId "com.skyveedrones.mapit"
        minSdk 22        // Android 5.1+ (covers 99% of devices)
        targetSdk 34     // Latest Android version
        versionCode 1    // Increment for each release
        versionName "1.0.0"
    }
}
```

### Permissions

The app requests these permissions (already configured):

- **Camera**: For uploading drone photos
- **Location**: For GPS tagging media
- **Storage**: For reading/writing files
- **Internet**: For connecting to your backend

Permissions are in `android/app/src/main/AndroidManifest.xml`.

## Native Features

### Using Camera

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri
  });
  
  // image.webPath contains the file URI
  console.log('Photo:', image.webPath);
};
```

### Using Geolocation

```typescript
import { Geolocation } from '@capacitor/geolocation';

const getCurrentPosition = async () => {
  const coordinates = await Geolocation.getCurrentPosition();
  console.log('Current position:', coordinates);
};
```

## Building for Production

### Step 1: Prepare Release Build

1. **Remove development server URL** from `capacitor.config.ts`:
   ```typescript
   server: {
     // url: 'https://...',  // Comment out or remove
   }
   ```

2. **Build web app**:
   ```bash
   pnpm run build
   npx cap sync android
   ```

### Step 2: Generate Signing Key

Android apps must be signed. Create a keystore:

```bash
keytool -genkey -v -keystore mapit-release-key.keystore \
  -alias mapit -keyalg RSA -keysize 2048 -validity 10000
```

**Save the keystore file and password securely!**

### Step 3: Configure Signing

Create `android/keystore.properties`:

```properties
storeFile=../mapit-release-key.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=mapit
keyPassword=YOUR_KEY_PASSWORD
```

**Add `keystore.properties` to `.gitignore`!**

Update `android/app/build.gradle`:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 4: Build Release APK/AAB

In Android Studio:

1. **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle** (required for Play Store)
3. Select your keystore and enter passwords
4. Choose **release** build variant
5. Click **Finish**

Output: `android/app/release/app-release.aab`

Or via command line:

```bash
cd android
./gradlew bundleRelease
```

## Google Play Store Submission

### 1. Create Play Console Account

- Visit: https://play.google.com/console
- Pay $25 one-time registration fee
- Complete account setup

### 2. Create App Listing

1. **Create app** in Play Console
2. **App details**:
   - Name: MapIt
   - Description: Professional drone mapping and media management
   - Category: Business / Productivity
   - Contact email: your@email.com

3. **Graphics**:
   - App icon: 512x512px PNG (use your logo)
   - Feature graphic: 1024x500px
   - Screenshots: At least 2 (phone), 1920x1080px recommended

4. **Privacy policy**:
   - Required for all apps
   - Host on your website or use a generator

### 3. Content Rating

Complete the content rating questionnaire:
- Business/productivity app
- No violence, mature content, etc.
- Will receive appropriate rating (likely "Everyone")

### 4. Upload App Bundle

1. **Production → Create new release**
2. **Upload** `app-release.aab`
3. **Release notes**: "Initial release of MapIt drone mapping app"
4. **Review and rollout**

### 5. Review Process

- Google reviews your app (1-7 days typically)
- May request changes or clarifications
- Once approved, app goes live!

## App Updates

To release updates:

1. **Increment version** in `android/app/build.gradle`:
   ```gradle
   versionCode 2        // Increment by 1
   versionName "1.1.0"  // Update version string
   ```

2. **Build web app**:
   ```bash
   pnpm run build
   npx cap sync android
   ```

3. **Build new AAB**:
   ```bash
   cd android && ./gradlew bundleRelease
   ```

4. **Upload to Play Console**:
   - Production → Create new release
   - Upload new AAB
   - Add release notes
   - Rollout

## Troubleshooting

### Build Errors

**"SDK location not found"**
- Create `android/local.properties`:
  ```properties
  sdk.dir=/path/to/Android/Sdk
  ```

**"Gradle sync failed"**
- File → Invalidate Caches / Restart
- Or delete `android/.gradle/` and rebuild

### Runtime Issues

**"White screen on launch"**
- Check `capacitor.config.ts` has correct `webDir`
- Ensure `pnpm run build` completed successfully
- Run `npx cap sync android` again

**"Network requests fail"**
- Add network security config for your domain
- Check CORS settings on your backend

**"Camera/GPS not working"**
- Verify permissions in `AndroidManifest.xml`
- Test on physical device (emulator has limitations)

### Debugging

**View logs**:
- Android Studio → Logcat
- Filter by package: `com.skyveedrones.mapit`

**Remote debugging**:
- Chrome → `chrome://inspect`
- Connect device and select WebView

## Best Practices

1. **Test on multiple devices**:
   - Different screen sizes
   - Various Android versions (API 22-34)
   - Low-end and high-end devices

2. **Optimize performance**:
   - Minimize bundle size
   - Use lazy loading
   - Optimize images

3. **Handle offline mode**:
   - Cache critical assets
   - Show appropriate error messages
   - Queue uploads for when online

4. **Follow Material Design**:
   - Use native Android UI patterns
   - Respect system theme (dark/light mode)
   - Proper back button behavior

## Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Developers**: https://developer.android.com
- **Play Console Help**: https://support.google.com/googleplay/android-developer
- **Material Design**: https://material.io/design

## Support

For issues specific to:
- **Web app**: Check Manus dashboard and logs
- **Capacitor**: Visit Capacitor GitHub issues
- **Android**: Stack Overflow with `android` tag
- **Play Store**: Google Play Console support

---

**Next Steps:**
1. Install Android Studio
2. Open the project: `npx cap open android`
3. Run on emulator or device
4. Test all features (camera, GPS, uploads)
5. Build release AAB when ready
6. Submit to Play Store!
