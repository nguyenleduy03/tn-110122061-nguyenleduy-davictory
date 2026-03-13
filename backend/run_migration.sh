#!/bin/bash

# Script để chạy migration database
# Sử dụng: ./run_migration.sh

echo "=========================================="
echo "DAVictory - Database Migration"
echo "Fix: Tăng độ dài cột title trong question_groups"
echo "=========================================="
echo ""

# Đọc thông tin database từ application.yaml
DB_NAME="DAVictory"
DB_USER="root"
DB_PASS="1111"

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Kiểm tra MySQL có chạy không
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL client không được cài đặt!"
    echo "Cài đặt: sudo apt-get install mysql-client"
    exit 1
fi

echo "Đang chạy migration..."
echo ""

# Chạy migration
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < migration_increase_title_length.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration thành công!"
    echo ""
    echo "Kiểm tra cột title:"
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE question_groups;" | grep title
else
    echo ""
    echo "❌ Migration thất bại!"
    echo "Vui lòng kiểm tra lại thông tin database trong application.yaml"
    exit 1
fi

echo ""
echo "=========================================="
echo "Hoàn tất! Hãy restart backend để áp dụng thay đổi."
echo "=========================================="
