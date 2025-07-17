import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import { Job, JobProgress, JobResults } from '../types';
import { config } from '../config/app';
import { jobLogger } from './logger';

const execAsync = promisify(exec);

export class JobExecutor extends EventEmitter {
  private static instance: JobExecutor;

  private constructor() {
    super();
  }

  public static getInstance(): JobExecutor {
    if (!JobExecutor.instance) {
      JobExecutor.instance = new JobExecutor();
    }
    return JobExecutor.instance;
  }

  /**
   * Execute a job (simulation or formal verification)
   */
  async executeJob(job: Job): Promise<void> {
    const jobWorkDir = path.join(config.workspace.jobs, job.id);
    const projectDir = path.join(config.workspace.projects, job.projectId);

    try {
      // Create job workspace directory
      await fs.mkdir(jobWorkDir, { recursive: true });
      await fs.mkdir(path.join(jobWorkDir, 'run'), { recursive: true });
      
      this.emitProgress(job.id, 'setup', 10, 'Setting up job workspace');

      // Copy project files to job workspace
      await this.copyProjectFiles(projectDir, jobWorkDir);
      this.emitProgress(job.id, 'setup', 30, 'Project files copied');

      // Set up environment with proper shell configuration
      const env = {
        ...process.env,
        SALT_LICENSE_SERVER: config.license.saltLicenseServer,
        PATH: `${config.tools.questaSim.modeltech}:${config.tools.questaFormal.bin}:${process.env.PATH || '/usr/bin:/bin'}`,
        SHELL: '/usr/bin/bash'
      };

      // Common exec options with proper shell configuration
      const execOptions = {
        env,
        shell: '/usr/bin/bash',
        cwd: jobWorkDir,
        timeout: 3600 * 1000,  // 1 hour timeout in milliseconds
        maxBuffer: 50 * 1024 * 1024  // 50MB buffer for large simulation outputs
      };

      this.emitProgress(job.id, 'setup', 50, 'Environment configured');

      if (job.type === 'simulation') {
        await this.executeSimulation(job, jobWorkDir, execOptions);
      } else if (job.type === 'formal') {
        await this.executeFormal(job, jobWorkDir, execOptions);
      }

    } catch (error) {
      jobLogger.error('Job execution failed', error, { jobId: job.id });
      this.emit('job-status', {
        jobId: job.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown execution error'
      });
      throw error;
    }
  }

  /**
   * Execute simulation job - Following proper QuestaSim sequence from Makefile
   */
  private async executeSimulation(job: Job, jobWorkDir: string, execOptions: any): Promise<void> {
    try {
      // Step 1: Create work library in run directory
      this.emitProgress(job.id, 'compile', 50, 'Creating work library');
      const vlibCmd = `${config.tools.questaSim.modeltech}/vlib run/work`;
      try {
        await execAsync(vlibCmd, execOptions);
        this.emitProgress(job.id, 'compile', 55, 'Work library created successfully');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown library creation error';
        throw new Error(`Library creation failed: ${errorMsg}`);
      }

      // Step 2: Compile (vlog) - Following Makefile pattern
      this.emitProgress(job.id, 'compile', 65, 'Compiling design files');
      
      // Build vlog command following Makefile pattern
      let vlogCmd = `${config.tools.questaSim.vlog} -sv -work run/work`;
      
      // Add user-defined compile options (including defines)
      if (job.config.compileOptions && job.config.compileOptions.trim()) {
        vlogCmd += ` ${job.config.compileOptions}`;
      }
      
      // Add include directories (like +incdir+src +incdir+src/include)
      if (job.config.includeDirectories?.length) {
        const incDirs = job.config.includeDirectories.map(dir => `+incdir+${dir}`).join(' ');
        vlogCmd += ` ${incDirs}`;
      }
      
      // Add filelist and logging (paths now relative to job root)
      vlogCmd += ' -f filelist.f -l run/compile.log';

      try {
        const vlogResult = await execAsync(vlogCmd, execOptions);
        // Check compilation success from log file instead of streaming output
        if (vlogResult.stderr.includes('Error:') || vlogResult.stderr.includes('** Error')) {
          throw new Error(`Compilation failed. Check compile.log for details.`);
        }
        this.emitProgress(job.id, 'compile', 75, 'Compilation completed successfully');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown compilation error';
        throw new Error(`Compilation failed: ${errorMsg}. Check compile.log for details.`);
      }

      // Step 3: Optimize (vopt) - Following Makefile pattern  
      this.emitProgress(job.id, 'compile', 80, 'Optimizing design');
      
      const testbenchName = job.config.dutTop || 'tb_top'; // Use configured testbench name
      let voptCmd = `${config.tools.questaSim.modeltech}/vopt -work run/work ${testbenchName} -o opt`;
      
      // Add user-defined compile options (extract defines only for vopt)
      if (job.config.compileOptions && job.config.compileOptions.includes('+define+')) {
        const defines = job.config.compileOptions.match(/\+define\+[^\s]+/g);
        if (defines) {
          voptCmd += ` ${defines.join(' ')}`;
        }
      }
      
      voptCmd += ' -l run/vopt.log';

      try {
        const voptResult = await execAsync(voptCmd, execOptions);
        // Check optimization success from stderr
        if (voptResult.stderr.includes('Error:') || voptResult.stderr.includes('** Error')) {
          throw new Error(`Optimization failed. Check vopt.log for details.`);
        }
        this.emitProgress(job.id, 'execute', 85, 'Design optimization completed');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown optimization error';
        throw new Error(`Optimization failed: ${errorMsg}. Check vopt.log for details.`);
      }

      // Step 4: Simulate (vsim) - Following Makefile pattern
      this.emitProgress(job.id, 'execute', 90, 'Running simulation');

      let vsimCmd = `${config.tools.questaSim.vsim} -c -work run/work opt`;
      
      // Add user-defined compile options (extract defines only for vsim)
      if (job.config.compileOptions && job.config.compileOptions.includes('+define+')) {
        const defines = job.config.compileOptions.match(/\+define\+[^\s]+/g);
        if (defines) {
          vsimCmd += ` ${defines.join(' ')}`;
        }
      }
      
      // Add simulation commands and logging
      const simulationTime = job.config.simulationTime || 'run -all';
      vsimCmd += ` -l run/vsim.result -do "${simulationTime}; quit -f;exit 0"`;

      try {
        await execAsync(vsimCmd, execOptions);
        this.emitProgress(job.id, 'collect', 95, 'Simulation completed, collecting results');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown simulation error';
        throw new Error(`Simulation failed: ${errorMsg}. Check vsim.result for details.`);
      }
      
      // Collect results from run directory
      const results = await this.collectSimulationResults(path.join(jobWorkDir, 'run'));
      
      this.emitProgress(job.id, 'collect', 100, 'Job completed successfully');
      
      this.emit('job-status', {
        jobId: job.id,
        status: 'completed',
        message: 'Simulation completed successfully',
        results
      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute formal verification job - Following proper qverify sequence from Makefile
   */
  private async executeFormal(job: Job, jobWorkDir: string, execOptions: any): Promise<void> {
    try {
      // Step 1: Compile first (same as simulation compile step)
      this.emitProgress(job.id, 'compile', 50, 'Creating work library for formal verification');
      const vlibCmd = `${config.tools.questaSim.modeltech}/vlib run/work`;
      try {
        await execAsync(vlibCmd, execOptions);
        this.emitProgress(job.id, 'compile', 55, 'Work library created successfully');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown library creation error';
        throw new Error(`Library creation failed: ${errorMsg}`);
      }

      this.emitProgress(job.id, 'compile', 65, 'Compiling design files for formal verification');
      
      // Build vlog command for formal (same as simulation)
      let vlogCmd = `${config.tools.questaSim.vlog} -sv -work run/work`;
      
      // Add user-defined compile options (including defines)
      if (job.config.compileOptions && job.config.compileOptions.trim()) {
        vlogCmd += ` ${job.config.compileOptions}`;
      }
      
      // Add include directories 
      if (job.config.includeDirectories?.length) {
        const incDirs = job.config.includeDirectories.map(dir => `+incdir+${dir}`).join(' ');
        vlogCmd += ` ${incDirs}`;
      }
      
      // Add filelist and logging (paths now relative to job root)
      vlogCmd += ' -f filelist.f -l run/compile.log';

      try {
        const vlogResult = await execAsync(vlogCmd, execOptions);
        // Check compilation success
        if (vlogResult.stderr.includes('Error:') || vlogResult.stderr.includes('** Error')) {
          throw new Error(`Compilation failed. Check compile.log for details.`);
        }
        this.emitProgress(job.id, 'execute', 75, 'Compilation completed, starting formal verification');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown compilation error';
        throw new Error(`Compilation failed: ${errorMsg}. Check compile.log for details.`);
      }

      // Step 2: Run Formal Verification based on mode
      const formalMode = job.config.formalMode || 'lint';
      this.emitProgress(job.id, 'execute', 80, `Running ${formalMode.toUpperCase()} verification`);
      
      const dutModule = job.config.dutTop || 'top_temp';
      
      if (formalMode === 'lint') {
        await this.executeLintVerification(job, jobWorkDir, execOptions, dutModule);
      } else if (formalMode === 'cdc') {
        await this.executeCDCVerification(job, jobWorkDir, execOptions, dutModule);
      } else {
        throw new Error(`Unsupported formal mode: ${formalMode}`);
      }
      
      // Collect results from run directory
      const results = await this.collectFormalResults(path.join(jobWorkDir, 'run'));
      
      this.emitProgress(job.id, 'collect', 100, 'Job completed successfully');
      
      this.emit('job-status', {
        jobId: job.id,
        status: 'completed',
        message: `${formalMode.toUpperCase()} verification completed successfully`,
        results
      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute Lint verification
   */
  private async executeLintVerification(job: Job, jobWorkDir: string, execOptions: any, dutModule: string): Promise<void> {
    let qverifyCmd = `${config.tools.questaFormal.bin}/qverify -c -licq -od run/Lint_result -l qlint.log`;
    qverifyCmd += ` -do "vmap work run/work; onerror {exit 1}; lint methodology standard -goal do-254; lint run -d ${dutModule}; exit 0"`;

    try {
      await execAsync(qverifyCmd, execOptions);
      this.emitProgress(job.id, 'collect', 95, 'Lint verification completed, collecting results');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown lint verification error';
      throw new Error(`Lint verification failed: ${errorMsg}. Check Lint_result/qlint.log for details.`);
    }
  }

  /**
   * Execute CDC verification
   */
  private async executeCDCVerification(job: Job, jobWorkDir: string, execOptions: any, dutModule: string): Promise<void> {
    let qverifyCmd = `${config.tools.questaFormal.bin}/qverify -c -od run/CDC_Results -l qcdc.log`;
    qverifyCmd += ` -do "vmap work run/work; onerror {exit 1}; cdc run -d ${dutModule}; cdc generate report cdc_detail.rpt; exit 0"`;

    try {
      await execAsync(qverifyCmd, execOptions);
      this.emitProgress(job.id, 'collect', 95, 'CDC verification completed, collecting results');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown CDC verification error';
      throw new Error(`CDC verification failed: ${errorMsg}. Check CDC_Results/qcdc.log for details.`);
    }
  }

  /**
   * Copy project files to job workspace
   */
  private async copyProjectFiles(projectDir: string, jobWorkDir: string): Promise<void> {
    try {
      // List all files and directories in the project directory
      const entries = await fs.readdir(projectDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const sourcePath = path.join(projectDir, entry.name);
        const destPath = path.join(jobWorkDir, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively copy directory
          await fs.cp(sourcePath, destPath, { recursive: true });
        } else {
          // Copy file
          await fs.copyFile(sourcePath, destPath);
        }
      }
    } catch (error) {
      throw new Error(`Failed to copy project files: ${error}`);
    }
  }

  /**
   * Collect simulation results
   */
  private async collectSimulationResults(runDir: string): Promise<JobResults> {
    const results: JobResults = {
      resultFiles: []
    };

    try {
      // Collect log files
      const files = await fs.readdir(runDir);
      
      for (const file of files) {
        const filePath = path.join(runDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          let type: 'log' | 'waveform' | 'report' | 'vcd' | 'other' = 'other';
          
          if (file.endsWith('.log')) type = 'log';
          else if (file.endsWith('.vcd')) type = 'vcd';
          else if (file.endsWith('.wlf')) type = 'waveform';
          
          results.resultFiles.push({
            name: file,
            path: filePath,
            type,
            size: stats.size,
            createdAt: stats.mtime
          });
        }
      }
    } catch (error) {
      jobLogger.warn('Failed to collect some results', { error });
    }

    return results;
  }

  /**
   * Recursively collect files from a directory
   */
  private async collectFilesRecursively(dirPath: string, baseDir: string = dirPath): Promise<Array<{
    name: string;
    path: string;
    type: 'log' | 'waveform' | 'report' | 'vcd' | 'other';
    size: number;
    createdAt: Date;
  }>> {
    const files: Array<{
      name: string;
      path: string;
      type: 'log' | 'waveform' | 'report' | 'vcd' | 'other';
      size: number;
      createdAt: Date;
    }> = [];

    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isFile()) {
          // Determine file type based on extension
          let type: 'log' | 'waveform' | 'report' | 'vcd' | 'other' = 'other';
          if (item.endsWith('.log')) type = 'log';
          else if (item.endsWith('.rpt') || item.endsWith('.report')) type = 'report';
          else if (item.endsWith('.vcd')) type = 'vcd';
          else if (item.endsWith('.wlf')) type = 'waveform';
          
          // Create relative path from base directory
          const relativePath = path.relative(baseDir, itemPath);
          
          files.push({
            name: relativePath, // Use relative path as name for nested files
            path: itemPath,
            type,
            size: stats.size,
            createdAt: stats.mtime
          });
        } else if (stats.isDirectory()) {
          // Recursively collect files from subdirectories
          const subFiles = await this.collectFilesRecursively(itemPath, baseDir);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      jobLogger.warn(`Failed to read directory: ${dirPath}`, { error });
    }

    return files;
  }

  /**
   * Collect formal verification results
   */
  private async collectFormalResults(runDir: string): Promise<JobResults> {
    const results: JobResults = {
      resultFiles: []
    };

    try {
      // Collect log and report files from run directory
      const files = await fs.readdir(runDir);
      
      for (const file of files) {
        const filePath = path.join(runDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          let type: 'log' | 'waveform' | 'report' | 'vcd' | 'other' = 'other';
          
          if (file.endsWith('.log')) type = 'log';
          else if (file.endsWith('.rpt') || file.endsWith('.report')) type = 'report';
          else if (file.endsWith('.vcd')) type = 'vcd';
          else if (file.endsWith('.wlf')) type = 'waveform';
          
          results.resultFiles.push({
            name: file,
            path: filePath,
            type,
            size: stats.size,
            createdAt: stats.mtime
          });
        }
      }

      // Check for Lint_result directory (from Makefile pattern)
      const lintResultDir = path.join(runDir, 'Lint_result');
      try {
        const lintStats = await fs.stat(lintResultDir);
        if (lintStats.isDirectory()) {
          // Recursively collect all files from Lint_result directory
          const lintFiles = await this.collectFilesRecursively(lintResultDir, lintResultDir);
          results.resultFiles.push(...lintFiles);
        }
      } catch {
        // Lint_result directory may not exist if lint failed
      }

      // Check for CDC_Results directory (from CDC mode)
      const cdcResultDir = path.join(runDir, 'CDC_Results');
      try {
        const cdcStats = await fs.stat(cdcResultDir);
        if (cdcStats.isDirectory()) {
          // Recursively collect all files from CDC_Results directory
          const cdcFiles = await this.collectFilesRecursively(cdcResultDir, cdcResultDir);
          results.resultFiles.push(...cdcFiles);
        }
      } catch {
        // CDC_Results directory may not exist if CDC failed
      }

      // Check for qverify results directory (backup)
      const qverifyDir = path.join(runDir, '.qverify');
      try {
        const qverifyStats = await fs.stat(qverifyDir);
        if (qverifyStats.isDirectory()) {
          // Recursively collect all files from .qverify directory
          const qverifyFiles = await this.collectFilesRecursively(qverifyDir, qverifyDir);
          results.resultFiles.push(...qverifyFiles);
        }
      } catch {
        // .qverify directory may not exist
      }

    } catch (error) {
      jobLogger.warn('Failed to collect some formal results', { error });
    }

    return results;
  }

  /**
   * Emit job progress
   */
  private emitProgress(jobId: string, stage: string, progress: number, message: string): void {
    this.emit('job-progress', {
      jobId,
      stage,
      progress,
      message
    });
  }
}

export const jobExecutor = JobExecutor.getInstance();