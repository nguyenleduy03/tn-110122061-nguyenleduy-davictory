# ✅ Đã Sửa Lỗi SQL - Version History

## Lỗi

```
JDBC exception executing SQL [Unknown column 'qg.created_by_user_id' in 'on clause']
```

## Nguyên Nhân

Bảng `question_groups` không có cột `created_by_user_id`.

## ✅ Giải Pháp

**File**: `QuestionGroupRepository.java`

### Trước (Lỗi):
```sql
LEFT JOIN users u ON qg.created_by_user_id = u.id
```

### Sau (Đã Sửa):
```sql
-- Bỏ join với users
-- Hardcode createdBy = 'N/A'
SELECT DISTINCT 
    qg.id as groupId,
    qg.created_at as createdAt,
    'N/A' as createdBy,
    COUNT(q.id) as questionCount
FROM test_question_groups tqg
JOIN question_groups qg ON tqg.question_group_id = qg.id
LEFT JOIN questions q ON qg.id = q.question_group_id
WHERE tqg.test_part_id IN (...)
GROUP BY qg.id, qg.created_at
ORDER BY qg.created_at DESC
```

## 📊 Kết Quả

Modal "Lịch Sử Phiên Bản" sẽ hiển thị:

```
┌─────────────────────────────────┐
│ ⏰ Lịch Sử Phiên Bản            │
├─────────────────────────────────┤
│ 🟢 Phiên bản hiện tại           │
│ 08/04/2026 18:52                │
│ Tạo bởi: N/A • 10 câu           │
├─────────────────────────────────┤
│ Phiên bản 2                     │
│ 08/04/2026 17:30                │
│ Tạo bởi: N/A • 8 câu            │
└─────────────────────────────────┘
```

## 🧪 Test

1. Restart backend server
2. Vào trang quản lý đề thi
3. Click menu 3 chấm → "Versions"
4. Modal sẽ hiển thị không lỗi

## 🔮 Tương Lai

Nếu muốn hiển thị tên người tạo:
1. Thêm cột `created_by_user_id` vào bảng `question_groups`
2. Hoặc lấy từ bảng `tests` (người tạo đề thi)

```sql
-- Option: Lấy từ tests table
SELECT DISTINCT 
    qg.id as groupId,
    qg.created_at as createdAt,
    t.created_by_username as createdBy,
    COUNT(q.id) as questionCount
FROM test_question_groups tqg
JOIN question_groups qg ON tqg.question_group_id = qg.id
JOIN test_parts tp ON tqg.test_part_id = tp.id
JOIN test_sessions ts ON tp.test_session_id = ts.id
JOIN tests t ON ts.test_id = t.id
LEFT JOIN questions q ON qg.id = q.question_group_id
WHERE ts.test_id = :testId
```

## ✅ Status

**FIXED** - Query đã được sửa, không còn lỗi SQL.
