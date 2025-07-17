/**
 * Utility functions for parsing module names from HDL files
 */

import { ProjectFile } from '../types';

export interface ParsedModules {
  testbench: string[];
  design: string[];
}

/**
 * Parse module names from HDL file content
 * @param content File content
 * @param fileType File type (verilog, systemverilog, vhdl, testbench)
 * @returns Array of module names found in the file
 */
export function parseModuleNames(content: string, fileType: string): string[] {
  const modules: string[] = [];
  
  // Remove comments and strings to avoid false matches
  const cleanContent = removeCommentsAndStrings(content);
  
  if (fileType === 'vhdl') {
    // VHDL entity parsing
    const entityRegex = /\bentity\s+(\w+)\s+is/gi;
    let match;
    while ((match = entityRegex.exec(cleanContent)) !== null) {
      const moduleName = match[1];
      if (isValidModuleName(moduleName, 'vhdl')) {
        modules.push(moduleName);
      }
    }
  } else {
    // Verilog/SystemVerilog module parsing
    const moduleRegex = /\bmodule\s+(\w+)\s*[#(;\s]/gi;
    let match;
    while ((match = moduleRegex.exec(cleanContent)) !== null) {
      const moduleName = match[1];
      if (isValidModuleName(moduleName, 'verilog')) {
        modules.push(moduleName);
      }
    }
  }
  
  return modules;
}

/**
 * Remove comments and string literals to avoid false matches
 * @param content Original file content
 * @returns Cleaned content without comments and strings
 */
function removeCommentsAndStrings(content: string): string {
  // Remove single-line comments (// comment)
  let cleaned = content.replace(/\/\/.*$/gm, '');
  
  // Remove multi-line comments (/* comment */)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove string literals ("string" and 'string')
  cleaned = cleaned.replace(/"[^"]*"/g, '""');
  cleaned = cleaned.replace(/'[^']*'/g, "''");
  
  return cleaned;
}

/**
 * Check if a name is a valid module name (not a reserved keyword)
 * @param name Module name to validate
 * @param language HDL language (verilog, vhdl)
 * @returns True if valid module name
 */
function isValidModuleName(name: string, language: string): boolean {
  // Common reserved keywords that should not be module names
  const verilogKeywords = [
    'input', 'output', 'inout', 'wire', 'reg', 'logic', 'bit', 'byte',
    'integer', 'real', 'time', 'realtime', 'string', 'event',
    'always', 'initial', 'begin', 'end', 'if', 'else', 'case', 'endcase',
    'for', 'while', 'repeat', 'forever', 'assign', 'deassign',
    'function', 'endfunction', 'task', 'endtask', 'generate', 'endgenerate',
    'parameter', 'localparam', 'defparam', 'specify', 'endspecify',
    'primitive', 'endprimitive', 'table', 'endtable', 'posedge', 'negedge',
    'clock', 'reset', 'clk', 'rst', 'enable', 'disable',
    'instantiation', 'integrating', 'instantiate'
  ];
  
  const vhdlKeywords = [
    'entity', 'architecture', 'component', 'package', 'library',
    'signal', 'variable', 'constant', 'type', 'subtype',
    'process', 'function', 'procedure', 'begin', 'end',
    'if', 'then', 'else', 'case', 'when', 'loop', 'for', 'while',
    'port', 'map', 'generic', 'configuration'
  ];
  
  const keywords = language === 'vhdl' ? vhdlKeywords : verilogKeywords;
  
  // Check if name is a reserved keyword
  if (keywords.includes(name.toLowerCase())) {
    return false;
  }
  
  // Check if name contains only valid characters (letters, numbers, underscores)
  // and starts with a letter or underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return false;
  }
  
  // Must not be empty or too short
  if (name.length < 2) {
    return false;
  }
  
  return true;
}

/**
 * Parse all modules from project files and categorize them
 * @param files Array of project files
 * @returns Categorized modules (testbench vs design)
 */
export function parseProjectModules(files: ProjectFile[]): ParsedModules {
  const result: ParsedModules = {
    testbench: [],
    design: []
  };

  for (const file of files) {
    // Only parse HDL files
    if (!['verilog', 'systemverilog', 'vhdl', 'testbench'].includes(file.type)) {
      continue;
    }

    const moduleNames = parseModuleNames(file.content, file.type);
    
    // Categorize modules based on file type or naming patterns
    for (const moduleName of moduleNames) {
      if (file.type === 'testbench' || isTestbenchModule(moduleName, file.path)) {
        // Add to testbench if not already present
        if (!result.testbench.includes(moduleName)) {
          result.testbench.push(moduleName);
        }
      } else {
        // Add to design if not already present
        if (!result.design.includes(moduleName)) {
          result.design.push(moduleName);
        }
      }
    }
  }

  return result;
}

/**
 * Check if a module is a testbench based on naming patterns and file path
 * @param moduleName Module name
 * @param filePath File path
 * @returns True if module appears to be a testbench
 */
function isTestbenchModule(moduleName: string, filePath: string): boolean {
  // Common testbench naming patterns
  const testbenchPatterns = [
    /^tb_/i,           // tb_xxx
    /_tb$/i,           // xxx_tb
    /^test/i,          // testxxx
    /_test$/i,         // xxx_test
    /testbench/i,      // xxxTestbenchxxx
    /^sim_/i,          // sim_xxx
    /_sim$/i,          // xxx_sim
    /bench/i,          // xxxbenchxxx
  ];

  // Check module name patterns
  const isTestbenchName = testbenchPatterns.some(pattern => pattern.test(moduleName));
  
  // Check file path patterns
  const isTestbenchPath = /\/(tb|test|testbench|sim)\//i.test(filePath);
  
  return isTestbenchName || isTestbenchPath;
}

/**
 * Get the most likely top module for formal verification
 * @param designModules Array of design module names
 * @returns The most likely top module name
 */
export function getTopModule(designModules: string[]): string | null {
  if (designModules.length === 0) return null;
  
  // Common top module naming patterns (in order of preference)
  const topPatterns = [
    /^top$/i,         // exactly 'top'
    /^top_/i,         // top_xxx
    /_top$/i,         // xxx_top
    /top/i,           // anything with 'top'
  ];

  // Try to find a module matching top patterns
  for (const pattern of topPatterns) {
    const match = designModules.find(name => pattern.test(name));
    if (match) return match;
  }

  // If no top pattern found, return the first design module
  return designModules[0];
}

/**
 * Get the most likely testbench module for simulation
 * @param testbenchModules Array of testbench module names
 * @returns The most likely testbench module name
 */
export function getDefaultTestbench(testbenchModules: string[]): string | null {
  if (testbenchModules.length === 0) return null;
  
  // Common testbench naming patterns (in order of preference)
  const tbPatterns = [
    /^tb_top$/i,      // exactly 'tb_top'
    /^testbench$/i,   // exactly 'testbench'
    /^tb_/i,          // tb_xxx
    /_tb$/i,          // xxx_tb
    /^test/i,         // testxxx
  ];

  // Try to find a module matching testbench patterns
  for (const pattern of tbPatterns) {
    const match = testbenchModules.find(name => pattern.test(name));
    if (match) return match;
  }

  // If no pattern found, return the first testbench module
  return testbenchModules[0];
} 