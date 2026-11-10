import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export function getAppAuth(app: FirebaseApp, _existing: boolean) {
  return getAuth(app);
}
