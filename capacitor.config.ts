import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ruoyi.assistant',
  appName: '龙虾助手',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    iosScheme: 'http',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
