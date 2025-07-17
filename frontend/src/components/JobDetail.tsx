import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  Stop as StopIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Engineering as EngineeringIcon,
} from '@mui/icons-material';
import JsonViewer from './JsonViewer';
import LogViewer from './LogViewer';
import LintReportViewer from './LintReport/LintReportViewer';
import CDCReportViewer from './CDCReport/CDCReportViewer';
import TestResults from './TestResults';

import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import { Job, LogFile, Project } from '../types';

// LogFilesCard component for displaying log files with download/view options
const LogFilesCard: React.FC<{ jobId: string; jobStatus: string }> = ({ jobId, jobStatus }) => {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedLogFile, setSelectedLogFile] = useState<LogFile | null>(null);

  useEffect(() => {
    if (jobStatus === 'running' || jobStatus === 'completed' || jobStatus === 'failed') {
      loadLogFiles();
    }
  }, [jobId, jobStatus]);

  const loadLogFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getJobLogFiles(jobId);
      if (response.success && response.data) {
        setLogFiles(response.data.logFiles);
      } else {
        setError(response.error || 'Failed to load log files');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load log files');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLog = (logFile: LogFile) => {
    setSelectedLogFile(logFile);
    setViewerOpen(true);
  };

  const handleDownloadLog = (logFile: LogFile) => {
    const downloadUrl = apiService.getLogFileDownloadUrl(jobId, logFile.filename);
    window.open(downloadUrl, '_blank');
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'compile': return 'primary';
      case 'optimize': return 'warning';
      case 'simulate': return 'success';
      case 'formal': return 'info';
      default: return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Log Files
          </Typography>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadLogFiles}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={loadLogFiles}>
              Retry
            </Button>
          }>
            {error}
          </Alert>
        ) : logFiles.length === 0 ? (
          <Alert severity="info">
            {jobStatus === 'pending' || jobStatus === 'queued' 
              ? 'Log files will be available once the job starts running.'
              : 'No log files available yet.'
            }
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Stage</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Modified</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logFiles.map((logFile) => (
                  <TableRow 
                    key={logFile.filename}
                    onClick={() => handleViewLog(logFile)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    <TableCell>
                      <Chip 
                        label={logFile.stage} 
                        color={getStageColor(logFile.stage)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" component="code">
                        {logFile.filename}
                      </Typography>
                    </TableCell>
                    <TableCell>{logFile.description}</TableCell>
                    <TableCell>{formatFileSize(logFile.size)}</TableCell>
                    <TableCell>
                      {new Date(logFile.modifiedAt).toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Download log file">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click when clicking download
                            handleDownloadLog(logFile);
                          }}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {selectedLogFile && (
          <LogViewer
            open={viewerOpen}
            onClose={() => setViewerOpen(false)}
            jobId={jobId}
            filename={selectedLogFile.filename}
            description={selectedLogFile.description}
          />
        )}
      </CardContent>
    </Card>
  );
};

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<Job | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadJob = async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getJob(jobId);
      
      if (response.success && response.data) {
        setJob(response.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(response.error || 'Failed to load job');
      }
    } catch (err: any) {
      console.error('❌ Job loading error:', err);
      setError(err.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const loadProject = async (projectId: string) => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getProject(projectId);
      if (response.success && response.data) {
        setProject(response.data);
      } else {
        setError(response.error || 'Failed to load project');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const loadJobLogs = async (jobId: string) => {
    try {
      const response = await apiService.getLogFile(jobId);
    } catch (err) {
      console.warn('Failed to load job logs:', err);
    }
  };

  const handleJobProgress = React.useCallback((progressData: any) => {
    if (progressData.jobId === id) {
      setProgress(progressData.progress || 0);
      setProgressMessage(progressData.message || '');
      setLastUpdate(new Date());
    }
  }, [id]);

  const handleJobStatus = React.useCallback((statusData: any) => {
    if (statusData.jobId === id) {
      setJob(prev => prev ? { ...prev, status: statusData.status } : null);
      setLastUpdate(new Date());
      
      // Reload full job data on status change
      if (id) {
        loadJob(id);
      }
    }
  }, [id]);

  const handleJobLogs = React.useCallback((logData: any) => {
    if (logData.jobId === id) {
      setLastUpdate(new Date());
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadJob(id);
      loadJobLogs(id);
      
      // Setup WebSocket listeners for real-time updates
      websocketService.on('jobProgress', handleJobProgress);
      websocketService.on('jobStatus', handleJobStatus);
      websocketService.on('jobLogs', handleJobLogs);
      
      // Subscribe to this specific job
      websocketService.emit('subscribe-job', id);
      
      // Set up periodic refresh
      const interval = setInterval(() => {
        loadJob(id);
        loadJobLogs(id);
      }, 5000);

      return () => {
        websocketService.off('jobProgress');
        websocketService.off('jobStatus');
        websocketService.off('jobLogs');
        websocketService.emit('unsubscribe-job', id);
        clearInterval(interval);
      };
    }
  }, [id, handleJobProgress, handleJobStatus, handleJobLogs]);

  // Load project when job is loaded
  useEffect(() => {
    if (job?.projectId) {
      loadProject(job.projectId);
    }
  }, [job?.projectId]);

  const handleCancelJob = async () => {
    if (!job) return;
    
    try {
      const response = await apiService.cancelJob(job.id);
      if (response.success) {
        loadJob(job.id);
      } else {
        setError(response.error || 'Failed to cancel job');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel job');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'queued': return 'info';
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ScheduleIcon fontSize="small" />;
      case 'queued': return <ScheduleIcon fontSize="small" />;
      case 'running': return <EngineeringIcon fontSize="small" />;
      case 'completed': return <CheckIcon fontSize="small" />;
      case 'failed': return <ErrorIcon fontSize="small" />;
      case 'cancelled': return <StopIcon fontSize="small" />;
      default: return <ScheduleIcon fontSize="small" />;
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading && !job) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading job details...
        </Typography>
      </Box>
    );
  }

  if (error && !job) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Failed to load job
        </Typography>
        <Typography variant="body2">
          {error}
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<BackIcon />} 
          onClick={() => navigate('/projects')}
          sx={{ mt: 2 }}
        >
          Back to Projects
        </Button>
      </Alert>
    );
  }

  if (!job) {
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        Job not found
      </Alert>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            {job.type.charAt(0).toUpperCase() + job.type.slice(1)} Job
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Job ID: {job.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <Tooltip title="Refresh">
            <IconButton onClick={() => job.id && loadJob(job.id)}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          {(job.status === 'pending' || job.status === 'queued' || job.status === 'running') && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={handleCancelJob}
            >
              Cancel Job
            </Button>
          )}
          
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/projects')}
          >
            Back to Projects
          </Button>
        </Box>
      </Box>

      {/* Job Information Section */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'medium', display: 'flex', alignItems: 'center', gap: 1 }}>
        📋 Job Information
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Job Overview */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🔍 Overview
              </Typography>
              
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                {getStatusIcon(job.status)}
                <Chip 
                  label={job.status.toUpperCase()}
                  color={getStatusColor(job.status)}
                  variant="filled"
                  size="medium"
                />
              </Box>

              {progress > 0 && (
                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Progress</Typography>
                    <Typography variant="body2" fontWeight="bold">{progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
                  {progressMessage && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {progressMessage}
                    </Typography>
                  )}
                </Box>
              )}

              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Type</TableCell>
                      <TableCell>
                        <Chip 
                          label={job.type} 
                          variant="outlined" 
                          size="small"
                          color={job.type === 'simulation' ? 'primary' : 'secondary'} 
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Project ID</TableCell>
                      <TableCell className="technical-cell">
                        {job.projectId.substring(0, 20)}...
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                      <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
                      <TableCell>
                        <Chip 
                          label={formatDuration(new Date(job.createdAt), job.completedAt ? new Date(job.completedAt) : undefined)}
                          variant="outlined"
                          size="small"
                          color="default"
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Job Configuration */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                ⚙️ Configuration
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>DUT Top</TableCell>
                      <TableCell className="technical-cell">
                        {job.config.dutTop}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Timeout</TableCell>
                      <TableCell>
                        <Chip 
                          label={job.config.timeout ? `${job.config.timeout}s` : 'Default'}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    {job.config.formalMode && (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Formal Mode</TableCell>
                        <TableCell>{job.config.formalMode}</TableCell>
                      </TableRow>
                    )}
                    {job.config.simulationTime && (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Simulation Time</TableCell>
                        <TableCell className="technical-cell">
                          {job.config.simulationTime}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {job.config.includeDirectories && job.config.includeDirectories.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>
                    📁 Include Directories:
                  </Typography>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1,
                      mt: 1
                    }}
                  >
                    {job.config.includeDirectories.map((dir, index) => (
                      <Chip 
                        key={index}
                        label={dir} 
                        variant="outlined" 
                        size="small"
                        className="technical-chip"
                        sx={{ 
                          maxWidth: 'calc(50% - 4px)', // Ensure reasonable line breaks
                          '& .MuiChip-label': { 
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }
                        }}
                        title={dir} // Show full path on hover
                      />
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Results Section */}
      {((job.type === 'formal' && job.status === 'completed') || 
        (job.type === 'simulation' && job.status === 'completed')) && (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'medium', display: 'flex', alignItems: 'center', gap: 1 }}>
            📊 Results
          </Typography>
        </>
      )}

      {/* Lint Report - Only for completed formal verification jobs in lint mode */}
      {job.type === 'formal' && job.status === 'completed' && job.config.formalMode === 'lint' && (
        <Box sx={{ mb: 4 }}>
          <LintReportViewer jobId={job.id} />
        </Box>
      )}

      {/* CDC Report - Only for completed formal verification jobs in cdc mode */}
      {job.type === 'formal' && job.status === 'completed' && job.config.formalMode === 'cdc' && (
        <Box sx={{ mb: 4 }}>
          <CDCReportViewer jobId={job.id} />
        </Box>
      )}

      {/* Functional Requirement Verification - Only for completed simulation jobs */}
      {job.type === 'simulation' && job.status === 'completed' && (
        <Box sx={{ mb: 4 }}>
          <TestResults jobId={job.id} projectTestPlan={project?.testPlan} />
        </Box>
      )}

      {/* Logs Section */}
      <Divider sx={{ my: 4 }} />
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'medium', display: 'flex', alignItems: 'center', gap: 1 }}>
        📄 Logs & Files
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <LogFilesCard jobId={job.id} jobStatus={job.status} />
      </Box>

      {/* Debug Section */}
      <Divider sx={{ my: 4 }} />
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'medium', display: 'flex', alignItems: 'center', gap: 1 }}>
        🔧 Debug Information
      </Typography>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            Raw Job Data
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
            <Typography variant="subtitle2" gutterBottom>
              Complete Job Object:
            </Typography>
            <JsonViewer data={job} style={{ fontSize: '0.75rem', overflow: 'auto' }} />
          </Paper>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default JobDetail; 