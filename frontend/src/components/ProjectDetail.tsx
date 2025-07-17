import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Divider,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DialogContentText,
  IconButton,
  FormHelperText,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Snackbar,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Verified as VerifiedIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
  ArrowBack as BackIcon,
  Memory as FormalIcon,
  Visibility as ViewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  TableChart as TestPlanIcon,
  CheckCircle as CheckCircleIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import { Project, ProjectFile, Job } from '../types';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [jobType, setJobType] = useState<'simulation' | 'formal'>('simulation');
  const [jobOptions, setJobOptions] = useState({
    testbench: '',
    timeout: '60',
    simulationTime: 'run -all',
    formalMode: 'lint', // Add formal mode selection
    defineOptions: [
      { name: 'SIMULATION', value: '', enabled: true },
      { name: 'DEPT', value: '10', enabled: false },
    ],
  });
  const [customModuleName, setCustomModuleName] = useState('');
  const [runningJobs, setRunningJobs] = useState<Job[]>([]);
  const [allProjectJobs, setAllProjectJobs] = useState<Job[]>([]);
  const [jobProgress, setJobProgress] = useState<Record<string, number>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Recently completed jobs (shown temporarily)
  const [recentlyCompletedJobs, setRecentlyCompletedJobs] = useState<Job[]>([]);
  
  // Toast notification state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');
  
  // Track subscribed job IDs to avoid duplicate subscriptions
  const subscribedJobsRef = useRef<Set<string>>(new Set());

  // File editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Test plan pagination state
  const [testPlanPage, setTestPlanPage] = useState(0);
  const TEST_PLAN_PAGE_SIZE = 10;
  
  // Test plan upload state
  const [testPlanUploading, setTestPlanUploading] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject(id);
    }

    // Setup WebSocket listeners
    websocketService.on('jobProgress', handleJobProgress);
    websocketService.on('jobStatus', handleJobStatus);
    websocketService.on('jobCompleted', () => {
      if (project) loadRunningJobs(project.id);
    });

    return () => {
      websocketService.off('jobProgress');
      websocketService.off('jobStatus');
      websocketService.off('jobCompleted');
      
      // Unsubscribe from all running job events
      subscribedJobsRef.current.forEach(jobId => {
        websocketService.emit('unsubscribe-job', jobId);
      });
      subscribedJobsRef.current.clear();
    };
  }, [id]);

  // Load jobs after project is loaded
  useEffect(() => {
    if (project) {
      loadRunningJobs(project.id);
    }
  }, [project]);

  const loadProject = async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading project details...', projectId);
      const response = await apiService.getProject(projectId);
      
      if (response.success && response.data) {
        console.log('✅ Project loaded successfully', response.data);
        console.log('🔍 Project modules data:', response.data.modules);
        setProject(response.data);
        
        // Select first file by default
        if (response.data.files.length > 0) {
          setSelectedFile(response.data.files[0]);
        }
      } else {
        throw new Error(response.error || 'Failed to load project');
      }
    } catch (err: any) {
      console.error('❌ Project loading error:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const loadRunningJobs = async (projectId: string) => {
    try {
      const response = await apiService.getJobs(projectId);
      if (response.success && response.data) {
        const projectJobs = response.data.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Set running jobs (only running/pending)
        const runningJobsOnly = projectJobs.filter(
          job => job.status === 'running' || job.status === 'pending'
        );
        
        // Unsubscribe from old job subscriptions
        subscribedJobsRef.current.forEach(jobId => {
          websocketService.emit('unsubscribe-job', jobId);
        });
        subscribedJobsRef.current.clear();
        
        // Subscribe to WebSocket events for all running jobs
        runningJobsOnly.forEach(job => {
          websocketService.emit('subscribe-job', job.id);
          subscribedJobsRef.current.add(job.id);
        });
        
        console.log(`📡 Subscribed to ${runningJobsOnly.length} running jobs:`, runningJobsOnly.map(j => j.id));
        
        setRunningJobs(runningJobsOnly);
        
        // Set all project jobs (for the bottom section)
        setAllProjectJobs(projectJobs.slice(0, 10)); // Show last 10 jobs
      }
    } catch (err) {
      console.warn('Failed to load project jobs:', err);
    }
  };

  const handleJobProgress = (progress: any) => {
    console.log('📈 Job progress update received:', progress);
    console.log('📈 Progress value:', progress.progress, 'for job:', progress.jobId);
    
    // Update job progress tracking
    setJobProgress(prev => {
      const updated = {
        ...prev,
        [progress.jobId]: progress.progress
      };
      console.log('📈 Updated jobProgress state:', updated);
      return updated;
    });
    
    // Update job status in both running jobs and all project jobs
    setRunningJobs(prev => 
      prev.map(job => 
        job.id === progress.jobId 
          ? { ...job, status: progress.status }
          : job
      )
    );
    
    setAllProjectJobs(prev => 
      prev.map(job => 
        job.id === progress.jobId 
          ? { ...job, status: progress.status }
          : job
      )
    );
  };

  const handleJobStatus = (statusData: any) => {
    console.log('📊 Job status update received:', statusData);
    console.log('📊 Current running jobs:', runningJobs.map(j => ({ id: j.id, status: j.status })));
    console.log('📊 Subscribed jobs:', Array.from(subscribedJobsRef.current));
    
    // Update job status in both running jobs and all project jobs
    setRunningJobs(prev => {
      const updated = prev.map(job => 
        job.id === statusData.jobId 
          ? { ...job, status: statusData.status }
          : job
      );
      
      // If job completed or failed, move it to recently completed and show toast
      if (statusData.status === 'completed' || statusData.status === 'failed') {
        console.log(`🎯 Job ${statusData.jobId} completed/failed, moving to recently completed`);
        
        const completedJob = updated.find(job => job.id === statusData.jobId);
        if (completedJob) {
          const updatedCompletedJob = { ...completedJob, status: statusData.status };
          
          // Add to recently completed jobs only if not already there
          setRecentlyCompletedJobs(prev => {
            const jobExists = prev.some(job => job.id === statusData.jobId);
            if (jobExists) {
              console.log(`🔄 Job ${statusData.jobId} already in recently completed, skipping`);
              return prev;
            }
            
            // Show toast notification for new completion
            const isSuccess = statusData.status === 'completed';
            setToastMessage(
              isSuccess 
                ? `${completedJob.type.charAt(0).toUpperCase() + completedJob.type.slice(1)} completed successfully!`
                : `${completedJob.type.charAt(0).toUpperCase() + completedJob.type.slice(1)} failed!`
            );
            setToastSeverity(isSuccess ? 'success' : 'error');
            setToastOpen(true);
            
            // Remove from recently completed after 15 seconds
            setTimeout(() => {
              setRecentlyCompletedJobs(prev => prev.filter(job => job.id !== statusData.jobId));
            }, 15000);
            
            return [updatedCompletedJob, ...prev.slice(0, 2)]; // Keep max 3
          });
        }
        
        return updated.filter(job => job.id !== statusData.jobId);
      }
      
      return updated;
    });
    
    setAllProjectJobs(prev => 
      prev.map(job => 
        job.id === statusData.jobId 
          ? { ...job, status: statusData.status }
          : job
      )
    );

    // Reload jobs to get fresh data when job completes
    if ((statusData.status === 'completed' || statusData.status === 'failed') && project) {
      console.log(`🔄 Reloading running jobs for project ${project.id}`);
      loadRunningJobs(project.id);
    }
  };

  const handleRunJob = async () => {
    if (!project) return;
    
    try {
      const testbench = jobOptions.testbench || (jobType === 'simulation' ? 'tb_top' : 'top');
      const compileOptions = buildCompileOptionsString();
      
      const response = jobType === 'simulation' 
        ? await apiService.simulateProject(project.id, { 
            ...jobOptions, 
            testbench,
            compileOptions
          })
        : await apiService.formalVerification(project.id, { 
            ...jobOptions, 
            testbench,
            compileOptions,
            formalMode: jobOptions.formalMode // Pass the selected formal mode
          });
      
      if (response.success) {
        setJobDialogOpen(false);
        // Reload running jobs
        loadRunningJobs(project.id);
      } else {
        throw new Error(response.error || 'Failed to start job');
      }
    } catch (err: any) {
      console.error('Failed to start job:', err);
    }
  };

  const handleDeleteJob = (job: Job) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!jobToDelete || !project) return;
    
    try {
      setDeleting(true);
      const response = await apiService.forceDeleteJob(jobToDelete.id);
      
      if (response.success) {
        await loadRunningJobs(project.id); // Reload jobs
        setDeleteDialogOpen(false);
        setJobToDelete(null);
      } else {
        throw new Error(response.error || 'Failed to delete job');
      }
    } catch (err: any) {
      console.error('Failed to delete job:', err);
    } finally {
      setDeleting(false);
    }
  };

  // File editing functions
  const handleEditFile = () => {
    if (!selectedFile) return;
    setIsEditing(true);
    setEditingContent(selectedFile.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingContent('');
  };

  // Define options management functions
  const handleAddDefineOption = () => {
    setJobOptions(prev => ({
      ...prev,
      defineOptions: [
        ...prev.defineOptions,
        { name: '', value: '', enabled: true }
      ]
    }));
  };

  const handleRemoveDefineOption = (index: number) => {
    setJobOptions(prev => ({
      ...prev,
      defineOptions: prev.defineOptions.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateDefineOption = (index: number, field: 'name' | 'value' | 'enabled', value: string | boolean) => {
    setJobOptions(prev => ({
      ...prev,
      defineOptions: prev.defineOptions.map((option, i) => 
        i === index ? { ...option, [field]: value } : option
      )
    }));
  };

  // Helper functions for intelligent module defaults
  const getDefaultTestbench = () => {
    if (!project?.modules?.testbench || project.modules.testbench.length === 0) {
      return 'tb_top'; // fallback
    }
    
    // Use the same priority logic as the dropdown sorting
    const testbenches = [...project.modules.testbench].sort((a, b) => {
      const getPriority = (name: string) => {
        if (name.toLowerCase() === 'tb_top') return 0;
        if (name.toLowerCase() === 'testbench') return 1;
        if (name.toLowerCase().startsWith('tb_')) return 2;
        if (name.toLowerCase().endsWith('_tb')) return 3;
        if (name.toLowerCase().includes('test')) return 4;
        return 5;
      };
      return getPriority(a) - getPriority(b);
    });
    
    // Return the first (highest priority) testbench
    return testbenches[0];
  };

  const getDefaultTopModule = () => {
    if (!project?.modules?.design || project.modules.design.length === 0) {
      return 'top'; // fallback
    }
    
    // Use the same priority logic as the dropdown sorting
    const designs = [...project.modules.design].sort((a, b) => {
      const getPriority = (name: string) => {
        if (name.toLowerCase() === 'top') return 0;
        if (name.toLowerCase().includes('top')) return 1;
        return 2;
      };
      return getPriority(a) - getPriority(b);
    });
    
    // Return the first (highest priority) design module
    return designs[0];
  };

  const buildCompileOptionsString = () => {
    const enabledDefines = jobOptions.defineOptions
      .filter(option => option.enabled && option.name.trim())
      .map(option => {
        if (option.value.trim()) {
          return `+define+${option.name.trim()}=${option.value.trim()}`;
        } else {
          return `+define+${option.name.trim()}`;
        }
      });
    
    return enabledDefines.join(' ');
  };

  const handleTestPlanUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !project) return;

    setTestPlanUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiService.uploadTestPlanToProject(project.id, formData);
      
      if (response.success) {
        // Reload the project to get the updated test plan data
        await loadProject(project.id);
        setToastMessage('Test plan uploaded successfully!');
        setToastSeverity('success');
        setToastOpen(true);
      } else {
        throw new Error(response.error || 'Failed to upload test plan');
      }
    } catch (error: any) {
      console.error('Test plan upload error:', error);
      setToastMessage(error.message || 'Failed to upload test plan');
      setToastSeverity('error');
      setToastOpen(true);
    } finally {
      setTestPlanUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile || !project) return;
    
    try {
      setSaving(true);
      const response = await apiService.updateProjectFile(
        project.id,
        selectedFile.path,
        editingContent
      );
      
      if (response.success) {
        // Update the file content in the project state
        const updatedFiles = project.files.map(file =>
          file.path === selectedFile.path
            ? { ...file, content: editingContent }
            : file
        );
        
        setProject({ ...project, files: updatedFiles });
        setSelectedFile({ ...selectedFile, content: editingContent });
        setIsEditing(false);
        setEditingContent('');
      } else {
        throw new Error(response.error || 'Failed to save file');
      }
    } catch (err: any) {
      console.error('Failed to save file:', err);
      alert(`Failed to save file: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.type === 'verilog' || file.type === 'systemverilog') {
      return <CodeIcon color="primary" />;
    } else if (file.type === 'testbench') {
      return <PlayIcon color="secondary" />;
    } else if (file.type === 'constraint') {
      return <SettingsIcon color="warning" />;
    }
    return <FileIcon />;
  };

  const getFileTypeColor = (type: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (type) {
      case 'verilog': return 'primary';
      case 'systemverilog': return 'info';
      case 'vhdl': return 'success';
      case 'testbench': return 'secondary';
      case 'constraint': return 'warning';
      default: return 'default';
    }
  };

  const formatFileContent = (content: string, fileType: string) => {
    const lines = content.split('\n');
    
    // Simple syntax highlighting for Verilog/SystemVerilog using React components
    const highlightVerilogLine = (line: string) => {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let index = 0;
      
      // Keywords
      const keywords = /(module|endmodule|input|output|wire|reg|always|begin|end|if|else|case|endcase|assign|initial)\b/g;
      let match;
      let lastIndex = 0;
      
      while ((match = keywords.exec(line)) !== null) {
        // Add text before keyword
        if (match.index > lastIndex) {
          parts.push(<span key={`text-${index++}`}>{line.slice(lastIndex, match.index)}</span>);
        }
        // Add highlighted keyword
        parts.push(
          <span key={`keyword-${index++}`} style={{ color: '#0066cc', fontWeight: 'bold' }}>
            {match[0]}
          </span>
        );
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < line.length) {
        let remainingText = line.slice(lastIndex);
        
        // Handle comments
        const commentMatch = remainingText.match(/\/\/.*$/);
        if (commentMatch) {
          const beforeComment = remainingText.slice(0, commentMatch.index);
          const comment = commentMatch[0];
          parts.push(<span key={`before-comment-${index++}`}>{beforeComment}</span>);
          parts.push(
            <span key={`comment-${index++}`} style={{ color: '#008000', fontStyle: 'italic' }}>
              {comment}
            </span>
          );
        } else {
          // Handle numbers and directives
          const highlightedParts = remainingText
            .split(/(\#\d+|`\w+)/)
            .map((part, i) => {
              if (/^\#\d+$/.test(part)) {
                return <span key={`num-${index++}-${i}`} style={{ color: '#ff6600' }}>{part}</span>;
              } else if (/^`\w+$/.test(part)) {
                return <span key={`dir-${index++}-${i}`} style={{ color: '#cc00cc' }}>{part}</span>;
              }
              return part;
            });
          parts.push(<span key={`remaining-${index++}`}>{highlightedParts}</span>);
        }
      }
      
      return parts.length > 0 ? parts : [<span key="empty">{line}</span>];
    };
    
    if (fileType === 'verilog' || fileType === 'systemverilog') {
      return lines.map((line, lineIndex) => (
        <div key={lineIndex} style={{ 
          fontFamily: 'Monaco, "Lucida Console", monospace', 
          fontSize: '13px', 
          lineHeight: '1.4',
          padding: '1px 0'
        }}>
          <span style={{ 
            color: '#999', 
            width: '45px', 
            display: 'inline-block', 
            textAlign: 'right', 
            marginRight: '12px',
            userSelect: 'none',
            borderRight: '1px solid #e0e0e0',
            paddingRight: '8px'
          }}>
            {lineIndex + 1}
          </span>
          <span>{highlightVerilogLine(line)}</span>
        </div>
      ));
    }
    
    // For other file types, just show with line numbers
    return lines.map((line, index) => (
      <div key={index} style={{ 
        fontFamily: 'Monaco, "Lucida Console", monospace', 
        fontSize: '13px', 
        lineHeight: '1.4',
        padding: '1px 0'
      }}>
        <span style={{ 
          color: '#999', 
          width: '45px', 
          display: 'inline-block', 
          textAlign: 'right', 
          marginRight: '12px',
          userSelect: 'none',
          borderRight: '1px solid #e0e0e0',
          paddingRight: '8px'
        }}>
          {index + 1}
        </span>
        <span>{line}</span>
      </div>
    ));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={() => id && loadProject(id)}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!project) {
    return (
      <Alert severity="warning">
        Project not found
      </Alert>
    );
  }

  return (
    <Box>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate('/dashboard')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </Link>
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate('/projects')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <FolderIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Projects
        </Link>
        <Typography color="text.primary">{project.name}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
    <Box>
      <Typography variant="h4" gutterBottom>
            📋 {project.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {project.description || 'No description provided'}
          </Typography>
          <Box display="flex" gap={1} mt={1}>
            <Chip label={`${project.files.length} files`} color="primary" size="small" />
            <Chip label={`Created: ${new Date(project.createdAt).toLocaleDateString()}`} size="small" />
            <Chip label={`Updated: ${new Date(project.updatedAt).toLocaleDateString()}`} size="small" />
          </Box>
        </Box>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/projects')}
          >
            Back to Projects
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={() => {
              setJobType('simulation');
              setCustomModuleName('');
              setJobOptions({
                testbench: getDefaultTestbench(),
                timeout: '60',
                simulationTime: 'run -all',
                formalMode: 'lint', // Add formalMode for consistency
                defineOptions: [
                  { name: 'SIMULATION', value: '', enabled: true },
                  { name: 'DEPT', value: '10', enabled: false },
                ],
              });
              setJobDialogOpen(true);
            }}
            disabled={runningJobs.length > 0}
          >
            Run Simulation
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<VerifiedIcon />}
            onClick={() => {
              setJobType('formal');
              setCustomModuleName('');
              setJobOptions({
                testbench: getDefaultTopModule(),
                timeout: '60',
                simulationTime: 'run -all',
                formalMode: 'lint', // Set default formal mode
                defineOptions: [
                  { name: 'SIMULATION', value: '', enabled: true },
                  { name: 'DEPT', value: '10', enabled: false },
                ],
              });
              setJobDialogOpen(true);
            }}
            disabled={runningJobs.length > 0}
          >
            Formal Verification
          </Button>
        </Box>
      </Box>

      {/* Running Jobs Alert */}
      {(runningJobs.length > 0 || recentlyCompletedJobs.length > 0) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {/* Running Jobs */}
          {runningJobs.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Running Jobs ({runningJobs.length})
              </Typography>
              {runningJobs.map(job => (
                <Box key={job.id} display="flex" flexDirection="column" gap={1} mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">
                      • {job.type.charAt(0).toUpperCase() + job.type.slice(1)} - {job.status}
                      {jobProgress[job.id] && ` (${jobProgress[job.id]}%)`}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      View Details
                    </Button>
                  </Box>
                  
                  {/* Progress Bar with Animation */}
                  {jobProgress[job.id] !== undefined && (
                    <Box sx={{ width: '100%' }}>
                      {(() => {
                        const progressValue = jobProgress[job.id];
                        console.log(`📊 Rendering progress bar for job ${job.id} with value:`, progressValue);
                        console.log('📊 Current jobProgress state:', jobProgress);
                        return (
                          <Box>
                            {/* Temporary test bar to verify LinearProgress works */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption">Test Progress (should show 75%):</Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={75} 
                                sx={{ height: 4, backgroundColor: 'rgba(255,0,0,0.2)' }}
                              />
                            </Box>
                            
                            {/* Actual progress bar */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption">Job Progress Value: {progressValue}%</Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={progressValue || 0} 
                                sx={{ 
                                  height: 8, 
                                  borderRadius: 4,
                                  backgroundColor: 'rgba(0,0,0,0.1)',
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 4,
                                    background: 'linear-gradient(45deg, #ff8533 30%, #ffaa66 90%)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::after': {
                                      content: '""',
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      bottom: 0,
                                      right: 0,
                                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                                      animation: 'shimmer 2s infinite',
                                    }
                                  }
                                }}
                              />
                            </Box>
                          </Box>
                        );
                      })()}
                      <style>
                        {`
                          @keyframes shimmer {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(100%); }
                          }
                        `}
                      </style>
                    </Box>
                  )}
                  
                  {/* Animated Status for jobs without progress percentage */}
                  {jobProgress[job.id] === undefined && job.status === 'running' && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={16} thickness={4} />
                      <Typography variant="caption" color="primary" sx={{ 
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%': { opacity: 0.6 },
                          '50%': { opacity: 1 },
                          '100%': { opacity: 0.6 }
                        }
                      }}>
                        Processing...
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Pending status with dots animation */}
                  {job.status === 'pending' && (
                    <Typography variant="caption" color="warning.main" sx={{
                      '&::after': {
                        content: '"..."',
                        animation: 'dots 1.5s steps(4, end) infinite',
                      },
                      '@keyframes dots': {
                        '0%, 20%': { content: '"."' },
                        '40%': { content: '".."' },
                        '60%': { content: '"..."' },
                        '80%, 100%': { content: '""' }
                      }
                    }}>
                      Waiting for execution
                    </Typography>
                  )}
                </Box>
              ))}
            </>
          )}
          
          {/* Recently Completed Jobs */}
          {recentlyCompletedJobs.length > 0 && (
            <>
              {runningJobs.length > 0 && <Box sx={{ height: '8px' }} />}
              <Typography variant="subtitle2" gutterBottom>
                Recently Completed
              </Typography>
              {recentlyCompletedJobs.map(job => (
                <Box key={job.id} display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="body2">
                    • {job.type.charAt(0).toUpperCase() + job.type.slice(1)} - 
                    <Chip 
                      label={job.status}
                      size="small"
                      color={job.status === 'completed' ? 'success' : 'error'}
                      sx={{ ml: 1, mr: 1 }}
                    />
                    (will hide in 15s)
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    View Results
                  </Button>
                </Box>
              ))}
            </>
          )}
        </Alert>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* File Browser */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '600px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box p={2} borderBottom="1px solid #e0e0e0">
              <Typography variant="h6">
                📁 Project Files ({project.files.length})
              </Typography>
            </Box>
            <List sx={{ flex: 1, overflow: 'auto' }} dense>
              {project.files.map((file, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemButton
                    selected={selectedFile?.path === file.path}
                    onClick={() => setSelectedFile(file)}
                  >
                    <ListItemIcon>
                      {getFileIcon(file)}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={file.path}
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Chip
                        label={file.type}
                        color={getFileTypeColor(file.type)}
                        size="small"
                      />
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* File Content Viewer */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '600px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box p={2} borderBottom="1px solid #e0e0e0" display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                {selectedFile ? (
                  <>
                    📄 {selectedFile.name}
                    <Chip 
                      label={selectedFile.type}
                      color={getFileTypeColor(selectedFile.type)}
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </>
                ) : (
                  '📄 Select a file to view'
                )}
              </Typography>
              
              {/* Edit Controls */}
              {selectedFile && selectedFile.content && (
                <Box display="flex" gap={1}>
                  {!isEditing ? (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={handleEditFile}
                    >
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleSaveFile}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </Box>
              )}
            </Box>
            
            <Box sx={{ flex: 1, overflow: 'auto', p: isEditing ? 0 : 2, backgroundColor: '#f8f9fa' }}>
              {selectedFile ? (
                selectedFile.content && selectedFile.content.trim() ? (
                  isEditing ? (
                    <TextField
                      multiline
                      fullWidth
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      variant="outlined"
                      sx={{
                        height: '100%',
                        '& .MuiOutlinedInput-root': {
                          height: '100%',
                          fontSize: '14px',
                          fontFamily: 'monospace',
                          backgroundColor: 'white',
                          '& fieldset': { border: 'none' },
                        },
                        '& .MuiInputBase-inputMultiline': {
                          height: '100% !important',
                          overflow: 'auto !important',
                        }
                      }}
                    />
                  ) : (
                    <Box>
                      {formatFileContent(selectedFile.content, selectedFile.type)}
                    </Box>
                  )
                ) : (
                  <Alert severity="info" sx={{ m: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      File content not available
                    </Typography>
                    <Typography variant="body2">
                      This may occur if:
                      • The file is empty
                      • The file content hasn't been loaded yet
                      • The file is binary or too large to display
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      File path: <code>{selectedFile.path}</code>
                    </Typography>
                  </Alert>
                )
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <FileIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select a file to view
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Click on any file in the left panel to view its content with syntax highlighting
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Test Plan Section */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TestPlanIcon color="primary" />
          Test Plan {project?.testPlan && `(${project.testPlan.validCount} test cases)`}
        </Typography>
        
        {project?.testPlan ? (
          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                File: <strong>{project.testPlan.filename}</strong> • 
                Total: {project.testPlan.totalCount} rows • 
                Valid: {project.testPlan.validCount} test cases
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Page {testPlanPage + 1} of {Math.ceil(project.testPlan.entries.length / TEST_PLAN_PAGE_SIZE)}
              </Typography>
            </Box>
            
            <Box sx={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Test Title</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Test ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Requirement ID</th>
                  </tr>
                </thead>
                <tbody>
                  {project.testPlan.entries
                    .slice(testPlanPage * TEST_PLAN_PAGE_SIZE, (testPlanPage + 1) * TEST_PLAN_PAGE_SIZE)
                    .map((entry, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{entry.title}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                          <Chip label={entry.testPlanId} size="small" color="primary" variant="outlined" />
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                          {entry.description && (
                            <Chip label={entry.description} size="small" color="secondary" variant="outlined" />
                          )}
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                          <Chip label={entry.requirementId} size="small" color="info" variant="outlined" />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Box>
            
            {project.testPlan.entries.length > TEST_PLAN_PAGE_SIZE && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
                <Button
                  size="small"
                  disabled={testPlanPage === 0}
                  onClick={() => setTestPlanPage(p => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  disabled={(testPlanPage + 1) * TEST_PLAN_PAGE_SIZE >= project.testPlan.entries.length}
                  onClick={() => setTestPlanPage(p => p + 1)}
                >
                  Next
                </Button>
              </Box>
            )}
          </Paper>
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No test plan uploaded for this project
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload an Excel file containing test plan information to track test case coverage and results.
            </Typography>
            <Button
              variant="contained"
              component="label"
              startIcon={testPlanUploading ? <CircularProgress size={16} /> : <TestPlanIcon />}
              disabled={testPlanUploading}
              sx={{ mr: 2 }}
            >
              {testPlanUploading ? 'Uploading...' : 'Upload Test Plan'}
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={handleTestPlanUpload}
                disabled={testPlanUploading}
              />
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Supported formats: Excel (.xlsx, .xls)<br />
              Column order: Title, Test ID, Type, Requirement ID
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Project Jobs Section */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Project Jobs
        </Typography>
        <Paper sx={{ p: 2 }}>
          {allProjectJobs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" py={4}>
              No jobs found for this project. Start a simulation or formal verification to see job history.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {allProjectJobs.map(job => (
                <Grid item xs={12} sm={6} md={4} key={job.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { 
                        transform: 'translateY(-2px)',
                        boxShadow: 4 
                      }
                    }}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                          </Typography>
                          {job.type === 'formal' && job.config.formalMode && (
                            <Chip
                              label={job.config.formalMode.toUpperCase()}
                              size="small"
                              icon={job.config.formalMode === 'lint' ? <CodeIcon fontSize="small" /> : <SyncIcon fontSize="small" />}
                              sx={{
                                height: '18px',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                backgroundColor: job.config.formalMode === 'lint' ? '#4caf50' : '#2196f3',
                                color: 'white',
                                '& .MuiChip-icon': {
                                  color: 'white',
                                  fontSize: '0.7rem'
                                },
                                '& .MuiChip-label': {
                                  px: 0.8,
                                  py: 0.3
                                }
                              }}
                            />
                          )}
                        </Box>
                        <Chip 
                          label={job.status} 
                          color={
                            job.status === 'completed' ? 'success' :
                            job.status === 'running' ? 'primary' :
                            job.status === 'failed' ? 'error' : 'warning'
                          }
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Created: {new Date(job.createdAt).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        DUT: {job.config.dutTop}
                      </Typography>
                      {jobProgress[job.id] && (
                        <Box mt={1}>
                          <LinearProgress 
                            variant="determinate" 
                            value={jobProgress[job.id]} 
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {jobProgress[job.id]}% complete
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.id}`);
                        }}
                      >
                        View Details
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Job
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to permanently delete this job? This action cannot be undone.
            {jobToDelete && (
              <Box mt={2}>
                <Typography variant="body2">
                  <strong>Job ID:</strong> {jobToDelete.id.substring(0, 8)}...
                </Typography>
                <Typography variant="body2">
                  <strong>Type:</strong> {jobToDelete.type}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> {jobToDelete.status}
                </Typography>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Job Configuration Dialog */}
      <Dialog open={jobDialogOpen} onClose={() => setJobDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {jobType === 'simulation' ? '🚀 Run Simulation' : '🔍 Formal Verification'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={2}>
            <FormControl fullWidth required>
              <InputLabel>{jobType === 'simulation' ? 'Testbench Module' : 'Top Module'}</InputLabel>
              <Select
                value={jobOptions.testbench}
                onChange={(e) => setJobOptions(prev => ({ ...prev, testbench: e.target.value }))}
                label={jobType === 'simulation' ? 'Testbench Module' : 'Top Module'}
              >
                {/* Show available modules based on job type */}
                {jobType === 'simulation' ? (
                  project?.modules?.testbench && project.modules.testbench.length > 0 ? (
                    // Sort testbench modules with tb_top, testbench, tb_* first
                    [...project.modules.testbench]
                      .sort((a, b) => {
                        // Priority order for testbench
                        const getPriority = (name: string) => {
                          if (name.toLowerCase() === 'tb_top') return 0;
                          if (name.toLowerCase() === 'testbench') return 1;
                          if (name.toLowerCase().startsWith('tb_')) return 2;
                          if (name.toLowerCase().endsWith('_tb')) return 3;
                          if (name.toLowerCase().includes('test')) return 4;
                          return 5;
                        };
                        return getPriority(a) - getPriority(b);
                      })
                      .map((module) => (
                        <MenuItem key={module} value={module}>
                          {module}
                        </MenuItem>
                      ))
                  ) : (
                    <MenuItem value="tb_top">tb_top (default)</MenuItem>
                  )
                ) : (
                  project?.modules?.design && project.modules.design.length > 0 ? (
                    // Sort design modules with 'top' related names first
                    [...project.modules.design]
                      .sort((a, b) => {
                        // Priority order for design modules
                        const getPriority = (name: string) => {
                          if (name.toLowerCase() === 'top') return 0;
                          if (name.toLowerCase().includes('top')) return 1;
                          return 2;
                        };
                        return getPriority(a) - getPriority(b);
                      })
                      .map((module) => (
                        <MenuItem key={module} value={module}>
                          {module}
                        </MenuItem>
                      ))
                  ) : (
                    <MenuItem value="top">top (default)</MenuItem>
                  )
                )}
                
                {/* Always allow manual entry option */}
                <Divider />
                <MenuItem value="__custom__" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  Enter custom module name...
                </MenuItem>
              </Select>
              <FormHelperText>
                {jobType === 'simulation' 
                  ? project?.modules?.testbench && project.modules.testbench.length > 0
                    ? `Found ${project.modules.testbench.length} testbench module(s) in your project`
                    : 'No testbench modules detected. Using default or enter custom name.'
                  : project?.modules?.design && project.modules.design.length > 0
                    ? `Found ${project.modules.design.length} design module(s) in your project`
                    : 'No design modules detected. Using default or enter custom name.'
                }
              </FormHelperText>
            </FormControl>
            
            {/* Custom module name input when "__custom__" is selected */}
            {jobOptions.testbench === '__custom__' && (
              <TextField
                label={`Custom ${jobType === 'simulation' ? 'Testbench' : 'Top'} Module Name`}
                value={customModuleName}
                onChange={(e) => {
                  setCustomModuleName(e.target.value);
                  setJobOptions(prev => ({ ...prev, testbench: e.target.value }));
                }}
                fullWidth
                required
                placeholder={jobType === 'simulation' ? 'tb_top' : 'top'}
                helperText="Enter the exact module name as defined in your design files"
                autoFocus
              />
            )}
            
            {/* Formal Mode Selection for Formal Jobs */}
            {jobType === 'formal' && (
              <FormControl fullWidth required>
                <InputLabel>Formal Verification Mode</InputLabel>
                <Select
                  value={jobOptions.formalMode}
                  onChange={(e) => setJobOptions(prev => ({ ...prev, formalMode: e.target.value }))}
                  label="Formal Verification Mode"
                >
                  <MenuItem value="lint">
                    <Box display="flex" alignItems="center" gap={1}>
                      <CheckCircleIcon color="primary" />
                      <Box>
                        <Typography variant="body2">Lint Verification</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Design rule checking and methodology compliance
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                  <MenuItem value="cdc">
                    <Box display="flex" alignItems="center" gap={1}>
                      <SyncIcon color="secondary" />
                      <Box>
                        <Typography variant="body2">CDC Verification</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Clock Domain Crossing analysis
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                </Select>
                <FormHelperText>
                  {jobOptions.formalMode === 'lint' 
                    ? 'Performs design rule checking and methodology compliance verification'
                    : 'Analyzes clock domain crossings for potential metastability issues'
                  }
                </FormHelperText>
              </FormControl>
            )}
            
            {jobType === 'simulation' && (
              <>
                <TextField
                  label="Simulation Time"
                  value={jobOptions.simulationTime}
                  onChange={(e) => setJobOptions(prev => ({ ...prev, simulationTime: e.target.value }))}
                  fullWidth
                  placeholder="run -all"
                  helperText="Simulation run command: 'run -all' (default), 'run 100ns', 'run 500us', 'run 12ms', etc."
                />

                {/* Define Options Section */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <SettingsIcon />
                      <Typography variant="subtitle1">
                        Define Options (+define+)
                      </Typography>
                      <Chip 
                        label={`${jobOptions.defineOptions.filter(opt => opt.enabled).length} active`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <Typography variant="body2" color="text.secondary">
                        Configure Verilog preprocessor defines for vlog, vopt, and vsim commands.
                        The SIMULATION define is automatically included when enabled.
                      </Typography>
                      
                      {/* Current Generated Command Preview */}
                      {buildCompileOptionsString() && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            <strong>Generated Command:</strong>
                          </Typography>
                          <Box component="code" sx={{ 
                            display: 'block', 
                            fontFamily: 'monospace', 
                            fontSize: '0.85rem',
                            mt: 0.5,
                            p: 1,
                            backgroundColor: 'grey.100',
                            borderRadius: 1
                          }}>
                            {buildCompileOptionsString()}
                          </Box>
                        </Alert>
                      )}

                      {/* Define Options List */}
                      {jobOptions.defineOptions.map((option, index) => (
                        <Paper key={index} sx={{ p: 2, backgroundColor: 'grey.50' }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={1}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={option.enabled}
                                    onChange={(e) => handleUpdateDefineOption(index, 'enabled', e.target.checked)}
                                    size="small"
                                  />
                                }
                                label=""
                                sx={{ m: 0 }}
                              />
                            </Grid>
                            <Grid item xs={4}>
                              <TextField
                                label="Define Name"
                                value={option.name}
                                onChange={(e) => handleUpdateDefineOption(index, 'name', e.target.value)}
                                size="small"
                                fullWidth
                                placeholder="SIMULATION"
                                disabled={option.name === 'SIMULATION'} // Don't allow editing default
                              />
                            </Grid>
                            <Grid item xs={5}>
                              <TextField
                                label="Value (optional)"
                                value={option.value}
                                onChange={(e) => handleUpdateDefineOption(index, 'value', e.target.value)}
                                size="small"
                                fullWidth
                                placeholder="10"
                                helperText={option.value ? `+define+${option.name}=${option.value}` : `+define+${option.name}`}
                              />
                            </Grid>
                            <Grid item xs={2}>
                              <IconButton
                                onClick={() => handleRemoveDefineOption(index)}
                                disabled={option.name === 'SIMULATION'} // Don't allow removing default
                                color="error"
                                size="small"
                              >
                                <RemoveIcon />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </Paper>
                      ))}

                      {/* Add New Define Option Button */}
                      <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddDefineOption}
                        variant="outlined"
                        size="small"
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Add Define Option
                      </Button>

                      {/* Usage Examples */}
                      <Box mt={2}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          <strong>Common Examples:</strong>
                        </Typography>
                        <Box sx={{ pl: 1 }}>
                          <Typography variant="caption" display="block" color="text.secondary">
                            • SIMULATION (no value) → +define+SIMULATION
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            • DEBUG=1 → +define+DEBUG=1
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            • DEPTH=256 → +define+DEPTH=256
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            • TEST_MODE (no value) → +define+TEST_MODE
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </>
            )}
            
            <TextField
              label="Job Timeout"
              type="number"
              value={jobOptions.timeout}
              onChange={(e) => setJobOptions(prev => ({ ...prev, timeout: e.target.value }))}
              fullWidth
              helperText="Maximum job execution time in minutes (prevents runaway jobs)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJobDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRunJob} variant="contained">
            Start {jobType === 'simulation' ? 'Simulation' : 'Verification'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setToastOpen(false)} 
          severity={toastSeverity}
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectDetail; 