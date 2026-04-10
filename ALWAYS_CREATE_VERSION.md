# ✅ Sửa Logic - Luôn Tạo Version Mới

## Vấn Đề

Khi edit và lưu, backend **không tạo version mới** vì logic cũ chỉ tạo version khi có attempt history.

## ✅ Giải Pháp

**File**: `TestBuilderService.java`

### Trước (Không Tạo Version):
```java
if (hasAttemptAnswersForGroup(qg.getId())) {
    // Tạo version mới
} else {
    // Cập nhật trực tiếp (không tạo version)
}
```

### Sau (Luôn Tạo Version):
```java
if (hasAttemptAnswersForGroup(qg.getId())) {
    // Có attempt lịch sử: tạo group mới
    qg = createQuestionGroupFromSave(part, gs);
} else {
    // LUÔN tạo version mới (để test version control)
    qg = createQuestionGroupFromSave(part, gs);
}
```

## 🧪 Test

1. **Restart backend server** (quan trọng!)
2. Vào edit đề thi
3. Sửa title hoặc thêm câu hỏi
4. Nhấn "Lưu" → Xác nhận
5. Vào menu 3 chấm → "Versions"
6. Sẽ thấy **2 versions**:
   - Version hiện tại (mới sửa)
   - Version cũ (trước khi sửa)

## 📊 Kết Quả Mong Đợi

### Lần Đầu Lưu:
```
┌─────────────────────────────────┐
│ ⏰ Lịch Sử Phiên Bản            │
├─────────────────────────────────┤
│ 🟢 Phiên bản hiện tại           │
│ 08/04/2026 19:36                │
│ Tạo bởi: N/A • 5 câu            │
└─────────────────────────────────┘
```

### Sau Khi Edit và Lưu:
```
┌─────────────────────────────────┐
│ ⏰ Lịch Sử Phiên Bản            │
├─────────────────────────────────┤
│ 🟢 Phiên bản hiện tại           │
│ 08/04/2026 19:40                │
│ Tạo bởi: N/A • 7 câu            │
├─────────────────────────────────┤
│ Phiên bản 2                     │
│ 08/04/2026 19:36                │
│ Tạo bởi: N/A • 5 câu            │
└─────────────────────────────────┘
```

## 🔍 Debug Logs

Trong backend console sẽ thấy:
```
🔄 Creating new version - for version control testing, group 123
```

## ⚠️ Lưu Ý

**Phải restart backend server** để code mới có hiệu lực!

```bash
# Stop backend
Ctrl + C

# Start lại
./mvnw spring-boot:run
```

## 🎯 Tương Lai

Sau khi test xong, có thể đổi lại logic:
- Tạo version mới khi có attempt
- Cập nhật trực tiếp khi chưa có attempt (tiết kiệm storage)

Nhưng hiện tại để test version control, **luôn tạo version mới**.
