import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { config } from '../config/app';
import { Job, LicenseStatus } from '../types';
import { licenseLogger, jobLogger } from './logger';

const execAsync = promisify(exec);

export class LicenseManager extends EventEmitter {
  private isLicenseAvailable: boolean = true;
  private jobQueue: Job[] = [];
  private currentJob: Job | null = null;
  private lastLicenseCheck: string | null = null;
  private licenseCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startLicenseMonitoring();
  }

  /**
   * Start periodic license monitoring
   */
  private startLicenseMonitoring(): void {
    // Check license based on configured interval (default 60 seconds)
    this.licenseCheckInterval = setInterval(async () => {
      await this.checkLicense();
    }, config.license.checkInterval);

    // Initial license check
    this.checkLicense();
  }

  /**
   * Check if QuestaSim and Questa Formal licenses are available
   */
  async checkLicense(): Promise<LicenseStatus> {
    try {
      console.log('🔍 Starting license check...');
      const env = {
        ...process.env,
        SALT_LICENSE_SERVER: config.license.saltLicenseServer,
        PATH: `${config.tools.questaSim.modeltech}:${config.tools.questaFormal.bin}:${process.env.PATH}`
      };

      console.log('🔧 Environment configured:', {
        SALT_LICENSE_SERVER: env.SALT_LICENSE_SERVER,
        vlogPath: config.tools.questaSim.vlog,
        qverifyPath: config.tools.questaFormal.qverify
      });

      // Test QuestaSim license
      console.log('🧪 Testing QuestaSim license...');
      const vlogTest = execAsync(`${config.tools.questaSim.vlog} -version`, { 
        env, 
        timeout: 30000 
      });

      // Test Questa Formal license  
      console.log('🧪 Testing Questa Formal license...');
      const qverifyTest = execAsync(`${config.tools.questaFormal.qverify} -version`, { 
        env, 
        timeout: 30000 
      });

      await Promise.all([vlogTest, qverifyTest]);
      console.log('✅ Both license tests passed!');

          const status: LicenseStatus = {
      available: true,
      checkedAt: new Date().toISOString()
    };
    
    this.lastLicenseCheck = status.checkedAt;
      this.emit('license-status', status);
      
      licenseLogger.logLicense('available', { checkedAt: status.checkedAt });
      return status;
    } catch (error) {
      console.error('❌ License check failed:', error);
      licenseLogger.error('License check failed', error);
      
      const status: LicenseStatus = {
        available: false,
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown license error'
      };

      this.lastLicenseCheck = status.checkedAt;
      this.emit('license-status', status);
      
      return status;
    }
  }

  /**
   * Add a job to the queue
   */
  async queueJob(job: Job): Promise<void> {
    console.log(`🔄 Queuing job ${job.id} (${job.type})`);
    jobLogger.logJob(job.id, 'queuing', { type: job.type });

    // Check license availability
    console.log('📋 Checking license availability...');
    const licenseStatus = await this.checkLicense();
    console.log('📋 License status:', licenseStatus);
    
    if (licenseStatus.available && this.isLicenseAvailable && !this.currentJob) {
      // License is available, execute immediately
      console.log(`✅ License available, executing job ${job.id} immediately`);
      await this.executeJob(job);
    } else {
      // Add to queue
      console.log(`⏳ License not available (available: ${licenseStatus.available}, isLicenseAvailable: ${this.isLicenseAvailable}, currentJob: ${this.currentJob?.id || 'none'}). Adding to queue.`);
      this.jobQueue.push(job);
      jobLogger.logJob(job.id, 'queued', { 
        position: this.jobQueue.length,
        totalInQueue: this.jobQueue.length
      });
      
      // Emit queue update
      this.emit('queue-update', {
        jobId: job.id,
        position: this.jobQueue.length,
        totalJobs: this.jobQueue.length + (this.currentJob ? 1 : 0)
      });

      // Update job status to queued
      this.emit('job-status', {
        jobId: job.id,
        status: 'queued',
        message: `Queued at position ${this.jobQueue.length}`
      });
    }
  }

  /**
   * Execute a job
   */
  private async executeJob(job: Job): Promise<void> {
    try {
      console.log(`🚀 Starting execution of job ${job.id} (${job.type})`);
      this.isLicenseAvailable = false;
      this.currentJob = job;

      jobLogger.logJob(job.id, 'execution_started', { type: job.type });
      
      // Update job status to running
      console.log(`📡 Emitting job-status: running for job ${job.id}`);
      this.emit('job-status', {
        jobId: job.id,
        status: 'running',
        message: 'Job execution started'
      });

      // Give frontend time to process the 'running' status before starting execution
      setTimeout(() => {
        // Here we would trigger the actual Jenkins pipeline
        // For now, we'll emit the job execution event
        console.log(`📡 Emitting execute-job event for job ${job.id}`);
        this.emit('execute-job', job);
      }, 100); // 100ms delay to ensure frontend receives the 'running' status
      
    } catch (error) {
      console.error(`❌ Job execution failed for ${job.id}:`, error);
      jobLogger.error(`Job execution failed`, error, { jobId: job.id });
      
      this.emit('job-status', {
        jobId: job.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown execution error'
      });

      // Release license on failure
      await this.onJobComplete(job.id);
    }
  }

  /**
   * Called when a job completes (success or failure)
   */
  async onJobComplete(jobId: string): Promise<void> {
    jobLogger.logJob(jobId, 'completed', { licenseReleased: true });
    
    this.isLicenseAvailable = true;
    this.currentJob = null;

    // Process next job in queue
    if (this.jobQueue.length > 0) {
      const nextJob = this.jobQueue.shift()!;
      jobLogger.logJob(nextJob.id, 'processing_next', { previousJob: jobId });
      
      // Execute next job after a short delay
      setTimeout(async () => {
        await this.executeJob(nextJob);
      }, 1000);
    }

    // Emit queue update
    this.emit('queue-update', {
      totalJobs: this.jobQueue.length + (this.currentJob ? 1 : 0)
    });
  }

  /**
   * Cancel a job (remove from queue or stop execution)
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Check if job is in queue
    const queueIndex = this.jobQueue.findIndex(job => job.id === jobId);
    if (queueIndex !== -1) {
      this.jobQueue.splice(queueIndex, 1);
      jobLogger.logJob(jobId, 'cancelled_from_queue', { position: queueIndex + 1 });
      
      this.emit('job-status', {
        jobId,
        status: 'cancelled',
        message: 'Job cancelled by user'
      });

      return true;
    }

    // Check if it's the currently running job
    if (this.currentJob && this.currentJob.id === jobId) {
      jobLogger.logJob(jobId, 'cancelling_running_job');
      // Implementation for cancelling running job would go here
      return true;
    }

    jobLogger.warn('Job cancellation failed - job not found', { jobId });
    return false;
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return {
      currentJob: this.currentJob,
      queuedJobs: this.jobQueue.length,
      licenseAvailable: this.isLicenseAvailable,
      lastLicenseCheck: this.lastLicenseCheck
    };
  }

  /**
   * Get position of a job in queue
   */
  getJobQueuePosition(jobId: string): number {
    const index = this.jobQueue.findIndex(job => job.id === jobId);
    return index === -1 ? -1 : index + 1;
  }

  /**
   * Cleanup and stop monitoring
   */
  destroy(): void {
    if (this.licenseCheckInterval) {
      clearInterval(this.licenseCheckInterval);
      this.licenseCheckInterval = null;
    }
    this.removeAllListeners();
  }
}

// Singleton instance
export const licenseManager = new LicenseManager(); 