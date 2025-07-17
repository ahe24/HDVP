# Scripts Directory

This directory contains the essential scripts for managing the Questa Web Interface server.

## 📋 Available Scripts

### 🚀 **start-questa.sh**
**Purpose**: Main startup script for the Questa Web Interface  
**Usage**: `./scripts/start-questa.sh [--setup-startup]`  
**Features**:
- Automatic IP detection for DHCP environments
- Port availability checking (finds alternative ports if default ones are busy)
- PM2 process management
- Environment variable configuration
- Optional PM2 startup script setup

**Example**:
```bash
# Basic startup
./scripts/start-questa.sh

# Setup PM2 startup for boot
./scripts/start-questa.sh --setup-startup
```

---

### ⚙️ **install-service.sh**
**Purpose**: Installs systemd service for automatic startup on boot  
**Usage**: `sudo ./scripts/install-service.sh`  
**Features**:
- Creates systemd service configuration
- Automatically updates paths for current user/directory
- Enables service for boot startup
- Provides management commands

**Example**:
```bash
# Install as system service
sudo ./scripts/install-service.sh

# Manage the service
sudo systemctl start questa-web
sudo systemctl status questa-web
sudo journalctl -u questa-web -f
```

---

### 🔧 **pm2-scripts.sh**
**Purpose**: Convenient PM2 management wrapper  
**Usage**: `./scripts/pm2-scripts.sh [command]`  
**Commands**:
- `setup` - Install dependencies and build projects
- `start-dev` - Start development environment
- `start-prod` - Start production environment  
- `stop` - Stop all services
- `restart` - Restart all services
- `logs` - View service logs
- `status` - Check service status
- `monitor` - Open PM2 monitoring

**Example**:
```bash
# Setup and start development
./scripts/pm2-scripts.sh setup
./scripts/pm2-scripts.sh start-dev

# View logs and status
./scripts/pm2-scripts.sh logs
./scripts/pm2-scripts.sh status
```

---

### 📝 **generate_filelist.py**
**Purpose**: Utility for generating filelist.f from project structure  
**Usage**: `python3 scripts/generate_filelist.py <project_path> <job_path>`  
**Features**:
- Scans project directories (src/, tb/, include/)
- Generates filelist.f with proper file ordering
- Creates compile_options.txt with include directories
- Generates project metadata JSON

**Example**:
```bash
# Generate filelist for a project
python3 scripts/generate_filelist.py /path/to/project /path/to/job
```

---

### 📄 **questa-web.service**
**Purpose**: Systemd service configuration file  
**Usage**: Used by `install-service.sh`  
**Features**:
- Automatic restart on failure
- Proper network dependencies
- Security settings
- Logging configuration

## 🔧 Configuration Files

The scripts work with these main configuration files:

- **`ecosystem.config.js`** (root) - Main PM2 configuration for both backend and frontend
- **`.questa-config.json`** - Auto-generated configuration cache for IP/port settings
- **`frontend/.env`** - Auto-generated frontend environment variables
- **`backend/.env`** - Auto-generated backend environment variables

## 🚀 Quick Start

### Option 1: Manual Startup
```bash
# Start services with automatic configuration
./scripts/start-questa.sh
```

### Option 2: System Service (Recommended for production)
```bash
# Install as system service
sudo ./scripts/install-service.sh

# Start the service
sudo systemctl start questa-web

# Enable auto-start on boot
sudo systemctl enable questa-web
```

### Option 3: Development Mode
```bash
# Setup and start development environment
./scripts/pm2-scripts.sh setup
./scripts/pm2-scripts.sh start-dev
```

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts**: The startup script automatically finds available ports
2. **IP changes**: Restart the service or run startup script again
3. **PM2 issues**: Use `pm2 kill` and restart with the scripts
4. **Permission issues**: Ensure scripts are executable with `chmod +x scripts/*.sh`

### Useful Commands

```bash
# Check what's running
pm2 status
pm2 logs

# Manual restart
pm2 restart all

# Service management
sudo systemctl status questa-web
sudo journalctl -u questa-web -f

# Check ports
sudo lsof -i :3000
sudo lsof -i :3001
```

## 📚 Related Documentation

- **`PM2_SETUP.md`** - Detailed PM2 configuration guide
- **`IP_MANAGEMENT.md`** - IP address management and DHCP handling
- **`IP_CHANGE_SOLUTIONS.md`** - Solutions for IP change scenarios 