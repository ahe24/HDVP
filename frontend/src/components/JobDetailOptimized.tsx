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
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Engineering as EngineeringIcon,
} from '@mui/icons-material';
import JsonViewer from './JsonViewer';
import LogViewer from './LogViewer';

import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import { Job, LogFile } from '../types';

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

const JobDetailOptimized: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<Job | null>(null);
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
      setError(err.message || 'Failed to load job');
    } finally {
      setLoading(false);
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

  useEffect(() => {
    if (id) {
      loadJob(id);
      
      // Setup WebSocket listeners for real-time updates (status and progress only)
      websocketService.on('jobProgress', handleJobProgress);
      websocketService.on('jobStatus', handleJobStatus);
      
      // Subscribe to this specific job
      websocketService.emit('subscribe-job', id);
      
      // Set up periodic refresh
      const interval = setInterval(() => {
        loadJob(id);
      }, 5000);

      return () => {
        websocketService.off('jobProgress');
        websocketService.off('jobStatus');
        websocketService.emit('unsubscribe-job', id);
        clearInterval(interval);
      };
    }
  }, [id, handleJobProgress, handleJobStatus]);

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
      case 'cancelled': return <ErrorIcon fontSize="small" />;
      default: return <ScheduleIcon fontSize="small" />;
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !job) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={() => id && loadJob(id)}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  if (!job) {
    return (
      <Alert severity="error">
        Job not found
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/jobs')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4">
            Job Details
          </Typography>
          <Chip 
            icon={getStatusIcon(job.status)}
            label={job.status.toUpperCase()}
            color={getStatusColor(job.status)}
          />
        </Box>
        <Box display="flex" gap={1}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => loadJob(job.id)}
            disabled={loading}
          >
            Refresh
          </Button>
          {(job.status === 'running' || job.status === 'queued') && (
            <Button
              startIcon={<CancelIcon />}
              onClick={handleCancelJob}
              color="error"
              variant="outlined"
            >
              Cancel
            </Button>
          )}
        </Box>
      </Box>

      {/* Progress Bar */}
      {job.status === 'running' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Progress
            </Typography>
            <Box sx={{ mb: 1 }}>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {progressMessage || 'Processing...'}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {job.status === 'failed' && job.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Job Failed:
          </Typography>
          <Typography variant="body2">
            {job.error}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Job Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Job Information
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Job ID</strong></TableCell>
                      <TableCell>{job.id}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell>{job.type}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell>
                        <Chip 
                          icon={getStatusIcon(job.status)}
                          label={job.status}
                          color={getStatusColor(job.status)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Created</strong></TableCell>
                      <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Duration</strong></TableCell>
                      <TableCell>{formatDuration(new Date(job.createdAt), job.completedAt ? new Date(job.completedAt) : undefined)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Job Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>DUT Top</strong></TableCell>
                      <TableCell>{job.config.dutTop}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Timeout</strong></TableCell>
                      <TableCell>{job.config.timeout ? `${job.config.timeout}s` : 'Default'}</TableCell>
                    </TableRow>
                    {job.config.formalMode && (
                      <TableRow>
                        <TableCell><strong>Formal Mode</strong></TableCell>
                        <TableCell>{job.config.formalMode}</TableCell>
                      </TableRow>
                    )}
                    {job.config.simulationTime && (
                      <TableRow>
                        <TableCell><strong>Simulation Time</strong></TableCell>
                        <TableCell>{job.config.simulationTime}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {job.config.includeDirectories && job.config.includeDirectories.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Include Directories:
                  </Typography>
                  <List dense>
                    {job.config.includeDirectories.map((dir, index) => (
                      <ListItem key={index} sx={{ py: 0 }}>
                        <ListItemText 
                          primary={dir}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Log Files */}
        <Grid item xs={12}>
          <LogFilesCard jobId={job.id} jobStatus={job.status} />
        </Grid>

        {/* Debug Information */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Debug Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Raw Job Data:
                </Typography>
                <JsonViewer data={job} style={{ fontSize: '0.75rem', overflow: 'auto' }} />
              </Paper>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
};

export default JobDetailOptimized;