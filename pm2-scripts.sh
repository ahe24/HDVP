#!/bin/bash

# Questa Web Interface PM2 Management Scripts
# Usage: ./pm2-scripts.sh [command]

case "$1" in
  "setup")
    echo "Setting up PM2 for Questa Web Interface..."
    
    # Install serve package globally for production frontend
    npm install -g serve
    
    # Build backend
    echo "Building backend..."
    cd backend && npm run build && cd ..
    
    # Build frontend for production (optional)
    echo "Building frontend for production..."
    cd frontend && npm run build && cd ..
    
    echo "Setup complete!"
    ;;
    
  "start-dev")
    echo "Starting development environment..."
    pm2 start ecosystem.config.js --only questa-backend,questa-frontend-dev
    ;;
    
  "start-prod")
    echo "Starting production environment..."
    pm2 start ecosystem.config.js --only questa-backend,questa-frontend-prod --env production
    ;;
    
  "start-all")
    echo "Starting all services..."
    pm2 start ecosystem.config.js
    ;;
    
  "stop")
    echo "Stopping all services..."
    pm2 stop ecosystem.config.js
    ;;
    
  "restart")
    echo "Restarting all services..."
    pm2 restart ecosystem.config.js
    ;;
    
  "logs")
    echo "Showing logs..."
    pm2 logs
    ;;
    
  "status")
    echo "Service status:"
    pm2 status
    ;;
    
  "monitor")
    echo "Opening PM2 monitor..."
    pm2 monit
    ;;
    
  "delete")
    echo "Deleting all PM2 processes..."
    pm2 delete ecosystem.config.js
    ;;
    
  "rebuild-backend")
    echo "Rebuilding backend..."
    cd backend
    npm run build
    cd ..
    pm2 restart questa-backend
    ;;
    
  "rebuild-frontend")
    echo "Rebuilding frontend..."
    cd frontend
    npm run build
    cd ..
    pm2 restart questa-frontend-prod
    ;;
    
  *)
    echo "Usage: $0 {setup|start-dev|start-prod|start-all|stop|restart|logs|status|monitor|delete|rebuild-backend|rebuild-frontend}"
    echo ""
    echo "Commands:"
    echo "  setup           - Install dependencies and build projects"
    echo "  start-dev       - Start backend + frontend development server"
    echo "  start-prod      - Start backend + frontend production server"
    echo "  start-all       - Start all services (dev and prod)"
    echo "  stop            - Stop all services"
    echo "  restart         - Restart all services"
    echo "  logs            - Show logs from all services"
    echo "  status          - Show status of all services"
    echo "  monitor         - Open PM2 monitoring interface"
    echo "  delete          - Delete all PM2 processes"
    echo "  rebuild-backend - Rebuild and restart backend"
    echo "  rebuild-frontend- Rebuild and restart frontend production"
    ;;
esac 