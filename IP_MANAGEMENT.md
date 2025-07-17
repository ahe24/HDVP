# 🌐 IP Management & Automatic Startup Guide

This guide explains how to handle IP address changes in DHCP environments and set up automatic startup for the Questa Web Interface.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [IP Change Solutions](#ip-change-solutions)
3. [Automatic Startup](#automatic-startup)
4. [Configuration Options](#configuration-options)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Method 1: Automatic IP Detection (Recommended)
```bash
# Start with automatic IP detection
./scripts/start-questa.sh

# Setup automatic startup on boot
sudo ./scripts/install-service.sh
```

### Method 2: Manual IP Configuration
```bash
# Set your specific IP
export HOST_IP=192.168.10.128
export BACKEND_PORT=3001
export FRONTEND_PORT=3000

# Start PM2
pm2 start ecosystem.config.js
```

---

## 🔧 IP Change Solutions

### 1. **Environment-Based Configuration** ✅
The updated `ecosystem.config.js` automatically detects your IP address and configures PM2 accordingly.

**Features:**
- ✅ Automatic IP detection
- ✅ Environment variable support
- ✅ Port availability checking
- ✅ Dynamic configuration

**Usage:**
```bash
# Automatic detection
pm2 start ecosystem.config.js

# Manual IP override
HOST_IP=192.168.10.128 pm2 start ecosystem.config.js
```

### 2. **Startup Script** ✅
The `start-questa.sh` script handles everything automatically.

**Features:**
- ✅ IP detection and validation
- ✅ Port availability checking
- ✅ PM2 installation check
- ✅ Automatic restart on IP change

**Usage:**
```bash
# Basic startup
./scripts/start-questa.sh

# Setup automatic startup
./scripts/start-questa.sh --setup-startup
```

### 3. **IP Change Monitor** ✅
The `monitor-ip.sh` script continuously monitors for IP changes.

**Features:**
- ✅ Real-time IP monitoring
- ✅ Automatic PM2 restart on IP change
- ✅ Detailed logging
- ✅ Configurable check intervals

**Usage:**
```bash
# Start monitoring (runs in background)
./scripts/monitor-ip.sh &

# View logs
tail -f logs/ip-monitor.log
```

---

## 🔄 Automatic Startup

### 1. **Systemd Service** (Recommended)
Install as a system service that starts on boot.

**Installation:**
```bash
sudo ./scripts/install-service.sh
```

**Management:**
```bash
# Start service
sudo systemctl start questa-web

# Stop service
sudo systemctl stop questa-web

# Check status
sudo systemctl status questa-web

# View logs
sudo journalctl -u questa-web -f

# Enable/disable auto-start
sudo systemctl enable questa-web
sudo systemctl disable questa-web
```

### 2. **PM2 Startup**
Use PM2's built-in startup functionality.

**Setup:**
```bash
# Generate startup script
pm2 startup

# Save current PM2 configuration
pm2 save

# Start PM2 on boot
pm2 resurrect
```

---

## ⚙️ Configuration Options

### Environment Variables

Create a `.env` file in the project root:

```bash
# Network Configuration
HOST_IP=192.168.10.128
BACKEND_PORT=3001
FRONTEND_PORT=3000

# Environment
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

### Configuration Priority

1. **Environment variables** (highest priority)
2. **Automatic detection** (fallback)
3. **Default values** (lowest priority)

### Port Management

The system automatically finds available ports if the default ports are in use:

- **Backend:** Starts at 3001, increments if busy
- **Frontend:** Starts at 3000, increments if busy
- **Maximum search:** Up to 100 ports from start

---

## 🔍 Troubleshooting

### Common Issues

#### 1. **IP Detection Fails**
```bash
# Check network interfaces
ip addr show

# Manual IP override
export HOST_IP=$(hostname -I | awk '{print $1}')
```

#### 2. **Port Already in Use**
```bash
# Check what's using the port
sudo lsof -i :3001
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>
```

#### 3. **PM2 Not Starting**
```bash
# Check PM2 installation
npm list -g pm2

# Reinstall PM2
npm install -g pm2

# Clear PM2 cache
pm2 kill
pm2 cleardump
```

#### 4. **Service Not Starting**
```bash
# Check service status
sudo systemctl status questa-web

# View service logs
sudo journalctl -u questa-web -f

# Check service file
sudo systemctl cat questa-web
```

### Log Files

- **PM2 Logs:** `logs/backend-*.log`, `logs/frontend-*.log`
- **IP Monitor:** `logs/ip-monitor.log`
- **System Service:** `sudo journalctl -u questa-web`

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=debug
pm2 start ecosystem.config.js
```

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check all services
pm2 status
pm2 logs

# Check system service
sudo systemctl status questa-web

# Check IP monitor
tail -f logs/ip-monitor.log
```

### Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
df -h
free -h
```

### Backup & Recovery

```bash
# Backup PM2 configuration
pm2 save

# Backup service configuration
sudo cp /etc/systemd/system/questa-web.service /backup/

# Restore from backup
pm2 resurrect
```

---

## 🎯 Best Practices

### 1. **Use Static IP** (if possible)
Configure your DHCP server to assign a static IP to your server's MAC address.

### 2. **Monitor Logs Regularly**
Set up log rotation and monitoring for early issue detection.

### 3. **Test IP Changes**
Periodically test IP change scenarios to ensure automatic recovery works.

### 4. **Document Your Setup**
Keep notes of your specific network configuration and any customizations.

### 5. **Regular Updates**
Keep PM2 and system packages updated for security and stability.

---

## 🆘 Support

If you encounter issues:

1. **Check logs** in the `logs/` directory
2. **Verify network** configuration
3. **Test with manual startup** first
4. **Review this documentation**
5. **Check system resources** (CPU, memory, disk)

For additional help, refer to the main project documentation or create an issue in the project repository. 