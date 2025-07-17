#!/bin/bash

# Questa Web Interface Startup Script
# Automatically handles IP changes and starts PM2 with correct configuration

set -e

echo "🚀 Starting Questa Web Interface..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to get local IP address
get_local_ip() {
    # Try to get IP from primary network interface
    local ip=$(ip route get 1.1.1.1 | awk '{print $7}' | head -n1)
    
    if [ -z "$ip" ] || [ "$ip" = "dev" ]; then
        # Fallback to hostname -I
        ip=$(hostname -I | awk '{print $1}')
    fi
    
    if [ -z "$ip" ]; then
        echo "localhost"
    else
        echo "$ip"
    fi
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to find available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while ! check_port $port; do
        echo "⚠️  Port $port is in use, trying next port..."
        port=$((port + 1))
        if [ $port -gt $((start_port + 100)) ]; then
            echo "❌ Could not find available port starting from $start_port"
            exit 1
        fi
    done
    
    echo $port
}

# Get current IP
CURRENT_IP=$(get_local_ip)
echo "📍 Detected IP: $CURRENT_IP"

# Check and find available ports
BACKEND_PORT=$(find_available_port 3001)
FRONTEND_PORT=$(find_available_port 3000)

echo "🔌 Backend Port: $BACKEND_PORT"
echo "🔌 Frontend Port: $FRONTEND_PORT"

# Export environment variables
export HOST_IP="$CURRENT_IP"
export BACKEND_PORT="$BACKEND_PORT"
export FRONTEND_PORT="$FRONTEND_PORT"
export NODE_ENV="${NODE_ENV:-development}"

echo "⚙️  Environment Configuration:"
echo "   HOST_IP: $HOST_IP"
echo "   BACKEND_PORT: $BACKEND_PORT"
echo "   FRONTEND_PORT: $FRONTEND_PORT"
echo "   NODE_ENV: $NODE_ENV"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Stop existing processes if running
echo "🛑 Stopping existing PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start the applications
echo "▶️  Starting Questa Web Interface with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (optional)
if [ "$1" = "--setup-startup" ]; then
    echo "🔧 Setting up PM2 startup script..."
    pm2 startup
    echo "✅ PM2 startup script configured. Run 'pm2 save' after reboot."
fi

# Show status
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://$HOST_IP:$FRONTEND_PORT"
echo "   Backend API: http://$HOST_IP:$BACKEND_PORT"
echo ""
echo "📝 Useful Commands:"
echo "   pm2 logs -f          # View logs"
echo "   pm2 restart all      # Restart all apps"
echo "   pm2 stop all         # Stop all apps"
echo "   pm2 delete all       # Remove all apps"
echo ""
echo "✅ Questa Web Interface started successfully!" 