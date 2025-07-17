import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { Project, ProjectFile, ApiResponse } from '../types';
import { config } from '../config/app';
import { cacheProjects } from '../middleware/cache';
import { validateId } from '../middleware/validation';
import { apiLogger } from '../services/logger';
import { loadExistingProjects } from '../utils/projectLoader';
import { parseProjectModules } from '../utils/moduleParser';
import { generateImprovedFilelist, buildSectionsFromProject } from '../utils/filelistGenerator';
import { parseTestPlanExcel, validateTestPlanEntries } from '../utils/excelParser';

// Helper function to save project metadata to file
async function saveProjectMetadataToFile(projectPath: string, project: Project): Promise<void> {
  try {
    const metadataPath = path.join(projectPath, 'metadata.json');
    const metadata = {
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      modules: project.modules,
      testPlan: project.testPlan,
      version: '1.0.0'
    };
    
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    apiLogger.info('Saved project metadata', { projectId: project.id, metadataPath });
  } catch (error) {
    apiLogger.error('Failed to save project metadata', error, { projectId: project.id, projectPath });
    throw error;
  }
}

const router = express.Router();
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req: any, file: any, cb: any) => {
    // Accept common HDL and constraint files - use config for allowed types
    const allowedTypes = ['.v', '.sv', '.vh', '.svh', '.h', '.vhd', '.vhdl', '.sdc', '.xdc', '.f', '.txt', '.tcl'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error(`File "${file.originalname}" has unsupported type ${ext}. Allowed types: ${allowedTypes.join(', ')}`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 50 // Maximum 50 files per project
  }
});

// Configure separate multer for Excel test plan uploads
const excelUpload = multer({
  storage,
  fileFilter: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File "${file.originalname}" must be an Excel file. Allowed types: .xlsx, .xls`));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for Excel files
    files: 1 // Only one Excel file at a time
  }
});

// In-memory projects store (replace with database in production)
let projects: Map<string, Project> = new Map();

// Export projects map for external access
export { projects };

// Initialize projects from filesystem
let projectsInitialized = false;
async function initializeProjects(): Promise<void> {
  if (!projectsInitialized) {
    try {
      projects = await loadExistingProjects();
      projectsInitialized = true;
      apiLogger.info('Projects initialized from filesystem', { count: projects.size });
    } catch (error) {
      apiLogger.error('Failed to initialize projects', error);
    }
  }
}

// Utility function to ensure directory exists
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Load project with full file contents
async function loadProjectWithFileContents(project: Project): Promise<Project> {
  const projectPath = path.join(config.workspace.projects, project.id);
  const filesWithContent: ProjectFile[] = [];

  for (const file of project.files) {
    try {
      const filePath = path.join(projectPath, file.path);
      const content = await fsp.readFile(filePath, 'utf-8');
      
      filesWithContent.push({
        ...file,
        content
      });
    } catch (error) {
      apiLogger.warn('Failed to load file content', { 
        projectId: project.id, 
        filePath: file.path, 
        error 
      });
      // Keep the file in the list but with empty content
      filesWithContent.push(file);
    }
  }

  // Parse modules if not already present (for existing projects created before module parsing)
  let modules = project.modules;
  if (!modules || (!modules.testbench && !modules.design)) {
    modules = parseProjectModules(filesWithContent);
    console.log(`🔄 Parsed modules for existing project ${project.name}: ${modules.testbench.length} testbench, ${modules.design.length} design`);
    
    // Update the project in memory with parsed modules
    const updatedProject = { ...project, modules };
    projects.set(project.id, updatedProject);
  }

  return {
    ...project,
    files: filesWithContent,
    modules
  };
}

// GET /api/projects - List all projects
router.get('/', async (req: Request, res: Response) => {
  try {
    // Initialize projects from filesystem if not already done
    await initializeProjects();
    
    const projectList = Array.from(projects.values());
    apiLogger.info('Serving projects list', { count: projectList.length, projectIds: projectList.map(p => p.id) });
    
    const response: ApiResponse<Project[]> = {
      success: true,
      data: projectList
    };
    res.json(response);
  } catch (error: any) {
    apiLogger.error('Failed to list projects', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to list projects'
    };
    res.status(500).json(response);
  }
});

// GET /api/projects/:id - Get specific project with full file contents
router.get('/:id', validateId, async (req: Request, res: Response) => {
  try {
    // Initialize projects from filesystem if not already done
    await initializeProjects();
    
    const project = projects.get(req.params.id);
    
    if (!project) {
      const response: ApiResponse = {
        success: false,
        error: 'Project not found'
      };
      return res.status(404).json(response);
    }

    // Load full file contents for individual project view
    const projectWithFiles = await loadProjectWithFileContents(project);

    const response: ApiResponse<Project> = {
      success: true,
      data: projectWithFiles
    };
    res.json(response);
  } catch (error: any) {
    apiLogger.error('Failed to get project', error, { projectId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to get project'
    };
    res.status(500).json(response);
  }
});

// POST /api/projects/parse-testplan - Parse Excel test plan file
router.post('/parse-testplan', excelUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      const response: ApiResponse = {
        success: false,
        error: 'No file uploaded'
      };
      return res.status(400).json(response);
    }
    const testPlan = parseTestPlanExcel(file.buffer, file.originalname);
    const validation = validateTestPlanEntries(testPlan.entries);
    if (!validation.valid) {
      const response: ApiResponse = {
        success: false,
        error: 'Test plan validation failed',
        details: validation.errors
      };
      return res.status(400).json(response);
    }
    const response: ApiResponse<any> = {
      success: true,
      data: testPlan
    };
    res.json(response);
  } catch (error: any) {
    console.error('Test plan parsing error:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to parse test plan'
    };
    res.status(500).json(response);
  }
});

// Custom upload middleware wrapper for better error handling
const uploadWithErrorHandling = (req: Request, res: Response, next: NextFunction) => {
  upload.array('files')(req, res, (err: any) => {
    if (err) {
      // Handle multer/file upload errors with better messaging
      if (err.message && err.message.includes('has unsupported type')) {
        const response: ApiResponse = {
          success: false,
          error: `File upload failed: ${err.message}`
        };
        return res.status(400).json(response);
      } else if (err.code === 'LIMIT_FILE_SIZE') {
        const response: ApiResponse = {
          success: false,
          error: 'File upload failed: File size exceeds the 10MB limit'
        };
        return res.status(400).json(response);
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        const response: ApiResponse = {
          success: false,
          error: 'File upload failed: Too many files (maximum 50 files allowed)'
        };
        return res.status(400).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          error: `File upload failed: ${err.message || 'Unknown upload error'}`
        };
        return res.status(400).json(response);
      }
    }
    next();
  });
};

// POST /api/projects - Create new project with validation
router.post('/', uploadWithErrorHandling, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const uploadedFiles = req.files as Express.Multer.File[];
    
    // Debug: Log the entire request body to see what we're receiving
    console.log('🔍 Request body keys:', Object.keys(req.body));
    console.log('🔍 Raw fileMetadata:', req.body.fileMetadata);
    console.log('🔍 Raw fileIds:', req.body.fileIds);

    // Validation
    if (!name || !name.trim()) {
      const response: ApiResponse = {
        success: false,
        error: 'Project name is required'
      };
      return res.status(400).json(response);
    }

    if (name.trim().length < 1 || name.trim().length > 100) {
      const response: ApiResponse = {
        success: false,
        error: 'Project name must be between 1 and 100 characters'
      };
      return res.status(400).json(response);
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name.trim())) {
      const response: ApiResponse = {
        success: false,
        error: 'Project name can only contain letters, numbers, underscores, and hyphens'
      };
      return res.status(400).json(response);
    }

    if (description && description.length > 500) {
      const response: ApiResponse = {
        success: false,
        error: 'Description must not exceed 500 characters'
      };
      return res.status(400).json(response);
    }

    if (!uploadedFiles || uploadedFiles.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'At least one file is required'
      };
      return res.status(400).json(response);
    }

    // Check if project name already exists
    const existingProject = Array.from(projects.values()).find(p => p.name === name.trim());
    if (existingProject) {
      const response: ApiResponse = {
        success: false,
        error: 'Project with this name already exists'
      };
      return res.status(400).json(response);
    }

    // Create project
    const projectId = uuidv4();
    const projectDir = path.join(config.workspace.projects, projectId);
    const srcDir = path.join(projectDir, 'src');
    const tbDir = path.join(projectDir, 'tb');
    
    // Create project directories
    await ensureDir(projectDir);
    await ensureDir(srcDir);
    await ensureDir(tbDir);

    // Process files using ID-based matching
    const projectFiles: ProjectFile[] = [];
    
    console.log(`📋 Processing ${uploadedFiles.length} files for project: ${name}`);

    // Parse structured file metadata from JSON (new section-based format)
    const fileMetadata = JSON.parse(req.body.fileMetadata || '[]');
    const fileIds = JSON.parse(req.body.fileIds || '[]');
    
    console.log(`🔍 Received ${fileIds.length} file IDs and ${fileMetadata.length} metadata entries`);
    
    // Create a map of file IDs to metadata for fast lookup
    const metadataMap = new Map();
    fileMetadata.forEach((metadata: any) => {
      metadataMap.set(metadata.id, metadata);
    });
    
    // Track sections and their directories for include path generation
    const sections = {
      src: new Set<string>(),
      tb: new Set<string>(),
      include: new Set<string>()
    };
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const fileId = fileIds[i];
      
      if (!fileId) {
        console.error(`❌ Missing file ID for file ${i}: ${file.originalname}`);
        throw new Error(`Missing file ID for uploaded file: ${file.originalname}`);
      }
      
      const metadata = metadataMap.get(fileId);
      if (!metadata) {
        console.error(`❌ Missing metadata for file ID: ${fileId} (${file.originalname})`);
        throw new Error(`Missing metadata for uploaded file: ${file.originalname}`);
      }
      
      const fileType = metadata.fileType || 'other';
      const uploadRelativePath = metadata.relativePath || '';
      const section = metadata.section || 'src';
      
      console.log(`📄 File ${i}: ${file.originalname} | ID: ${fileId} | Section: ${section} | Type: ${fileType} | RelPath: ${uploadRelativePath || 'none'}`);
      
      let filePath: string;
      let relativePath: string;

      // Organize files by section (src, tb, include)
      let targetDir: string;
      let sectionDir: string;
      
      switch (section) {
        case 'src':
          sectionDir = srcDir;
          break;
        case 'tb':
          sectionDir = tbDir;
          break;
        case 'include':
          sectionDir = path.join(projectDir, 'include');
          await ensureDir(sectionDir);
          break;
        default:
          sectionDir = srcDir; // Default to src
      }

      if (uploadRelativePath) {
        // Preserve folder structure within section for folder uploads
        const normalizedPath = uploadRelativePath.replace(/\\/g, '/');
        // Remove any leading section name from the path to avoid duplication
        const cleanPath = normalizedPath.replace(new RegExp(`^(src|tb|include)/`), '');
        targetDir = path.join(sectionDir, path.dirname(cleanPath));
        await ensureDir(targetDir);
        filePath = path.join(targetDir, path.basename(cleanPath));
        relativePath = path.relative(projectDir, filePath);
        
        // Track directory for include path generation
        const fileDir = path.dirname(relativePath);
        sections[section as keyof typeof sections].add(fileDir);
        
        console.log(`📁 Section-based folder: ${section}/${cleanPath} -> ${relativePath}`);
      } else {
        // Individual file upload
        filePath = path.join(sectionDir, file.originalname);
        relativePath = path.relative(projectDir, filePath);
        
        // Track directory for include path generation
        const fileDir = path.dirname(relativePath);
        sections[section as keyof typeof sections].add(fileDir);
        
        console.log(`📂 Section-based file: ${section}/${file.originalname} -> ${relativePath}`);
      }

      // Write file to disk
      await writeFile(filePath, file.buffer);

      // Create project file record with section information
      const projectFile: ProjectFile = {
        name: uploadRelativePath ? path.basename(uploadRelativePath) : file.originalname,
        path: relativePath,
        content: file.buffer.toString('utf8'),
        type: fileType as ProjectFile['type'],
        section: section // Add section info to the project file
      };

      projectFiles.push(projectFile);
    }

    // Process test plan if provided
    let testPlan: any = undefined;
    if (req.body.testPlanData) {
      try {
        const testPlanData = JSON.parse(req.body.testPlanData);
        testPlan = {
          ...testPlanData,
          uploadedAt: new Date().toISOString()
        };
        console.log(`📊 Test plan loaded: ${testPlan.validCount}/${testPlan.totalCount} valid entries`);
      } catch (error) {
        console.warn('Failed to parse test plan data:', error);
      }
    }

    // Parse modules from project files
    const parsedModules = parseProjectModules(projectFiles);
    console.log(`📋 Parsed modules: ${parsedModules.testbench.length} testbench, ${parsedModules.design.length} design`);

    // Create project record with section information
    const project: Project = {
      id: projectId,
      name: name.trim(),
      description: description?.trim() || '',
      files: projectFiles,
      modules: parsedModules,
      sections: sections, // Add sections for include path generation
      testPlan, // Add test plan to project
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store project
    projects.set(projectId, project);

    // Generate improved filelist.f with include paths
    await generateImprovedFilelist(project, projectDir, sections);

    console.log(`✅ Created project: ${project.name} (${projectFiles.length} files)`);
    console.log(`📊 Section breakdown: src=${Array.from(sections.src).length} dirs, tb=${Array.from(sections.tb).length} dirs, include=${Array.from(sections.include).length} dirs`);

    const response: ApiResponse<Project> = {
      success: true,
      data: project
    };
    res.status(201).json(response);

  } catch (error: any) {
    console.error('Project creation error:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create project'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = projects.get(req.params.id);
    
    if (!project) {
      const response: ApiResponse = {
        success: false,
        error: 'Project not found'
      };
      return res.status(404).json(response);
    }

    // Remove project directory
    const projectDir = path.join(config.workspace.projects, project.id);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    // Remove from memory
    projects.delete(req.params.id);

    console.log(`🗑️ Deleted project: ${project.name}`);

    const response: ApiResponse = {
      success: true
    };
    res.json(response);

  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to delete project'
    };
    res.status(500).json(response);
  }
});

// PUT /api/projects/:id/files/:filePath - Update project file
router.put('/:id/files/*', validateId, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const filePath = req.params[0]; // Get the file path from the wildcard
    const { content } = req.body;

    if (!content && content !== '') {
      const response: ApiResponse = {
        success: false,
        error: 'File content is required'
      };
      return res.status(400).json(response);
    }

    // Initialize projects from filesystem if not already done
    await initializeProjects();
    
    const project = projects.get(projectId);
    if (!project) {
      const response: ApiResponse = {
        success: false,
        error: 'Project not found'
      };
      return res.status(404).json(response);
    }

    // Find the file in the project
    const fileIndex = project.files.findIndex(f => f.path === filePath);
    if (fileIndex === -1) {
      const response: ApiResponse = {
        success: false,
        error: 'File not found in project'
      };
      return res.status(404).json(response);
    }

    // Update file content in memory
    project.files[fileIndex] = {
      ...project.files[fileIndex],
      content
    };
    project.updatedAt = new Date().toISOString();

    // Write file to disk
    const projectDir = path.join(config.workspace.projects, projectId);
    const fullFilePath = path.join(projectDir, filePath);
    
    // Ensure directory exists
    await mkdir(path.dirname(fullFilePath), { recursive: true });
    
    // Write the updated content
    await writeFile(fullFilePath, content, 'utf8');

    // Update project in memory
    projects.set(projectId, project);

    // Regenerate filelist.f
    const sections = buildSectionsFromProject(project);
    await generateImprovedFilelist(project, projectDir, sections);

    apiLogger.info('File updated successfully', { 
      projectId, 
      filePath, 
      contentLength: content.length 
    });

    const response: ApiResponse<ProjectFile> = {
      success: true,
      data: project.files[fileIndex],
      message: 'File updated successfully'
    };
    res.json(response);

  } catch (error: any) {
    apiLogger.error('Failed to update file', error, { 
      projectId: req.params.id, 
      filePath: req.params[0] 
    });
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to update file'
    };
    res.status(500).json(response);
  }
});

// PUT /api/projects/:id/testplan - Upload test plan to existing project
router.put('/:id/testplan', validateId, excelUpload.single('file'), async (req: Request, res: Response) => {
  try {
    // Initialize projects from filesystem if not already done
    await initializeProjects();
    
    const projectId = req.params.id;
    const project = projects.get(projectId);
    
    if (!project) {
      const response: ApiResponse = {
        success: false,
        error: 'Project not found'
      };
      return res.status(404).json(response);
    }
    
    const file = req.file;
    if (!file) {
      const response: ApiResponse = {
        success: false,
        error: 'No file uploaded'
      };
      return res.status(400).json(response);
    }
    
    // Parse the test plan Excel file
    const testPlan = parseTestPlanExcel(file.buffer, file.originalname);
    const validation = validateTestPlanEntries(testPlan.entries);
    
    if (!validation.valid) {
      const response: ApiResponse = {
        success: false,
        error: 'Test plan validation failed',
        details: validation.errors
      };
      return res.status(400).json(response);
    }
    
    // Add upload timestamp
    const testPlanWithTimestamp = {
      ...testPlan,
      uploadedAt: new Date().toISOString()
    };
    
    // Update project with test plan
    const updatedProject: Project = {
      ...project,
      testPlan: testPlanWithTimestamp,
      updatedAt: new Date().toISOString()
    };
    
    // Update project in memory
    projects.set(projectId, updatedProject);
    
    // Save updated metadata to disk
    const projectPath = path.join(config.workspace.projects, projectId);
    await saveProjectMetadataToFile(projectPath, updatedProject);
    
    console.log(`📊 Added test plan to existing project: ${project.name} (${testPlan.validCount}/${testPlan.totalCount} valid entries)`);
    
    const response: ApiResponse<any> = {
      success: true,
      data: testPlanWithTimestamp
    };
    res.json(response);
    
  } catch (error: any) {
    console.error('Test plan upload error:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to upload test plan'
    };
    res.status(500).json(response);
  }
});

// Debug endpoint to reload projects from filesystem
router.get('/debug/reload', async (req: Request, res: Response) => {
  try {
    // Force reload projects
    projectsInitialized = false;
    await initializeProjects();
    
    const projectList = Array.from(projects.values());
    apiLogger.info('Force reloaded projects', { count: projectList.length });
    
    res.json({
      success: true,
      message: `Reloaded ${projectList.length} projects`,
      data: projectList.map(p => ({ id: p.id, name: p.name }))
    });
  } catch (error: any) {
    apiLogger.error('Failed to reload projects', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reload projects'
    });
  }
});

export default router; 