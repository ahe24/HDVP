import fs from 'fs/promises';
import path from 'path';
import { Project, ProjectFile } from '../types';
import { config } from '../config/app';
import { apiLogger } from '../services/logger';
import { parseProjectModules } from './moduleParser';
import { generateImprovedFilelist, buildSectionsFromProject } from './filelistGenerator';

/**
 * Load existing projects from filesystem into memory
 */
export async function loadExistingProjects(): Promise<Map<string, Project>> {
  const projects = new Map<string, Project>();
  
  try {
    const projectsDir = config.workspace.projects;
    
    // Check if projects directory exists
    try {
      await fs.access(projectsDir);
    } catch {
      apiLogger.warn('Projects directory does not exist', { projectsDir });
      return projects;
    }

    // Read project directories
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    const projectDirs = entries.filter(entry => entry.isDirectory());

    for (const projectDir of projectDirs) {
      try {
        const projectId = projectDir.name;
        const projectPath = path.join(projectsDir, projectId);
        
        // Try to load project metadata
        const project = await loadProjectFromDirectory(projectId, projectPath);
        if (project) {
          projects.set(projectId, project);
          apiLogger.info('Loaded existing project', { projectId, name: project.name });
        }
      } catch (error) {
        apiLogger.warn('Failed to load project', { projectId: projectDir.name, error });
      }
    }

    apiLogger.info('Finished loading existing projects', { count: projects.size });
  } catch (error) {
    apiLogger.error('Failed to load existing projects', error);
  }

  return projects;
}

/**
 * Load a single project from its directory
 */
async function loadProjectFromDirectory(projectId: string, projectPath: string): Promise<Project | null> {
  try {
    // Try to extract project name from filelist.f first
    let projectName = await extractProjectNameFromFilelist(projectPath);
    
    // Check for metadata.json
    const metadataPath = path.join(projectPath, 'metadata.json');
    let metadata: any = null;
    
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch {
      // No metadata.json, we'll generate it from the directory structure
    }

    // Get project statistics
    const stats = await fs.stat(projectPath);
    
    // Scan for project files
    const files = await scanProjectFiles(projectPath);
    
    // Parse modules if not already present in metadata
    let modules = metadata?.modules;
    if (!modules) {
      // For existing projects, we need to load file contents to parse modules
      const filesWithContent = await loadProjectFilesWithContent(projectPath, files);
      modules = parseProjectModules(filesWithContent);
      console.log(`📋 Parsed modules for ${projectName || generateProjectNameFromId(projectId)}: ${modules.testbench.length} testbench, ${modules.design.length} design`);
    }

    // Create project object
    const project: Project = {
      id: projectId,
      name: projectName || metadata?.name || generateProjectNameFromId(projectId),
      description: metadata?.description || `${projectName || generateProjectNameFromId(projectId)} verification project`,
      createdAt: metadata?.createdAt || stats.birthtime.toISOString(),
      updatedAt: metadata?.updatedAt || stats.mtime.toISOString(),
      files,
      modules,
      testPlan: metadata?.testPlan // Load test plan from metadata
    };

    // If no metadata existed, create one
    if (!metadata) {
      await saveProjectMetadata(projectPath, project);
    }

    // Generate/regenerate filelist.f with correct sections and include paths
    try {
      const sections = buildSectionsFromProject(project);
      await generateImprovedFilelist(project, projectPath, sections);
      console.log(`🔄 Regenerated filelist.f for project ${project.name}`);
    } catch (error) {
      apiLogger.warn('Failed to regenerate filelist.f during project loading', { projectId, error });
    }

    return project;
  } catch (error) {
    apiLogger.error('Failed to load project from directory', error, { projectId, projectPath });
    return null;
  }
}

/**
 * Scan project directory for files
 */
async function scanProjectFiles(projectPath: string): Promise<ProjectFile[]> {
  const files: ProjectFile[] = [];

  async function scanDirectory(dirPath: string, relativePath: string = ''): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await scanDirectory(fullPath, relativeFilePath);
        } else if (entry.isFile()) {
          // Only load metadata for initial project list
          const fileType = determineFileType(entry.name, relativeFilePath);
          const section = determineSectionFromPath(relativeFilePath);
          
          files.push({
            name: entry.name,
            path: relativeFilePath,
            content: '', // Don't load content for project listing
            type: fileType,
            section: section
          });
        }
      }
    } catch (error) {
      apiLogger.warn('Failed to scan directory', { dirPath, error });
    }
  }

  await scanDirectory(projectPath);
  return files;
}

/**
 * Determine file type based on filename and path
 */
function determineFileType(filename: string, relativePath: string): ProjectFile['type'] {
  const ext = path.extname(filename).toLowerCase();
  const dirName = path.dirname(relativePath);
  
  // Check by directory first
  if (dirName.includes('tb') || dirName.includes('testbench')) {
    return 'testbench';
  }
  
  if (dirName.includes('constraint')) {
    return 'constraint';
  }
  
  // Check by extension
  switch (ext) {
    case '.v':
      return 'verilog';
    case '.sv':
    case '.svh':
      return 'systemverilog';
    case '.vhd':
    case '.vhdl':
      return 'vhdl';
    case '.sdc':
    case '.xdc':
      return 'constraint';
    default:
      // Check if it's in testbench files
      if (filename.toLowerCase().includes('tb_') || filename.toLowerCase().includes('test')) {
        return 'testbench';
      }
      return 'other';
  }
}

/**
 * Determine section (src, tb, include) based on file path
 */
function determineSectionFromPath(relativePath: string): 'src' | 'tb' | 'include' | undefined {
  const pathParts = relativePath.split(path.sep);
  
  // Check if the first directory indicates the section
  if (pathParts.length > 1) {
    const firstDir = pathParts[0].toLowerCase();
    
    if (firstDir === 'src' || firstDir === 'source') {
      return 'src';
    } else if (firstDir === 'tb' || firstDir === 'testbench') {
      return 'tb';
    } else if (firstDir === 'include' || firstDir === 'inc') {
      return 'include';
    }
  }
  
  // For files in the root directory, try to guess based on filename
  const filename = path.basename(relativePath).toLowerCase();
  if (filename.includes('tb_') || filename.includes('test')) {
    return 'tb';
  }
  
  // Default to src for design files, undefined for special files like filelist.f, metadata.json
  if (filename.endsWith('.v') || filename.endsWith('.sv') || filename.endsWith('.vhd')) {
    return 'src';
  }
  
  return undefined;
}

/**
 * Extract project name from filelist.f file
 */
async function extractProjectNameFromFilelist(projectPath: string): Promise<string | null> {
  try {
    const filelistPath = path.join(projectPath, 'filelist.f');
    const content = await fs.readFile(filelistPath, 'utf-8');
    
    // Look for the pattern "# Generated filelist for project: PROJECT_NAME"
    const match = content.match(/# Generated filelist for project:\s*(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (error) {
    // filelist.f doesn't exist or can't be read
  }
  
  return null;
}

/**
 * Generate a readable project name from project ID
 */
function generateProjectNameFromId(projectId: string): string {
  // Try to make a readable name from UUID
  return `Project_${projectId.substring(0, 8)}`;
}

/**
 * Load file contents for parsing modules
 */
async function loadProjectFilesWithContent(projectPath: string, files: ProjectFile[]): Promise<ProjectFile[]> {
  const filesWithContent: ProjectFile[] = [];
  
  for (const file of files) {
    try {
      // Only load content for HDL files
      if (['verilog', 'systemverilog', 'vhdl', 'testbench'].includes(file.type)) {
        const filePath = path.join(projectPath, file.path);
        const content = await fs.readFile(filePath, 'utf-8');
        filesWithContent.push({ ...file, content });
      } else {
        filesWithContent.push(file);
      }
    } catch (error) {
      // If file can't be read, add it without content
      filesWithContent.push(file);
      apiLogger.warn('Failed to read file content for module parsing', { filePath: file.path, error });
    }
  }
  
  return filesWithContent;
}

/**
 * Save project metadata to disk
 */
async function saveProjectMetadata(projectPath: string, project: Project): Promise<void> {
  try {
    const metadataPath = path.join(projectPath, 'metadata.json');
    const metadata = {
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      modules: project.modules,
      testPlan: project.testPlan, // Add test plan to metadata
      version: '1.0.0'
    };
    
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    apiLogger.info('Saved project metadata', { projectId: project.id, metadataPath });
  } catch (error) {
    apiLogger.error('Failed to save project metadata', error, { projectId: project.id, projectPath });
  }
}