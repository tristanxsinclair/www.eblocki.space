import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'space.eblocki.app',
  appName: 'Eblocki',
  webDir: 'dist',
  // No server.url — app loads from local dist/ bundle (required for App Store)
  ios: {
    contentInset: 'always',
    backgroundColor: '#0a0e14',
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#0a0e14',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: '#0a0e14',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0e14',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'ionic',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;