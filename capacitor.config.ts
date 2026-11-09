import type { CapacitorConfig } from '@capacitor/cli';

const isDemo = process.env.VITE_APP_EDITION === 'demo';

const config: CapacitorConfig = {
  appId: isDemo ? 'com.crafted.tradenet.demo' : 'com.crafted.tradenet',
  appName: isDemo ? 'Crafted Demo' : 'Crafted',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
