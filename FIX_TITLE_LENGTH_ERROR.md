# Fix Lỗi: Data too long for column 'title'

## Vấn đề
Khi lưu đề thi Reading với passage dài, hệ thống báo lỗi:
```
Data truncation: Data too long for column 'title' at row 1
```

## Nguyên nhân
- Cột `title` trong bảng `question_groups` chỉ cho phép 200 ký tự
- Frontend có thể gửi title dài hơn (ví dụ: toàn bộ đoạn văn)

## Giải pháp đã áp dụng

### 1. Backend Code Changes

#### a) Tăng độ dài cột trong Entity
**File:** `backend/src/main/java/com/victory/DAVictory/entity/QuestionGroup.java`
```java
@Column(nullable = false, length = 500)  // Tăng từ 200 lên 500
private String title;
```

#### b) Thêm validation trong Service
**File:** `backend/src/main/java/com/victory/DAVictory/service/TestBuilderService.java`

Thêm helper method:
```java
private String truncateTitle(String title) {
    if (title == null) return "Nhóm câu hỏi";
    if (title.length() <= 500) return title;
    return title.substring(0, 497) + "...";
}
```

Áp dụng ở 3 chỗ:
1. Cập nhật group tồn tại: `qg.setTitle(truncateTitle(gs.getTitle()));`
2. Tạo group mới (existingGroupId không tồn tại)
3. Tạo group hoàn toàn mới (không có existingGroupId)

#### c) Fix lỗi passageText bị null
Thay đổi từ:
```java
qg.setPassageText(gs.getPassageText());  // Ghi đè thành null nếu không gửi lên
```

Thành:
```java
if (gs.getPassageText() != null) qg.setPassageText(gs.getPassageText());  // Chỉ cập nhật khi có giá trị
```

### 2. Database Migration

**Chạy SQL sau để cập nhật database:**

```sql
USE DAVictory;

ALTER TABLE question_groups 
MODIFY COLUMN title VARCHAR(500) NOT NULL 
COMMENT 'Tiêu đề nhóm câu hỏi';
```

Hoặc chạy file migration:
```bash
mysql -u root -p DAVictory < backend/migration_increase_title_length.sql
```

## Cách test

1. **Restart backend:**
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

2. **Test tạo đề Reading:**
   - Vào Test Builder
   - Kéo Reading Passage vào
   - Nhập đoạn văn dài (> 200 ký tự)
   - Thêm câu hỏi
   - Lưu đề thi
   - ✅ Không còn lỗi "Data too long"
   - ✅ Đoạn văn (passageText) được lưu đầy đủ

3. **Test cập nhật đề:**
   - Load đề thi đã lưu
   - Sửa câu hỏi (không sửa passage)
   - Lưu lại
   - ✅ Passage không bị mất

## Lưu ý

- **Title** là tiêu đề ngắn gọn của group (ví dụ: "Questions 1-10", "Passage 1")
- **PassageText** là nội dung đầy đủ của đoạn văn (không giới hạn - LONGTEXT)
- Nếu frontend gửi title quá dài (> 500 ký tự), backend sẽ tự động cắt ngắn thành 497 ký tự + "..."

## Checklist

- [x] Tăng độ dài cột `title` trong Entity (200 → 500)
- [x] Thêm validation `truncateTitle()` trong Service
- [x] Fix lỗi `passageText` bị null khi cập nhật
- [x] Tạo file migration SQL
- [ ] Chạy migration trên database
- [ ] Restart backend
- [ ] Test tạo đề Reading mới
- [ ] Test cập nhật đề Reading cũ
