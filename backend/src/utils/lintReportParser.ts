import { promises as fs } from 'fs';
import path from 'path';

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

export class LintReportParser {
  /**
   * Parse a lint.rpt file and extract structured data
   */
  static async parseLintReport(filePath: string): Promise<LintReportData> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseContent(content);
    } catch (error) {
      throw new Error(`Failed to parse lint report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse lint report content string
   */
  static parseContent(content: string): LintReportData {
    const lines = content.split('\n');
    
    // Extract header information
    const designQualityScore = this.extractQualityScore(content);
    const design = this.extractDesign(content);
    const timestamp = this.extractTimestamp(content);
    const database = this.extractDatabase(content);
    
    // Extract Section 1: Check Summary
    const { summary, checkSummary } = this.extractCheckSummary(content);
    
    // Extract Section 2: Check Details
    const checkDetails = this.extractCheckDetails(content);
    
    // Extract Section 3: Design Information (optional)
    const designInfo = this.extractDesignInfo(content);

    return {
      designQualityScore,
      design,
      timestamp,
      database,
      summary,
      checkSummary,
      checkDetails,
      designInfo
    };
  }

  private static extractQualityScore(content: string): number {
    const match = content.match(/Design Quality Score\s*:\s*([\d.]+)%/);
    return match ? parseFloat(match[1]) : 0;
  }

  private static extractDesign(content: string): string {
    const match = content.match(/Design\s*:\s*(.+)/);
    return match ? match[1].trim() : '';
  }

  private static extractTimestamp(content: string): string {
    const match = content.match(/Timestamp\s*:\s*(.+)/);
    return match ? match[1].trim() : '';
  }

  private static extractDatabase(content: string): string {
    const match = content.match(/Database\s*:\s*(.+)/);
    return match ? match[1].trim() : '';
  }

  private static extractCheckSummary(content: string): { summary: LintReportData['summary'], checkSummary: LintCheckSummary } {
    const section1Match = content.match(/Section 1 : Check Summary\s*\n=+\s*\n([\s\S]*?)=+\s*\nSection 2/);
    
    if (!section1Match) {
      return {
        summary: { error: 0, warning: 0, info: 0 },
        checkSummary: { error: {}, warning: {}, info: {}, resolved: {} }
      };
    }

    const section1Content = section1Match[1];
    const summary = { error: 0, warning: 0, info: 0 };
    const checkSummary: LintCheckSummary = { error: {}, warning: {}, info: {}, resolved: {} };

    // Extract totals from section headers
    const errorMatch = section1Content.match(/Error \((\d+)\)/);
    const warningMatch = section1Content.match(/Warning \((\d+)\)/);
    const infoMatch = section1Content.match(/Info \((\d+)\)/);
    const resolvedMatch = section1Content.match(/Resolved \((\d+)\)/);

    summary.error = errorMatch ? parseInt(errorMatch[1]) : 0;
    summary.warning = warningMatch ? parseInt(warningMatch[1]) : 0;
    summary.info = infoMatch ? parseInt(infoMatch[1]) : 0;

    // Extract individual check counts
    const checkLines = section1Content.split('\n').filter(line => line.includes(':') && /\d+$/.test(line.trim()));
    
    checkLines.forEach(line => {
      const match = line.match(/(.+?)\s*:\s*(\d+)$/);
      if (match) {
        const checkName = match[1].trim();
        const count = parseInt(match[2]);
        
        // Determine severity based on which section this line appears in
        if (section1Content.indexOf(line) < section1Content.indexOf('Warning')) {
          checkSummary.error[checkName] = count;
        } else if (section1Content.indexOf(line) < section1Content.indexOf('Info')) {
          checkSummary.warning[checkName] = count;
        } else if (section1Content.indexOf(line) < section1Content.indexOf('Resolved')) {
          checkSummary.info[checkName] = count;
        } else {
          checkSummary.resolved[checkName] = count;
        }
      }
    });

    return { summary, checkSummary };
  }

  private static extractCheckDetails(content: string): LintCheckDetail[] {
    const section2Match = content.match(/Section 2 : Check Details\s*\n=+\s*\n([\s\S]*?)(?:=+\s*\nSection 3|$)/);
    
    if (!section2Match) {
      return [];
    }

    const section2Content = section2Match[1];
    const checkDetails: LintCheckDetail[] = [];

    // Split by severity sections
    const severitySections = section2Content.split(/\n-+\n\| (Error|Warning|Info|Resolved) \(\d+\) \|\n-+\n/);
    
    // Handle the first part (Error section) which comes before any captured groups
    if (severitySections[0] && severitySections[0].includes('Error (')) {
      // The first part contains the Error section
      const errorSection = severitySections[0];
      
      // Extract individual checks from Error section
      const checkBlocks = errorSection.split(/\n\nCheck: /);
      
      checkBlocks.forEach((block, index) => {
        if (!block.trim()) return;
        
        // Add "Check: " prefix back for all but the first block
        const fullBlock = index === 0 ? block : `Check: ${block}`;
        
        // Only process if it actually contains a check (has the Check: header)
        if (fullBlock.includes('Check:') && fullBlock.includes('[Category:')) {
          const checkDetail = this.parseCheckBlock(fullBlock, 'error');
          
          if (checkDetail) {
            checkDetails.push(checkDetail);
          }
        }
      });
    }
    
    // Handle the remaining severity sections (start from index 1)
    for (let i = 1; i < severitySections.length; i += 2) {
      const severity = severitySections[i].toLowerCase() as 'error' | 'warning' | 'info' | 'resolved';
      const sectionContent = severitySections[i + 1];
      
      if (!sectionContent) continue;

      // Extract individual checks
      const checkBlocks = sectionContent.split(/\n\nCheck: /);
      
      checkBlocks.forEach((block, index) => {
        if (!block.trim()) return;
        
        // Add "Check: " prefix back for all but the first block
        const fullBlock = index === 0 ? block : `Check: ${block}`;
        const checkDetail = this.parseCheckBlock(fullBlock, severity);
        
        if (checkDetail) {
          checkDetails.push(checkDetail);
        }
      });
    }

    return checkDetails;
  }

  private static parseCheckBlock(block: string, severity: 'error' | 'warning' | 'info' | 'resolved'): LintCheckDetail | null {
    const lines = block.split('\n');
    
    // Find the line with the check header (might not be the first line)
    let headerMatch = null;
    let headerLineIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/Check: (.+?) \[Category: (.+?)\] \[Alias: (.+?)\]/);
      if (match) {
        headerMatch = match;
        headerLineIndex = i;
        break;
      }
    }
    
    if (!headerMatch) return null;

    const checkName = headerMatch[1].trim();
    const category = headerMatch[2].trim();
    const alias = headerMatch[3].trim();

    // Extract message from the line after the header line
    let message = '';
    if (headerLineIndex + 1 < lines.length) {
      const messageMatch = lines[headerLineIndex + 1]?.match(/\[Message: (.+?)\]/);
      message = messageMatch ? messageMatch[1] : '';
    }

    // Extract violations - look for all lines that start with the check name followed by ":"
    const violations: LintViolation[] = [];
    
    // Find the start of violations (after the dashed line)
    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^-+$/)) {
        startIndex = i + 1;
        break;
      }
    }

    if (startIndex >= 0) {
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Check if this line is a violation (starts with check name or contains [uninspected]/[inspected])
        if (line.startsWith(checkName + ':') || line.includes('[uninspected]') || line.includes('[inspected]')) {
          const violation = this.parseViolationLine(line);
          if (violation) {
            violations.push(violation);
          }
        }
        // Also handle additional occurrence lines like "10 more occurrences at: line 33, line 34..."
        else if (line.includes('more occurrences at:')) {
          // Parse the additional occurrences
          const occurrenceMatch = line.match(/(\d+) more occurrences at: (.+)/);
          if (occurrenceMatch) {
            const count = parseInt(occurrenceMatch[1]);
            const locations = occurrenceMatch[2];
            
            // Extract line numbers from the locations string
            const lineMatches = [...locations.matchAll(/line (\d+)/g)];
            for (const match of lineMatches) {
              const lineNum = parseInt(match[1]);
              // Create additional violations for each occurrence
              // Use the last valid violation as a template
              if (violations.length > 0) {
                const lastViolation = violations[violations.length - 1];
                violations.push({
                  description: lastViolation.description,
                  file: lastViolation.file,
                  line: lineNum,
                  module: lastViolation.module,
                  hierarchy: lastViolation.hierarchy,
                  additionalInfo: `Additional occurrence`
                });
              }
            }
          }
        }
      }
    }

    return {
      checkName,
      category,
      alias,
      message,
      severity,
      violations
    };
  }

  private static parseViolationLine(line: string): LintViolation | null {
    // Remove the inspection status
    const cleanLine = line.replace(/\[(uninspected|inspected)\]/, '').trim();
    
    // Extract file path and line number
    const fileMatch = cleanLine.match(/File '([^']+)', Line '?(\d+)'?/);
    const moduleMatch = cleanLine.match(/Module '([^']+)'/);
    const hierarchyMatch = cleanLine.match(/\[Example Hierarchy:([^\]]+)\]/);
    
    return {
      description: cleanLine.split('[Example Hierarchy:')[0].trim(),
      file: fileMatch ? fileMatch[1] : undefined,
      line: fileMatch ? parseInt(fileMatch[2]) : undefined,
      module: moduleMatch ? moduleMatch[1] : undefined,
      hierarchy: hierarchyMatch ? hierarchyMatch[1] : undefined
    };
  }

  private static extractDesignInfo(content: string): LintReportData['designInfo'] | undefined {
    const section3Match = content.match(/Section 3 : Design Information\s*\n=+\s*\n[\s\S]*?Summary[\s\S]*?\n-+\s*\n([\s\S]*?)$/);
    
    if (!section3Match) return undefined;

    const section3Content = section3Match[1];
    const info: LintReportData['designInfo'] = {};

    const registerBitsMatch = section3Content.match(/Register Bits\s*:\s*(\d+)/);
    const latchBitsMatch = section3Content.match(/Latch Bits\s*:\s*(\d+)/);
    const blackboxesMatch = section3Content.match(/User-specified Blackboxes\s*:\s*(\d+)/);
    const emptyModulesMatch = section3Content.match(/Empty Modules\s*:\s*(\d+)/);
    const unresolvedModulesMatch = section3Content.match(/Unresolved Modules\s*:\s*(\d+)/);

    if (registerBitsMatch) info.registerBits = parseInt(registerBitsMatch[1]);
    if (latchBitsMatch) info.latchBits = parseInt(latchBitsMatch[1]);
    if (blackboxesMatch) info.blackboxes = parseInt(blackboxesMatch[1]);
    if (emptyModulesMatch) info.emptyModules = parseInt(emptyModulesMatch[1]);
    if (unresolvedModulesMatch) info.unresolvedModules = parseInt(unresolvedModulesMatch[1]);

    return Object.keys(info).length > 0 ? info : undefined;
  }
} 