import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, BackHandler, FlatList, Image, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { adminUid, auth, isEmulator } from './src/firebase';
import { pickAvatar } from './src/avatar';
import {
  DuplicateEmail, normalizeEmail, removeUser, saveUser, UserRemoved, validateUser, watchUsers,
  type UserFields, type UserRecord,
} from './src/users';

const color = {
  background: '#F5F3EC',
  paper: '#FFFDF7',
  ink: '#172720',
  muted: '#506057',
  line: '#D5DCD0',
  accent: '#175A42',
  pale: '#E3EEE2',
  white: '#FFFFFF',
  error: '#A32626',
};

function Button({ label, onPress, disabled, variant = 'plain', accessibilityLabel }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'plain' | 'primary' | 'danger' | 'destructive';
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'destructive' && styles.destructiveButton,
        (pressed || disabled) && styles.dim,
      ]}
    >
      <Text style={[
        styles.buttonText,
        variant === 'danger' && styles.errorText,
        (variant === 'primary' || variant === 'destructive') && styles.whiteText,
      ]}>{label}</Text>
    </Pressable>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.frame}>{children}</View>
    </SafeAreaView>
  );
}

function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color.muted}
        style={[styles.input, Boolean(error) && styles.invalidInput]}
        {...input}
      />
      {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function EntryForm({ entry, onBack, onSaved }: {
  entry: UserRecord | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<UserFields>({
    hoten: entry?.hoten ?? '', email: entry?.email ?? '', matkhau: '', hinhanh: entry?.hinhanh ?? '',
  });
  const [errors, setErrors] = useState<Partial<UserFields>>({});
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!savingRef.current) onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  function change(key: keyof UserFields, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function choosePhoto() {
    setPicking(true);
    try {
      const image = await pickAvatar();
      if (image) change('hinhanh', image);
    } catch {
      setErrors((current) => ({ ...current, hinhanh: 'Không mở được ảnh. Hãy thử một ảnh khác.' }));
    } finally {
      setPicking(false);
    }
  }

  async function submit() {
    if (savingRef.current || picking) return;
    const values = { ...draft, email: normalizeEmail(draft.email), hoten: draft.hoten.trim() };
    const nextErrors = validateUser(values, Boolean(entry));
    setErrors(nextErrors);
    setFailure('');
    if (Object.keys(nextErrors).length > 0) return;

    savingRef.current = true;
    setSaving(true);
    try {
      await saveUser(values, entry?.id);
      onSaved();
    } catch (error) {
      if (error instanceof DuplicateEmail) {
        setErrors({ email: 'Email này đã có trong danh sách.' });
      } else {
        setFailure(error instanceof UserRemoved
          ? 'Người dùng đã bị xóa. Quay về danh sách để kiểm tra.'
          : 'Lưu thất bại. Kiểm tra kết nối và quyền Firestore rồi thử lại.');
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Frame>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <View style={styles.back}>
            <Button label="Về danh sách" onPress={onBack} disabled={saving} />
          </View>
          <Text accessibilityRole="header" style={styles.heading}>
            {entry ? 'Sửa' : 'Thêm'} người dùng
          </Text>
          <Field label="Họ tên" placeholder="Ví dụ Nguyễn Minh An" autoComplete="name" editable={!saving}
            value={draft.hoten} error={errors.hoten} onChangeText={(value) => change('hoten', value)} />
          <Field label="Email" placeholder="vidu@example.com" inputMode="email" autoCapitalize="none" autoCorrect={false}
            editable={!saving} value={draft.email} error={errors.email} onChangeText={(value) => change('email', value)} />
          <Field label="Mật khẩu" placeholder={entry ? 'Để trống để giữ mật khẩu cũ' : 'Ít nhất 8 ký tự'}
            secureTextEntry autoComplete="new-password" editable={!saving}
            value={draft.matkhau} error={errors.matkhau} onChangeText={(value) => change('matkhau', value)} />
          <View style={styles.field}>
            <Text style={styles.label}>Ảnh đại diện</Text>
            <View style={styles.photoRow}>
              {draft.hinhanh ? <Image accessibilityLabel="Ảnh xem trước" source={{ uri: draft.hinhanh }} style={styles.preview} /> : null}
              <Button label={draft.hinhanh ? 'Đổi ảnh' : 'Chọn ảnh'} onPress={choosePhoto} disabled={picking || saving} />
            </View>
            {errors.hinhanh ? <Text accessibilityRole="alert" style={styles.errorText}>{errors.hinhanh}</Text> : null}
          </View>
          {failure ? <Text accessibilityRole="alert" style={styles.errorText}>{failure}</Text> : null}
          <Button label={saving ? 'Đang lưu…' : 'Lưu người dùng'} variant="primary" onPress={submit} disabled={saving || picking} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Frame>
  );
}

function DirectoryScreen({ onLogout }: { onLogout: () => void }) {
  const [entries, setEntries] = useState<UserRecord[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState('');
  const [editor, setEditor] = useState<{ entry: UserRecord | null }>();
  const [deleting, setDeleting] = useState<UserRecord>();
  const [deleteError, setDeleteError] = useState('');
  const [busy, setBusy] = useState(false);
  const deleteInFlight = useRef(false);
  const [message, setMessage] = useState('');

  useEffect(() => watchUsers((items) => {
    setEntries(items);
    setStatus('ready');
  }, () => setStatus('error')), [retry]);

  if (editor) {
    return <EntryForm entry={editor.entry} onBack={() => setEditor(undefined)} onSaved={() => {
      setEditor(undefined);
      setFilter('');
      setMessage(editor.entry ? 'Đã lưu thay đổi.' : 'Đã thêm người dùng.');
    }} />;
  }

  async function confirmDelete() {
    if (!deleting || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setBusy(true);
    setDeleteError('');
    try {
      await removeUser(deleting.id);
      setDeleting(undefined);
      setMessage('Đã xóa người dùng.');
    } catch {
      setDeleteError('Xóa thất bại. Kiểm tra kết nối rồi thử lại.');
    } finally {
      deleteInFlight.current = false;
      setBusy(false);
    }
  }

  const term = filter.trim().toLocaleLowerCase('vi-VN');
  const visible = term
    ? entries.filter((item) => item.hoten.toLocaleLowerCase('vi-VN').includes(term) || item.email.includes(term))
    : entries;

  return (
    <Frame>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>Quản trị</Text>
          <Button label="Đăng xuất" onPress={onLogout} disabled={busy} />
        </View>
        <Text accessibilityRole="header" style={styles.heading}>Quản lý người dùng</Text>
      </View>
      {status === 'loading' ? (
        <View style={styles.state}>
          <ActivityIndicator color={color.accent} />
          <Text style={styles.body}>Đang kết nối Firebase…</Text>
        </View>
      ) : status === 'error' ? (
        <View style={styles.state}>
          <Text accessibilityRole="alert" style={styles.stateTitle}>Không tải được dữ liệu</Text>
          <Text style={styles.body}>Kiểm tra kết nối và UID admin trong Firestore Rules.</Text>
          <Button label="Thử lại" onPress={() => {
            setStatus('loading');
            setRetry((value) => value + 1);
          }} />
        </View>
      ) : (
        <>
          <View style={styles.toolbar}>
            <TextInput
              accessibilityLabel="Tìm người dùng"
              placeholder="Tên hoặc email…"
              placeholderTextColor={color.muted}
              value={filter}
              onChangeText={setFilter}
              style={[styles.input, styles.search]}
            />
            <Button label="Thêm người dùng" variant="primary" onPress={() => {
              setMessage('');
              setEditor({ entry: null });
            }} />
          </View>
          <View style={styles.listHeader}>
            <Text style={styles.count}>{term ? `${visible.length} / ${entries.length}` : entries.length} người dùng</Text>
            {message ? <Text accessibilityLiveRegion="polite" style={styles.feedback}>{message}</Text> : null}
          </View>
          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.state}>
                <Text style={styles.stateTitle}>{term ? 'Không tìm thấy người dùng' : 'Danh sách đang trống'}</Text>
                <Text style={styles.body}>{term ? 'Thử tìm bằng từ khóa khác.' : 'Chọn “Thêm người dùng” để tạo hồ sơ đầu tiên.'}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.photoRow}>
                  <Image accessibilityLabel={`Ảnh của ${item.hoten}`} source={{ uri: item.hinhanh }} style={styles.avatar} />
                  <View style={styles.identity}>
                    <Text accessibilityRole="header" style={styles.rowTitle}>{item.hoten}</Text>
                    <Text style={styles.body}>{item.email}</Text>
                    <Text style={styles.body}>Mật khẩu · ••••••••</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Button label="Sửa" accessibilityLabel={`Sửa ${item.hoten}`} onPress={() => {
                    setMessage('');
                    setEditor({ entry: item });
                  }} />
                  <Button label="Xóa" accessibilityLabel={`Xóa ${item.hoten}`} variant="danger" onPress={() => {
                    setMessage('');
                    setDeleteError('');
                    setDeleting(item);
                  }} />
                </View>
              </View>
            )}
          />
        </>
      )}
      <Modal visible={Boolean(deleting)} transparent onRequestClose={() => {
        if (!deleteInFlight.current) setDeleting(undefined);
      }}>
        <View style={styles.overlay}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.stateTitle}>Xóa người dùng?</Text>
            <Text style={styles.body}>“{deleting?.hoten}” sẽ bị xóa khỏi danh sách.</Text>
            {deleteError ? <Text accessibilityRole="alert" style={styles.errorText}>{deleteError}</Text> : null}
            <View style={styles.actions}>
              <Button label="Hủy" onPress={() => setDeleting(undefined)} disabled={busy} />
              <Button label={busy ? 'Đang xóa…' : 'Xác nhận xóa'} variant="destructive" onPress={confirmDelete} disabled={busy} />
            </View>
          </View>
        </View>
      </Modal>
    </Frame>
  );
}

function AdminGate() {
  const [session, setSession] = useState<User | null | undefined>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const request = useRef(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setSession);
  }, []);

  async function login() {
    if (!auth || request.current) return;
    if (!email.trim() || !password) {
      setNotice('Nhập email và mật khẩu admin.');
      return;
    }
    request.current = true;
    setPending(true);
    setNotice('');
    try {
      const { user } = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      if (user.uid !== adminUid) {
        setNotice('Tài khoản này chưa được cấp quyền admin.');
        await signOut(auth);
      }
      setPassword('');
    } catch {
      setNotice('Đăng nhập thất bại. Kiểm tra thông tin và kết nối Firebase.');
    } finally {
      request.current = false;
      setPending(false);
    }
  }

  async function logout() {
    if (!auth) return;
    setNotice('');
    await signOut(auth);
  }

  if (session && session.uid === adminUid) return <DirectoryScreen onLogout={logout} />;

  return (
    <Frame>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.login}>
          <Text accessibilityRole="header" style={styles.heading}>Đăng nhập quản trị</Text>
          {!auth ? (
            <Text style={styles.body}>Điền cấu hình Firebase và UID admin trong .env theo README.</Text>
          ) : session === undefined ? (
            <ActivityIndicator color={color.accent} />
          ) : session ? (
            <>
              <Text accessibilityRole="alert" style={styles.errorText}>Tài khoản này chưa được cấp quyền admin.</Text>
              <Button label="Đăng xuất" onPress={logout} />
            </>
          ) : (
            <>
              <Text style={styles.body}>{isEmulator ? 'Firebase Emulator · Chế độ chạy thử' : 'Đăng nhập bằng tài khoản admin để quản lý hồ sơ.'}</Text>
              <Field label="Email admin" inputMode="email" autoCapitalize="none" autoCorrect={false}
                autoComplete="username" editable={!pending} value={email} onChangeText={setEmail} />
              <Field label="Mật khẩu admin" secureTextEntry autoComplete="current-password"
                editable={!pending} value={password} onChangeText={setPassword} onSubmitEditing={login} />
              {notice ? <Text accessibilityRole="alert" style={styles.errorText}>{notice}</Text> : null}
              <Button label={pending ? 'Đang đăng nhập…' : 'Đăng nhập'} variant="primary" onPress={login} disabled={pending} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Frame>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AdminGate />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.background },
  frame: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  fill: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 20, gap: 16 },
  brandRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  brand: { fontSize: 17, fontWeight: '700', color: color.accent },
  heading: { color: color.ink, fontSize: 35, fontWeight: '700', letterSpacing: -0.8 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  search: { flexGrow: 1, flexBasis: 148, minWidth: 148, width: 0 },
  input: { minHeight: 48, borderWidth: 1, borderColor: color.line, borderRadius: 10, backgroundColor: color.paper, color: color.ink, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16 },
  invalidInput: { borderColor: color.error },
  listHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', paddingTop: 20, paddingBottom: 9 },
  count: { color: color.muted, fontSize: 14, fontWeight: '600' },
  feedback: { color: color.accent, fontSize: 14 },
  listContent: { paddingBottom: 24 },
  row: { gap: 4, paddingTop: 15, paddingBottom: 8, borderTopWidth: 1, borderColor: color.line },
  rowTitle: { color: color.ink, fontSize: 21, fontWeight: '700', marginBottom: 2 },
  state: { paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', gap: 8, backgroundColor: color.pale, borderRadius: 12 },
  stateTitle: { color: color.ink, fontSize: 19, fontWeight: '700' },
  body: { color: color.muted, fontSize: 16, lineHeight: 23 },
  label: { color: color.ink, fontSize: 15, fontWeight: '600' },
  errorText: { color: color.error, fontSize: 14 },
  whiteText: { color: color.white },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  button: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  buttonText: { color: color.accent, fontSize: 15, fontWeight: '700' },
  primaryButton: { backgroundColor: color.accent },
  destructiveButton: { backgroundColor: color.error },
  dim: { opacity: 0.65 },
  back: { alignSelf: 'flex-start' },
  form: { gap: 16, paddingTop: 8, paddingBottom: 24 },
  field: { gap: 6 },
  login: { alignSelf: 'center', width: '100%', maxWidth: 440, gap: 16, paddingTop: 56, paddingBottom: 24 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  identity: { flex: 1 },
  avatar: { width: 66, height: 66, borderRadius: 14, backgroundColor: color.pale },
  preview: { width: 84, height: 84, borderRadius: 12, backgroundColor: color.pale },
  overlay: { flex: 1, backgroundColor: 'rgba(16, 32, 24, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 420, gap: 12, backgroundColor: color.paper, padding: 20, borderRadius: 16 },
});
