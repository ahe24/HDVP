export interface Project {
  id: string;
  name: string;
  description: string;
  files: ProjectFile[];
  testPlan?: TestPlanData; // Add test plan support
  modules?: {
    testbench: string[];  // List of testbench module names
    design: string[];     // List of design module names
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  name: string;
  path: string;
  content: string;
  type: 'verilog' | 'systemverilog' | 'vhdl' | 'testbench' | 'constraint' | 'other';
}

export interface Job {
  id: string;
  projectId: string;
  type: 'simulation' | 'formal';
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: JobConfig;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  results?: JobResults;
  logs?: string;
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
  timeout?: number;
  waveform?: boolean;
}

export interface JobResults {
  success: boolean;
  output: string;
  errors?: string[];
  warnings?: string[];
  coverage?: CoverageData;
  waveformPath?: string;
}

export interface LogFile {
  filename: string;
  stage: 'compile' | 'optimize' | 'simulate' | 'formal' | 'other';
  size: number;
  modifiedAt: string;
  description: string;
}

export interface CoverageData {
  line: number;
  branch: number;
  toggle: number;
  condition: number;
}

export interface LicenseStatus {
  available: boolean;
  checkedAt: string;
  nextCheck?: string;
}

export interface SystemStatus {
  server: {
    status: string;
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    version: string;
  };
  license: LicenseStatus;
  queue: {
    currentJob: Job | null;
    queuedJobs: number;
    licenseAvailable: boolean;
    lastLicenseCheck: string;
  };
  tools: {
    questaSim: {
      modeltech: string;
      vlog: string;
      vopt: string;
      vsim: string;
    };
    questaFormal: {
      bin: string;
      qverify: string;
    };
  };
  workspace: {
    root: string;
    projects: string;
    jobs: string;
    uploads: string;
    results: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface JobProgress {
  jobId: string;
  progress: number;
  status: string;
  currentStep: string;
  logs: string[];
}

// Lint Report interfaces
export interface LintCheckDetail {
  checkName: string;
  category: string;
  alias: string;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'resolved';
  violations: LintViolation[];
}

export interface LintViolation {
  description: string;
  file?: string;
  line?: number;
  module?: string;
  hierarchy?: string;
  additionalInfo?: string;
}

export interface LintCheckSummary {
  error: { [checkName: string]: number };
  warning: { [checkName: string]: number };
  info: { [checkName: string]: number };
  resolved: { [checkName: string]: number };
}

export interface LintReportData {
  designQualityScore: number;
  design: string;
  timestamp: string;
  database: string;
  summary: {
    error: number;
    warning: number;
    info: number;
  };
  checkSummary: LintCheckSummary;
  checkDetails: LintCheckDetail[];
  designInfo?: {
    registerBits?: number;
    latchBits?: number;
    blackboxes?: number;
    emptyModules?: number;
    unresolvedModules?: number;
  };
}

// CDC Report interfaces
export interface CDCDetail {
  category: string;
  issueType: string;
  start: { clock: string; signal: string; file: string; line: number };
  end: { clock: string; signal: string; file: string; line: number };
  additionalInfo?: string;
  synchronizerId?: string;
  synchronizerLength?: number;
}

export interface CDCSummary {
  totalChecks: number;
  violations: number;
  cautions: number;
  evaluations: number;
}

export interface CDCReportData {
  design: string;
  timestamp: string;
  summary: CDCSummary;
  violations: CDCDetail[];
  cautions: CDCDetail[];
  evaluations: CDCDetail[];
  designInfo?: {
    designComplexityNumber?: number;
    cdcSignals?: number;
    registerBits?: number;
    latchBits?: number;
    rams?: number;
    deadEndRegisters?: number;
  };
} 

export interface TestPlanData {
  filename: string;
  entries: TestPlanEntry[];
  totalCount: number;
  validCount: number;
  uploadedAt?: string;
}

export interface TestPlanEntry {
  title: string;
  requirementId: string;
  testPlanId: string;
  description?: string;
  priority?: string;
  status?: string;
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

// Material-UI Theme Extensions for Typography
declare module '@mui/material/styles' {
  interface TypographyVariants {
    technicalData: React.CSSProperties;
    technicalDataSmall: React.CSSProperties;
    technicalDataXSmall: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    technicalData?: React.CSSProperties;
    technicalDataSmall?: React.CSSProperties;
    technicalDataXSmall?: React.CSSProperties;
  }
}

// Update Typography component props
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    technicalData: true;
    technicalDataSmall: true;
    technicalDataXSmall: true;
  }
} 