const base = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const email = 'admin@example.test';
const password = 'DemoAdmin!2026';
const localId = 'demo-admin-uid';

async function seed() {
  const login = await fetch(`${base}/accounts:signInWithPassword?key=demo-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (login.ok) {
    if ((await login.json()).localId !== localId) throw new Error('UID của admin demo không khớp.');
  } else {
    const response = await fetch(`${base}/projects/demo-project-mid/accounts:batchCreate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ users: [{ localId, email, rawPassword: password }] }),
    });
    const result = await response.json();
    if (!response.ok || result.error?.length || result.error?.message) {
      throw new Error('Không tạo được tài khoản admin trong Auth Emulator.');
    }
  }
  console.log(`Admin Firebase Emulator: ${email} / ${password}`);
}

seed().catch((error) => {
  console.error(error.message, 'Chạy npm run emulators trước và giữ cửa sổ đó mở.');
  process.exitCode = 1;
});
