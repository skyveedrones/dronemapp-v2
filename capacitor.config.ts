import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skyveedrones.mapit',
  appName: 'MapIt',
  webDir: 'dist/client',
  server: {
    // For production, the app will load from the bundled web assets
    // For development, you can point to your Manus hosted site:
    // url: 'https://skyveemapit.manus.space',
    // cleartext: true
  },
  android: {
    // Allow mixed content for development
    allowMixedContent: true,
    // Use modern WebView
    webContentsDebuggingEnabled: true
  },
  plugins: {
    // Camera plugin configuration
    Camera: {
      // Request permissions on first use
      presentationStyle: 'fullscreen'
    },
    // Geolocation plugin configuration  
    Geolocation: {
      // Request permissions on first use
    },
    // SplashScreen configuration
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
