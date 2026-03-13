# ✅ ĐÃ FIX XONG - Tóm tắt các thay đổi

## Ngày: 2026-03-13

## Vấn đề đã fix:

### 1. ❌ Lỗi: "Data too long for column 'title'"
**Triệu chứng:** Khi lưu đề thi Reading, báo lỗi title quá dài

**Nguyên nhân:** Cột `title` chỉ cho phép 200 ký tự

**Giải pháp:**
- ✅ Tăng độ dài cột `title` lên 500 ký tự trong Entity
- ✅ Thêm validation `truncateTitle()` để tự động cắt ngắn nếu > 500 ký tự
- ✅ Chạy migration database thành công

### 2. ❌ Lỗi: PassageText bị mất khi cập nhật đề thi
**Triệu chứng:** Sau khi sửa câu hỏi và lưu lại, đoạn văn (passage) bị mất

**Nguyên nhân:** Code ghi đè `passageText = null` khi frontend không gửi lên

**Giải pháp:**
- ✅ Thay đổi từ `qg.setPassageText(gs.getPassageText())` 
- ✅ Thành `if (gs.getPassageText() != null) qg.setPassageText(gs.getPassageText())`
- ✅ Áp dụng cho tất cả các trường: audioUrl, imageUrl, orderIndex

## Files đã thay đổi:

### Backend:
1. **QuestionGroup.java** (Entity)
   - Tăng `@Column(length = 500)` cho field `title`

2. **TestBuilderService.java** (Service)
   - Thêm method `truncateTitle(String title)`
   - Fix logic cập nhật group: chỉ set khi giá trị != null
   - Áp dụng truncateTitle ở 3 chỗ tạo/cập nhật group

3. **Database Migration**
   - Chạy: `ALTER TABLE question_groups MODIFY COLUMN title VARCHAR(500)`
   - Kết quả: ✅ Thành công

## Cách test:

### Test 1: Tạo đề Reading mới với passage dài
```
1. Vào Test Builder
2. Chọn Reading
3. Kéo "Reading Passage" vào
4. Nhập đoạn văn dài (> 200 ký tự)
5. Thêm câu hỏi (MCQ, Fill blank, etc.)
6. Nhấn "Lưu đề thi"
7. ✅ Không còn lỗi "Data too long"
8. ✅ Passage được lưu đầy đủ
```

### Test 2: Cập nhật đề Reading đã có
```
1. Load đề thi Reading đã lưu
2. Sửa câu hỏi (thêm/xóa/sửa đáp án)
3. KHÔNG sửa passage
4. Nhấn "Lưu đề thi"
5. ✅ Passage không bị mất
6. ✅ Câu hỏi được cập nhật đúng
```

### Test 3: Title quá dài (> 500 ký tự)
```
1. Tạo group với title rất dài (> 500 ký tự)
2. Lưu đề thi
3. ✅ Backend tự động cắt thành 497 ký tự + "..."
4. ✅ Không có lỗi database
```

## Restart backend:

```bash
cd /home/hv/DuAn/DAVictory/backend
./mvnw spring-boot:run
```

Hoặc nếu đang chạy, nhấn Ctrl+C và chạy lại.

## Kiểm tra database:

```sql
USE DAVictory;

-- Kiểm tra cột title
DESCRIBE question_groups;

-- Kiểm tra dữ liệu
SELECT id, title, LENGTH(title) as title_length, 
       LEFT(passageText, 50) as passage_preview
FROM question_groups
ORDER BY id DESC
LIMIT 5;
```

## Lưu ý quan trọng:

1. **Title vs PassageText:**
   - `title`: Tiêu đề ngắn gọn (max 500 ký tự) - "Questions 1-10", "Passage 1"
   - `passageText`: Nội dung đầy đủ (LONGTEXT, không giới hạn) - toàn bộ đoạn văn

2. **Khi nào cần restart backend:**
   - Sau khi thay đổi Entity (QuestionGroup.java)
   - Sau khi thay đổi Service logic
   - Hibernate sẽ tự động sync schema nếu `ddl-auto: update`

3. **Backup trước khi test:**
   ```bash
   mysqldump -u root -p1111 DAVictory > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

## Status: ✅ HOÀN TẤT

Tất cả thay đổi đã được áp dụng. Hãy restart backend và test!
