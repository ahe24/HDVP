import { promises as fs } from 'fs';
import path from 'path';

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

export class CDCReportParser {
  /**
   * Parse a cdc_detail.rpt file and extract structured data
   */
  static async parseCDCReport(filePath: string): Promise<CDCReportData> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseContent(content);
    } catch (error) {
      throw new Error(`Failed to parse CDC report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse CDC report content string
   */
  static parseContent(content: string): CDCReportData {
    const lines = content.split('\n');
    
    // Extract header information
    const design = this.extractDesign(content);
    const timestamp = this.extractTimestamp(content);
    
    console.log('🔍 CDC Parser - Design:', design);
    console.log('🔍 CDC Parser - Timestamp:', timestamp);
    
    // Extract Section 3: CDC Results
    const { summary, violations, cautions, evaluations } = this.extractCDCResults(content);
    
    console.log('🔍 CDC Parser - Summary:', summary);
    console.log('🔍 CDC Parser - Violations count:', violations.length);
    console.log('🔍 CDC Parser - Cautions count:', cautions.length);
    console.log('🔍 CDC Parser - Evaluations count:', evaluations.length);
    
    // Extract Section 9: Design Information (optional)
    const designInfo = this.extractDesignInfo(content);

    return {
      design,
      timestamp,
      summary,
      violations,
      cautions,
      evaluations,
      designInfo
    };
  }

  private static extractDesign(content: string): string {
    const match = content.match(/Clock Group Summary for '([^']+)'/);
    return match ? match[1] : 'Unknown Design';
  }

  private static extractTimestamp(content: string): string {
    const match = content.match(/Created (.+?)\n/);
    return match ? match[1] : new Date().toISOString();
  }

  private static extractCDCResults(content: string): { 
    summary: CDCSummary; 
    violations: CDCDetail[]; 
    cautions: CDCDetail[]; 
    evaluations: CDCDetail[] 
  } {
    const section3Match = content.match(/Section 3 : CDC Results\s*\n=+\s*\n([\s\S]*?)=+\s*\nSection 4/);
    
    if (!section3Match) {
      return {
        summary: { totalChecks: 0, violations: 0, cautions: 0, evaluations: 0 },
        violations: [],
        cautions: [],
        evaluations: []
      };
    }

    const section3Content = section3Match[1];
    
    // Extract summary
    const summary = this.extractSummary(section3Content);
    
    // Extract details for each category
    const violations = this.extractViolations(section3Content);
    const cautions = this.extractCautions(section3Content);
    const evaluations = this.extractEvaluations(section3Content);

    return { summary, violations, cautions, evaluations };
  }

  private static extractSummary(content: string): CDCSummary {
    const totalChecksMatch = content.match(/Total number of checks\s*\((\d+)\)/);
    const violationsMatch = content.match(/Violations\s*\((\d+)\)/);
    const cautionsMatch = content.match(/Cautions\s*\((\d+)\)/);
    const evaluationsMatch = content.match(/Evaluations\s*\((\d+)\)/);

    return {
      totalChecks: totalChecksMatch ? parseInt(totalChecksMatch[1]) : 0,
      violations: violationsMatch ? parseInt(violationsMatch[1]) : 0,
      cautions: cautionsMatch ? parseInt(cautionsMatch[1]) : 0,
      evaluations: evaluationsMatch ? parseInt(evaluationsMatch[1]) : 0
    };
  }

  private static extractViolations(content: string): CDCDetail[] {
    // Look for the Violations section - it starts with "Violations" followed by "================================================================="
    const violationsMatch = content.match(/Violations\s*\n=+\s*\n([\s\S]*?)(?:\n\nCautions|$)/);
    if (!violationsMatch) {
      console.log('🔍 No Violations section found');
      return [];
    }

    const violationsContent = violationsMatch[1];
    console.log('🔍 Violations content found:', violationsContent.substring(0, 200) + '...');
    
    const violations: CDCDetail[] = [];

    // Find all issue types in the violations section
    const issueTypeMatches = violationsContent.matchAll(/([^.\n]+)\.\s*\(([^)]+)\)\s*\n-+\n([\s\S]*?)(?=\n\n[^.\n]+\.\s*\([^)]+\)|$)/g);
    
    for (const match of issueTypeMatches) {
      const issueType = match[1].trim();
      const category = match[2].trim();
      const dataSection = match[3];
      
      console.log(`🔍 Found issue type: "${issueType}" with category: "${category}"`);
      console.log(`🔍 Data section:`, dataSection.substring(0, 100) + '...');
      
      // Parse the data section for this issue type
      const lines = dataSection.split('\n');
      let currentStart: any = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('---')) continue;
        
        console.log(`🔍 Processing line: "${trimmedLine}"`);
        
        // Check if this is a start line (contains "start :")
        const startMatch = trimmedLine.match(/^([^:]+)\s*:\s*start\s*:\s*([^\s]+)\s*\(([^:]+)\s*:\s*(\d+)\)/);
        if (startMatch) {
          currentStart = {
            clock: startMatch[1].trim(),
            signal: startMatch[2].trim(),
            file: startMatch[3].split('/').pop() || startMatch[3],
            line: parseInt(startMatch[4])
          };
          console.log('🔍 Found start:', currentStart);
          continue;
        }
        
        // Check if this is an end line (contains "end :")
        const endMatch = trimmedLine.match(/^([^:]+)\s*:\s*end\s*:\s*([^\s]+)\s*\(([^:]+)\s*:\s*(\d+)\)/);
        if (endMatch && currentStart) {
          const end = {
            clock: endMatch[1].trim(),
            signal: endMatch[2].trim(),
            file: endMatch[3].split('/').pop() || endMatch[3],
            line: parseInt(endMatch[4])
          };
          
          console.log('🔍 Found end:', end);
          
          // Extract additional info (ID, Status, Base Type)
          const idMatch = trimmedLine.match(/\(ID:([^)]+)\)/);
          const baseTypeMatch = trimmedLine.match(/Base Type\s*:\s*([^\n]+)/);
          
          const violation = {
            category,
            issueType,
            start: currentStart,
            end,
            additionalInfo: baseTypeMatch ? baseTypeMatch[1].trim() : undefined,
            synchronizerId: idMatch ? idMatch[1].trim() : undefined
          };
          
          console.log('🔍 Created violation:', violation);
          violations.push(violation);
          
          currentStart = null;
        }
      }
    }

    console.log('🔍 Extracted violations:', violations.length, violations);
    return violations;
  }

  private static extractCautions(content: string): CDCDetail[] {
    // Look for the Cautions section - it starts with "Cautions" followed by "================================================================="
    const cautionsMatch = content.match(/Cautions\s*\n=+\s*\n([\s\S]*?)(?:\n\nEvaluations|$)/);
    if (!cautionsMatch) {
      console.log('🔍 No Cautions section found');
      return [];
    }

    const cautionsContent = cautionsMatch[1];
    console.log('🔍 Cautions content found:', cautionsContent.substring(0, 200) + '...');
    
    const cautions: CDCDetail[] = [];

    // Find all issue types in the cautions section
    const issueTypeMatches = cautionsContent.matchAll(/([^.\n]+)\.\s*\(([^)]+)\)\s*\n-+\n([\s\S]*?)(?=\n\n[^.\n]+\.\s*\([^)]+\)|$)/g);
    
    for (const match of issueTypeMatches) {
      const issueType = match[1].trim();
      const category = match[2].trim();
      const dataSection = match[3];
      
      console.log(`🔍 Found issue type: "${issueType}" with category: "${category}"`);
      console.log(`🔍 Data section:`, dataSection.substring(0, 100) + '...');
      
      // Parse the data section for this issue type
      const lines = dataSection.split('\n');
      let currentStart: any = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('---')) continue;
        
        console.log(`🔍 Processing line: "${trimmedLine}"`);
        
        // Check if this is a start line (contains "start :")
        const startMatch = trimmedLine.match(/^([^:]+)\s*:\s*start\s*:\s*([^\s]+)\s*\(([^:]+)\s*:\s*(\d+)\)/);
        if (startMatch) {
          currentStart = {
            clock: startMatch[1].trim(),
            signal: startMatch[2].trim(),
            file: startMatch[3].split('/').pop() || startMatch[3],
            line: parseInt(startMatch[4])
          };
          console.log('🔍 Found start:', currentStart);
          continue;
        }
        
        // Check if this is an end line (contains "end :")
        const endMatch = trimmedLine.match(/^([^:]+)\s*:\s*end\s*:\s*([^\s]+)\s*\(([^:]+)\s*:\s*(\d+)\)/);
        if (endMatch && currentStart) {
          const end = {
            clock: endMatch[1].trim(),
            signal: endMatch[2].trim(),
            file: endMatch[3].split('/').pop() || endMatch[3],
            line: parseInt(endMatch[4])
          };
          
          console.log('🔍 Found end:', end);
          
          // Extract synchronizer ID if present
          const syncIdMatch = trimmedLine.match(/Synchronizer ID\s*:\s*([^\n]+)/);
          
          const caution = {
            category,
            issueType,
            start: currentStart,
            end,
            synchronizerId: syncIdMatch ? syncIdMatch[1].trim() : undefined
          };
          
          console.log('🔍 Created caution:', caution);
          cautions.push(caution);
          
          currentStart = null;
        }
      }
    }

    console.log('🔍 Extracted cautions:', cautions.length, cautions);
    return cautions;
  }

  private static extractEvaluations(content: string): CDCDetail[] {
    // Look for the Evaluations section - it starts with "Evaluations" followed by "================================================================="
    const evaluationsMatch = content.match(/Evaluations\s*\n=+\s*\n([\s\S]*?)(?:\n\nResolved|$)/);
    if (!evaluationsMatch) {
      console.log('🔍 No Evaluations section found');
      return [];
    }

    const evaluationsContent = evaluationsMatch[1];
    console.log('🔍 Evaluations content found:', evaluationsContent.substring(0, 200) + '...');
    
    const evaluations: CDCDetail[] = [];

    // Find all issue types in the evaluations section
    const issueTypeMatches = evaluationsContent.matchAll(/([^.\n]+)\.\s*\(([^)]+)\)\s*\n-+\n([\s\S]*?)(?=\n\n[^.\n]+\.\s*\([^)]+\)|$)/g);
    
    for (const match of issueTypeMatches) {
      const issueType = match[1].trim();
      const category = match[2].trim();
      const dataSection = match[3];
      
      console.log(`🔍 Found issue type: "${issueType}" with category: "${category}"`);
      console.log(`🔍 Data section:`, dataSection.substring(0, 100) + '...');
      
      // Parse the data section for this issue type
      const lines = dataSection.split('\n');
      let currentStart: any = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('---')) continue;
        
        console.log(`🔍 Processing line: "${trimmedLine}"`);
        
        // Check if this is a start line (contains "start :")
        const startMatch = trimmedLine.match(/^([^:]+)\s*:\s*start\s*:\s*([^\s]+)\s*\(([^:]+)\s*:\s*(\d+)\)/);
        if (startMatch) {
          currentStart = {
            clock: startMatch[1].trim(),
            signal: startMatch[2].trim(),
            file: startMatch[3].split('/').pop() || startMatch[3],
            line: parseInt(startMatch[4])
          };
          console.log('🔍 Found start:', currentStart);
          continue;
        }
        
        // Check if this is an end line (contains "end :")
        const endMatch = trimmedLine.match(/^([^:]+)\s*:\s*end\s*:\s*([^\s]+)\s*\(([^:]+)\s*:\s*(\d+)\)/);
        if (endMatch && currentStart) {
          const end = {
            clock: endMatch[1].trim(),
            signal: endMatch[2].trim(),
            file: endMatch[3].split('/').pop() || endMatch[3],
            line: parseInt(endMatch[4])
          };
          
          console.log('🔍 Found end:', end);
          
          // Extract synchronizer length and ID if present
          const syncLengthMatch = trimmedLine.match(/Synchronizer length\s*:\s*(\d+)/);
          const syncIdMatch = trimmedLine.match(/\(ID:([^)]+)\)/);
          
          const evaluation = {
            category,
            issueType,
            start: currentStart,
            end,
            synchronizerLength: syncLengthMatch ? parseInt(syncLengthMatch[1]) : undefined,
            synchronizerId: syncIdMatch ? syncIdMatch[1].trim() : undefined
          };
          
          console.log('🔍 Created evaluation:', evaluation);
          evaluations.push(evaluation);
          
          currentStart = null;
        }
      }
    }

    console.log('🔍 Extracted evaluations:', evaluations.length, evaluations);
    return evaluations;
  }



  private static extractDesignInfo(content: string): CDCReportData['designInfo'] | undefined {
    const section9Match = content.match(/Section 9\s*:\s*Design Information\s*\n=+\s*\n([\s\S]*?)(?:=+\s*\nSection 10|$)/);
    
    if (!section9Match) return undefined;

    const section9Content = section9Match[1];
    const info: CDCReportData['designInfo'] = {};

    const complexityMatch = section9Content.match(/Design Complexity Number\s*=\s*(\d+)/);
    const cdcSignalsMatch = section9Content.match(/Number of CDC Signals\s*=\s*(\d+)/);
    const registerBitsMatch = section9Content.match(/Number of Register bits\s*=\s*(\d+)/);
    const latchBitsMatch = section9Content.match(/Number of Latch bits\s*=\s*(\d+)/);
    const ramsMatch = section9Content.match(/Number of RAMs\s*=\s*(\d+)/);
    const deadEndRegistersMatch = section9Content.match(/Number of Dead-end Registers\s*=\s*(\d+)/);

    if (complexityMatch) info.designComplexityNumber = parseInt(complexityMatch[1]);
    if (cdcSignalsMatch) info.cdcSignals = parseInt(cdcSignalsMatch[1]);
    if (registerBitsMatch) info.registerBits = parseInt(registerBitsMatch[1]);
    if (latchBitsMatch) info.latchBits = parseInt(latchBitsMatch[1]);
    if (ramsMatch) info.rams = parseInt(ramsMatch[1]);
    if (deadEndRegistersMatch) info.deadEndRegisters = parseInt(deadEndRegistersMatch[1]);

    return Object.keys(info).length > 0 ? info : undefined;
  }
} 