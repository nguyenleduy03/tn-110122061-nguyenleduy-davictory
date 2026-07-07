# DAVictory - Nen Tang Luyen Thi IELTS

He thong luyen thi IELTS toan dien, bao gom cac ky nang: Listening, Reading, Writing, Speaking.

## Yeu cau he thong

- **Docker** >= 24.0
- **Docker Compose** >= 2.20

## Cach chay nhanh

```bash
# 1. Clone du an
git clone <repo-url>
cd DAVictory

# 2. Sua file .env - dien API key:
#    - GROQ_API_KEY (bat buoc - lay tu https://console.groq.com)
#    - JWT_SECRET (doi thanh chuoi ngau nhien)

# 3. Khoi dong toan bo he thong
docker compose up -d --build
```

> **Quan trong:** Sau khi sưa `.env`, dung `--force-recreate` đê ap dung thay đôi:
> ```bash
> docker compose up -d --force-recreate
> ```
> Hoăc reset hoan toan:
> ```bash
> docker compose down && docker compose up -d --build
> ```
docker compose up -d --build

# 5. Truy cap
# http://localhost:5173
```

## Cau hinh .env

Sua file `.env` truoc khi chay. Cac bien quan trong:

| Bien | Mo ta | Bat buoc |
|------|-------|----------|
| `MYSQL_ROOT_PASSWORD` | Mat khau MySQL root | Co |
| `DB_PASSWORD` | Mat khau ket noi DB (trung voi tren) | Co |
| `JWT_SECRET` | Khoa ky JWT - doi thanh chuoi ngau nhien | Co |
| `GROQ_API_KEY` | Groq API key (LLM chinh) | Co |
| `NVIDIA_API_KEY` | NVIDIA API key (LLM du phong) | Khong |
| `GOOGLE_DRIVE_CLIENT_ID` | Google OAuth client ID | Khong |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Google OAuth client secret | Khong |

## Cac service

| Service | Port | Mo ta |
|---------|------|-------|
| Frontend | 5173 | Giao dien nguoi dung (React) |
| Backend | 8080 | API chinh (Spring Boot) |
| AI Writing | 5182 | Cham bai Writing (Python FastAPI) |
| AI Speaking | 5181 | Cham bai Speaking (Python FastAPI) |
| AI Agent | 5187 | Content Agent (Python FastAPI) |
| AI Import | 5186 | Import de thi tu file (Python FastAPI) |
| MySQL | 3306 | Co so du lieu |
| Redis | 6379 | Cache va hang doi |
| ChromaDB | 8000 | Vector database cho RAG |

## Lenh thuong dung

```bash
# Khoi dong
docker compose up -d --build

# Sau khi sua .env → ap dung thay doi (BAT BUOC)
docker compose up -d --force-recreate

# Hoac reset hoan toan
docker compose down && docker compose up -d --build

# Xem log
docker compose logs -f

# Xem log mot service cu the
docker compose logs -f backend
docker compose logs -f ai-writing-python

# Dung tat ca
docker compose down

# Dung + xoa du lieu (reset hoan toan)
docker compose down -v

# Khoi dong lai
docker compose restart

# Kiem tra trang thai
docker compose ps
```

## Phuc hoi du lieu DB

File `initdb/seed.sql` chua du lieu mau (duoc tu dong import khi chay lan dau).

Neu muon phuc hoi tu file backup khac:

```bash
# Xoa DB cu
docker compose down -v

# Copy file backup vao initdb/
cp backup-cua-ban.sql initdb/seed.sql

# Khoi dong lai
docker compose up -d
```

## Phat trien

Source code nam trong cac thu muc:

| Thu muc | Cong nghe |
|---------|-----------|
| `backend/` | Java 21, Spring Boot 4, Maven |
| `frontend/` | React 19, Vite 8 |
| `ai-test-frontend/` | React 19, Vite 6 |
| `ai-writing-python/` | Python 3.12, FastAPI |
| `ai-speaking-python/` | Python 3.12, FastAPI |
| `ai-agent-python/` | Python 3.12, FastAPI |
| `ai-import-python/` | Python 3.12, FastAPI |
| `scripts/` | Tien ich (backup DB, seed data) |
| `initdb/` | SQL dump khoi tao DB |
