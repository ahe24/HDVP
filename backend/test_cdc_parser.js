const fs = require('fs');
const path = require('path');

// Import the CDC parser
const { CDCReportParser } = require('./dist/utils/cdcReportParser');

async function testCDCParser() {
  try {
    const cdcReportPath = path.join(__dirname, '../workspace/jobs/7da90703-e1fa-45f5-a0db-77aa57f11c4f/run/CDC_Results/cdc_detail.rpt');
    
    console.log('🔍 Testing CDC parser with file:', cdcReportPath);
    
    // Check if file exists
    if (!fs.existsSync(cdcReportPath)) {
      console.error('❌ CDC report file not found');
      return;
    }
    
    // Parse the CDC report
    const cdcData = await CDCReportParser.parseCDCReport(cdcReportPath);
    
    console.log('✅ CDC parsing completed');
    console.log('📊 Summary:', cdcData.summary);
    console.log('🚨 Violations count:', cdcData.violations.length);
    console.log('⚠️  Cautions count:', cdcData.cautions.length);
    console.log('✅ Evaluations count:', cdcData.evaluations.length);
    
    if (cdcData.violations.length > 0) {
      console.log('🚨 Sample violation:', cdcData.violations[0]);
    }
    
    if (cdcData.cautions.length > 0) {
      console.log('⚠️  Sample caution:', cdcData.cautions[0]);
    }
    
    if (cdcData.evaluations.length > 0) {
      console.log('✅ Sample evaluation:', cdcData.evaluations[0]);
    }
    
  } catch (error) {
    console.error('❌ CDC parser test failed:', error);
  }
}

testCDCParser(); 