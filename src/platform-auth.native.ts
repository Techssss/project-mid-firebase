import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
// @ts-expect-error Metro resolves the native export, but firebase/auth ships browser typings.
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

export function getAppAuth(app: FirebaseApp, existing: boolean) {
  if (existing) return getAuth(app);
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}
