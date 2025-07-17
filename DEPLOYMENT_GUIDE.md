# Questa Web Interface - Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Questa Web Interface to a new server PC, including database migration, workspace files transfer, and configuration updates for different QuestaSim installations and license servers.

## Prerequisites

### Target Server Requirements
- **Operating System**: Linux (Rocky Linux 9commended, but any Linux distribution works)
- **Node.js**: Version 18x or higher
- **PM2**: For process management
- **QuestaSim**: Installed and configured
- **Network Access**: Ports 300(frontend) and 3001 (backend) accessible

### Required Software
```bash
# Install Node.js 18.x
sudo dnf module install nodejs:18/common -y  # Rocky Linux/CentOS
# OR
curl -fsSL https://deb.nodesource.com/setup_18x | sudo -E bash -  # Ubuntu/Debian
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
# Install Git (if not already installed)
sudo dnf install git -y  # Rocky Linux/CentOS
# OR
sudo apt-get install git -y  # Ubuntu/Debian
```

## Step 1: Transfer Application Files

### Option A: Git Clone (Recommended)
```bash
# On target server
cd /opt
sudo git clone https://github.com/ahe24DVP.git questa-web-interface
sudo chown -R $USER:$USER questa-web-interface
cd questa-web-interface
```

### Option B: Direct File Transfer
```bash
# From source server, create a backup
tar -czf questa-web-interface-backup.tar.gz \
  --exclude=node_modules \
  --exclude=workspace \
  --exclude=logs \
  --exclude=.env \
  .

# Transfer to target server
scp questa-web-interface-backup.tar.gz user@target-server:/opt/
ssh user@target-server
cd /opt
tar -xzf questa-web-interface-backup.tar.gz
mv questa-web-interface-backup questa-web-interface
```

### Option C: Download from GitHub Release
```bash
# Download latest release from GitHub
cd /opt
wget https://github.com/ahe24/HDVP/archive/refs/heads/main.zip
unzip main.zip
mv HDVP-main questa-web-interface
cd questa-web-interface
```

## Step2Transfer Workspace Data

### Workspace Transfer (Projects and Jobs)
```bash
# On source server - backup workspace
tar -czf workspace-backup.tar.gz workspace/

# Transfer to target server
scp workspace-backup.tar.gz user@target-server:/opt/questa-web-interface/
ssh user@target-server
cd /opt/questa-web-interface
tar -xzf workspace-backup.tar.gz
rm workspace-backup.tar.gz
```

### Database Note
The application uses SQLite database that will be created automatically on first run:
- **Source**: No existing database file to transfer
- **Target**: Database will be created at `backend/data/questasim.db` when application starts
- **Data**: All project and job data is stored in the `workspace/` directory structure

## Step 3: Configure Environment Variables

### Option A: Use Deployment Configuration Script (Recommended)
```bash
cd /opt/questa-web-interface

# Make the script executable
chmod +x scripts/deploy-config.sh

# Run the interactive configuration script
./scripts/deploy-config.sh
```

This script will:
- Automatically detect QuestaSim installation paths
- Prompt for network configuration (IP, ports)
- Configure license server settings
- Test QuestaSim tools and license connectivity
- Create a properly formatted `.env` file

### Option B: Manual Configuration
```bash
cd /opt/questa-web-interface
cp env.example .env
```

### Update QuestaSim Paths
Edit `.env` file and update the QuestaSim paths according to your installation:

```bash
# Find your QuestaSim installation
find /opt -name vlog2dev/null
find /opt -name "qverify" 2>/dev/null

# Example paths for different QuestaSim versions:
# QuestaSim2024.3urrent)
QUESTA_MODELTECH_PATH=/opt/QOSF_2024.3questa_static_formal/linux_x86_64/modeltech/linux_x86_64QUESTA_VLOG_PATH=/opt/QOSF_2024.3questa_static_formal/linux_x86_64/modeltech/linux_x864g
QUESTA_VOPT_PATH=/opt/QOSF_2024.3questa_static_formal/linux_x86_64/modeltech/linux_x864t
QUESTA_VSIM_PATH=/opt/QOSF_2024.3questa_static_formal/linux_x86_64/modeltech/linux_x86vsim
QUESTA_FORMAL_PATH=/opt/QOSF_2024.3questa_static_formal/linux_x8664bin
QUESTA_QVERIFY_PATH=/opt/QOSF_2024.3questa_static_formal/linux_x86_64/bin/qverify

# QuestaSim 2230.4ternative)
# QUESTA_MODELTECH_PATH=/opt/questa/20230.4/questasim/linux_x86# QUESTA_VLOG_PATH=/opt/questa/20230.4/questasim/linux_x8664vlog
# QUESTA_VOPT_PATH=/opt/questa/20230.4/questasim/linux_x8664vopt
# QUESTA_VSIM_PATH=/opt/questa/20230.4/questasim/linux_x8664im
# QUESTA_FORMAL_PATH=/opt/questa/2234/formal/linux_x86_64/bin
# QUESTA_QVERIFY_PATH=/opt/questa/2234/formal/linux_x86/bin/qverify
```

### Update License Configuration
```bash
# Update license server settings in .env
# Replace with your actual license server
LICENSE_SERVER=29000our-license-server
SALT_LICENSE_SERVER=29000our-license-server

# Examples:
# LICENSE_SERVER=2900@192168.1100ALT_LICENSE_SERVER=2900192.168100R
# LICENSE_SERVER=2900icense.company.com
# SALT_LICENSE_SERVER=2900icense.company.com
```

### Update Network Configuration
```bash
# Update IP and ports in .env
HOST_IP=1920.168200Your target server IP
BACKEND_PORT=31
FRONTEND_PORT=300## Step 4: Install Dependencies

```bash
cd /opt/questa-web-interface

# Install backend dependencies
cd backend
npm install
npm run build

# Install frontend dependencies
cd ../frontend
npm install

# Return to root directory
cd ..
```

## Step 5: Verify QuestaSim Configuration

### Test QuestaSim Installation
```bash
# Test QuestaSim tools
export QUESTA_MODELTECH_PATH=/opt/QOSF_2024.3questa_static_formal/linux_x86_64/modeltech/linux_x8664port QUESTA_FORMAL_PATH=/opt/QOSF_2024.3questa_static_formal/linux_x8664/bin
export SALT_LICENSE_SERVER=29000our-license-server

# Test vlog
$QUESTA_MODELTECH_PATH/vlog -version

# Test qverify
$QUESTA_FORMAL_PATH/qverify -version
```

### Test License Connection
```bash
# Test license availability
export PATH=$QUESTA_MODELTECH_PATH:$QUESTA_FORMAL_PATH:$PATH
vlog -version
qverify -version
```

## Step6tart Services with PM2

### Initial Setup
```bash
cd /opt/questa-web-interface

# Start services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2artup
# Follow the instructions provided by the command above
```

### Verify Services
```bash
# Check service status
pm2 status

# Check logs
pm2ogs questa-backend
pm2 logs questa-frontend

# Test web interface
curl http://localhost:3001/api/system/status
```

## Step7Configure Firewall

```bash
# Open required ports
sudo firewall-cmd --permanent --add-port=3000p  # Frontend
sudo firewall-cmd --permanent --add-port=301cp  # Backend
sudo firewall-cmd --reload

# For Ubuntu/Debian
sudo ufw allow3000tcp
sudo ufw allow 3001/tcp
```

## Step 8 Test Deployment

### Access Web Interface
- Frontend: `http://your-server-ip:300`
- Backend API: `http://your-server-ip:3001`

### Verify Functionality
1. **Project Management**: Create a new project
2. **File Upload**: Upload Verilog files
3*Simulation**: Run a test simulation
4**License Check**: Verify license availability in system status

## Troubleshooting

### Common Issues

####1QuestaSim Path Not Found
```bash
# Check if paths exist
ls -la $QUESTA_MODELTECH_PATH/vlog
ls -la $QUESTA_FORMAL_PATH/qverify

# Update paths in .env if different
```

#### 2. License Connection Failed
```bash
# Test license server connectivity
telnet your-license-server 29000

# Check environment variables
echo $SALT_LICENSE_SERVER
echo $PATH
```

#### 3. PM2 Services Not Starting
```bash
# Check PM2s
pm2 logs

# Restart services
pm2 restart all

# Check if ports are in use
netstat -tlnp | grep :300
```

#### 4. Database Issues
```bash
# Check if database directory exists
ls -la backend/data/

# Create database directory if missing
mkdir -p backend/data

# Check database file permissions (if exists)
ls -la backend/data/questasim.db

# Recreate database if corrupted (if exists)
rm backend/data/questasim.db
# Database will be recreated on next application start
```

### Log Locations
- **PM2 Logs**: `pm2 logs`
- **Application Logs**: `backend/logs/` and `frontend/logs/`
- **System Logs**: `/var/log/messages` or `/var/log/syslog`

## Maintenance

### Regular Updates
```bash
# Update application
cd /opt/questa-web-interface
git pull origin main

# Rebuild and restart
cd backend && npm run build
cd ..
pm2 restart all
```

### Backup Strategy
```bash
# Create backup script
cat > backup-questa.sh << EOF#!/bin/bash
BACKUP_DIR="/backup/questa-web-interface
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database (if exists)
if [ -f /opt/questa-web-interface/backend/data/questasim.db ]; then
    cp /opt/questa-web-interface/backend/data/questasim.db $BACKUP_DIR/questasim_$DATE.db
fi

# Backup workspace
tar -czf $BACKUP_DIR/workspace_$DATE.tar.gz -C /opt/questa-web-interface workspace/

# Keep only last 7ys of backups
find $BACKUP_DIR -name *.db -mtime +7 -delete
find $BACKUP_DIR -name*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup-questa.sh

# Add to crontab for daily backup
echo "0 2 * * * /opt/questa-web-interface/backup-questa.sh" | crontab -
```

## Security Considerations

### Environment Security
- Change default session secret in production
- Use HTTPS in production environments
- Restrict network access to required ports only
- Regular security updates

### File Permissions
```bash
# Set proper permissions
chmod 644esta-web-interface/.env
chmod -R 755esta-web-interface/workspace
chmod 644esta-web-interface/backend/data/questasim.db
```

## Support

For additional support or questions:
1. Check the application logs for error details
2. Verify QuestaSim installation and license configuration
3. Test network connectivity and firewall settings
4. Review this deployment guide for configuration steps

---

**Note**: This deployment guide assumes a Linux environment. For Windows deployment, additional configuration may be required for path separators and service management. 