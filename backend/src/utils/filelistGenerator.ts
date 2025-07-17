import { writeFile } from 'fs/promises';
import path from 'path';
import { Project } from '../types';

/**
 * Generate improved filelist.f for the project
 */
export async function generateImprovedFilelist(project: Project, projectDir: string, sections?: any): Promise<void> {
  // Only include design files from src and tb sections in filelist.f
  const srcFiles = project.files.filter(f => 
    f.section === 'src' && (f.type === 'verilog' || f.type === 'systemverilog' || f.type === 'vhdl')
  );
  
  const tbFiles = project.files.filter(f => 
    f.section === 'tb' && (f.type === 'testbench' || f.type === 'verilog' || f.type === 'systemverilog' || f.type === 'vhdl')
  );

  let filelistContent = `# Generated filelist for project: ${project.name}\n`;
  filelistContent += `# Created: ${new Date().toISOString()}\n`;
  filelistContent += `# Structure: Section-based organization with separated src, tb, and include files\n\n`;

  // Add include directories - src and tb sections are automatically included
  const includeDirectories = new Set<string>();
  
  // Add src directories to include paths (relative to job root directory)
  if (sections?.src) {
    sections.src.forEach((dir: string) => {
      if (dir && dir !== '.') {
        includeDirectories.add(`./${dir}`);
      }
    });
  }
  
  // Add tb directories to include paths (relative to job root directory)
  if (sections?.tb) {
    sections.tb.forEach((dir: string) => {
      if (dir && dir !== '.') {
        includeDirectories.add(`./${dir}`);
      }
    });
  }
  
  // Add include directories to include paths (relative to job root directory)
  if (sections?.include) {
    sections.include.forEach((dir: string) => {
      if (dir && dir !== '.') {
        includeDirectories.add(`./${dir}`);
      }
    });
  }
  
  // Always add base src, tb, and include directories (relative to job root directory)
  includeDirectories.add('./src');
  includeDirectories.add('./tb');
  includeDirectories.add('./include');

  // Add include directory directives
  if (includeDirectories.size > 0) {
    filelistContent += '# Include directories (+incdir+)\n';
    Array.from(includeDirectories).sort().forEach(dir => {
      filelistContent += `+incdir+${dir}\n`;
    });
    filelistContent += '\n';
  }

  // Add source files (design modules)
  if (srcFiles.length > 0) {
    filelistContent += '# Source files (src section)\n';
    srcFiles.forEach(file => {
      filelistContent += `${file.path}\n`;
    });
    filelistContent += '\n';
  }

  // Add testbench files
  if (tbFiles.length > 0) {
    filelistContent += '# Testbench files (tb section)\n';
    tbFiles.forEach(file => {
      filelistContent += `${file.path}\n`;
    });
    filelistContent += '\n';
  }

  // Add summary comment
  filelistContent += `# Summary: ${srcFiles.length} source files, ${tbFiles.length} testbench files\n`;
  filelistContent += `# Include directories: ${Array.from(includeDirectories).join(', ')}\n`;
  filelistContent += `# Note: Include files (.vh, .svh, .h) are accessed via +incdir+ paths, not listed directly\n`;

  await writeFile(path.join(projectDir, 'filelist.f'), filelistContent);
  console.log(`📄 Generated improved filelist.f: ${srcFiles.length} src + ${tbFiles.length} tb files, ${includeDirectories.size} include dirs`);
}

/**
 * Build sections object from project files for include directory generation
 */
export function buildSectionsFromProject(project: Project): any {
  const sections = {
    src: new Set<string>(),
    tb: new Set<string>(),
    include: new Set<string>()
  };

  // Extract unique directory paths for each section
  project.files.forEach(file => {
    if (file.section && file.path.includes('/')) {
      const dir = path.dirname(file.path);
      const section = file.section as 'src' | 'tb' | 'include';
      
      if (sections[section]) {
        sections[section].add(dir);
      }
    }
  });

  // Convert Sets to Arrays for the sections object
  return {
    src: Array.from(sections.src),
    tb: Array.from(sections.tb),
    include: Array.from(sections.include)
  };
} 