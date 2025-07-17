import * as XLSX from 'xlsx';

export interface TestPlanEntry {
  title: string;
  requirementId: string;
  testPlanId: string;
  description?: string;
  priority?: string;
  status?: string;
}

export interface ParsedTestPlan {
  filename: string;
  entries: TestPlanEntry[];
  totalCount: number;
  validCount: number;
}

export function parseTestPlanExcel(buffer: Buffer, filename: string): ParsedTestPlan {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row');
    }
    
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1) as any[][];
    
    // Debug: Log the actual headers found
    console.log('📊 Excel headers found:', headers);
    console.log('📊 Using fixed column positions: [0]=Title, [1]=Test ID, [2]=Type, [3]=Requirement ID');
    
    // Fixed column positions - no column name detection needed
    const titleIndex = 0;        // 1st column: test title
    const testPlanIndex = 1;     // 2nd column: test ID (testcase ID)
    const typeIndex = 2;         // 3rd column: type (test type)
    const requirementIndex = 3;  // 4th column: verifies (requirement ID)
    
    // Validate minimum columns exist
    if (headers.length < 4) {
      throw new Error(`Excel file must have at least 4 columns. Found ${headers.length} columns: [${headers.join(', ')}]. Expected order: Title, Test ID, Type, Requirement ID`);
    }
    
    console.log(`📊 Column mapping by position: Title[0]="${headers[0]}", TestID[1]="${headers[1]}", Type[2]="${headers[2]}", RequirementID[3]="${headers[3]}"`);
    
    const entries: TestPlanEntry[] = [];
    let validCount = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
        continue;
      }
      
      const title = row[titleIndex]?.toString().trim();
      const testPlanId = row[testPlanIndex]?.toString().trim();
      const type = row[typeIndex]?.toString().trim();
      const requirementId = row[requirementIndex]?.toString().trim();
      
      // Skip rows with missing required fields
      if (!title || !testPlanId || !requirementId) {
        console.log(`⚠️ Skipping row ${i + 2}: Missing required fields - Title: "${title}", TestID: "${testPlanId}", RequirementID: "${requirementId}"`);
        continue;
      }
      
      const entry: TestPlanEntry = {
        title,
        testPlanId,
        requirementId,
        description: type, // Store type in description field for now
        priority: undefined, // Not used with position-based parsing
        status: undefined    // Not used with position-based parsing
      };
      
      entries.push(entry);
      validCount++;
    }
    
    console.log(`📊 Parsed ${validCount} valid entries out of ${dataRows.length} total rows`);
    
    return {
      filename,
      entries,
      totalCount: dataRows.length,
      validCount
    };
  } catch (error) {
    console.error('❌ Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateTestPlanEntries(entries: TestPlanEntry[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (entries.length === 0) {
    errors.push('No valid test plan entries found');
  }
  const testPlanIds = new Set<string>();
  const requirementIds = new Set<string>();
  entries.forEach((entry, index) => {
    if (!entry.testPlanId) {
      errors.push(`Row ${index + 1}: Test Plan ID is required`);
    } else if (testPlanIds.has(entry.testPlanId)) {
      errors.push(`Row ${index + 1}: Duplicate Test Plan ID: ${entry.testPlanId}`);
    } else {
      testPlanIds.add(entry.testPlanId);
    }
    if (!entry.requirementId) {
      errors.push(`Row ${index + 1}: Requirement ID is required`);
    } else {
      requirementIds.add(entry.requirementId);
    }
    if (!entry.title) {
      errors.push(`Row ${index + 1}: Title is required`);
    }
  });
  return {
    valid: errors.length === 0,
    errors
  };
} 