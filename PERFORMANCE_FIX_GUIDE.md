# HƯỚNG DẪN KHẮC PHỤC HIỆU SUẤT - DAVICTORY

## 📋 CHECKLIST THỰC HIỆN (Theo thứ tự ưu tiên)

### ✅ BƯỚC 1: Backup Database (5 phút)
```bash
# Backup database trước khi thay đổi
mysqldump -u root -p DAVictory > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

### ✅ BƯỚC 2: Thêm Database Indexes (10-30 phút)
```bash
# Chạy script tạo indexes
mysql -u root -p DAVictory < add_performance_indexes.sql

# Kiểm tra indexes đã tạo
mysql -u root -p DAVictory -e "SHOW INDEX FROM exam_attempts;"
```

**Kết quả mong đợi:** Query time giảm 50-80%

---

### ✅ BƯỚC 3: Cập nhật application.yaml (2 phút)
```bash
# Backup file cũ
cp backend/src/main/resources/application.yaml backend/src/main/resources/application.yaml.backup

# Copy file mới
cp application-optimized.yaml backend/src/main/resources/application.yaml
```

**Thay đổi chính:**
- ✅ Hikari pool: 10 → 20 connections
- ✅ open-in-view: true → false
- ✅ max-file-size: 2GB → 50MB
- ✅ Batch processing enabled
- ✅ Compression enabled

---

### ✅ BƯỚC 4: Fix User Entity (5 phút)
```bash
# Backup file cũ
cp backend/src/main/java/com/victory/DAVictory/entity/User.java \
   backend/src/main/java/com/victory/DAVictory/entity/User.java.backup

# Copy file đã fix
cp User.java.fixed backend/src/main/java/com/victory/DAVictory/entity/User.java
```

**Thay đổi:** `FetchType.EAGER` → `FetchType.LAZY`

---

### ✅ BƯỚC 5: Thêm JOIN FETCH vào Repositories (30 phút)

#### 5.1. UserRepository
```java
// File: backend/src/main/java/com/victory/DAVictory/repository/UserRepository.java

import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long> {
    
    // ✅ Thêm JOIN FETCH để load roles cùng lúc
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.username = :username")
    Optional<User> findByUsernameWithRoles(@Param("username") String username);
    
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.id = :id")
    Optional<User> findByIdWithRoles(@Param("id") Long id);
    
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.email = :email")
    Optional<User> findByEmailWithRoles(@Param("email") String email);
    
    // Giữ nguyên methods cũ cho backward compatibility
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
}
```

#### 5.2. ExamAttemptRepository
```java
// File: backend/src/main/java/com/victory/DAVictory/repository/ExamAttemptRepository.java

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {
    
    // ✅ JOIN FETCH user và test
    @Query("SELECT ea FROM ExamAttempt ea " +
           "LEFT JOIN FETCH ea.user " +
           "LEFT JOIN FETCH ea.test " +
           "WHERE ea.user.id = :userId " +
           "ORDER BY ea.createdAt DESC")
    List<ExamAttempt> findByUserIdWithDetails(@Param("userId") Long userId);
    
    @Query("SELECT ea FROM ExamAttempt ea " +
           "LEFT JOIN FETCH ea.user " +
           "LEFT JOIN FETCH ea.test " +
           "LEFT JOIN FETCH ea.session " +
           "WHERE ea.id = :id")
    Optional<ExamAttempt> findByIdWithDetails(@Param("id") Long id);
}
```

#### 5.3. TestRepository
```java
// File: backend/src/main/java/com/victory/DAVictory/repository/TestRepository.java

public interface TestRepository extends JpaRepository<Test, Long> {
    
    // ✅ JOIN FETCH creator
    @Query("SELECT t FROM Test t " +
           "LEFT JOIN FETCH t.createdByUser " +
           "WHERE t.status = :status " +
           "ORDER BY t.publishedAt DESC")
    List<Test> findByStatusWithCreator(@Param("status") TestStatus status);
    
    @Query("SELECT t FROM Test t " +
           "LEFT JOIN FETCH t.createdByUser " +
           "WHERE t.id = :id")
    Optional<Test> findByIdWithCreator(@Param("id") Long id);
}
```

---

### ✅ BƯỚC 6: Cập nhật Services để dùng methods mới (30 phút)

#### 6.1. UserService
```java
// Thay đổi từ:
User user = userRepository.findByUsername(username)
    .orElseThrow(() -> new RuntimeException("User not found"));

// Sang:
User user = userRepository.findByUsernameWithRoles(username)
    .orElseThrow(() -> new RuntimeException("User not found"));
```

#### 6.2. ExamAttemptService
```java
// Thay đổi từ:
List<ExamAttempt> attempts = examAttemptRepository.findByUserIdOrderByCreatedAtDesc(userId);

// Sang:
List<ExamAttempt> attempts = examAttemptRepository.findByUserIdWithDetails(userId);
```

---

### ✅ BƯỚC 7: Cập nhật Vite Config (2 phút)
```bash
# Backup
cp frontend/vite.config.js frontend/vite.config.js.backup

# Copy file mới
cp vite.config.optimized.js frontend/vite.config.js
```

**Thay đổi:**
- ✅ Cache public IP
- ✅ Code splitting
- ✅ Optimize dependencies

---

### ✅ BƯỚC 8: Thêm Caching (Optional - 20 phút)

#### 8.1. Thêm dependency vào pom.xml
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

#### 8.2. Enable caching
```java
// File: backend/src/main/java/com/victory/DAVictory/DaVictoryApplication.java

@SpringBootApplication
@EnableCaching  // ✅ Thêm annotation này
public class DaVictoryApplication {
    public static void main(String[] args) {
        SpringApplication.run(DaVictoryApplication.class, args);
    }
}
```

#### 8.3. Thêm cache config
```java
// File: backend/src/main/java/com/victory/DAVictory/config/CacheConfig.java

@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
            "tests", "questionTypes", "sessions", "parts"
        );
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .recordStats());
        return cacheManager;
    }
}
```

#### 8.4. Thêm @Cacheable vào services
```java
// TestManagementService
@Cacheable(value = "tests", key = "#id")
public Test getTestById(Long id) {
    return testRepository.findByIdWithCreator(id)
        .orElseThrow(() -> new RuntimeException("Test not found"));
}

@CacheEvict(value = "tests", key = "#testId")
public Test updateTest(Long testId, TestUpdateRequest request) {
    // ...
}
```

---

### ✅ BƯỚC 9: Restart Services (5 phút)
```bash
# Stop services
./stop.sh

# Rebuild backend
cd backend
./mvnw clean package -DskipTests

# Start services
cd ..
./start.sh
```

---

### ✅ BƯỚC 10: Kiểm tra kết quả (10 phút)

#### 10.1. Kiểm tra logs
```bash
# Xem backend logs
tail -f .run/backend.log | grep -i "error\|warn\|hikari"

# Kiểm tra số queries
# Bật logging trong application.yaml:
# logging.level.org.hibernate.SQL: DEBUG
```

#### 10.2. Test performance
```bash
# Test API response time
time curl http://localhost:8080/api/tests/published

# Trước fix: ~2-5 seconds
# Sau fix: ~100-300ms
```

#### 10.3. Monitor database
```sql
-- Kiểm tra slow queries
SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;

-- Kiểm tra connections
SHOW PROCESSLIST;

-- Kiểm tra index usage
SHOW INDEX FROM exam_attempts;
```

---

## 📊 KẾT QUẢ MONG ĐỢI

| Metric | Trước | Sau | Cải thiện |
|--------|-------|-----|-----------|
| Response time | 2-5s | 100-300ms | **90%** |
| Queries/request | 50-200 | 2-10 | **95%** |
| Database load | Cao | Thấp | **80%** |
| Memory usage | 500MB+ | 200-300MB | **50%** |
| Crash frequency | Nhiều | Hiếm | **95%** |

---

## 🔍 MONITORING SAU KHI FIX

### 1. Enable slow query log
```sql
-- Trong MySQL
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Log queries > 1s
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow-query.log';
```

### 2. Monitor Hikari pool
```bash
# Xem logs
grep "HikariPool" .run/backend.log
```

### 3. Check memory usage
```bash
# Backend memory
ps aux | grep java

# Frontend memory
ps aux | grep node
```

---

## ⚠️ LƯU Ý

1. **Backup trước khi thay đổi** - Quan trọng!
2. **Test trên staging trước** - Nếu có môi trường staging
3. **Monitor sau khi deploy** - Xem logs 24h đầu
4. **Rollback plan** - Giữ backup files để rollback nếu cần
5. **Thông báo users** - Nếu cần downtime để maintenance

---

## 🆘 TROUBLESHOOTING

### Vấn đề: LazyInitializationException sau khi đổi EAGER → LAZY
**Giải pháp:** Dùng `@Transactional` hoặc JOIN FETCH

### Vấn đề: Queries vẫn chậm sau khi thêm indexes
**Giải pháp:** Chạy `ANALYZE TABLE` và kiểm tra query plan

### Vấn đề: Connection pool exhausted
**Giải pháp:** Tăng `maximum-pool-size` hoặc giảm `connection-timeout`

### Vấn đề: Frontend vẫn chậm
**Giải pháp:** Check Network tab trong DevTools, optimize components

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, kiểm tra:
1. Logs: `.run/backend.log` và `.run/frontend.log`
2. Database: `SHOW PROCESSLIST;`
3. Network: Browser DevTools → Network tab
4. Memory: `ps aux | grep java`

---

**Thời gian thực hiện tổng:** ~2-3 giờ  
**Độ khó:** Trung bình  
**Rủi ro:** Thấp (nếu có backup)  
**Tác động:** Cải thiện hiệu suất 80-90%
