export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  files: ProjectFile[];
  testPlan?: TestPlanData; // Add test plan support
  modules?: {
    testbench: string[];  // List of testbench module names
    design: string[];     // List of design module names
  };
  sections?: {
    src: Set<string>;
    tb: Set<string>;
    include: Set<string>;
  };
}

export interface ProjectFile {
  name: string;
  path: string;
  content: string;
  type: 'verilog' | 'systemverilog' | 'vhdl' | 'testbench' | 'constraint' | 'other';
  section?: 'src' | 'tb' | 'include';
}

export interface Job {
  id: string;
  projectId: string;
  type: 'simulation' | 'formal';
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: JobConfig;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  logs?: string;
  results?: JobResults;
  error?: string;
}

export interface JobConfig {
  // Simulation Configuration
  simulationTime?: string;
  dutTop: string;
  compileOptions?: string;
  simulationOptions?: string;
  
  // Formal Configuration
  formalMode?: 'lint' | 'cdc' | 'rdc';
  tclScript?: string;
  outputDir?: string;
  
  // Common Configuration
  includeDirectories?: string[];
  defines?: Record<string, string>;
}

export interface JobResults {
  compileLogs?: string;
  simulationLogs?: string;
  formalResults?: string;
  resultFiles: ResultFile[];
  waveforms?: string[];
  reports?: string[];
}

export interface ResultFile {
  name: string;
  path: string;
  type: 'log' | 'waveform' | 'report' | 'vcd' | 'other';
  size: number;
  createdAt: Date;
}

export interface TestCaseResult {
  testId: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'NOT_TESTED';
  passCount: number;
  failCount: number;
  totalRuns: number;
  occurrences: TestOccurrence[];
}

export interface TestOccurrence {
  timeStamp: string;
  status: 'PASS' | 'FAIL';
  description: string;
}

export interface VsimResultSummary {
  testResults: TestCaseResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  notTestedTests: number;
  executionTime?: string;
  errorCount: number;
  warningCount: number;
}

export interface LicenseStatus {
  available: boolean;
  checkedAt: string;
  error?: string;
}

export interface QueueStatus {
  position: number;
  estimatedStartTime?: Date;
  totalJobs: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any; // Add details field for validation errors
}

export interface FileUploadRequest {
  projectId?: string;
  projectName?: string;
  description?: string;
}

export interface JobCreateRequest {
  projectId: string;
  type: 'simulation' | 'formal';
  config: JobConfig;
}

// WebSocket Events
export interface WebSocketMessage {
  type: 'job-status' | 'job-progress' | 'job-logs' | 'license-status' | 'queue-update';
  data: any;
  timestamp: Date;
}

export interface JobProgress {
  jobId: string;
  stage: 'setup' | 'compile' | 'execute' | 'collect';
  progress: number; // 0-100
  message?: string;
} 

export interface TestPlanData {
  filename: string;
  entries: TestPlanEntry[];
  totalCount: number;
  validCount: number;
  uploadedAt: string;
}

export interface TestPlanEntry {
  title: string;
  requirementId: string;
  testPlanId: string;
  description?: string;
  priority?: string;
  status?: string;
} 