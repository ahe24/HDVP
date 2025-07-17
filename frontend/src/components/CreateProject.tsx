import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Upload as UploadIcon,
  InsertDriveFile as FileIcon,
  Folder as FolderIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  BugReport as TestIcon,
  Settings as IncludeIcon,
  Description as DescriptionIcon,
  Memory as MemoryIcon,
  AccountTree as VhdlIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  TableChart as ExcelIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

import { apiService as api } from '../services/api';

interface FileWithPreview extends File {
  preview?: string;
  fileType?: 'verilog' | 'systemverilog' | 'vhdl' | 'testbench' | 'constraint' | 'header' | 'other';
  relativePath?: string;
  id: string;
  section: 'src' | 'tb' | 'include'; // Which upload section this file belongs to
}

interface UploadSection {
  id: 'src' | 'tb' | 'include';
  title: string;
  description: string;
  icon: React.ReactElement;
  files: FileWithPreview[];
  acceptedTypes: string;
  defaultFileTypes: string[];
}

const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize upload sections
  const [uploadSections, setUploadSections] = useState<UploadSection[]>([
    {
      id: 'src',
      title: 'Source Files (src)',
      description: 'Verilog, SystemVerilog, VHDL design files',
      icon: <CodeIcon />,
      files: [],
      acceptedTypes: '.v,.sv,.svh,.vh,.vhd,.vhdl',
      defaultFileTypes: ['verilog', 'systemverilog', 'vhdl']
    },
    {
      id: 'tb',
      title: 'Testbench Files (tb)',
      description: 'Simulation testbench and verification files',
      icon: <TestIcon />,
      files: [],
      acceptedTypes: '.v,.sv,.svh,.vh,.vhd,.vhdl',
      defaultFileTypes: ['testbench']
    },
    {
      id: 'include',
      title: 'Include Files (include)',
      description: 'Header files, defines, and common include files',
      icon: <IncludeIcon />,
      files: [],
      acceptedTypes: '.vh,.svh,.h,.txt,.f',
      defaultFileTypes: ['header', 'other']
    }
  ]);

  // Add state for test plan Excel upload
  const [testPlanFile, setTestPlanFile] = useState<File | null>(null);
  const [testPlanData, setTestPlanData] = useState<any>(null);
  const [testPlanLoading, setTestPlanLoading] = useState(false);
  const [testPlanError, setTestPlanError] = useState<string | null>(null);
  const [testPlanPage, setTestPlanPage] = useState(0);
  const TEST_PLAN_PAGE_SIZE = 10;

  const excelDropzone = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setTestPlanFile(file);
        setTestPlanError(null);
        parseExcelFile(file);
      }
    }, []),
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const detectFileType = (filename: string, section: 'src' | 'tb' | 'include'): 'verilog' | 'systemverilog' | 'vhdl' | 'testbench' | 'constraint' | 'header' | 'other' => {
    const ext = filename.toLowerCase().split('.').pop();
    const basename = filename.toLowerCase();

    // Force testbench type for tb section
    if (section === 'tb') {
      return 'testbench';
    }
    
    // Force header type for include section
    if (section === 'include') {
      if (['.vh', '.svh', '.h'].includes(`.${ext}`)) {
        return 'header';
      }
      return 'other';
    }

    // For src section, detect based on extension
    switch (ext) {
      case 'v':
        return basename.includes('test') || basename.includes('tb') ? 'testbench' : 'verilog';
      case 'sv':
      case 'svh':
        return basename.includes('test') || basename.includes('tb') ? 'testbench' : 'systemverilog';
      case 'vh':
      case 'h':
        return 'header';
      case 'vhd':
      case 'vhdl':
        return 'vhdl';
      case 'sdc':
      case 'xdc':
        return 'constraint';
      default:
        return 'other';
    }
  };

  // Create individual dropzones for each section
  const srcDropzone = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map(file => {
        const fileWithPreview = file as FileWithPreview;
        fileWithPreview.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
        fileWithPreview.section = 'src';
        
        if ((file as any).webkitRelativePath) {
          fileWithPreview.relativePath = (file as any).webkitRelativePath;
          fileWithPreview.fileType = detectFileType((file as any).webkitRelativePath, 'src');
          console.log(`📁 SRC folder file: ${(file as any).webkitRelativePath} -> Type: ${fileWithPreview.fileType}`);
        } else {
          fileWithPreview.fileType = detectFileType(file.name, 'src');
          console.log(`📄 SRC file: ${file.name} -> Type: ${fileWithPreview.fileType}`);
        }
        return fileWithPreview;
      });
      
      setUploadSections(prev => prev.map(s => 
        s.id === 'src' 
          ? { ...s, files: [...s.files, ...newFiles] }
          : s
      ));
      setError(null);
    }, []),
    accept: {
      'text/*': '.v,.sv,.svh,.vh,.vhd,.vhdl'.split(',')
    }
  });

  const tbDropzone = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      const fileWithPreview = file as FileWithPreview;
        fileWithPreview.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
        fileWithPreview.section = 'tb';
        
      if ((file as any).webkitRelativePath) {
        fileWithPreview.relativePath = (file as any).webkitRelativePath;
          fileWithPreview.fileType = detectFileType((file as any).webkitRelativePath, 'tb');
          console.log(`📁 TB folder file: ${(file as any).webkitRelativePath} -> Type: ${fileWithPreview.fileType}`);
      } else {
          fileWithPreview.fileType = detectFileType(file.name, 'tb');
          console.log(`📄 TB file: ${file.name} -> Type: ${fileWithPreview.fileType}`);
      }
      return fileWithPreview;
    });
    
      setUploadSections(prev => prev.map(s => 
        s.id === 'tb' 
          ? { ...s, files: [...s.files, ...newFiles] }
          : s
      ));
    setError(null);
    }, []),
    accept: {
      'text/*': '.v,.sv,.svh,.vh,.vhd,.vhdl'.split(',')
    }
  });

  const includeDropzone = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map(file => {
        const fileWithPreview = file as FileWithPreview;
        fileWithPreview.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
        fileWithPreview.section = 'include';
        
        if ((file as any).webkitRelativePath) {
          fileWithPreview.relativePath = (file as any).webkitRelativePath;
          fileWithPreview.fileType = detectFileType((file as any).webkitRelativePath, 'include');
          console.log(`📁 INCLUDE folder file: ${(file as any).webkitRelativePath} -> Type: ${fileWithPreview.fileType}`);
        } else {
          fileWithPreview.fileType = detectFileType(file.name, 'include');
          console.log(`📄 INCLUDE file: ${file.name} -> Type: ${fileWithPreview.fileType}`);
        }
        return fileWithPreview;
      });
      
      setUploadSections(prev => prev.map(s => 
        s.id === 'include' 
          ? { ...s, files: [...s.files, ...newFiles] }
          : s
      ));
      setError(null);
    }, []),
    accept: {
      'text/*': '.vh,.svh,.h,.txt,.f'.split(',')
    }
  });

  const parseExcelFile = async (file: File) => {
    setTestPlanLoading(true);
    setTestPlanError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.parseTestPlan(formData);
      setTestPlanData(response.data);
      setTestPlanPage(0);
    } catch (error: any) {
      setTestPlanError(error.response?.data?.error || error.message || 'Failed to parse test plan');
      setTestPlanFile(null);
      setTestPlanData(null);
    } finally {
      setTestPlanLoading(false);
    }
  };

  const removeTestPlan = () => {
    setTestPlanFile(null);
    setTestPlanData(null);
    setTestPlanError(null);
    setTestPlanPage(0);
  };

  // Helper function to get the appropriate dropzone for a section
  const getDropzoneForSection = (sectionId: 'src' | 'tb' | 'include') => {
    switch (sectionId) {
      case 'src': return srcDropzone;
      case 'tb': return tbDropzone;
      case 'include': return includeDropzone;
    }
  };

  const removeFile = (sectionId: 'src' | 'tb' | 'include', fileIndex: number) => {
    setUploadSections(prev => prev.map(s => 
      s.id === sectionId 
        ? { ...s, files: s.files.filter((_, i) => i !== fileIndex) }
        : s
    ));
  };

  const updateFileType = (sectionId: 'src' | 'tb' | 'include', fileIndex: number, fileType: 'verilog' | 'systemverilog' | 'vhdl' | 'testbench' | 'constraint' | 'header' | 'other') => {
    setUploadSections(prev => prev.map(s => 
      s.id === sectionId 
        ? { ...s, files: s.files.map((f, i) => i === fileIndex ? { ...f, fileType } : f) }
        : s
    ));
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'verilog': return <CodeIcon color="primary" />;
      case 'systemverilog': return <CodeIcon color="secondary" />;
      case 'vhdl': return <VhdlIcon color="info" />;
      case 'testbench': return <TestIcon color="warning" />;
      case 'constraint': return <MemoryIcon color="error" />;
      case 'header': return <IncludeIcon color="success" />;
      default: return <DescriptionIcon color="disabled" />;
    }
  };

  const getTotalFileCount = () => {
    return uploadSections.reduce((total, section) => total + section.files.length, 0);
  };

  const validateProject = (): string | null => {
    if (!projectName.trim()) {
      return 'Project name is required';
    }

    const totalFiles = getTotalFileCount();
    if (totalFiles === 0) {
      return 'At least one file must be uploaded';
    }

    const srcFiles = uploadSections.find(s => s.id === 'src')?.files || [];
    if (srcFiles.length === 0) {
      return 'At least one source file is required in the src section';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateProject();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', projectName);
      formData.append('description', projectDescription);

      // Prepare structured file metadata for ID-based matching
      const fileMetadata: Array<{
        id: string;
        section: string;
        fileType: string;
        relativePath: string;
        originalName: string;
      }> = [];

      const fileIds: string[] = [];

      // Add files from all sections
      uploadSections.forEach(section => {
        section.files.forEach(file => {
        formData.append('files', file as File);
          fileIds.push(file.id);
          
          fileMetadata.push({
            id: file.id,
            section: file.section,
            fileType: file.fileType || 'other',
            relativePath: file.relativePath || '',
            originalName: file.name
          });

          console.log(`📤 Uploading ${section.id} file: ${file.name} [ID: ${file.id}] [Type: ${file.fileType}]`);
        });
      });

      // Add testPlanData if present
      if (testPlanData) {
        formData.append('testPlanData', JSON.stringify(testPlanData));
      }

      // Send structured metadata
      formData.append('fileMetadata', JSON.stringify(fileMetadata));
      formData.append('fileIds', JSON.stringify(fileIds));

      console.log(`🚀 Creating project "${projectName}" with ${getTotalFileCount()} files`);
      console.log(`📊 Sections: src=${uploadSections[0].files.length}, tb=${uploadSections[1].files.length}, include=${uploadSections[2].files.length}`);

      const response = await api.createProject(formData);
      console.log('✅ Project created successfully:', response);
      navigate('/projects');
    } catch (error: any) {
      console.error('❌ Project creation failed:', error);
      setError(error.response?.data?.error || error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to create file input
  const createFileInput = (sectionId: 'src' | 'tb' | 'include', multiple: boolean = true, directory: boolean = false) => {
    const section = uploadSections.find(s => s.id === sectionId)!;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.accept = section.acceptedTypes;
    if (directory) {
      //@ts-ignore
      input.webkitdirectory = true;
    }
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      // Manually trigger the same logic as onDrop
      const newFiles = files.map(file => {
        const fileWithPreview = file as FileWithPreview;
        fileWithPreview.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
        fileWithPreview.section = sectionId;
        
        if ((file as any).webkitRelativePath) {
          fileWithPreview.relativePath = (file as any).webkitRelativePath;
          fileWithPreview.fileType = detectFileType((file as any).webkitRelativePath, sectionId);
          console.log(`📁 ${sectionId.toUpperCase()} folder file: ${(file as any).webkitRelativePath} -> Type: ${fileWithPreview.fileType}`);
        } else {
          fileWithPreview.fileType = detectFileType(file.name, sectionId);
          console.log(`📄 ${sectionId.toUpperCase()} file: ${file.name} -> Type: ${fileWithPreview.fileType}`);
        }
        return fileWithPreview;
      });
      
      setUploadSections(prev => prev.map(s => 
        s.id === sectionId 
          ? { ...s, files: [...s.files, ...newFiles] }
          : s
      ));
      setError(null);
    };
    input.click();
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Create New Project
      </Typography>
      
      {/* Project Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Project Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
            <TextField
              label="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
                fullWidth
                required
                placeholder="e.g., my_cpu_design"
                helperText="Enter a unique name for your project"
              />
            </Grid>
            <Grid item xs={12} md={6}>
          <TextField
                label="Description"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
                fullWidth
                placeholder="Brief description of your design"
                helperText="Optional project description"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>



      {/* Upload Sections */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Upload Design Files
          </Typography>
            <Chip 
              label={`${getTotalFileCount()} files total`}
              color="primary"
              variant="outlined"
            />
          </Box>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Upload Structure:</strong> Organize your files into sections for better management.
              Include files from both src and tb sections will be automatically added to include paths (+incdir+).
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            {uploadSections.map((section) => {
              const dropzone = getDropzoneForSection(section.id);
              const { getRootProps, getInputProps, isDragActive } = dropzone;
              
              return (
                <Grid item xs={12} md={4} key={section.id}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      height: '100%',
                      border: section.files.length > 0 ? '2px solid' : '1px solid',
                      borderColor: section.files.length > 0 ? 'success.main' : 'grey.300'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {section.icon}
                      <Box sx={{ ml: 1, flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {section.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {section.description}
                        </Typography>
                      </Box>
                      <Chip 
                        label={section.files.length}
                        size="small"
                        color={section.files.length > 0 ? 'success' : 'default'}
                      />
                    </Box>
          
          {/* Dropzone */}
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
                        borderRadius: 1,
                        p: 2,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.default',
              transition: 'all 0.2s ease',
              mb: 2,
                        minHeight: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'primary.main',
              }
            }}
          >
            <input {...getInputProps()} />
                      <Typography variant="body2" color="text.secondary">
                        {isDragActive ? 'Drop here...' : 'Drag & drop or click'}
            </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {section.acceptedTypes}
            </Typography>
          </Box>

                    {/* Upload Buttons */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
                        size="small"
              variant="outlined"
                        onClick={() => createFileInput(section.id, true, false)}
              startIcon={<FileIcon />}
                        fullWidth
            >
                        Files
            </Button>
            <Button
                        size="small"
              variant="outlined"
                        onClick={() => createFileInput(section.id, true, true)}
              startIcon={<FolderIcon />}
                        fullWidth
            >
                        Folder
            </Button>
          </Box>

          {/* File List */}
                    {section.files.length > 0 && (
                      <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                        <List dense>
                          {section.files.map((file, index) => (
                            <ListItem key={file.id} divider>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                      {getFileIcon(file.fileType || 'other')}
                    </ListItemIcon>
                    <ListItemText
                                primary={
                                  <Typography variant="body2" noWrap>
                                    {file.relativePath || file.name}
                                  </Typography>
                                }
                      secondary={
                                  <Typography variant="caption" color="text.secondary">
                            {(file.size / 1024).toFixed(1)} KB
                          </Typography>
                                }
                              />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={file.fileType || 'other'}
                                    onChange={(e) => updateFileType(section.id, index, e.target.value as any)}
                                  >
                                    {section.defaultFileTypes.map(type => (
                                      <MenuItem key={type} value={type}>
                                        {type}
                                      </MenuItem>
                                    ))}
                                    <MenuItem value="other">other</MenuItem>
                        </Select>
                      </FormControl>
                                <IconButton
                      size="small"
                                  onClick={() => removeFile(section.id, index)}
                        color="error"
                      >
                                  <DeleteIcon fontSize="small" />
                      </IconButton>
                              </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

                    {section.files.length === 0 && (
                      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 1 }}>
                        No files uploaded
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Test Plan (Optional) - Moved here to be under Upload Design Files */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Test Plan (Optional)
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Upload an Excel file containing test plan information. This will help track test case coverage and results.<br/>
            <strong>Required column order (column names can vary):</strong><br/>
            • Column 1: Test Title<br/>
            • Column 2: Test ID (Test Case ID)<br/>
            • Column 3: Type (Test Type)<br/>
            • Column 4: Verifies (Requirement ID)
          </Typography>
        </Alert>
        {!testPlanFile ? (
          <Box
            {...excelDropzone.getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: excelDropzone.isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: excelDropzone.isDragActive ? 'action.hover' : 'background.default',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'primary.main',
              }
            }}
          >
            <input {...excelDropzone.getInputProps()} />
            <ExcelIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Upload Test Plan Excel File
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {excelDropzone.isDragActive ? 'Drop Excel file here...' : 'Drag & drop or click to select Excel file'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: .xlsx, .xls
            </Typography>
          </Box>
        ) : (
          <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckIcon sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {testPlanFile.name}
                  </Typography>
                  {testPlanData && (
                    <Typography variant="body2">
                      {testPlanData.validCount} valid test cases loaded
                    </Typography>
                  )}
                </Box>
              </Box>
              <IconButton onClick={removeTestPlan} color="inherit">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Paper>
        )}
        {testPlanLoading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Parsing Excel file...
            </Typography>
          </Box>
        )}
        {testPlanError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {testPlanError}
          </Alert>
        )}
        {testPlanData && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Test Plan Preview (paginated):
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              <List dense>
                {testPlanData.entries.slice(testPlanPage * TEST_PLAN_PAGE_SIZE, (testPlanPage + 1) * TEST_PLAN_PAGE_SIZE).map((entry: any, index: number) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={entry.title}
                      secondary={`${entry.requirementId} | ${entry.testPlanId}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button
                size="small"
                disabled={testPlanPage === 0}
                onClick={() => setTestPlanPage(p => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Typography variant="body2" sx={{ mx: 2 }}>
                Page {testPlanPage + 1} / {Math.ceil(testPlanData.entries.length / TEST_PLAN_PAGE_SIZE)}
              </Typography>
              <Button
                size="small"
                disabled={(testPlanPage + 1) * TEST_PLAN_PAGE_SIZE >= testPlanData.entries.length}
                onClick={() => setTestPlanPage(p => p + 1)}
              >
                Next
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* File Organization Info */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="subtitle1">
              Project Organization Guidelines
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                📁 Source Files (src)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Main design modules (.v, .sv, .vhd)
                • RTL implementation files
                • Design hierarchies
                • Automatically added to include paths
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="warning.main" gutterBottom>
                🧪 Testbench Files (tb)  
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Test modules and testbenches
                • Verification infrastructure
                • Test data and stimuli
                • Automatically added to include paths
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="success.main" gutterBottom>
                📋 Include Files (include)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Header files (.vh, .svh, .h)
                • Package definitions
                • Global defines and parameters
                • Configuration files
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            <strong>Filelist.f Generation:</strong> Only files in src and tb sections will be included in the main filelist.f.
            Include directories will be automatically added with +incdir+ directives.
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading Progress */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Creating project and uploading files...
          </Typography>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || getTotalFileCount() === 0 || !projectName.trim()}
          startIcon={loading ? undefined : <UploadIcon />}
          size="large"
        >
          {loading ? 'Creating...' : 'Create Project'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={() => navigate('/projects')}
          disabled={loading}
          size="large"
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

export default CreateProject; 