#!/bin/bash

# Questa Web Interface Service Installer
# Installs systemd service for automatic startup

set -e

echo "🔧 Installing Questa Web Interface Service..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
SERVICE_NAME="questa-web"
SERVICE_FILE="questa-web.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_FILE"
BACKUP_PATH="/etc/systemd/system/${SERVICE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Get current user (who invoked sudo)
ACTUAL_USER=${SUDO_USER:-$USER}
echo "👤 Installing service for user: $ACTUAL_USER"

# Update service file with correct paths
echo "📝 Updating service configuration..."
sed -i "s|User=csjo|User=$ACTUAL_USER|g" "$PROJECT_ROOT/scripts/$SERVICE_FILE"
sed -i "s|WorkingDirectory=/home/csjo/a2_cursor/Questa_Web_IF|WorkingDirectory=$PROJECT_ROOT|g" "$PROJECT_ROOT/scripts/$SERVICE_FILE"
sed -i "s|ExecStart=/home/csjo/a2_cursor/Questa_Web_IF/scripts/start-questa.sh|ExecStart=$PROJECT_ROOT/scripts/start-questa.sh|g" "$PROJECT_ROOT/scripts/$SERVICE_FILE"
sed -i "s|ReadWritePaths=/home/csjo/a2_cursor/Questa_Web_IF|ReadWritePaths=$PROJECT_ROOT|g" "$PROJECT_ROOT/scripts/$SERVICE_FILE"

# Backup existing service if it exists
if [ -f "$SERVICE_PATH" ]; then
    echo "💾 Backing up existing service file..."
    cp "$SERVICE_PATH" "$BACKUP_PATH"
    echo "✅ Backup saved to: $BACKUP_PATH"
fi

# Copy service file
echo "📋 Installing service file..."
cp "$PROJECT_ROOT/scripts/$SERVICE_FILE" "$SERVICE_PATH"

# Set correct permissions
chmod 644 "$SERVICE_PATH"

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable service
echo "✅ Enabling service..."
systemctl enable "$SERVICE_NAME"

echo ""
echo "🎉 Service installation completed!"
echo ""
echo "📋 Service Information:"
echo "   Name: $SERVICE_NAME"
echo "   Status: $(systemctl is-enabled $SERVICE_NAME)"
echo "   File: $SERVICE_PATH"
echo ""
echo "🚀 Useful Commands:"
echo "   sudo systemctl start $SERVICE_NAME     # Start the service"
echo "   sudo systemctl stop $SERVICE_NAME      # Stop the service"
echo "   sudo systemctl restart $SERVICE_NAME   # Restart the service"
echo "   sudo systemctl status $SERVICE_NAME    # Check service status"
echo "   sudo journalctl -u $SERVICE_NAME -f    # View service logs"
echo ""
echo "🔧 To start the service now, run:"
echo "   sudo systemctl start $SERVICE_NAME"
echo ""
echo "✅ The service will automatically start on boot!" 