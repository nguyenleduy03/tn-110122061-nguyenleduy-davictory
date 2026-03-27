#!/bin/bash
echo "=== Chạy SQL Migration cho Guest Exam ==="
echo ""
echo "Nhập mật khẩu MySQL root:"
mysql -u root -p davictory < create_guest_exam_attempts.sql
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration thành công!"
    echo "Bảng guest_exam_attempts đã được tạo."
else
    echo ""
    echo "❌ Migration thất bại!"
    echo "Vui lòng kiểm tra lại mật khẩu MySQL."
fi
