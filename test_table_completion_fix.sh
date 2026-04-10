#!/bin/bash

# Test script for Table Completion answer persistence bug
# Vấn đề: Khi sửa đáp án rồi sửa cell, đáp án bị mất

echo "=== TABLE COMPLETION ANSWER PERSISTENCE TEST ==="
echo ""
echo "Test scenario:"
echo "1. Tạo table với 2 blank: [blank] và [blank]"
echo "2. Nhập đáp án: 'answer1' và 'answer2'"
echo "3. Sửa cell khác (không thay đổi số blank)"
echo "4. Kiểm tra đáp án có còn không"
echo ""

# Simulate the bug
echo "--- Simulating the bug ---"
echo ""

# Initial state
echo "Step 1: Initial table with 2 blanks"
BLANKS=2
QUESTIONS='[{"id":1,"questionNumber":1,"answerText":""},{"id":2,"questionNumber":2,"answerText":""}]'
echo "Questions: $QUESTIONS"
echo ""

# User enters answers
echo "Step 2: User enters answers"
QUESTIONS='[{"id":1,"questionNumber":1,"answerText":"answer1"},{"id":2,"questionNumber":2,"answerText":"answer2"}]'
echo "Questions: $QUESTIONS"
echo ""

# User edits a cell (not changing blank count)
echo "Step 3: User edits cell content (not changing blank count)"
echo "setCell() is called -> checks blank count -> no change"
echo "BUT: onUpdate() might use stale questionsRef"
echo ""

# Check if answers persist
echo "Step 4: Check if answers persist"
echo "Expected: answer1, answer2"
echo "Actual (BUG): '', '' (answers lost due to stale state)"
echo ""

echo "=== ROOT CAUSE ==="
echo "1. questionsRef.current được update trong onChange của input"
echo "2. Nhưng onUpdate có thể được gọi với state cũ từ closure"
echo "3. setCell() gọi onUpdate với questionsRef.current nhưng có race condition"
echo ""

echo "=== FIX STRATEGY ==="
echo "1. Đảm bảo onUpdateQuestion cập nhật cả state và ref"
echo "2. Trong setCell, luôn dùng questionsRef.current mới nhất"
echo "3. Tránh gọi syncTcQuestions khi không cần thiết"
echo ""

echo "=== TESTING CHECKLIST ==="
echo "[ ] 1. Tạo table với 2 blank"
echo "[ ] 2. Nhập đáp án cho cả 2 câu"
echo "[ ] 3. Sửa nội dung cell (không đổi số blank)"
echo "[ ] 4. Kiểm tra đáp án vẫn còn"
echo "[ ] 5. Thêm blank mới"
echo "[ ] 6. Kiểm tra đáp án cũ vẫn còn, câu mới được tạo"
echo "[ ] 7. Xóa blank"
echo "[ ] 8. Kiểm tra đáp án tương ứng bị xóa"
echo "[ ] 9. Paste từ Excel"
echo "[ ] 10. Kiểm tra đáp án không bị mất"
echo ""

echo "=== MANUAL TEST STEPS ==="
echo "1. Mở TestBuilder"
echo "2. Tạo Table Completion block"
echo "3. Nhập: 'Name: [blank]' vào cell đầu"
echo "4. Nhập: 'Age: [blank]' vào cell thứ 2"
echo "5. Nhập đáp án: 'John' cho câu 1, '25' cho câu 2"
echo "6. Sửa cell đầu thành: 'Full Name: [blank]'"
echo "7. Kiểm tra: Đáp án 'John' vẫn còn"
echo "8. Sửa cell thứ 2 thành: 'Age (years): [blank]'"
echo "9. Kiểm tra: Đáp án '25' vẫn còn"
echo ""

echo "Test script completed. Run manual tests in browser."
