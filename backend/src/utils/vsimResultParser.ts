/**
 * Utility for parsing vsim.result files to extract test case results
 */

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

export class VsimResultParser {
  /**
   * Parse vsim.result file content
   */
  static parseContent(content: string): VsimResultSummary {
    const lines = content.split('\n');
    
    // Extract individual test occurrences
    const occurrences = this.extractTestOccurrences(lines);
    
    // Extract execution metadata
    const metadata = this.extractMetadata(lines);
    
    // Create test results from occurrences only
    const testResults = this.createResultsFromOccurrences(occurrences);
    
    // Calculate overall statistics
    const stats = this.calculateStatistics(testResults);
    
    return {
      testResults,
      totalTests: stats.totalTests,
      passedTests: stats.passedTests,
      failedTests: stats.failedTests,
      notTestedTests: stats.notTestedTests,
      executionTime: metadata.executionTime,
      errorCount: metadata.errorCount,
      warningCount: metadata.warningCount
    };
  }
  
  /**
   * Extract individual test occurrences from log lines
   * Pattern: #                   55        [TC-HLR-002] => PASS : fsm_transition_stable
   */
  private static extractTestOccurrences(lines: string[]): Map<string, TestOccurrence[]> {
    const occurrences = new Map<string, TestOccurrence[]>();
    
    for (const line of lines) {
      // Updated regex to handle multiple spaces instead of tab
      const match = line.match(/^#\s*(\d+)\s+\[([TC-\w-]+)\]\s+=>\s+(PASS|FAIL)\s+:\s+(.+)$/);
      if (match) {
        const [, timeStamp, testId, status, description] = match;
        
        if (!occurrences.has(testId)) {
          occurrences.set(testId, []);
        }
        
        occurrences.get(testId)!.push({
          timeStamp,
          status: status as 'PASS' | 'FAIL',
          description: description.trim()
        });
      }
    }
    
    return occurrences;
  }
  
  /**
   * Create test results from individual occurrences only
   */
  private static createResultsFromOccurrences(occurrences: Map<string, TestOccurrence[]>): TestCaseResult[] {
    const testResults: TestCaseResult[] = [];
    
    for (const [testId, occurrenceList] of occurrences) {
      // Get test name from first occurrence description
      const testName = occurrenceList.length > 0 ? occurrenceList[0].description : testId;
      
      // Calculate counts from all occurrences
      const passCount = occurrenceList.filter(o => o.status === 'PASS').length;
      const failCount = occurrenceList.filter(o => o.status === 'FAIL').length;
      
      // Determine overall status: FAIL if any failures, otherwise PASS
      const status = failCount > 0 ? 'FAIL' : 'PASS';
      
      testResults.push({
        testId,
        name: testName,
        status,
        passCount,
        failCount,
        totalRuns: passCount + failCount,
        occurrences: occurrenceList
      });
    }
    
    return testResults.sort((a, b) => a.testId.localeCompare(b.testId));
  }
  
  /**
   * Extract execution metadata
   */
  private static extractMetadata(lines: string[]): {
    executionTime?: string;
    errorCount: number;
    warningCount: number;
  } {
    let executionTime: string | undefined;
    let errorCount = 0;
    let warningCount = 0;
    
    for (const line of lines) {
      // Extract execution time
      const timeMatch = line.match(/^# End time:.*Elapsed time:\s*(.+)$/);
      if (timeMatch) {
        executionTime = timeMatch[1];
      }
      
      // Count errors and warnings
      const errorWarningMatch = line.match(/^# Errors:\s*(\d+),\s*Warnings:\s*(\d+)/);
      if (errorWarningMatch) {
        errorCount = parseInt(errorWarningMatch[1]);
        warningCount = parseInt(errorWarningMatch[2]);
      }
    }
    
    return { executionTime, errorCount, warningCount };
  }

  /**
   * Calculate overall statistics
   */
  private static calculateStatistics(testResults: TestCaseResult[]): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    notTestedTests: number;
  } {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(t => t.status === 'PASS').length;
    const failedTests = testResults.filter(t => t.status === 'FAIL').length;
    const notTestedTests = testResults.filter(t => t.status === 'NOT_TESTED').length;
    
    return { totalTests, passedTests, failedTests, notTestedTests };
  }
} 