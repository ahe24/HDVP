import io, { Socket } from 'socket.io-client';
import { JobProgress } from '../types';
import { WS_BASE_URL } from '../config/api';

export type WebSocketEventHandlers = {
  jobProgress: (data: JobProgress) => void;
  jobCompleted: (data: any) => void;
  jobStatus: (data: any) => void;
  jobLogs: (data: any) => void;
  licenseStatusChanged: (data: any) => void;
  systemStatusChanged: (data: any) => void;
  connect: () => void;
  disconnect: () => void;
  error: (error: any) => void;
};

class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Partial<WebSocketEventHandlers> = {};

  constructor() {
    this.connect();
  }

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_BASE_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Connected to QuestaSim WebSocket');
      this.eventHandlers.connect?.();
    });

    this.socket.on('disconnect', () => {
      console.log('📡 Disconnected from QuestaSim WebSocket');
      this.eventHandlers.disconnect?.();
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket Error:', error);
      this.eventHandlers.error?.(error);
    });

    this.socket.on('job-progress', (data: JobProgress) => {
      this.eventHandlers.jobProgress?.(data);
    });

    this.socket.on('job-status', (data: any) => {
      this.eventHandlers.jobStatus?.(data);
      if (data.status === 'completed' || data.status === 'failed') {
        this.eventHandlers.jobCompleted?.(data);
      }
    });

    this.socket.on('job-logs', (data: any) => {
      this.eventHandlers.jobLogs?.(data);
    });

    this.socket.on('license-status-changed', (data: any) => {
      this.eventHandlers.licenseStatusChanged?.(data);
    });

    this.socket.on('system-status-changed', (data: any) => {
      this.eventHandlers.systemStatusChanged?.(data);
    });

    // Handle additional backend events
    this.socket.on('license-status', (data: any) => {
      this.eventHandlers.licenseStatusChanged?.(data);
    });

    this.socket.on('queue-update', (data: any) => {
      // Queue updates can be handled by components that need them
      console.log('📊 Queue update:', data);
    });
  }

  on<K extends keyof WebSocketEventHandlers>(
    event: K,
    handler: WebSocketEventHandlers[K]
  ): void {
    this.eventHandlers[event] = handler;
  }

  off(event: keyof WebSocketEventHandlers): void {
    delete this.eventHandlers[event];
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Join project room for project-specific updates
  joinProject(projectId: string): void {
    this.emit('joinProject', { projectId });
  }

  // Leave project room
  leaveProject(projectId: string): void {
    this.emit('leaveProject', { projectId });
  }

  // Subscribe to job updates
  subscribeToJob(jobId: string): void {
    this.emit('subscribe-job', jobId);
  }

  // Unsubscribe from job updates
  unsubscribeFromJob(jobId: string): void {
    this.emit('unsubscribe-job', jobId);
  }
}

export const websocketService = new WebSocketService();
export default websocketService; 