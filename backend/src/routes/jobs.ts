import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Job, JobCreateRequest, ApiResponse, VsimResultSummary } from '../types';
import { licenseManager } from '../services/LicenseManager';
import { validateId, validateProjectId } from '../middleware/validation';
import { apiLogger } from '../services/logger';
import { loadExistingJobs, saveJobMetadata } from '../utils/jobLoader';
import { config } from '../config/app';
import { VsimResultParser } from '../utils/vsimResultParser';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// In-memory jobs store (replace with database in production)
let jobs: Map<string, Job> = new Map();

// Initialize jobs from filesystem
let jobsInitialized = false;
async function initializeJobs(): Promise<void> {
  if (!jobsInitialized) {
    try {
      jobs = await loadExistingJobs();
      jobsInitialized = true;
      apiLogger.info('Jobs initialized from filesystem', { count: jobs.size });
    } catch (error) {
      apiLogger.error('Failed to initialize jobs', error);
    }
  }
}

// Export jobs map for external access
export { jobs };

// Get all jobs (with optional projectId filtering)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Initialize jobs from filesystem if not already done
    await initializeJobs();
    
    let jobList = Array.from(jobs.values());
    
    // Filter by projectId if provided
    const { projectId } = req.query;
    if (projectId && typeof projectId === 'string') {
      jobList = jobList.filter(job => job.projectId === projectId);
      apiLogger.info('Filtering jobs by projectId', { projectId, filteredCount: jobList.length });
    }
    
    jobList = jobList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const response: ApiResponse<Job[]> = {
      success: true,
      data: jobList
    };
    res.json(response);
  } catch (error: any) {
    apiLogger.error('Failed to list jobs', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to list jobs'
    };
    res.status(500).json(response);
  }
});

// Create new simulation job
router.post('/simulation/:projectId', validateProjectId, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { config: jobConfig } = req.body as JobCreateRequest;

    // Validation
    if (!jobConfig || !jobConfig.dutTop) {
      const response: ApiResponse = {
        success: false,
        error: 'Job configuration with dutTop is required'
      };
      return res.status(400).json(response);
    }

    // Create job
    const jobId = uuidv4();
    const job: Job = {
      id: jobId,
      projectId,
      type: 'simulation',
      status: 'pending',
      config: {
        ...jobConfig,
        includeDirectories: jobConfig.includeDirectories || ['./src', './tb', './include']
      },
      createdAt: new Date()
    };

    // Store job
    jobs.set(jobId, job);

    // Save job metadata to filesystem
    const jobPath = path.join(config.workspace.jobs, jobId);
    try {
      await saveJobMetadata(jobPath, job);
    } catch (error) {
      apiLogger.warn('Failed to save job metadata', { jobId, error });
    }

    // Queue job for execution
    console.log(`🔧 [ROUTE] About to queue job ${jobId} for execution`);
    try {
      await licenseManager.queueJob(job);
      console.log(`✅ [ROUTE] Job ${jobId} queued successfully`);
    } catch (queueError) {
      console.error(`❌ [ROUTE] Failed to queue job ${jobId}:`, queueError);
      throw queueError;
    }

    apiLogger.info('Simulation job created', { jobId, projectId });

    const response: ApiResponse<Job> = {
      success: true,
      data: job,
      message: 'Simulation job created and queued'
    };
    res.status(201).json(response);

  } catch (error: any) {
    apiLogger.error('Failed to create simulation job', error, { projectId: req.params.projectId });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create simulation job'
    };
    res.status(500).json(response);
  }
});

// Create new formal verification job
router.post('/formal/:projectId', validateProjectId, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { config: jobConfig } = req.body as JobCreateRequest;

    // Validation
    if (!jobConfig || !jobConfig.dutTop) {
      const response: ApiResponse = {
        success: false,
        error: 'Job configuration with dutTop is required'
      };
      return res.status(400).json(response);
    }

    // Create job
    const jobId = uuidv4();
    const job: Job = {
      id: jobId,
      projectId,
      type: 'formal',
      status: 'pending',
      config: {
        ...jobConfig,
        formalMode: jobConfig.formalMode || 'lint',
        includeDirectories: jobConfig.includeDirectories || ['./src', './tb', './include']
      },
      createdAt: new Date()
    };

    // Store job
    jobs.set(jobId, job);

    // Save job metadata to filesystem
    const jobPath = path.join(config.workspace.jobs, jobId);
    try {
      await saveJobMetadata(jobPath, job);
    } catch (error) {
      apiLogger.warn('Failed to save job metadata', { jobId, error });
    }

    // Queue job for execution
    console.log(`🔧 [ROUTE] About to queue job ${jobId} for execution`);
    try {
      await licenseManager.queueJob(job);
      console.log(`✅ [ROUTE] Job ${jobId} queued successfully`);
    } catch (queueError) {
      console.error(`❌ [ROUTE] Failed to queue job ${jobId}:`, queueError);
      throw queueError;
    }

    apiLogger.info('Formal verification job created', { jobId, projectId, mode: job.config.formalMode });

    const response: ApiResponse<Job> = {
    success: true,
      data: job,
      message: `Formal verification (${job.config.formalMode}) job created and queued`
    };
    res.status(201).json(response);

  } catch (error: any) {
    apiLogger.error('Failed to create formal job', error, { projectId: req.params.projectId });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create formal job'
    };
    res.status(500).json(response);
  }
});

// Get job by ID
router.get('/:id', validateId, (req: Request, res: Response) => {
  try {
    const job = jobs.get(req.params.id);
    
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Job> = {
    success: true,
      data: job
    };
    res.json(response);
  } catch (error: any) {
    apiLogger.error('Failed to get job', error, { jobId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to get job'
    };
    res.status(500).json(response);
  }
});

// Force delete job (completely remove from system)
router.delete('/:id/force', validateId, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const job = jobs.get(jobId);
    
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    // Force cancel if running
    await licenseManager.cancelJob(jobId);
    
    // Remove from memory
    jobs.delete(jobId);
    
    // Remove job directory from filesystem
    const jobPath = path.join(config.workspace.jobs, jobId);
    try {
      await fs.rm(jobPath, { recursive: true, force: true });
      apiLogger.info('Job directory removed from filesystem', { jobId, jobPath });
    } catch (error) {
      apiLogger.warn('Failed to remove job directory', { jobId, jobPath, error });
    }
    
    apiLogger.info('Job force deleted', { jobId });
    
    const response: ApiResponse = {
      success: true,
      message: 'Job deleted successfully'
    };
    res.json(response);

  } catch (error: any) {
    apiLogger.error('Failed to force delete job', error, { jobId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to delete job'
    };
    res.status(500).json(response);
  }
});

// Cancel job  
router.delete('/:id', validateId, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const job = jobs.get(jobId);
    
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    // Try to cancel the job
    const cancelled = await licenseManager.cancelJob(jobId);
    
    if (cancelled) {
      job.status = 'cancelled';
      jobs.set(jobId, job);
      
      apiLogger.info('Job cancelled', { jobId });
      
      const response: ApiResponse = {
        success: true,
        message: 'Job cancelled successfully'
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: 'Job could not be cancelled (may be running or already completed)'
      };
      res.status(400).json(response);
    }

  } catch (error: any) {
    apiLogger.error('Failed to cancel job', error, { jobId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to cancel job'
    };
    res.status(500).json(response);
  }
});

// Legacy logs endpoint removed - replaced by comprehensive log files API below

// Get job results
router.get('/:id/results', validateId, (req: Request, res: Response) => {
  try {
    const job = jobs.get(req.params.id);
    
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    if (!job.results) {
      const response: ApiResponse = {
        success: false,
        error: 'No results available yet'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: job.results
    };
    res.json(response);
  } catch (error: any) {
    apiLogger.error('Failed to get job results', error, { jobId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to get job results'
    };
    res.status(500).json(response);
  }
});

// Get log file content for a job
router.get('/:id/logs/:filename', validateId, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid filename'
      };
      return res.status(400).json(response);
    }

    const job = jobs.get(jobId);
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    const logFilePath = path.join(config.workspace.jobs, jobId, 'run', filename);
    
    try {
      const logContent = await fs.readFile(logFilePath, 'utf-8');
      const response: ApiResponse<{ content: string, filename: string }> = {
        success: true,
        data: {
          content: logContent,
          filename: filename
        }
      };
      res.json(response);
    } catch (error) {
      // Try to find the file in Lint_result subdirectory for formal verification files
      const lintResultFilePath = path.join(config.workspace.jobs, jobId, 'run', 'Lint_result', filename);
      try {
        const logContent = await fs.readFile(lintResultFilePath, 'utf-8');
        const response: ApiResponse<{ content: string, filename: string }> = {
          success: true,
          data: {
            content: logContent,
            filename: filename
          }
        };
        res.json(response);
      } catch (error2) {
        // Try to find the file in CDC_Results subdirectory for CDC verification files
        const cdcResultFilePath = path.join(config.workspace.jobs, jobId, 'run', 'CDC_Results', filename);
        try {
          const logContent = await fs.readFile(cdcResultFilePath, 'utf-8');
          const response: ApiResponse<{ content: string, filename: string }> = {
            success: true,
            data: {
              content: logContent,
              filename: filename
            }
          };
          res.json(response);
        } catch (error3) {
          const response: ApiResponse = {
            success: false,
            error: `Log file '${filename}' not found or cannot be read`
          };
          res.status(404).json(response);
        }
      }
    }

  } catch (error: any) {
    apiLogger.error('Failed to get log file', error, { jobId: req.params.id, filename: req.params.filename });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to get log file'
    };
    res.status(500).json(response);
  }
});

// Get source file content for a job
router.get('/:id/src/:filename', validateId, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid filename'
      };
      return res.status(400).json(response);
    }

    const job = jobs.get(jobId);
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    // Try to find the file in src directory first
    const srcFilePath = path.join(config.workspace.jobs, jobId, 'src', filename);
    
    try {
      const fileContent = await fs.readFile(srcFilePath, 'utf-8');
      const response: ApiResponse<{ content: string, filename: string }> = {
        success: true,
        data: {
          content: fileContent,
          filename: filename
        }
      };
      res.json(response);
    } catch (error) {
      // Try to find the file in tb directory for testbench files
      const tbFilePath = path.join(config.workspace.jobs, jobId, 'tb', filename);
      try {
        const fileContent = await fs.readFile(tbFilePath, 'utf-8');
        const response: ApiResponse<{ content: string, filename: string }> = {
          success: true,
          data: {
            content: fileContent,
            filename: filename
          }
        };
        res.json(response);
      } catch (error2) {
        const response: ApiResponse = {
          success: false,
          error: `Source file '${filename}' not found or cannot be read`
        };
        res.status(404).json(response);
      }
    }

  } catch (error: any) {
    apiLogger.error('Failed to get source file', error, { jobId: req.params.id, filename: req.params.filename });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to get source file'
    };
    res.status(500).json(response);
  }
});

// Download log file for a job
router.get('/:id/logs/:filename/download', validateId, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).send('Invalid filename');
    }

    const job = jobs.get(jobId);
    if (!job) {
      return res.status(404).send('Job not found');
    }

    const logFilePath = path.join(config.workspace.jobs, jobId, 'run', filename);
    
    try {
      await fs.access(logFilePath);
      res.download(logFilePath, `${jobId}_${filename}`, (error) => {
        if (error) {
          apiLogger.error('Failed to download log file', error, { jobId, filename });
          if (!res.headersSent) {
            res.status(404).send('Log file not found');
          }
        }
      });
    } catch (error) {
      // Try to find the file in Lint_result subdirectory for formal verification files
      const lintResultFilePath = path.join(config.workspace.jobs, jobId, 'run', 'Lint_result', filename);
      try {
        await fs.access(lintResultFilePath);
        res.download(lintResultFilePath, `${jobId}_${filename}`, (error) => {
          if (error) {
            apiLogger.error('Failed to download log file from Lint_result', error, { jobId, filename });
            if (!res.headersSent) {
              res.status(404).send('Log file not found');
            }
          }
        });
      } catch (error2) {
        // Try to find the file in CDC_Results subdirectory for CDC verification files
        const cdcResultFilePath = path.join(config.workspace.jobs, jobId, 'run', 'CDC_Results', filename);
        try {
          await fs.access(cdcResultFilePath);
          res.download(cdcResultFilePath, `${jobId}_${filename}`, (error) => {
            if (error) {
              apiLogger.error('Failed to download log file from CDC_Results', error, { jobId, filename });
              if (!res.headersSent) {
                res.status(404).send('Log file not found');
              }
            }
          });
        } catch (error3) {
          res.status(404).send('Log file not found');
        }
      }
    }

  } catch (error: any) {
    apiLogger.error('Failed to download log file', error, { jobId: req.params.id, filename: req.params.filename });
    if (!res.headersSent) {
      res.status(500).send('Failed to download log file');
    }
  }
});

// List available log files for a job
router.get('/:id/logs', validateId, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const job = jobs.get(jobId);
    
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    const runDir = path.join(config.workspace.jobs, jobId, 'run');
    
    try {
      const files = await fs.readdir(runDir);
      const logFiles = [];
      
      for (const file of files) {
        if (file.endsWith('.log') || file.endsWith('.result')) {
          const filePath = path.join(runDir, file);
          const stats = await fs.stat(filePath);
          
          // Determine log file stage
          let stage = 'other';
          if (file === 'compile.log') stage = 'compile';
          else if (file === 'vopt.log') stage = 'optimize';
          else if (file === 'vsim.result') stage = 'simulate';
                      else if (file === 'qlint.log') stage = 'formal';
          
          logFiles.push({
            filename: file,
            stage: stage,
            size: stats.size,
            modifiedAt: stats.mtime,
            description: getLogDescription(file)
          });
        }
      }
      
      // Check for formal verification log files in Lint_result subdirectory
      const lintResultDir = path.join(runDir, 'Lint_result');
      try {
        const lintStats = await fs.stat(lintResultDir);
        if (lintStats.isDirectory()) {
          const lintFiles = await fs.readdir(lintResultDir);
          for (const file of lintFiles) {
            if (file.endsWith('.log') || file.endsWith('.rpt')) {
              const filePath = path.join(lintResultDir, file);
              const stats = await fs.stat(filePath);
              
              // Determine stage for formal verification files
              let stage = 'formal';
              if (file === 'qlint.log') stage = 'formal';
              else if (file === 'lint_run.log') stage = 'formal';
              else if (file.endsWith('.rpt')) stage = 'formal';
              
              logFiles.push({
                filename: file,
                stage: stage,
                size: stats.size,
                modifiedAt: stats.mtime,
                description: getLogDescription(file)
              });
            }
          }
        }
      } catch {
        // Lint_result directory may not exist for non-formal jobs
      }
      
      // Check for CDC verification log files in CDC_Results subdirectory
      const cdcResultDir = path.join(runDir, 'CDC_Results');
      try {
        const cdcStats = await fs.stat(cdcResultDir);
        if (cdcStats.isDirectory()) {
          const cdcFiles = await fs.readdir(cdcResultDir);
          for (const file of cdcFiles) {
            if (file.endsWith('.log') || file.endsWith('.rpt')) {
              const filePath = path.join(cdcResultDir, file);
              const stats = await fs.stat(filePath);
              
              // Determine stage for CDC verification files
              let stage = 'formal';
              if (file === 'qcdc.log') stage = 'formal';
              else if (file === 'cdc_run.log') stage = 'formal';
              else if (file.endsWith('.rpt')) stage = 'formal';
              
              logFiles.push({
                filename: file,
                stage: stage,
                size: stats.size,
                modifiedAt: stats.mtime,
                description: getLogDescription(file)
              });
            }
          }
        }
      } catch {
        // CDC_Results directory may not exist for non-CDC jobs
      }
      
      const response: ApiResponse<{ logFiles: any[] }> = {
        success: true,
        data: { logFiles }
      };
      res.json(response);
      
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to list log files'
      };
      res.status(500).json(response);
    }

  } catch (error: any) {
    apiLogger.error('Failed to list log files', error, { jobId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to list log files'
    };
    res.status(500).json(response);
  }
});

// Get parsed lint report data for a formal job
router.get('/:id/lint-report', validateId, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const job = jobs.get(jobId);
    
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    // Check if this is a formal verification job
    if (job.type !== 'formal') {
      const response: ApiResponse = {
        success: false,
        error: 'Lint report is only available for formal verification jobs'
      };
      return res.status(400).json(response);
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      const response: ApiResponse = {
        success: false,
        error: 'Lint report is only available for completed jobs'
      };
      return res.status(400).json(response);
    }

    // Look for lint.rpt file in Lint_result directory
    const lintReportPath = path.join(config.workspace.jobs, jobId, 'run', 'Lint_result', 'lint.rpt');
    
    try {
      await fs.access(lintReportPath);
      
      // Parse the lint report
      const { LintReportParser } = await import('../utils/lintReportParser');
      const lintData = await LintReportParser.parseLintReport(lintReportPath);
      
      const response: ApiResponse<typeof lintData> = {
        success: true,
        data: lintData,
        message: 'Lint report parsed successfully'
      };
      res.json(response);
      
    } catch (parseError) {
      apiLogger.warn('Failed to parse lint report', { jobId, error: parseError });
      
      // Check if file exists but parsing failed
      try {
        await fs.access(lintReportPath);
        const response: ApiResponse = {
          success: false,
          error: 'Lint report file exists but could not be parsed'
        };
        res.status(500).json(response);
      } catch {
        const response: ApiResponse = {
          success: false,
          error: 'Lint report file not found. Make sure the formal verification job completed successfully.'
        };
        res.status(404).json(response);
      }
    }

  } catch (error: any) {
    apiLogger.error('Failed to get lint report', error, { jobId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to get lint report'
    };
    res.status(500).json(response);
  }
});

// Get parsed CDC report data for a formal job
router.get('/:id/cdc-report', validateId, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const job = jobs.get(jobId);
    
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    // Check if this is a formal verification job
    if (job.type !== 'formal') {
      const response: ApiResponse = {
        success: false,
        error: 'CDC report is only available for formal verification jobs'
      };
      return res.status(400).json(response);
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      const response: ApiResponse = {
        success: false,
        error: 'CDC report is only available for completed jobs'
      };
      return res.status(400).json(response);
    }

    // Look for cdc_detail.rpt file in CDC_Results directory
    const cdcReportPath = path.join(config.workspace.jobs, jobId, 'run', 'CDC_Results', 'cdc_detail.rpt');
    
    try {
      await fs.access(cdcReportPath);
      
      // Parse the CDC report
      const { CDCReportParser } = await import('../utils/cdcReportParser');
      const cdcData = await CDCReportParser.parseCDCReport(cdcReportPath);
      
      const response: ApiResponse<typeof cdcData> = {
        success: true,
        data: cdcData,
        message: 'CDC report parsed successfully'
      };
      res.json(response);
      
    } catch (parseError) {
      apiLogger.warn('Failed to parse CDC report', { jobId, error: parseError });
      
      // Check if file exists but parsing failed
      try {
        await fs.access(cdcReportPath);
        const response: ApiResponse = {
          success: false,
          error: 'CDC report file exists but could not be parsed'
        };
        res.status(500).json(response);
      } catch {
        const response: ApiResponse = {
          success: false,
          error: 'CDC report file not found. Make sure the formal verification job completed successfully.'
        };
        res.status(404).json(response);
      }
    }

  } catch (error: any) {
    apiLogger.error('Failed to get CDC report', error, { jobId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to get CDC report'
    };
    res.status(500).json(response);
  }
});

// Get parsed test results from vsim.result file for a simulation job
router.get('/:id/test-results', validateId, async (req: Request, res: Response) => {
  try {
    // Initialize jobs from filesystem if not already done
    await initializeJobs();
    
    const jobId = req.params.id;
    const job = jobs.get(jobId);
    
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    // Check if this is a simulation job
    if (job.type !== 'simulation') {
      const response: ApiResponse = {
        success: false,
        error: 'Test results are only available for simulation jobs'
      };
      return res.status(400).json(response);
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      const response: ApiResponse = {
        success: false,
        error: 'Test results are only available for completed jobs'
      };
      return res.status(400).json(response);
    }

    // Look for vsim.result file
    const vsimResultPath = path.join(config.workspace.jobs, jobId, 'run', 'vsim.result');
    
    try {
      await fs.access(vsimResultPath);
      
      // Read and parse the vsim.result file
      const content = await fs.readFile(vsimResultPath, 'utf-8');
      const testResults = VsimResultParser.parseContent(content);
      
      const response: ApiResponse<VsimResultSummary> = {
        success: true,
        data: testResults,
        message: 'Test results parsed successfully'
      };
      res.json(response);
      
    } catch (parseError) {
      apiLogger.warn('Failed to parse test results', { jobId, error: parseError });
      
      // Check if file exists but parsing failed
      try {
        await fs.access(vsimResultPath);
        const response: ApiResponse = {
          success: false,
          error: 'vsim.result file exists but could not be parsed'
        };
        res.status(500).json(response);
      } catch {
        const response: ApiResponse = {
          success: false,
          error: 'vsim.result file not found. Make sure the simulation job completed successfully.'
        };
        res.status(404).json(response);
      }
    }

  } catch (error: any) {
    apiLogger.error('Failed to get test results', error, { jobId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to get test results'
    };
    res.status(500).json(response);
  }
});

// Helper function to get log file descriptions
function getLogDescription(filename: string): string {
  switch (filename) {
    case 'compile.log': return 'Compilation logs (vlog)';
    case 'vopt.log': return 'Optimization logs (vopt)';
    case 'vsim.result': return 'Simulation logs (vsim)';
    case 'qlint.log': return 'Formal verification logs (qverify)';
    case 'lint_run.log': return 'Lint execution logs';
    case 'lint.rpt': return 'Formal verification report';
    case 'lint_settings.rpt': return 'Lint settings report';
    case 'lint_status_history.rpt': return 'Lint status history';
    // CDC verification files
    case 'qcdc.log': return 'CDC verification logs (qverify)';
    case 'cdc_run.log': return 'CDC execution logs';
    case 'cdc.rpt': return 'CDC verification report';
    case 'cdc_detail.rpt': return 'CDC detailed analysis report';
    case 'cdc_design.rpt': return 'CDC design information report';
    case 'cdc_setting.rpt': return 'CDC settings report';
    default: return 'Log file';
  }
}

export default router; 