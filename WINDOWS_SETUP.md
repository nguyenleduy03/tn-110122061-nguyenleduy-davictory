# 🖥️ Hướng dẫn cài đặt DAVictory trên Windows

> **Dự án IELTS Test Website** — Backend Spring Boot + Frontend React + 4 Python AI Service

---

## 🚀 Cách nhanh nhất: Chỉ 3 bước!

```
1. Clone dự án
2. Chạy setup-windows.bat (Run as Administrator)
3. Chạy start-windows.bat
```

`setup-windows.bat` sẽ **tự động làm tất cả** cho bạn.

---

## 📋 Yêu cầu tối thiểu

| Yêu cầu | Ghi chú |
|---|---|
| Windows 10 (build 1809+) hoặc Windows 11 | Cần `winget` để tự động cài phần mềm |
| Kết nối Internet | Để tải phần mềm và packages |
| Quyền Administrator | Để cài Java, Python, Node.js, v.v. |
| Docker Desktop | Để chạy Redis (AI Agent) và ChromaDB (AI Writing) |

> [!NOTE]
> **`winget`** (Windows Package Manager) có sẵn trên Windows 10 từ build 1809 và Windows 11.
> Nếu máy không có winget, script sẽ hướng dẫn cài thủ công.

---

## 🔧 setup-windows.bat làm gì?

Script chạy theo 10 bước tự động:

| Bước | Hành động |
|---|---|
| 1 | Kiểm tra `winget` |
| 2 | Kiểm tra Java 21, **tự cài nếu thiếu** |
| 3 | Kiểm tra Python 3.12, **tự cài nếu thiếu** |
| 4 | Kiểm tra Node.js LTS, **tự cài nếu thiếu** |
| 5 | Kiểm tra MySQL, **tự cài nếu thiếu** |
| 6 | Kiểm tra Tesseract OCR, **tự cài nếu thiếu** |
| 7 | Kiểm tra Docker Desktop (Redis + ChromaDB) |
| 8 | **Hỏi thông tin**: DB password, JWT secret, API keys |
| 9 | **Tự tạo database** `DAVictory` trên MySQL |
| 10 | **Cập nhật** `application.yaml` với mật khẩu DB + JWT |
| 11 | Tạo `.venv`, cài packages cho **4 Python service** + Redis fallback |
| 12 | `npm install` + `npm run build` cho **Frontend** |
| 13 | `npm install` + `npm run build` cho **AI Test Frontend** |

---

## 📝 Thông tin cần chuẩn bị trước

Khi chạy `setup-windows.bat`, script sẽ hỏi:

| Thông tin | Bắt buộc? | Lấy ở đâu |
|---|---|---|
| **Mật khẩu MySQL** | ✅ Bắt buộc | Mật khẩu root bạn đặt khi cài MySQL |
| **JWT Secret** | ⬜ Tuỳ chọn | Enter để dùng mặc định |
| **GROQ API Key** | ✅ Bắt buộc | Đăng ký **miễn phí** tại https://console.groq.com/keys |
| **NVIDIA API Key** | ⬜ Tuỳ chọn | Fallback của AI Agent — bỏ qua được |
| **OpenAI API Key** | ⬜ Tuỳ chọn | Chỉ cần cho tính năng Speaking (phí) |

> [!IMPORTANT]
> **GROQ API Key là miễn phí** — đăng ký tại https://console.groq.com/keys chỉ mất 1 phút.
> Đây là key quan trọng nhất, tất cả 4 AI service đều cần.

---

## ▶️ Hướng dẫn chi tiết

### Bước 1: Clone dự án

```cmd
git clone https://github.com/nguyenleduy03/tn-110122061-nguyenleduy-davictory.git
cd DAVictory
```

### Bước 2: Chạy `setup-windows.bat`

1. Chuột phải vào `setup-windows.bat`
2. Chọn **"Run as administrator"**
3. Làm theo hướng dẫn trên màn hình

> Script sẽ tự động cài Java, Python, Node.js, Tesseract nếu chưa có.  
> Có thể mất **5-15 phút** tùy tốc độ mạng.

### Bước 3: Chạy `start-windows.bat`

Double-click **`start-windows.bat`** → mở 8 cửa sổ CMD riêng biệt.

Chờ khoảng **30-60 giây** để Backend Spring Boot khởi động xong.

> Muốn dừng tất cả: Double-click **`stop-windows.bat`** hoặc đóng các cửa sổ CMD.

---

## ✅ Kiểm tra hoạt động

| URL | Mô tả |
|---|---|
| **http://localhost:5173** | 🌐 Trang web chính |
| http://localhost:5174 | 🧪 AI Test Frontend |
| http://localhost:8080/swagger-ui.html | 📖 API Docs Backend |
| http://localhost:5187/docs | 📖 AI Agent |
| http://localhost:5181/docs | 📖 AI Speaking |
| http://localhost:5182/docs | 📖 AI Writing |
| http://localhost:5186/docs | 📖 AI Import |
| http://localhost:5185 | 🔴 Redis (Docker) |
| http://localhost:5184 | 📚 ChromaDB |

---

## ❗ Xử lý lỗi thường gặp

### Lỗi sau khi cài xong (PATH chưa cập nhật)
```
'python' is not recognized as an internal or external command
```
→ **Mở lại cửa sổ CMD mới** hoặc khởi động lại máy. PATH cần được reload.

### Lỗi Python service: `ModuleNotFoundError`
→ Chạy lại `setup-windows.bat` để cài lại packages.

### Lỗi Backend: `Access Denied` khi đọc port 8080
→ Chạy `start-windows.bat` với **Run as Administrator**.

### Port đang bị chiếm
```cmd
netstat -ano | findstr :8080
taskkill /PID <số PID> /F
```

### Lỗi ChromaDB: `sqlite3.OperationalError`
```cmd
cd ai-writing-python
.venv\Scripts\activate
pip install pysqlite3-binary
```

### MySQL không nhận mật khẩu khi setup
→ Kiểm tra MySQL service đang chạy:
```cmd
sc query MySQL80
net start MySQL80
```

### Docker Desktop không chạy → Redis lỗi
→ AI Agent sẽ tự fallback sang in-memory queue nếu không có Redis.
→ Tuy nhiên nên cài Docker Desktop để chạy Redis ổn định hơn:
  → Tải tại: https://www.docker.com/products/docker-desktop/

### Redis port 5185 bị chiếm
```cmd
netstat -ano | findstr :5185
taskkill /PID <số PID> /F
```

---

## 📁 Tổng quan file sau khi setup

```
DAVictory/
├── setup-windows.bat              ← Chạy 1 lần
├── start-windows.bat              ← Chạy mỗi lần mở dự án
├── stop-windows.bat               ← Dừng tất cả services
├── WINDOWS_SETUP.md               ← File này
├── backend/src/main/resources/
│   └── application.yaml           ← Đã tự động cập nhật DB password
├── ai-agent-python/
│   ├── .venv/                     ← Đã tạo tự động
│   └── .env                       ← Đã tạo + điền keys
├── ai-speaking-python/
│   ├── .venv/
│   └── .env
├── ai-writing-python/
│   ├── .venv/
│   └── .env
├── ai-import-python/
│   ├── .venv/
│   └── .env
└── frontend/
    ├── node_modules/              ← Đã cài tự động
    └── dist/                     ← Đã build tự động
```
