# QuestaSim Web Interface System - Design Plan

## Executive Summary

**Feasibility Assessment: ✅ FEASIBLE**

Based on the analysis of the requirements document and the example user project structure, the QuestaSim Web Interface System is fully implementable. The system architecture is well-defined, and all required components can be developed using modern web technologies and Jenkins automation.

## 1. System Architecture Overview

### 1.1 High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │───▶│   Backend API   │───▶│     Jenkins     │───▶│  QuestaSim/     │
│   (React.js)    │    │   (Node.js)     │    │   Pipeline      │    │  Questa Formal  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         └───────────────────────┼───────────────────────┼───────────────────────┘
                           WebSocket/SSE           File System              Results
                        (Real-time Updates)      (Project Files)         (Logs, Reports)
```

### 1.2 Technology Stack
- **Host OS**: Rocky Linux 9
- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express.js
- **Real-time Communication**: Socket.IO
- **File Upload**: Multer
- **Process Automation**: Jenkins with Pipeline
- **File Storage**: Local filesystem with organized structure
- **Database**: SQLite for metadata (optional)
- **License Server**: SALT_LICENSE_SERVER=29000@vbox (floating license)

### 1.3 QuestaSim Tool Environment
- **QuestaSim Tools Path**: `/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech/linux_x86_64`
  - `vlog` (Verilog compiler)
  - `vopt` (Optimizer) 
  - `vsim` (Simulator)
- **Questa Formal Path**: `/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/bin`
  - `qverify` (Formal verification tool)
- **License Configuration**: Floating license server at port 29000 on vbox

## 2. Component Design Details

### 2.1 Frontend Components

#### 2.1.1 Main Application Structure
```
src/
├── components/
│   ├── ProjectManager/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectCreator.tsx
│   │   └── FileUploader.tsx
│   ├── SimulationConfig/
│   │   ├── SimulationSettings.tsx
│   │   ├── FormalSettings.tsx
│   │   └── CompileOptions.tsx
│   ├── JobMonitor/
│   │   ├── JobQueue.tsx
│   │   ├── JobProgress.tsx
│   │   └── JobHistory.tsx
│   ├── Results/
│   │   ├── LogViewer.tsx
│   │   ├── ReportViewer.tsx
│   │   └── FileDownloader.tsx
│   └── Layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
├── services/
│   ├── api.ts
│   ├── websocket.ts
│   └── fileUpload.ts
├── utils/
│   ├── fileValidation.ts
│   └── formatters.ts
└── types/
    ├── project.ts
    ├── job.ts
    └── api.ts
```

#### 2.1.2 Key Features Implementation
- **Drag & Drop File Upload**: Multi-file upload with validation
- **Real-time Job Monitoring**: WebSocket-based status updates
- **Interactive Log Viewer**: Syntax highlighting for errors
- **Project Templates**: Pre-configured project structures
- **Responsive Design**: Mobile-friendly interface

### 2.2 Backend API Design

#### 2.2.1 API Endpoints
```typescript
// Project Management
POST   /api/projects                    // Create new project
GET    /api/projects                    // List projects
GET    /api/projects/:id                // Get project details
DELETE /api/projects/:id                // Delete project
POST   /api/projects/:id/files          // Upload files
GET    /api/projects/:id/files          // List files

// Job Management
POST   /api/jobs/simulation/:projectId  // Start simulation
POST   /api/jobs/formal/:projectId      // Start formal verification
GET    /api/jobs                        // List jobs
GET    /api/jobs/:id                    // Get job status
DELETE /api/jobs/:id                    // Cancel job

// Results
GET    /api/jobs/:id/logs               // Get job logs
GET    /api/jobs/:id/results            // Get result files
GET    /api/jobs/:id/download/:file     // Download specific file
```

#### 2.2.2 File Structure Management
```
workspace/
├── projects/
│   └── {project-id}/
│       ├── src/           # User uploaded source files
│       ├── tb/            # User uploaded testbench files
│       ├── include/       # User uploaded include files
│       └── metadata.json  # Project configuration
└── jobs/
    └── {job-id}/
        ├── run/           # Jenkins workspace
        │   ├── work/      # QuestaSim work library
        │   ├── logs/      # Compilation and simulation logs
        │   ├── results/   # Output files (VCD, reports)
        │   └── Lint_result/ # Formal verification results
        └── config.json    # Job configuration
```

### 2.3 Jenkins Pipeline Implementation

#### 2.3.1 Jenkins Pipeline Structure
```groovy
pipeline {
    agent any
    
    environment {
        // QuestaSim Tool Paths
        QUESTA_MODELTECH = '/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech'
        QUESTA_FORMAL = '/opt/QOSF_2024.3/questa_static_formal/linux_x86_64'
        PATH = "${QUESTA_MODELTECH}:${QUESTA_FORMAL}:${env.PATH}"
        
        // License Configuration
        SALT_LICENSE_SERVER = '29000@vbox'
        LM_LICENSE_FILE = '29000@vbox'
        
        // Job Configuration
        JOB_ID = "${BUILD_NUMBER}_${params.PROJECT_ID}"
        WORKSPACE_DIR = "/workspace/jobs/${JOB_ID}"
    }
    
    parameters {
        string(name: 'PROJECT_ID', description: 'Project ID')
        string(name: 'JOB_TYPE', description: 'simulation or formal')
        string(name: 'SIMULATION_TIME', defaultValue: '1us', description: 'Simulation time')
        string(name: 'DUT_TOP', description: 'Top module name')
        choice(name: 'FORMAL_MODE', choices: ['lint', 'cdc', 'rdc'], description: 'Formal analysis mode')
        string(name: 'COMPILE_OPTS', defaultValue: '+define+SIMULATION', description: 'Additional compile options')
    }
    
    stages {
        stage('Environment Setup') {
            steps {
                script {
                    sh """
                        # Create job workspace
                        mkdir -p ${WORKSPACE_DIR}/run
                        cd ${WORKSPACE_DIR}
                        
                        # Copy project files
                        cp -r /workspace/projects/${params.PROJECT_ID}/* .
                        
                        # Generate filelist.f
                        python3 /jenkins/scripts/generate_filelist.py \\
                            /workspace/projects/${params.PROJECT_ID} \\
                            ${WORKSPACE_DIR}/run
                            
                        # Verify license connectivity
                        ${QUESTA_MODELTECH}/vlog -version || exit 1
                    """
                }
            }
        }
        
        stage('Compile') {
            steps {
                script {
                    sh """
                        cd ${WORKSPACE_DIR}/run
                        
                        # Create work library
                        ${QUESTA_MODELTECH}/vlib work
                        ${QUESTA_MODELTECH}/vmap work work
                        
                        # Compile with full paths
                        ${QUESTA_MODELTECH}/vlog -sv ${params.COMPILE_OPTS} \\
                            +incdir+../src +incdir+../src/include \\
                            -f filelist.f -l compile.log
                    """
                }
            }
        }
        
        stage('Execute') {
            parallel {
                stage('Simulation') {
                    when { params.JOB_TYPE == 'simulation' }
                    steps {
                        script {
                            sh """
                                cd ${WORKSPACE_DIR}/run
                                
                                # Optimization
                                ${QUESTA_MODELTECH}/vopt ${params.DUT_TOP} -o opt \\
                                    +acc=npr ${params.COMPILE_OPTS} -l vopt.log
                                
                                # Simulation
                                ${QUESTA_MODELTECH}/vsim -c opt \\
                                    ${params.COMPILE_OPTS} -l vsim.result \\
                                    -do "run ${params.SIMULATION_TIME}; quit -f; exit 0"
                            """
                        }
                    }
                }
                
                stage('Formal Verification') {
                    when { params.JOB_TYPE == 'formal' }
                    steps {
                        script {
                            sh """
                                cd ${WORKSPACE_DIR}/run
                                
                                # Create output directory
                                mkdir -p ${params.FORMAL_MODE}_result
                                
                                # Run formal verification
                                ${QUESTA_FORMAL}/qverify -c -licq \\
                                    -l ${params.FORMAL_MODE}.log \\
                                    -od ${params.FORMAL_MODE}_result \\
                                    -do "onerror {exit 1}; \\
                                         lint methodology standard -goal do-254; \\
                                         lint run -d ${params.DUT_TOP}; \\
                                         lint generate report -show_code_snippet -lines_count_before_violation 7;
                                         exit 0"
                            """
                        }
                    }
                }
            }
        }
        
        stage('Collect Results') {
            steps {
                script {
                    sh """
                        cd ${WORKSPACE_DIR}/run
                        
                        # Archive all result files
                        find . -name "*.log" -o -name "*.rpt" -o -name "*.wlf" \\
                            -o -name "*.vcd" | tar -czf results.tar.gz -T -
                        
                        # Copy results to web-accessible location
                        cp results.tar.gz /var/www/job-results/${JOB_ID}_results.tar.gz
                        
                        # Update job status via API
                        curl -X POST http://localhost:3000/api/jobs/${JOB_ID}/complete \\
                            -H "Content-Type: application/json" \\
                            -d '{"status":"completed","results_path":"${JOB_ID}_results.tar.gz"}'
                    """
                }
            }
        }
    }
    
    post {
        always {
            // Cleanup workspace but preserve results
            sh """
                if [ -d "${WORKSPACE_DIR}" ]; then
                    # Keep results but clean up temporary files
                    find ${WORKSPACE_DIR} -name "work" -type d -exec rm -rf {} + || true
                    find ${WORKSPACE_DIR} -name "*.tmp" -delete || true
                fi
            """
        }
        failure {
            script {
                // Notify web interface of failure
                sh """
                    curl -X POST http://localhost:3000/api/jobs/${JOB_ID}/failed \\
                        -H "Content-Type: application/json" \\
                        -d '{"status":"failed","error":"Pipeline execution failed"}'
                """
            }
        }
    }
}
```

#### 2.3.2 Automatic File List Generation
```python
# generate_filelist.py
import os
import json

def generate_filelist(project_path, job_path):
    """Generate filelist.f based on project structure"""
    src_files = []
    tb_files = []
    
    # Scan src directory
    src_dir = os.path.join(project_path, 'src')
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.v', '.sv')):
                rel_path = os.path.relpath(os.path.join(root, file), job_path)
                src_files.append(rel_path)
    
    # Scan tb directory
    tb_dir = os.path.join(project_path, 'tb')
    for root, dirs, files in os.walk(tb_dir):
        for file in files:
            if file.endswith(('.v', '.sv')):
                rel_path = os.path.relpath(os.path.join(root, file), job_path)
                tb_files.append(rel_path)
    
    # Generate filelist.f
    filelist_path = os.path.join(job_path, 'filelist.f')
    with open(filelist_path, 'w') as f:
        for src_file in src_files:
            f.write(f"{src_file}\n")
        for tb_file in tb_files:
            f.write(f"{tb_file}\n")
    
    return filelist_path
```

## 3. Security Implementation

### 3.1 File Upload Security
```typescript
// File validation middleware
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
    // Allowed file extensions
    const allowedExtensions = ['.v', '.sv', '.vh', '.svh', '.tcl'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }
};

// File size limits
const upload = multer({
    storage: diskStorage({
        destination: './uploads/',
        filename: (req, file, cb) => {
            const uniqueName = `${Date.now()}-${file.originalname}`;
            cb(null, uniqueName);
        }
    }),
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 50 // Maximum 50 files per upload
    }
});
```

### 3.2 System Environment Configuration

#### 3.2.1 Rocky Linux 9 Host Setup
```bash
# System dependencies for Node.js and Jenkins
sudo dnf install -y nodejs npm python3 python3-pip curl wget git

# Create application directories
sudo mkdir -p /workspace/projects /workspace/jobs /var/www/job-results
sudo chown -R jenkins:jenkins /workspace
sudo chown -R jenkins:jenkins /var/www/job-results

# Jenkins user environment setup
echo 'export QUESTA_MODELTECH=/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech' >> /var/lib/jenkins/.bashrc
echo 'export QUESTA_FORMAL=/opt/QOSF_2024.3/questa_static_formal/linux_x86_64' >> /var/lib/jenkins/.bashrc
echo 'export PATH=$QUESTA_MODELTECH:$QUESTA_FORMAL:$PATH' >> /var/lib/jenkins/.bashrc
echo 'export SALT_LICENSE_SERVER=29000@vbox' >> /var/lib/jenkins/.bashrc
echo 'export LM_LICENSE_FILE=29000@vbox' >> /var/lib/jenkins/.bashrc
```

#### 3.2.2 License Verification Script
```bash
#!/bin/bash
# /jenkins/scripts/verify_license.sh

export QUESTA_MODELTECH=/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech
export SALT_LICENSE_SERVER=29000@vbox
export LM_LICENSE_FILE=29000@vbox

# Test QuestaSim license
echo "Testing QuestaSim license..."
timeout 30 $QUESTA_MODELTECH/vlog -version
if [ $? -eq 0 ]; then
    echo "QuestaSim license OK"
else
    echo "QuestaSim license FAILED"
    exit 1
fi

# Test Questa Formal license  
echo "Testing Questa Formal license..."
timeout 30 /opt/QOSF_2024.3/questa_static_formal/linux_x86_64/qverify -version
if [ $? -eq 0 ]; then
    echo "Questa Formal license OK"
else
    echo "Questa Formal license FAILED"  
    exit 1
fi

echo "All licenses verified successfully"
```

#### 3.2.3 Security Configurations
```bash
# Sudoers configuration for Jenkins user
echo "jenkins ALL=(ALL) NOPASSWD: /opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech/vlog" >> /etc/sudoers
echo "jenkins ALL=(ALL) NOPASSWD: /opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech/vopt" >> /etc/sudoers  
echo "jenkins ALL=(ALL) NOPASSWD: /opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech/vsim" >> /etc/sudoers
echo "jenkins ALL=(ALL) NOPASSWD: /opt/QOSF_2024.3/questa_static_formal/linux_x86_64/qverify" >> /etc/sudoers

# File permissions
chmod +x /jenkins/scripts/verify_license.sh
chmod +x /jenkins/scripts/generate_filelist.py
```

## 4. Performance Optimization

### 4.1 License Management
```typescript
// License monitoring service with specific Rocky Linux 9 / QuestaSim 2024.3 integration
class LicenseManager {
    private isLicenseAvailable: boolean = true;
    private jobQueue: Job[] = [];
    private readonly QUESTA_MODELTECH = '/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech';
    private readonly QUESTA_FORMAL = '/opt/QOSF_2024.3/questa_static_formal/linux_x86_64';
    private readonly LICENSE_SERVER = '29000@vbox';
    
    async checkLicense(): Promise<boolean> {
        // Check QuestaSim license availability with specific paths
        try {
            const env = {
                ...process.env,
                SALT_LICENSE_SERVER: this.LICENSE_SERVER,
                LM_LICENSE_FILE: this.LICENSE_SERVER,
                PATH: `${this.QUESTA_MODELTECH}:${this.QUESTA_FORMAL}:${process.env.PATH}`
            };
            
            // Test both QuestaSim and Questa Formal licenses
            const vlogResult = await exec(`${this.QUESTA_MODELTECH}/vlog -version`, { env, timeout: 30000 });
            const qverifyResult = await exec(`${this.QUESTA_FORMAL}/qverify -version`, { env, timeout: 30000 });
            
            return vlogResult.exitCode === 0 && qverifyResult.exitCode === 0;
        } catch (error) {
            console.error('License check failed:', error);
            return false;
        }
    }
    
    async queueJob(job: Job): Promise<void> {
        // Check license before queueing
        const licenseAvailable = await this.checkLicense();
        
        if (licenseAvailable && this.isLicenseAvailable) {
            this.isLicenseAvailable = false;
            await this.executeJob(job);
        } else {
            console.log(`Job ${job.id} queued - license not available`);
            this.jobQueue.push(job);
            
            // Update job status to queued
            await this.updateJobStatus(job.id, 'queued');
        }
    }
    
    async onJobComplete(jobId: string): Promise<void> {
        console.log(`Job ${jobId} completed, releasing license`);
        this.isLicenseAvailable = true;
        
        if (this.jobQueue.length > 0) {
            const nextJob = this.jobQueue.shift();
            console.log(`Processing next job: ${nextJob.id}`);
            this.isLicenseAvailable = false;
            await this.executeJob(nextJob);
        }
    }
    
    private async executeJob(job: Job): Promise<void> {
        try {
            await this.updateJobStatus(job.id, 'running');
            
            // Trigger Jenkins pipeline with specific parameters
            const jenkinsParams = {
                PROJECT_ID: job.projectId,
                JOB_TYPE: job.type,
                SIMULATION_TIME: job.simulationTime || '1us',
                DUT_TOP: job.dutTop,
                FORMAL_MODE: job.formalMode || 'lint'
            };
            
            await this.triggerJenkinsPipeline(jenkinsParams);
        } catch (error) {
            console.error(`Job ${job.id} execution failed:`, error);
            await this.updateJobStatus(job.id, 'failed');
            await this.onJobComplete(job.id); // Release license on failure
        }
    }
    
    private async updateJobStatus(jobId: string, status: string): Promise<void> {
        // Implementation to update job status in database/API
    }
    
    private async triggerJenkinsPipeline(params: any): Promise<void> {
        // Implementation to trigger Jenkins pipeline
    }
}
```

### 4.2 File System Optimization
```typescript
// Cleanup service
class CleanupService {
    async cleanupOldJobs(): Promise<void> {
        const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
        
        const oldJobs = await Job.findAll({
            where: {
                completedAt: { [Op.lt]: cutoffDate },
                status: 'completed'
            }
        });
        
        for (const job of oldJobs) {
            await this.archiveJobResults(job);
            await this.deleteJobWorkspace(job);
        }
    }
}
```

## 5. Rocky Linux 9 System Setup Guide

### 5.1 Prerequisites Verification
```bash
# Verify QuestaSim installation
ls -la /opt/QOSF_2024.3/questa_static_formal/linux_x86_64/
ls -la /opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech/

# Test license connectivity
export SALT_LICENSE_SERVER=29000@vbox
export LM_LICENSE_FILE=29000@vbox
/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech/vlog -version
/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/qverify -version
```

### 5.2 System Dependencies Installation
```bash
# Install Node.js 18.x (latest LTS)
sudo dnf module install nodejs:18/common -y

# Install Jenkins
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
sudo dnf install jenkins -y

# Install additional tools
sudo dnf install -y python3 python3-pip git curl wget tar gzip

# Install PM2 for Node.js process management
sudo npm install -g pm2
```

### 5.3 Directory Structure Setup
```bash
# Create main workspace structure
sudo mkdir -p /workspace/{projects,jobs}
sudo mkdir -p /var/www/job-results
sudo mkdir -p /jenkins/scripts

# Set permissions
sudo useradd -r -s /bin/bash -d /var/lib/jenkins jenkins || true
sudo chown -R jenkins:jenkins /workspace
sudo chown -R jenkins:jenkins /var/www/job-results
sudo chown -R jenkins:jenkins /jenkins/scripts

# Create log directories
sudo mkdir -p /var/log/questasim-web
sudo chown -R jenkins:jenkins /var/log/questasim-web
```

### 5.4 Environment Configuration
```bash
# Create system-wide environment file
sudo tee /etc/environment >> EOF
QUESTA_MODELTECH=/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech
QUESTA_FORMAL=/opt/QOSF_2024.3/questa_static_formal/linux_x86_64
SALT_LICENSE_SERVER=29000@vbox
LM_LICENSE_FILE=29000@vbox
EOF

# Update Jenkins user profile
sudo tee -a /var/lib/jenkins/.bashrc >> EOF
export QUESTA_MODELTECH=/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech
export QUESTA_FORMAL=/opt/QOSF_2024.3/questa_static_formal/linux_x86_64
export PATH=\$QUESTA_MODELTECH:\$QUESTA_FORMAL:\$PATH
export SALT_LICENSE_SERVER=29000@vbox
export LM_LICENSE_FILE=29000@vbox
EOF

# Reload environment
source /etc/environment
sudo -u jenkins bash -c "source /var/lib/jenkins/.bashrc"
```

### 5.5 Firewall and Security Setup
```bash
# Open required ports (adjust as needed)
sudo firewall-cmd --permanent --add-port=8080/tcp   # Jenkins
sudo firewall-cmd --permanent --add-port=3000/tcp   # Web API
sudo firewall-cmd --permanent --add-port=3001/tcp   # Web Frontend
sudo firewall-cmd --reload

# SELinux configuration (if enabled)
sudo setsebool -P httpd_can_network_connect 1
sudo setsebool -P jenkins_enable_ftp 1
```

## 6. Implementation Phases

### Phase 1: Core Infrastructure (4 weeks)
- Basic project structure setup
- File upload functionality
- Jenkins integration setup
- Basic simulation workflow

### Phase 2: Advanced Features (3 weeks)
- Formal verification integration
- Real-time monitoring
- Result visualization
- Error handling

### Phase 3: User Experience (2 weeks)
- UI/UX improvements
- Performance optimization
- Security hardening
- Documentation

### Phase 4: Testing & Deployment (2 weeks)
- Integration testing
- Performance testing
- Security testing
- Production deployment

## 7. Risk Mitigation

### 7.1 Technical Risks
- **License Conflicts**: Implement robust license monitoring
- **File Corruption**: Implement file integrity checks
- **Process Hanging**: Implement timeouts and process monitoring

### 7.2 Operational Risks
- **Resource Exhaustion**: Implement resource monitoring and limits
- **Security Vulnerabilities**: Regular security audits and updates
- **Data Loss**: Implement backup and recovery procedures

## 8. Success Metrics

### 8.1 Performance Metrics
- Job completion time: < 5 minutes for typical simulations
- System availability: > 99%
- File upload success rate: > 99%

### 8.2 User Experience Metrics
- User onboarding time: < 30 minutes
- Error resolution time: < 2 minutes
- User satisfaction score: > 4.5/5

## Conclusion

The QuestaSim Web Interface System is not only feasible but also represents a valuable improvement in accessibility and usability for HDL simulation and formal verification workflows. The proposed architecture leverages proven technologies and follows best practices for security, performance, and maintainability.

The implementation can be completed in approximately 11 weeks with a small development team (2-3 developers) and will provide significant value to users by eliminating the need for complex command-line operations while maintaining the full power of QuestaSim and Questa Formal tools.