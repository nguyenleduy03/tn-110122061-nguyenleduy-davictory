# BÁO CÁO KIỂM TRA HIỆU SUẤT WEBSITE - DAVictory

**Ngày kiểm tra:** 2026-04-07  
**Trạng thái:** Website load rất chậm và thường hay tắc đột ngột

---

## 🔴 CÁC VẤN ĐỀ NGHIÊM TRỌNG PHÁT HIỆN

### 1. **BACKEND - N+1 Query Problem (Nghiêm trọng)**

**Vấn đề:** Phát hiện 487+ truy vấn database không tối ưu trong 80 file Java
- Nhiều `findById()`, `findByUsername()`, `findAll()` không có JOIN FETCH
- Gây ra N+1 query problem - mỗi entity lại query thêm nhiều lần
- User entity có `FetchType.EAGER` cho roles → mỗi lần load user sẽ load cả roles

**File ảnh hưởng:**
- `/backend/src/main/java/com/victory/DAVictory/entity/User.java` (line 61)
- `/backend/src/main/java/com/victory/DAVictory/service/UserService.java` (56 queries)
- `/backend/src/main/java/com/victory/DAVictory/service/ExamAttemptService.java` (38 queries)
- `/backend/src/main/java/com/victory/DAVictory/service/TestManagementService.java` (30 queries)
- `/backend/src/main/java/com/victory/DAVictory/service/TestBuilderService.java` (28 queries)

**Tác động:**
- Mỗi request có thể tạo ra 10-100+ queries thay vì 1-2 queries
- Database bị quá tải
- Response time tăng từ 50ms lên 2000-5000ms

---

### 2. **BACKEND - Database Connection Pool Chưa Cấu Hình**

**Vấn đề:** HikariCP đang dùng cấu hình mặc định
```yaml
# application.yaml - THIẾU cấu hình pool
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/DAVictory
    # ❌ Không có hikari configuration
```

**Tác động:**
- Pool size mặc định (10 connections) không đủ cho traffic cao
- Khi hết connection, request phải chờ → timeout
- Gây tắc nghẽn đột ngột

---

### 3. **BACKEND - JPA Open-in-View = true (Anti-pattern)**

**Cảnh báo trong log:**
```
WARN: spring.jpa.open-in-view is enabled by default
```

**Vấn đề:**
- Database connection giữ mở suốt quá trình render view
- Lazy loading trong controller/view → thêm nhiều queries
- Connection pool cạn kiệt nhanh

---

### 4. **FRONTEND - Vite Config Gọi API Bên Ngoài Mỗi Lần Build**

**File:** `/frontend/vite.config.js`
```javascript
async function getPublicIP() {
  const res = await fetch('https://api.ipify.org?format=json', { 
    signal: AbortSignal.timeout(4000) 
  })
  // ❌ Mỗi lần dev server restart phải chờ 4s
}
```

**Tác động:**
- Dev server khởi động chậm (thêm 4s)
- Nếu api.ipify.org chậm/down → frontend không start được
- Không cần thiết cho development

---

### 5. **FRONTEND - 161 useEffect Hooks (Quá nhiều re-render)**

**Phát hiện:**
- 161 useEffect trong 72 file JSX
- Nhiều component có 4-16 useEffect
- `IeltsListeningTest.jsx`: 16 useEffect
- `IeltsSpeakingTest.jsx`: 11 useEffect
- `IeltsWritingTest.jsx`: 10 useEffect

**Vấn đề:**
- Mỗi useEffect có thể trigger re-render
- Dependency array không tối ưu → infinite loop
- Component re-render liên tục → UI lag

---

### 6. **BACKEND - File Upload Size 2GB (Quá lớn)**

**File:** `/backend/src/main/resources/application.yaml`
```yaml
spring:
  servlet:
    multipart:
      max-file-size: 2GB      # ❌ Quá lớn
      max-request-size: 2GB   # ❌ Quá lớn

server:
  tomcat:
    max-http-form-post-size: 2GB  # ❌ Quá lớn
```

**Tác động:**
- Cho phép upload file 2GB → memory overflow
- Tomcat có thể crash khi xử lý file lớn
- Không có validation → user có thể upload file khổng lồ

---

### 7. **BACKEND - Thiếu Caching**

**Vấn đề:**
- Không thấy `@Cacheable`, `@CacheEvict` trong code
- Mỗi request đều query database
- Dữ liệu tĩnh (test structure, question types) query lại mỗi lần

**Ví dụ:**
```java
// TestStructureInitializer - chạy mỗi lần startup
@PostConstruct
public void init() {
    // Query và insert data mỗi lần restart
}
```

---

### 8. **FRONTEND - Vite Beta Version (Không ổn định)**

**File:** `/frontend/package.json`
```json
{
  "devDependencies": {
    "vite": "^8.0.0-beta.13"  // ❌ Beta version
  }
}
```

**Tác động:**
- Beta version có thể có bugs
- HMR (Hot Module Reload) không ổn định
- Build production có thể lỗi

---

### 9. **BACKEND - Logging Errors**

**Log phát hiện:**
```
java.lang.IllegalArgumentException: Invalid character found in method name
```

**Nguyên nhân:**
- Client gửi non-HTTP request đến HTTP port
- Có thể là bot/scanner tấn công
- Hoặc HTTPS request đến HTTP port

**Tác động:**
- Tomcat phải xử lý invalid requests
- Tốn CPU và memory
- Log file phình to

---

### 10. **DATABASE - Thiếu Index**

**Vấn đề:** Không thấy file migration/schema với index
- Các query `findByUserId`, `findByTestId` có thể chậm
- Không có composite index cho các query phức tạp
- Full table scan trên bảng lớn

---

## 📊 THỐNG KÊ DỰ ÁN

- **Backend:** 225 file Java
- **Frontend:** 161 file JS/JSX
- **Repositories:** 80+ với 487+ query methods
- **Controllers:** 23 controllers
- **Database:** MySQL 8.0.45
- **Spring Boot:** 4.0.3 (mới nhất)
- **React:** 19.2.0

---

## 🔧 GIẢI PHÁP ƯU TIÊN

### Ưu tiên 1: Fix N+1 Query (Quan trọng nhất)
1. Thêm `@Query` với `JOIN FETCH` cho các repository
2. Đổi `FetchType.EAGER` → `LAZY` trong User entity
3. Enable query logging để debug: `spring.jpa.show-sql: true`

### Ưu tiên 2: Cấu hình Database Pool
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

### Ưu tiên 3: Tắt Open-in-View
```yaml
spring:
  jpa:
    open-in-view: false
```

### Ưu tiên 4: Giảm File Upload Size
```yaml
spring:
  servlet:
    multipart:
      max-file-size: 50MB
      max-request-size: 50MB
```

### Ưu tiên 5: Thêm Caching
```java
@EnableCaching
@Cacheable("tests")
public List<Test> getPublishedTests() { ... }
```

### Ưu tiên 6: Fix Frontend
- Downgrade Vite về stable version (5.x)
- Cache public IP thay vì fetch mỗi lần
- Optimize useEffect dependencies
- Implement React.memo cho heavy components

### Ưu tiên 7: Thêm Database Index
```sql
CREATE INDEX idx_user_username ON users(username);
CREATE INDEX idx_test_status ON tests(status);
CREATE INDEX idx_exam_attempt_user_test ON exam_attempts(user_id, test_id);
```

### Ưu tiên 8: Enable Compression
```yaml
server:
  compression:
    enabled: true
    mime-types: text/html,text/xml,text/plain,text/css,application/javascript,application/json
```

---

## 📈 KẾT QUẢ DỰ KIẾN SAU KHI FIX

| Metric | Hiện tại | Sau khi fix |
|--------|----------|-------------|
| Response time | 2000-5000ms | 100-300ms |
| Database queries/request | 50-200 | 2-10 |
| Memory usage | Cao, không ổn định | Ổn định |
| Crash frequency | Thường xuyên | Hiếm |
| Page load time | 5-10s | 1-2s |

---

## 🚀 HÀNH ĐỘNG TIẾP THEO

1. **Ngay lập tức:** Fix N+1 queries và database pool
2. **Trong 1 ngày:** Tắt open-in-view, giảm upload size
3. **Trong 1 tuần:** Thêm caching, optimize frontend
4. **Dài hạn:** Monitoring, profiling, load testing

---

**Kết luận:** Website chậm do nhiều vấn đề tích lũy, chủ yếu từ backend (N+1 queries, thiếu caching, pool không đủ). Cần fix theo thứ tự ưu tiên để cải thiện hiệu suất.
