const fs = require('fs').promises;
const path = require('path');

// Simulate the logs endpoint logic
async function testLogsEndpoint() {
  const jobId = 'fd65d7ee-0341-4b5a-8e8e-4159b91290f9';
  const runDir = path.join('../workspace/jobs', jobId, 'run');
  
  console.log('Testing logs endpoint logic for job:', jobId);
  console.log('Run directory:', runDir);
  
  try {
    const files = await fs.readdir(runDir);
    const logFiles = [];
    
    console.log('\nFiles in run directory:', files);
    
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
    
    console.log('\nLog files found in run directory:', logFiles.length);
    logFiles.forEach(f => console.log(`  - ${f.filename} (${f.description})`));
    
    // Check for formal verification log files in Lint_result subdirectory
    const lintResultDir = path.join(runDir, 'Lint_result');
    try {
      const lintStats = await fs.stat(lintResultDir);
      if (lintStats.isDirectory()) {
        const lintFiles = await fs.readdir(lintResultDir);
        console.log('\nFiles in Lint_result directory:', lintFiles);
        
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
    } catch (error) {
      console.log('\nLint_result directory not found or not accessible');
    }
    
    // Check for CDC verification log files in CDC_Results subdirectory
    const cdcResultDir = path.join(runDir, 'CDC_Results');
    try {
      const cdcStats = await fs.stat(cdcResultDir);
      if (cdcStats.isDirectory()) {
        const cdcFiles = await fs.readdir(cdcResultDir);
        console.log('\nFiles in CDC_Results directory:', cdcFiles);
        
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
    } catch (error) {
      console.log('\nCDC_Results directory not found or not accessible');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`Total log files found: ${logFiles.length}`);
    console.log('='.repeat(80));
    
    logFiles.forEach(f => {
      console.log(`${f.filename.padEnd(30)} | ${f.stage.padEnd(10)} | ${f.description}`);
    });
    
  } catch (error) {
    console.error('Error testing logs endpoint:', error);
  }
}

// Helper function to get log file descriptions (copied from backend)
function getLogDescription(filename) {
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

testLogsEndpoint(); 