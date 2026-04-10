# Table Completion Answer Persistence - Test Suite

## Vấn đề (Bug)

Khi người dùng:
1. Tạo table với các ô `[blank]`
2. Nhập đáp án cho các câu hỏi
3. Sửa nội dung cell (không thay đổi số lượng `[blank]`)

**Kết quả**: Đáp án bị mất

## Nguyên nhân

1. `questionsRef.current` được update trong `onChange` của input đáp án
2. Nhưng `onUpdate()` có thể được gọi với state cũ từ closure
3. `setCell()` gọi `onUpdate()` với `questionsRef.current` nhưng có race condition giữa việc update ref và gọi onUpdate

## Giải pháp

1. Đảm bảo `onUpdateQuestion` cập nhật cả state và ref
2. Trong `setCell()`, luôn dùng `questionsRef.current` mới nhất
3. Tránh gọi `syncTcQuestions()` khi không cần thiết (số blank không đổi)

## Test Scripts

### 1. Master Test Suite
```bash
./test_table_completion.sh
```
Chạy tất cả automated tests

### 2. Documentation Test
```bash
./test_table_completion_fix.sh
```
Hiển thị:
- Mô tả bug
- Root cause analysis
- Fix strategy
- Testing checklist
- Manual test steps

### 3. Automated Unit Tests
```bash
./test_table_completion_automated.sh
```
Kiểm tra:
- syncTcQuestions preserves answers
- questionsRef.current usage
- Race condition prevention

### 4. Browser Integration Tests
```bash
./test_table_completion_browser.sh
```
Hướng dẫn test thủ công trong browser với các test cases:
- Basic answer persistence
- Multiple blanks in one cell
- Adding/removing blanks
- Paste from Excel
- Column/row operations

## Test Cases

### Test Case 1: Basic Answer Persistence
1. Tạo table với 2 blank
2. Nhập đáp án cho cả 2 câu
3. Sửa nội dung cell (không đổi số blank)
4. **Verify**: Đáp án vẫn còn

### Test Case 2: Multiple Blanks
1. Tạo cell với nhiều blank: `[blank] and [blank]`
2. Nhập đáp án cho tất cả
3. Sửa cell: `[blank] or [blank]`
4. **Verify**: Tất cả đáp án được giữ nguyên

### Test Case 3: Adding Blanks
1. Nhập đáp án cho các blank hiện có
2. Thêm blank mới
3. **Verify**: Đáp án cũ được giữ, câu mới được tạo

### Test Case 4: Removing Blanks
1. Nhập đáp án cho tất cả blank
2. Xóa một blank
3. **Verify**: Chỉ đáp án tương ứng bị xóa, các đáp án khác được giữ

### Test Case 5: Paste from Excel
1. Paste bảng từ Excel có chứa blank
2. Nhập đáp án
3. Sửa bất kỳ cell nào
4. **Verify**: Tất cả đáp án được giữ nguyên

### Test Case 6: Column/Row Operations
1. Nhập đáp án cho tất cả blank
2. Thêm/xóa cột/hàng
3. **Verify**: Đáp án hiện có được giữ nguyên

## Expected Behavior

✓ Đáp án phải được giữ nguyên khi sửa cell (nếu số blank không đổi)
✓ Đáp án phải được giữ nguyên khi thêm blank mới
✓ Chỉ đáp án tương ứng bị xóa khi xóa blank
✓ Thứ tự đáp án phải khớp với thứ tự blank (theo hàng, từ trái sang phải)

## Debugging Tips

Nếu đáp án bị mất:

1. Mở DevTools Console (F12)
2. Kiểm tra errors
3. Đặt breakpoint trong `setCell()` function
4. Verify `questionsRef.current` có giá trị đúng
5. Kiểm tra `onUpdate()` nhận đúng questions array

## Files

- `test_table_completion.sh` - Master test suite
- `test_table_completion_fix.sh` - Documentation & bug analysis
- `test_table_completion_automated.sh` - Automated unit tests
- `test_table_completion_browser.sh` - Browser integration test guide
- `TEST_TABLE_COMPLETION.md` - This file

## Running All Tests

```bash
# Run automated tests
./test_table_completion.sh

# If all pass, run browser tests
./test_table_completion_browser.sh
```

## Success Criteria

- All automated tests pass ✓
- All manual browser tests pass
- No console errors
- Answers persist across all operations
- No race conditions or stale state issues
