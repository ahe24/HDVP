# PM2 Setup for Questa Web Interface

This document explains how to use PM2 to manage the Questa Web Interface backend and frontend services.

## Quick Start

### 1. Initial Setup
```bash
# Install serve package (for production frontend)
npm install -g serve

# Build backend
cd backend && npm run build && cd ..

# Build frontend (for production)
cd frontend && npm run build && cd ..
```

### 2. Using the Script (Recommended)
```bash
# Setup everything
./pm2-scripts.sh setup

# Start development environment (backend + frontend dev server)
./pm2-scripts.sh start-dev

# Start production environment (backend + frontend prod server)
./pm2-scripts.sh start-prod

# Check status
./pm2-scripts.sh status

# View logs
./pm2-scripts.sh logs

# Stop all services
./pm2-scripts.sh stop
```

## Manual PM2 Commands

### Start Services

**Development Environment:**
```bash
# Start both backend and frontend in development mode
pm2 start ecosystem.config.js --only questa-backend,questa-frontend-dev

# Or start individually
pm2 start backend/ecosystem.config.js
pm2 start frontend/ecosystem.config.js --only questa-frontend-dev
```

**Production Environment:**
```bash
# Start backend and frontend in production mode
pm2 start ecosystem.config.js --only questa-backend,questa-frontend-prod --env production

# Or start all services
pm2 start ecosystem.config.js --env production
```

### Manage Services

```bash
# Check status
pm2 status

# View logs (all services)
pm2 logs

# View logs for specific service
pm2 logs questa-backend
pm2 logs questa-frontend-dev

# Restart services
pm2 restart questa-backend
pm2 restart all

# Stop services
pm2 stop questa-backend
pm2 stop all

# Delete processes
pm2 delete all
```

### Monitoring

```bash
# Real-time monitoring dashboard
pm2 monit

# Process list with resource usage
pm2 list
```

## Service Configuration

### Backend (Port 3001)
- **Development**: Uses `dist/index.js` (requires `npm run build`)
- **Production**: Same as development but with production environment variables
- **Auto-restart**: Yes, with memory limit of 1GB
- **Logs**: `backend/logs/backend-*.log`

### Frontend Development (Port 3000)
- **Script**: `npm start` (React development server)
- **Environment**: Development
- **Auto-restart**: Yes, with memory limit of 1GB
- **Browser**: Disabled (BROWSER=none)

### Frontend Production (Port 3000)
- **Script**: `npx serve -s build -l 3000`
- **Environment**: Production
- **Requirements**: Must run `npm run build` first
- **Auto-restart**: Yes, with memory limit of 512MB

## Port Configuration

Based on workspace rules:
- **Backend**: Port 3001
- **Frontend**: Port 3000

## Log Files

All logs are stored with timestamps:
- Backend logs: `backend/logs/`
- Frontend logs: `frontend/logs/`
- Combined logs available for each service

## Troubleshooting

### Backend won't start
1. Ensure TypeScript is compiled: `cd backend && npm run build`
2. Check if port 3001 is available: `lsof -i :3001`
3. Check logs: `pm2 logs questa-backend`

### Frontend won't start (production)
1. Ensure build exists: `cd frontend && npm run build`
2. Install serve globally: `npm install -g serve`
3. Check if port 3000 is available: `lsof -i :3000`

### General Issues
1. Check PM2 status: `pm2 status`
2. View all logs: `pm2 logs`
3. Restart services: `pm2 restart all`
4. Check system resources: `pm2 monit`

## Development Workflow

1. **Initial setup**: `./pm2-scripts.sh setup`
2. **Daily development**: `./pm2-scripts.sh start-dev`
3. **Code changes in backend**: `./pm2-scripts.sh rebuild-backend`
4. **Code changes in frontend**: Frontend dev server auto-reloads
5. **Production testing**: `./pm2-scripts.sh start-prod`

## Production Deployment

1. Build both services:
   ```bash
   cd backend && npm run build && cd ..
   cd frontend && npm run build && cd ..
   ```
2. Start production services:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```
3. Save PM2 configuration:
   ```bash
   pm2 save
   pm2 startup
   ```
4. Monitor: `pm2 monit` 