import { CapacitorConfig } from '@capacitor/cli';

const devMode = process.env.CAPACITOR_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'com.balanceprojection.app',
  appName: 'Gestão Tesouraria',
  webDir: '../web/dist',
  server: devMode
    ? {
        url: 'https://10.0.2.2:5173',
        cleartext: true,
      }
    : {
        androidScheme: 'https',
      },
};

export default config;
