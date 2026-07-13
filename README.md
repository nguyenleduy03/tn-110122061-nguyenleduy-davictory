# DAVictory - Nen Tang Luyen Thi IELTS

## Yeu cau he thong

- **Docker** >= 24.0
- **Docker Compose** >= 2.20

## Cach chay

### Docker (Local Development)

```bash
cp .env.example .env.docker
docker compose up -d --build
```

### Native / Production (Server)

```bash
cp .env.example .env.production
./manage.sh start
```

### Windows

```batch
copy .env.example .env.docker
manage.bat
```

## Quan ly bang script

| Script | Mode | Lenh |
|--------|------|------|
| `manage.sh` | Native | `./manage.sh [start\|stop\|status\|log\|build]` |
| `docker.sh` | Docker | `./docker.sh [up\|down\|ps\|logs\|start\|stop\|rebuild]` |
| `manage.bat` | Docker | `manage.bat [up\|down\|build\|logs\|status]` |

## Cac service

| Service | Port |
|---------|------|
| Frontend | 5173 |
| Backend | 8080 |
| AI Writing | 5182 |
| AI Speaking | 5181 |
| AI Agent | 5187 |
| AI Import | 5186 |
| MySQL | 3306 |
| ChromaDB | 8000 |

## Lenh thuong dung (Docker)

```bash
docker compose up -d --build
docker compose logs -f backend
docker compose down
docker compose down -v   # reset ca du lieu
```

## Phuc hoi du lieu DB

```bash
docker compose down -v
cp backup.sql initdb/seed.sql
docker compose up -d
```

## Phat trien

| Thu muc | Cong nghe |
|---------|-----------|
| `backend/` | Java 21, Spring Boot 4, Maven |
| `frontend/` | React 19, Vite 8 |
| `ai-*-python/` | Python 3.12, FastAPI |
| `scripts/` | Tien ich |
| `initdb/` | SQL dump khoi tao |
