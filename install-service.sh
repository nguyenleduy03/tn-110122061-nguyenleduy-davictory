#!/usr/bin/env bash
set -e

SERVICE_FILE="davictory.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_FILE"

echo "🔧 Cài đặt DAVictory systemd service..."

# Copy service file
sudo cp "$SERVICE_FILE" "$SERVICE_PATH"
echo "✓ Đã copy service file"

# Reload systemd
sudo systemctl daemon-reload
echo "✓ Đã reload systemd"

# Enable service
sudo systemctl enable davictory.service
echo "✓ Đã enable service (tự động chạy khi khởi động)"

echo ""
echo "✅ Hoàn tất! Hệ thống sẽ tự động chạy khi khởi động máy."
echo ""
echo "📋 Các lệnh quản lý:"
echo "  sudo systemctl start davictory    # Khởi động (stop trước, rồi start)"
echo "  sudo systemctl stop davictory     # Dừng service"
echo "  sudo systemctl status davictory   # Xem trạng thái"
echo "  sudo systemctl restart davictory  # Khởi động lại"
echo "  sudo systemctl disable davictory  # Tắt tự động chạy"
