import fs from 'fs/promises';
import path from 'path';
import { Job } from '../types';
import { config } from '../config/app';
import { apiLogger } from '../services/logger';

/**
 * Load existing jobs from filesystem into memory
 */
export async function loadExistingJobs(): Promise<Map<string, Job>> {
  const jobs = new Map<string, Job>();
  
  try {
    const jobsDir = config.workspace.jobs;
    
    // Check if jobs directory exists
    try {
      await fs.access(jobsDir);
    } catch {
      apiLogger.warn('Jobs directory does not exist', { jobsDir });
      return jobs;
    }

    // Read job directories
    const entries = await fs.readdir(jobsDir, { withFileTypes: true });
    const jobDirs = entries.filter(entry => entry.isDirectory());

    for (const jobDir of jobDirs) {
      try {
        const jobId = jobDir.name;
        const jobPath = path.join(jobsDir, jobId);
        
        // Try to load job metadata
        const job = await loadJobFromDirectory(jobId, jobPath);
        if (job) {
          jobs.set(jobId, job);
          apiLogger.info('Loaded existing job', { jobId, type: job.type, status: job.status });
        }
      } catch (error) {
        apiLogger.warn('Failed to load job', { jobId: jobDir.name, error });
      }
    }

    apiLogger.info('Finished loading existing jobs', { count: jobs.size });
  } catch (error) {
    apiLogger.error('Failed to load existing jobs', error);
  }

  return jobs;
}

/**
 * Load a single job from its directory
 */
async function loadJobFromDirectory(jobId: string, jobPath: string): Promise<Job | null> {
  try {
    // Try to load job metadata
    const jobMetadataPath = path.join(jobPath, 'job_metadata.json');
    let jobMetadata = null;
    
    try {
      const metadataContent = await fs.readFile(jobMetadataPath, 'utf-8');
      jobMetadata = JSON.parse(metadataContent);
    } catch {
      // No job metadata file, try to reconstruct from directory structure
      return await reconstructJobFromDirectory(jobId, jobPath);
    }

    // Convert date strings back to Date objects
    const job: Job = {
      ...jobMetadata,
      createdAt: new Date(jobMetadata.createdAt),
      startedAt: jobMetadata.startedAt ? new Date(jobMetadata.startedAt) : undefined,
      completedAt: jobMetadata.completedAt ? new Date(jobMetadata.completedAt) : undefined,
    };

    return job;
  } catch (error) {
    apiLogger.error('Failed to load job from directory', error, { jobId, jobPath });
    return null;
  }
}

/**
 * Reconstruct job information from directory structure when no metadata exists
 */
async function reconstructJobFromDirectory(jobId: string, jobPath: string): Promise<Job | null> {
  try {
    // Get directory stats for creation time
    const stats = await fs.stat(jobPath);
    
    // Try to determine job type from log files
    let jobType: 'simulation' | 'formal' = 'simulation';
    let status: Job['status'] = 'completed';
    
    try {
      // Check if it's a formal verification job
      const lintResultDir = path.join(jobPath, 'run', 'Lint_result');
      await fs.access(lintResultDir);
      jobType = 'formal';
    } catch {
      // Default to simulation
      jobType = 'simulation';
    }

    // Try to determine completion status from log files
    try {
      const runDir = path.join(jobPath, 'run');
      const files = await fs.readdir(runDir);
      
      // Check for error indicators
      if (files.some(f => f.includes('error') || f.includes('failed'))) {
        status = 'failed';
      } else if (files.length > 0) {
        status = 'completed';
      }
    } catch {
      status = 'completed';
    }

    // Try to extract project ID from filelist or metadata
    let projectId = 'unknown';
    try {
      const metadataPath = path.join(jobPath, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      // This is project metadata, so we'll use a generic project ID
      projectId = 'reconstructed-project';
    } catch {
      // Use a generic project ID
      projectId = 'unknown-project';
    }

    // Create a reconstructed job
    const job: Job = {
      id: jobId,
      projectId,
      type: jobType,
      status,
      config: {
        dutTop: 'unknown',
        includeDirectories: ['./src', './tb', './include'],
      },
      createdAt: stats.birthtime,
      completedAt: status === 'completed' || status === 'failed' ? stats.mtime : undefined,
    };

    // Save the reconstructed job metadata for future loads
    await saveJobMetadata(jobPath, job);
    
    return job;
  } catch (error) {
    apiLogger.error('Failed to reconstruct job from directory', error, { jobId, jobPath });
    return null;
  }
}

/**
 * Save job metadata to disk
 */
export async function saveJobMetadata(jobPath: string, job: Job): Promise<void> {
  try {
    const jobMetadataPath = path.join(jobPath, 'job_metadata.json');
    const metadata = {
      id: job.id,
      projectId: job.projectId,
      type: job.type,
      status: job.status,
      config: job.config,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      logs: job.logs,
      results: job.results,
      error: job.error,
      version: '1.0.0'
    };
    
    await fs.writeFile(jobMetadataPath, JSON.stringify(metadata, null, 2));
    apiLogger.info('Saved job metadata', { jobId: job.id });
  } catch (error) {
    apiLogger.warn('Failed to save job metadata', { jobId: job.id, error });
  }
} 