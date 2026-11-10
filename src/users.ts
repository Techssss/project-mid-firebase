import {
  collection, deleteDoc, doc, onSnapshot, runTransaction,
} from 'firebase/firestore';
import { hash, setRandomFallback, truncates } from 'bcryptjs';
import { getRandomValues } from 'expo-crypto';
import { db } from './firebase';

setRandomFallback((length) => Array.from(getRandomValues(new Uint8Array(length))));

export type UserFields = { email: string; matkhau: string; hoten: string; hinhanh: string };
export type UserRecord = UserFields & { id: string };

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateUser(values: UserFields, editing: boolean) {
  const errors: Partial<UserFields> = {};
  if (!values.hoten || values.hoten.length > 100) errors.hoten = 'Nhập họ tên từ 1 đến 100 ký tự.';
  if (values.email.length > 254 || !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(values.email)) {
    errors.email = 'Nhập địa chỉ email hợp lệ.';
  }
  if ((!editing || values.matkhau) && (values.matkhau.length < 8 || truncates(values.matkhau))) {
    errors.matkhau = 'Dùng ít nhất 8 ký tự và tối đa 72 byte.';
  }
  if (!values.hinhanh) errors.hinhanh = 'Chọn ảnh đại diện.';
  return errors;
}

function users() {
  if (!db) throw new Error('Firestore chưa được cấu hình.');
  return collection(db, 'nguoidung');
}

export function watchUsers(onUsers: (rows: UserRecord[]) => void, onError: (error: Error) => void) {
  return onSnapshot(users(), (snapshot) => {
    const rows = snapshot.docs.map((item) => ({ ...(item.data() as UserFields), id: item.id }));
    rows.sort((a, b) => a.hoten.localeCompare(b.hoten, 'vi') || a.email.localeCompare(b.email));
    onUsers(rows);
  }, onError);
}

export class DuplicateEmail extends Error {}
export class UserRemoved extends Error {}

export async function saveUser(values: UserFields, previousId?: string) {
  if (!db) throw new Error('Firestore chưa được cấu hình.');
  const records = users();
  const target = doc(records, values.email);
  const previous = previousId ? doc(records, previousId) : null;
  const passwordHash = values.matkhau ? await hash(values.matkhau, 12) : undefined;

  await runTransaction(db, async (transaction) => {
    const before = previous ? await transaction.get(previous) : null;
    if (before && !before.exists()) throw new UserRemoved();
    if ((!previous || previous.id !== target.id) && (await transaction.get(target)).exists()) {
      throw new DuplicateEmail();
    }
    const matkhau = passwordHash ?? before?.data()?.matkhau;
    if (typeof matkhau !== 'string') throw new Error('Thiếu mật khẩu.');
    transaction.set(target, { ...values, matkhau });
    if (previous && previous.id !== target.id) transaction.delete(previous);
  });
}

export function removeUser(id: string) {
  return deleteDoc(doc(users(), id));
}
