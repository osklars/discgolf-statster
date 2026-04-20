const IS_DEV = process.env.APP_VARIANT !== 'release';

module.exports = {
  expo: {
    name: IS_DEV ? 'Statster (Dev)' : 'Statster',
    slug: 'statster',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? 'com.statster.app.dev' : 'com.statster.app',
      appleTeamId: '85JGP4UC6B',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-sqlite'],
  },
};
