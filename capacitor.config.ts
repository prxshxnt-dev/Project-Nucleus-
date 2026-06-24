import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nucleus.coaching',
  appName: 'Nucleus Coaching Platform',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
