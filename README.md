# Quản lý người dùng

Ứng dụng React Native chạy trên web và di động bằng Expo SDK 57. Firebase Authentication xác thực admin, Cloud Firestore lưu hồ sơ người dùng. Admin có thể thêm, xem, tìm theo họ tên hoặc email, sửa, đổi mật khẩu, chọn ảnh và xóa hồ sơ.

## Chạy thử

Cần Node.js 24 và Java JDK 21 cho Firebase Emulator. Trong thư mục dự án, mở PowerShell thứ nhất:

```powershell
npm ci
npm run emulators
```

Sau khi Firebase báo các emulator đã sẵn sàng, mở PowerShell thứ hai:

```powershell
npm run demo:admin
$env:EXPO_PUBLIC_FIREBASE_EMULATOR_HOST = '127.0.0.1'
npm run web
```

Mở địa chỉ Expo in ra. Admin chạy thử là `admin@example.test`, mật khẩu `DemoAdmin!2026`. Tài khoản này chỉ dành cho Firebase Emulator. Xem dữ liệu tại [Emulator UI](http://localhost:4000/firestore). Dữ liệu mặc định mất khi tắt emulator.

Để chạy trên Android Emulator cùng máy, đặt `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` thành `10.0.2.2` và chạy `npm run android`.

## Kết nối Firebase thật

1. Tạo một project trong [Firebase Console](https://console.firebase.google.com/) và đăng ký app **Web** để lấy cấu hình Firebase JS SDK.
2. Bật **Authentication → Sign-in method → Email/Password**. Trong tab **Users**, tạo một tài khoản quản trị viên và sao chép **User UID**.
3. Tạo **Cloud Firestore Standard** với database ID `(default)` ở Production mode. Mở tab **Rules**, dán nội dung `firestore.rules`, thay chuỗi `demo-admin-uid` bằng **User UID** ở bước 2 và bấm **Publish**.
4. Chạy `Copy-Item .env.example .env`. Điền bốn giá trị Firebase và điền cùng UID vào `EXPO_PUBLIC_ADMIN_UID`. Để trống `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST`. Nếu đã chạy emulator trong cửa sổ này, chạy `Remove-Item Env:EXPO_PUBLIC_FIREBASE_EMULATOR_HOST -ErrorAction SilentlyContinue`.
5. Chạy `npm run web` hoặc `npm start` rồi quét QR bằng Expo Go tương thích SDK 57. Đăng nhập bằng tài khoản đã tạo ở bước 2. Thêm một hồ sơ để collection `nguoidung` xuất hiện ở tab **Data**.

Giữ mật khẩu admin trong Firebase Authentication. Mục quản lý người dùng quản lý các hồ sơ Firestore riêng với tài khoản đăng nhập admin.

## Cơ sở dữ liệu

Collection `nguoidung` có đúng bốn trường kiểu string:

| Trường | Nội dung |
| --- | --- |
| `email` | Email viết thường, dùng làm ID document để chống trùng |
| `matkhau` | Bản băm bcrypt cost 12, được hiển thị dưới dạng dấu che |
| `hoten` | Họ tên |
| `hinhanh` | Ảnh JPEG nén lưu dưới dạng data URI |

Ảnh được thu về cạnh dài tối đa 360 px và giới hạn 220.000 ký tự trước khi lưu. Ứng dụng dùng ảnh lưu trong Firestore nên không cần cấu hình thêm Firebase Storage. Khi sửa email, app tạo document mới và xóa document cũ trong cùng một transaction. Để trống mật khẩu khi sửa sẽ giữ bản băm cũ.

`submission/nguoidung.json` chứa dữ liệu mẫu trích từ Firebase Emulator và có thể mở bằng trình đọc JSON. Thư viện dùng trong bài được cài qua:

```powershell
npx expo install expo-image-picker expo-image-manipulator expo-crypto
npm install bcryptjs
npm run typecheck
```
