import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Pagination,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Engineering as EngineeringIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import { Job, Project } from '../types';

const JobList: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadJobs();
    
    // Setup WebSocket listeners for real-time updates
    websocketService.on('jobStatus', handleJobStatusUpdate);
    websocketService.on('jobProgress', handleJobProgress);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadJobs, 30000);

    return () => {
      websocketService.off('jobStatus');
      websocketService.off('jobProgress');
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = jobs;
    
    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(job => 
        job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getProjectName(job.projectId).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      if (typeFilter.startsWith('formal:')) {
        const mode = typeFilter.split(':')[1];
        filtered = filtered.filter(job => job.type === 'formal' && job.config.formalMode === mode);
      } else {
        filtered = filtered.filter(job => job.type === typeFilter);
      }
    }
    
    setFilteredJobs(filtered);
    
    // Reset to first page when filters change
    setPage(1);
  }, [jobs, searchTerm, statusFilter, typeFilter]);

  // Calculate paginated jobs
  const totalPages = Math.ceil(filteredJobs.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const loadJobs = async () => {
    try {
      setError(null);
      const [jobsResponse, projectsResponse] = await Promise.all([
        apiService.getJobs(),
        apiService.getProjects(),
      ]);
      
      if (jobsResponse.success && jobsResponse.data) {
        setJobs(jobsResponse.data);
        console.log('📊 Loaded jobs:', jobsResponse.data.length);
      } else {
        throw new Error(jobsResponse.error || 'Failed to load jobs');
      }

      if (projectsResponse.success && projectsResponse.data) {
        setProjects(projectsResponse.data);
        console.log('📊 Loaded projects for job mapping:', projectsResponse.data.length);
      } else {
        console.warn('Failed to load projects for job mapping:', projectsResponse.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
      console.error('❌ Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJobStatusUpdate = (data: any) => {
    setJobs(prev => 
      prev.map(job => 
        job.id === data.jobId 
          ? { ...job, status: data.status }
          : job
      )
    );
  };

  const handleJobProgress = (data: any) => {
    // Real-time progress updates (UI can show progress indicators)
    console.log('📈 Job progress update:', data);
  };

  const handleDeleteJob = (job: Job) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    
    try {
      setDeleting(true);
      const response = await apiService.forceDeleteJob(jobToDelete.id);
      
      if (response.success) {
        await loadJobs(); // Reload jobs
        setDeleteDialogOpen(false);
        setJobToDelete(null);
      } else {
        throw new Error(response.error || 'Failed to delete job');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete job');
    } finally {
      setDeleting(false);
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

  const formatDuration = (createdAt: string, completedAt?: string) => {
    const start = new Date(createdAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const duration = end.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getJobCounts = () => {
    const counts = {
      total: jobs.length,
      running: jobs.filter(j => j.status === 'running' || j.status === 'pending').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };
    return counts;
  };

  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : projectId.substring(0, 8) + '...';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading jobs...
        </Typography>
      </Box>
    );
  }

  const counts = getJobCounts();

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            ✅ Jobs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and manage your simulation and formal verification jobs
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadJobs}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Job Statistics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {counts.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Jobs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {counts.running}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Running
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {counts.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                {counts.failed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Failed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            placeholder="Search jobs by ID, project name, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="running">Running</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label="Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="simulation">Simulation</MenuItem>
              <MenuItem value="formal">Formal Verification</MenuItem>
              <MenuItem value="formal:lint">Formal - Lint</MenuItem>
              <MenuItem value="formal:cdc">Formal - CDC</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Jobs Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Job ID</TableCell>
                <TableCell>Project Name</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {jobs.length === 0 
                        ? 'No jobs found. Start a simulation or formal verification from a project to see jobs here.'
                        : filteredJobs.length === 0
                        ? 'No jobs match the current filters.'
                        : 'No jobs on this page.'
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedJobs.map((job) => (
                  <TableRow 
                    key={job.id} 
                    hover 
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(job.status)}
                        <Chip
                          label={job.status}
                          color={getStatusColor(job.status)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={job.type}
                          variant="outlined"
                          size="small"
                          icon={job.type === 'simulation' ? <PlayIcon fontSize="small" /> : <CheckIcon fontSize="small" />}
                        />
                        {job.type === 'formal' && job.config.formalMode && (
                          <Chip
                            label={job.config.formalMode.toUpperCase()}
                            size="small"
                            icon={job.config.formalMode === 'lint' ? <CodeIcon fontSize="small" /> : <SyncIcon fontSize="small" />}
                            sx={{
                              height: '20px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              backgroundColor: job.config.formalMode === 'lint' ? '#4caf50' : '#2196f3',
                              color: 'white',
                              '& .MuiChip-icon': {
                                color: 'white',
                                fontSize: '0.8rem'
                              },
                              '& .MuiChip-label': {
                                px: 1,
                                py: 0.5
                              }
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="technicalDataSmall">
                        {job.id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getProjectName(job.projectId)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(job.createdAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDuration(job.createdAt, job.completedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobs/${job.id}`);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Force Delete">
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
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Pagination Controls */}
      {filteredJobs.length > 0 && (
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center" 
          mt={2}
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="body2" color="text.secondary">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredJobs.length)} of {filteredJobs.length} jobs
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1); // Reset to first page when changing page size
                }}
                variant="outlined"
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              per page
            </Typography>
            
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
              showFirstButton
              showLastButton
            />
          </Box>
        </Box>
      )}

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
    </Box>
  );
};

export default JobList; 