#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  TEST: Sửa Đáp Án Đã Lưu - Table Completion               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══ CHUẨN BỊ ═══${NC}"
echo ""
echo "1. Mở browser: http://localhost:5173/test-builder"
echo "2. Tạo hoặc mở một đề thi có Table Completion"
echo ""
read -p "Nhấn Enter khi đã sẵn sàng..."
echo ""

echo -e "${BLUE}═══ TEST CASE 1: Tạo Mới và Lưu ═══${NC}"
echo ""
echo "Bước 1: Tạo Table Completion block"
echo "  - Click 'Table Completion' trong sidebar"
echo ""
read -p "✓ Đã tạo? Nhấn Enter..."

echo ""
echo "Bước 2: Thêm blank vào table"
echo "  - Nhập vào cell: 'Name: [blank]'"
echo "  - Nhập vào cell khác: 'Age: [blank]'"
echo ""
read -p "✓ Đã thêm 2 blank? Nhấn Enter..."

echo ""
echo "Bước 3: Nhập đáp án ban đầu"
echo "  - Câu 1: Nhập 'John'"
echo "  - Câu 2: Nhập '25'"
echo ""
read -p "✓ Đã nhập đáp án? Nhấn Enter..."

echo ""
echo "Bước 4: Lưu đề thi"
echo "  - Click nút 'Lưu' (hoặc Ctrl+S)"
echo "  - Đợi thông báo 'Đã lưu thành công!'"
echo ""
read -p "✓ Đã lưu thành công? Nhấn Enter..."

echo ""
echo -e "${GREEN}✓ Test Case 1 hoàn thành${NC}"
echo ""

echo -e "${BLUE}═══ TEST CASE 2: Reload và Kiểm Tra ═══${NC}"
echo ""
echo "Bước 5: Reload trang"
echo "  - Nhấn F5 hoặc Ctrl+R"
echo "  - Đợi trang load xong"
echo ""
read -p "✓ Đã reload? Nhấn Enter..."

echo ""
echo "Bước 6: Kiểm tra đáp án còn không"
echo "  - Mở Table Completion block vừa tạo"
echo "  - Xem phần 'Đáp án'"
echo ""
echo -e "${YELLOW}Câu hỏi: Đáp án 'John' và '25' có còn không?${NC}"
read -p "  [y] Có / [n] Không: " answer1

if [ "$answer1" = "y" ]; then
    echo -e "${GREEN}✓ PASS: Đáp án được lưu đúng${NC}"
else
    echo -e "${RED}✗ FAIL: Đáp án bị mất sau khi reload${NC}"
    echo ""
    echo "Debug:"
    echo "  1. Mở Console (F12)"
    echo "  2. Xem có lỗi gì không"
    echo "  3. Check Network tab khi load trang"
    exit 1
fi

echo ""
echo -e "${BLUE}═══ TEST CASE 3: Sửa Đáp Án Đã Lưu ═══${NC}"
echo ""
echo "Bước 7: Sửa đáp án câu 1"
echo "  - Click vào ô đáp án câu 1 (đang là 'John')"
echo "  - Xóa và nhập 'Jane'"
echo ""
read -p "✓ Đã sửa thành 'Jane'? Nhấn Enter..."

echo ""
echo "Bước 8: Sửa đáp án câu 2"
echo "  - Click vào ô đáp án câu 2 (đang là '25')"
echo "  - Xóa và nhập '30'"
echo ""
read -p "✓ Đã sửa thành '30'? Nhấn Enter..."

echo ""
echo "Bước 9: Lưu lại"
echo "  - Click nút 'Lưu'"
echo "  - Đợi thông báo 'Đã lưu thành công!'"
echo ""
read -p "✓ Đã lưu? Nhấn Enter..."

echo ""
echo -e "${BLUE}═══ TEST CASE 4: Verify Sau Khi Sửa ═══${NC}"
echo ""
echo "Bước 10: Reload trang lần nữa"
echo "  - Nhấn F5"
echo ""
read -p "✓ Đã reload? Nhấn Enter..."

echo ""
echo "Bước 11: Kiểm tra đáp án mới"
echo "  - Mở Table Completion block"
echo "  - Xem đáp án"
echo ""
echo -e "${YELLOW}Câu hỏi: Đáp án có phải 'Jane' và '30' không?${NC}"
read -p "  [y] Đúng / [n] Sai: " answer2

if [ "$answer2" = "y" ]; then
    echo -e "${GREEN}✓ PASS: Đáp án được cập nhật đúng${NC}"
else
    echo -e "${RED}✗ FAIL: Đáp án không được cập nhật${NC}"
    echo ""
    echo "Có thể:"
    echo "  - Đáp án vẫn là 'John' và '25' (không lưu được sửa đổi)"
    echo "  - Đáp án bị mất hoàn toàn"
    echo ""
    echo "Debug:"
    echo "  1. Mở Console (F12) trước khi sửa đáp án"
    echo "  2. Sửa đáp án và xem log"
    echo "  3. Click Lưu và xem Network tab"
    echo "  4. Kiểm tra payload gửi lên có đáp án mới không"
    exit 1
fi

echo ""
echo -e "${BLUE}═══ TEST CASE 5: Sửa Nhiều Lần ═══${NC}"
echo ""
echo "Bước 12: Sửa đáp án nhiều lần liên tiếp"
echo "  - Sửa câu 1: 'Jane' → 'Alice'"
echo "  - Sửa câu 2: '30' → '35'"
echo "  - Sửa câu 1 lại: 'Alice' → 'Bob'"
echo "  - KHÔNG LƯU"
echo ""
read -p "✓ Đã sửa 3 lần? Nhấn Enter..."

echo ""
echo "Bước 13: Thao tác khác"
echo "  - Tick checkbox 'Bỏ qua hoa/thường'"
echo "  - Sửa tiêu đề bảng"
echo "  - Sửa instructions"
echo ""
read -p "✓ Đã thao tác? Nhấn Enter..."

echo ""
echo -e "${YELLOW}Câu hỏi: Đáp án hiện tại có phải 'Bob' và '35' không?${NC}"
read -p "  [y] Đúng / [n] Sai: " answer3

if [ "$answer3" = "y" ]; then
    echo -e "${GREEN}✓ PASS: Đáp án không bị mất khi thao tác khác${NC}"
else
    echo -e "${RED}✗ FAIL: Đáp án bị mất khi thao tác khác${NC}"
    echo ""
    echo "Đây là bug race condition!"
    echo "Khi tick checkbox hoặc sửa field khác,"
    echo "nó gọi onUpdate với questions cũ → ghi đè đáp án mới"
    exit 1
fi

echo ""
echo "Bước 14: Lưu lần cuối"
echo "  - Click 'Lưu'"
echo ""
read -p "✓ Đã lưu? Nhấn Enter..."

echo ""
echo "Bước 15: Reload và verify"
echo "  - Reload trang"
echo ""
read -p "✓ Đã reload? Nhấn Enter..."

echo ""
echo -e "${YELLOW}Câu hỏi: Đáp án cuối cùng có phải 'Bob' và '35' không?${NC}"
read -p "  [y] Đúng / [n] Sai: " answer4

if [ "$answer4" = "y" ]; then
    echo -e "${GREEN}✓ PASS: Tất cả test cases đều pass!${NC}"
else
    echo -e "${RED}✗ FAIL: Đáp án cuối không đúng${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           TẤT CẢ TEST CASES ĐỀU PASS! ✓✓✓                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Kết luận:"
echo "  ✓ Lưu đáp án mới: OK"
echo "  ✓ Load đáp án đã lưu: OK"
echo "  ✓ Sửa đáp án đã lưu: OK"
echo "  ✓ Sửa nhiều lần: OK"
echo "  ✓ Không bị mất khi thao tác khác: OK"
echo ""
