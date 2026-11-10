import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getAppAuth } from './platform-auth';

const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
export const isEmulator = Boolean(emulatorHost);

const cloud = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim(),
};

const options = emulatorHost
  ? { apiKey: 'demo-api-key', projectId: 'demo-project-mid' }
  : cloud;

export const adminUid = isEmulator ? 'demo-admin-uid' : process.env.EXPO_PUBLIC_ADMIN_UID?.trim();
export const isConfigured = isEmulator || Boolean(adminUid && Object.values(cloud).every(Boolean));
const appName = 'project-mid';
const existingApp = getApps().find((item) => item.name === appName);
const app = isConfigured ? (existingApp ?? initializeApp(options, appName)) : null;
export const auth = app ? getAppAuth(app, Boolean(existingApp)) : null;
export const db = app ? getFirestore(app) : null;

if (emulatorHost && auth && db && !existingApp) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
}
