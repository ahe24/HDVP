import express, { Request, Response } from 'express';
import { licenseManager } from '../services/LicenseManager';
import { config } from '../config/app';
import { cacheSystemStatus, cacheLicenseStatus } from '../middleware/cache';
import { systemLogger, apiLogger } from '../services/logger';

const router = express.Router();

// Get system status with caching
router.get('/status', async (req, res) => {
  try {
    const queueStatus = licenseManager.getQueueStatus();
    const licenseStatus = await licenseManager.checkLicense();
    
    res.json({
      success: true,
      data: {
        server: {
          status: 'running',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: '1.0.0'
        },
        license: licenseStatus,
        queue: queueStatus,
        tools: {
          questaSim: config.tools.questaSim,
          questaFormal: config.tools.questaFormal
        },
        workspace: config.workspace
      }
    });
  } catch (error) {
    systemLogger.error('System status error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get license status with caching
router.get('/license', cacheLicenseStatus, async (req, res) => {
  try {
    const status = await licenseManager.checkLicense();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    systemLogger.error('License check error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check license',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get queue status (no caching for real-time data)
router.get('/queue', (req, res) => {
  try {
    const status = licenseManager.getQueueStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    systemLogger.error('Queue status error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add this new endpoint for statistics
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { jobs } = await import('./jobs');
    const { projects } = await import('./projects');
    
    // Ensure projects are initialized before accessing them
    const projectsModule = await import('./projects');
    if (!projectsModule.projects || projectsModule.projects.size === 0) {
      // Try to initialize projects if they're empty
      try {
        const { loadExistingProjects } = await import('../utils/projectLoader');
        const loadedProjects = await loadExistingProjects();
        // Manually set the projects if they were loaded
        loadedProjects.forEach((project, key) => {
          projects.set(key, project);
        });
      } catch (error) {
        apiLogger.warn('Could not load existing projects for statistics', error);
      }
    }
    
    const allJobs = Array.from(jobs.values());
    const allProjects = Array.from(projects.values());
    
    apiLogger.info('Statistics calculation', { 
      jobCount: allJobs.length, 
      projectCount: allProjects.length 
    });
    
    // Get date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Helper function to filter jobs by date range
    const filterJobsByDateRange = (jobs: any[], startDate: Date, endDate?: Date) => {
      return jobs.filter(job => {
        const jobDate = new Date(job.createdAt);
        if (endDate) {
          return jobDate >= startDate && jobDate < endDate;
        }
        return jobDate >= startDate;
      });
    };
    
    // Basic counts
    const statistics = {
      totals: {
        projects: allProjects.length,
        jobs: allJobs.length,
        completedJobs: allJobs.filter(job => job.status === 'completed').length,
        failedJobs: allJobs.filter(job => job.status === 'failed').length,
        runningJobs: allJobs.filter(job => job.status === 'running').length,
        pendingJobs: allJobs.filter(job => job.status === 'pending' || job.status === 'queued').length,
      },
      
      // Time-based statistics
      timeBasedStats: {
        today: {
          jobsCreated: filterJobsByDateRange(allJobs, today).length,
          jobsCompleted: filterJobsByDateRange(allJobs.filter(job => job.status === 'completed'), today).length,
          jobsFailed: filterJobsByDateRange(allJobs.filter(job => job.status === 'failed'), today).length,
        },
        yesterday: {
          jobsCreated: filterJobsByDateRange(allJobs, yesterday, today).length,
          jobsCompleted: filterJobsByDateRange(allJobs.filter(job => job.status === 'completed'), yesterday, today).length,
          jobsFailed: filterJobsByDateRange(allJobs.filter(job => job.status === 'failed'), yesterday, today).length,
        },
        lastWeek: {
          jobsCreated: filterJobsByDateRange(allJobs, weekStart).length,
          jobsCompleted: filterJobsByDateRange(allJobs.filter(job => job.status === 'completed'), weekStart).length,
          jobsFailed: filterJobsByDateRange(allJobs.filter(job => job.status === 'failed'), weekStart).length,
        },
        lastMonth: {
          jobsCreated: filterJobsByDateRange(allJobs, monthStart).length,
          jobsCompleted: filterJobsByDateRange(allJobs.filter(job => job.status === 'completed'), monthStart).length,
          jobsFailed: filterJobsByDateRange(allJobs.filter(job => job.status === 'failed'), monthStart).length,
        }
      },
      
      // Success rates
      successRates: {
        overall: allJobs.length > 0 ? (allJobs.filter(job => job.status === 'completed').length / allJobs.filter(job => job.status === 'completed' || job.status === 'failed').length * 100) : 0,
        lastWeek: (() => {
          const weekJobs = filterJobsByDateRange(allJobs, weekStart);
          const completedJobs = weekJobs.filter(job => job.status === 'completed' || job.status === 'failed');
          return completedJobs.length > 0 ? (weekJobs.filter(job => job.status === 'completed').length / completedJobs.length * 100) : 0;
        })(),
        lastMonth: (() => {
          const monthJobs = filterJobsByDateRange(allJobs, monthStart);
          const completedJobs = monthJobs.filter(job => job.status === 'completed' || job.status === 'failed');
          return completedJobs.length > 0 ? (monthJobs.filter(job => job.status === 'completed').length / completedJobs.length * 100) : 0;
        })()
      },
      
      // Job type distribution
      jobTypes: {
        simulation: allJobs.filter(job => job.type === 'simulation').length,
        formal: allJobs.filter(job => job.type === 'formal').length,
      },
      
      // Most active projects
      projectActivity: allProjects.map(project => ({
        id: project.id,
        name: project.name,
        jobCount: allJobs.filter(job => job.projectId === project.id).length,
        lastJobDate: (() => {
          const projectJobs = allJobs.filter(job => job.projectId === project.id);
          if (projectJobs.length === 0) return null;
          return projectJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt;
        })()
      })).sort((a, b) => b.jobCount - a.jobCount).slice(0, 5),
      
      // Daily activity for the last 7 days
      dailyActivity: Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const dayJobs = filterJobsByDateRange(allJobs, date, nextDate);
        return {
          date: date.toISOString().split('T')[0],
          jobsCreated: dayJobs.length,
          jobsCompleted: dayJobs.filter(job => job.status === 'completed').length,
          jobsFailed: dayJobs.filter(job => job.status === 'failed').length,
        };
      }).reverse(),
      
      // Weekly activity for the last 8 weeks
      weeklyActivity: Array.from({ length: 8 }, (_, i) => {
        const weekStart = new Date(today.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const weekJobs = filterJobsByDateRange(allJobs, weekStart, weekEnd);
        return {
          date: `Week ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          jobsCreated: weekJobs.length,
          jobsCompleted: weekJobs.filter(job => job.status === 'completed').length,
          jobsFailed: weekJobs.filter(job => job.status === 'failed').length,
        };
      }).reverse(),
      
      // Monthly activity for the last 6 months
      monthlyActivity: Array.from({ length: 6 }, (_, i) => {
        const monthStart = new Date(today.getFullYear(), today.getMonth() - (i + 1), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthJobs = filterJobsByDateRange(allJobs, monthStart, monthEnd);
        return {
          date: monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          jobsCreated: monthJobs.length,
          jobsCompleted: monthJobs.filter(job => job.status === 'completed').length,
          jobsFailed: monthJobs.filter(job => job.status === 'failed').length,
        };
      }).reverse()
    };
    
    res.json({ success: true, data: statistics });
  } catch (error: any) {
    apiLogger.error('Failed to get system statistics', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get system statistics'
    });
  }
});

export default router; 