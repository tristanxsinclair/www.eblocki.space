import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'space.eblocki.app',
  appName: 'Eblocki',
  webDir: 'dist',
  // No server.url — app loads from local dist/ bundle (required for App Store)
  ios: {
    contentInset: 'never',
    backgroundColor: '#131516',
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#131516',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: '#131516',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#131516',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'native',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
