# DAVictory

DAVictory la he thong thi IELTS truc tuyen cho Trung tam Ngoai ngu - Tin hoc Victory, xay dung theo mo hinh client-server voi backend Spring Boot va frontend React/Vite.

Tai lieu nay tong hop toan bo du an o muc de hieu nhanh: kien truc, tinh nang, cau truc thu muc, cach chay va cac tai lieu chi tiet da co san.

## Tong quan

He thong tap trung vao 4 ky nang IELTS:

- Listening
- Reading
- Writing
- Speaking

Ngoai ra con co cac nhom chuc nang ho tro:

- Quan ly tai khoan va phan quyen nguoi dung
- Test Builder tao cau truc de thi phuc tap
- Lam bai thi online voi luu tien trinh
- Cham diem tu dong cho phan co the cham may
- Cham tay cho Writing va Speaking
- Quan ly lop hoc, bai tap, thong ke va bao cao
- Tich hop Google Drive cho tap tin media/tai nguyen

## Kien truc tong the

Du an duoc to chuc theo 2 lop ung dung chinh:

- Backend: Spring Boot 4.0.3, Java 21, Spring Security, JPA, MySQL, JWT, Swagger/OpenAPI, Google Drive API
- Frontend: React 19, Vite 8, React Router, Axios, Framer Motion, TipTap, Quill, dnd-kit

Quy uoc chay mac dinh trong repo hien tai:

- Backend: cong 8080
- Frontend: cong 5173

## Cau truc thu muc

### Backend

Backend nam tai thu muc [backend](backend) va su dung package chinh `com.victory.DAVictory`.

Cac nhom code chinh:

- `controller/`: REST API cho auth, test builder, exam attempt, writing, speaking, class management, assignment, Google Drive, import/export
- `service/`: logic nghiep vu
- `repository/`: tang truy cap du lieu JPA
- `entity/`: cac entity JPA cho test, question, attempt, user, class, writing, speaking, assignment
- `dto/`: request/response model cho API
- `security/`: JWT filter, util, user details service
- `config/`: cau hinh security, CORS, Swagger, khoi tao du lieu
- `enums/`: enum cho trang thai de thi, loai cau hoi, ky nang, media
- `specification/`: bo loc/tim kiem dong cho test

File khoi dong backend:

- [backend/src/main/java/com/victory/DAVictory/DaVictoryApplication.java](backend/src/main/java/com/victory/DAVictory/DaVictoryApplication.java)

### Frontend

Frontend nam tai thu muc [frontend](frontend).

Cac nhom code chinh:

- `pages/`: man hinh cho home, login/register, dashboard, test builder, bai thi IELTS, quan ly lop, quan ly giao vien/manager/admin, debug pages
- `components/`: component tai su dung theo domain
- `services/`: lop goi API nhu auth, test builder, assignment, teacher, file, IELTS
- `hooks/`: custom hooks cho auto-save, undo/layout, timer, scrollbar, token expiry, text highlight
- `styles/`: CSS toan cuc va style theo trang
- `utils/`: tien ich xu ly du lieu

File khoi dong frontend:

- [frontend/src/main.jsx](frontend/src/main.jsx)

## Tinh nang chinh

### 1. Tai khoan va phan quyen

- Dang ky, dang nhap, dang xuat
- JWT authentication
- Quyen theo vai tro: student, teacher, manager, admin
- Trang ca nhan, doi mat khau, quan ly nguoi dung

### 2. Test Builder

- Tao de thi theo cau truc Session -> Part -> Question Group -> Question
- Ho tro nhieu dang cau hoi va media dinh kem
- Quan ly phien ban/de chia se link
- Co giao dien soan de thi va preview

### 3. Lam bai thi

- Bai thi IELTS cho Listening, Reading, Writing, Speaking
- Luu tien trinh lam bai
- Timer va auto-save
- Trang hoan thanh de thi va xem ket qua

### 4. Cham diem

- Cham tu dong cho phan phu hop
- Cham tay cho Writing va Speaking
- Lich su cham diem va ket qua bai lam

### 5. Quan ly lop hoc va bai tap

- Tao/quan ly lop
- Gan hoc vien, giao vien
- Tao assignment, nop bai, cham bai
- Thong ke theo lop va theo bai

### 6. Tich hop Google Drive

- Upload va quan ly media/tai nguyen de thi
- OAuth2 va cac tien ich lien quan den file/tai nguyen

## API va tai lieu ky thuat

Tai lieu da co san trong thu muc [baocao](baocao):

- [baocao/TECHNICAL_DOCUMENTATION.md](baocao/TECHNICAL_DOCUMENTATION.md): mo ta ky thuat tong quan, co so du lieu, API va flow chinh
- [baocao/README_DIAGRAMS.md](baocao/README_DIAGRAMS.md): huong dan cac so do
- [baocao/architecture_diagrams.puml](baocao/architecture_diagrams.puml): so do kien truc
- [baocao/sequence_diagrams.puml](baocao/sequence_diagrams.puml): so do tuan tu
- [baocao/user_flow_diagrams.puml](baocao/user_flow_diagrams.puml): so do luong nguoi dung
- [baocao/google_drive_gmail_diagrams.puml](baocao/google_drive_gmail_diagrams.puml): so do tich hop Google Drive/Gmail
- [DAVictory_core_erd.puml](DAVictory_core_erd.puml): ERD chinh
- [DAVictory_general_erd.md](DAVictory_general_erd.md): mo ta ERD tong quan

Neu can bao cao nghien cuu/thuc tap, tham khao them:

- [baocao/baocao.md](baocao/baocao.md)
- [baocao/report.md](baocao/report.md)
- [DE_CUONG_CHI_TIET.md](DE_CUONG_CHI_TIET.md)

## Cau hinh chay local

### Yeu cau toi thieu

- Java 21
- Node.js va npm
- MySQL 8
- Maven Wrapper trong backend, hoac Maven cai san

### Backend

1. Di chuyen vao thu muc backend.
2. Dam bao MySQL dang chay va database `DAVictory` ton tai.
3. Chay backend:

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend

1. Di chuyen vao thu muc frontend.
2. Cai dependency neu can.
3. Chay frontend:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

### Chay toan bo du an

Repo co san script tien loi:

```bash
./start.sh
./stop.sh
```

`start.sh` se chay backend va frontend nen, con `stop.sh` se dung cac tien trinh lien quan va don dep PID/log.

## Cau hinh quan trong

File cau hinh backend nam tai [backend/src/main/resources/application.yaml](backend/src/main/resources/application.yaml).

No chua cac nhom cau hinh chinh:

- Datasource MySQL
- JPA/Hibernate
- JWT
- Google Drive
- SpringDoc Swagger
- Gioi han upload/file lon

Luu y: cac gia tri nhay cam trong cau hinh can duoc quan ly an toan truoc khi dua len moi truong production.

## Cach tim nhanh module

- Muon xem API backend: tim trong [backend/src/main/java/com/victory/DAVictory/controller](backend/src/main/java/com/victory/DAVictory/controller)
- Muon xem logic nghiep vu: tim trong [backend/src/main/java/com/victory/DAVictory/service](backend/src/main/java/com/victory/DAVictory/service)
- Muon xem frontend page: tim trong [frontend/src/pages](frontend/src/pages)
- Muon xem component tai su dung: tim trong [frontend/src/components](frontend/src/components)

## Ghi chu ve pham vi tai lieu

Tai lieu nay la ban tong hop muc cao de giup nguoi moi nho nhanh toan bo he thong. Neu ban muon, co the tiep tuc tach thanh cac tai lieu rieng:

- Tai lieu backend chi tiet
- Tai lieu frontend chi tiet
- Tai lieu API
- Tai lieu database/ERD
- Tai lieu trien khai van hanh
