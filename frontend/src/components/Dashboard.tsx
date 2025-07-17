import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Folder as FolderIcon,
  PlayArrow as PlayIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  DateRange as DateRangeIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import { Job, SystemStatus } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    
    // Setup WebSocket listeners for real-time updates
    websocketService.on('jobProgress', handleJobProgress);
    websocketService.on('jobCompleted', loadDashboardData);
    websocketService.on('systemStatusChanged', (data) => setSystemStatus(data));

    return () => {
      websocketService.off('jobProgress');
      websocketService.off('jobCompleted');
      websocketService.off('systemStatusChanged');
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusResponse, jobsResponse, statisticsResponse] = await Promise.all([
        apiService.getSystemStatus(),
        apiService.getJobs(),
        apiService.getSystemStatistics(),
      ]);

      if (statusResponse.success && statusResponse.data) {
        setSystemStatus(statusResponse.data);
      }

      if (jobsResponse.success && jobsResponse.data) {
        setAllJobs(jobsResponse.data);
      }

      if (statisticsResponse.success && statisticsResponse.data) {
        setStatistics(statisticsResponse.data);
        console.log('📊 Dashboard: Loaded statistics', statisticsResponse.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleJobProgress = (progress: any) => {
    // Update jobs in allJobs array for real-time statistics
    setAllJobs(prev => 
      prev.map(job => 
        job.id === progress.jobId 
          ? { ...job, status: progress.status }
          : job
      )
    );
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getTaskStatistics = () => {
    return {
      total: allJobs.length,
      pending: allJobs.filter(job => job.status === 'pending' || job.status === 'queued').length,
      inProgress: allJobs.filter(job => job.status === 'running').length,
      completed: allJobs.filter(job => job.status === 'completed').length,
      failed: allJobs.filter(job => job.status === 'failed').length,
      cancelled: allJobs.filter(job => job.status === 'cancelled').length,
    };
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
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={loadDashboardData}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  const taskStats = getTaskStatistics();

  // Prepare data for the donut chart
  const chartData = [
    { name: 'Completed', value: taskStats.completed, color: theme.palette.success.main },
    { name: 'Running', value: taskStats.inProgress, color: theme.palette.info.main },
    { name: 'Pending', value: taskStats.pending, color: theme.palette.warning.main },
    { name: 'Failed', value: taskStats.failed, color: theme.palette.error.main },
    { name: 'Cancelled', value: taskStats.cancelled, color: theme.palette.text.disabled },
  ].filter(item => item.value > 0); // Only show segments with values > 0

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            boxShadow: 1,
          }}
        >
          <Typography variant="body2">
            <strong>{data.name}:</strong> {data.value}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🎛️ Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Three Equal Cards in One Row */}
        <Grid item xs={12} md={4}>
          {/* Task Statistics */}
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Task Statistics
              </Typography>
              
              {taskStats.total === 0 ? (
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center" 
                  height={200}
                  color="text.secondary"
                >
                  <Typography variant="body2">No jobs found</Typography>
                </Box>
              ) : (
                <Box height={200}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}

              {/* Legend with totals */}
              <Box mt={2}>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="center" mb={1}>
                      <Typography variant="h5" color="primary">
                        {taskStats.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 1, alignSelf: 'flex-end' }}>
                        Total Jobs
                      </Typography>
                    </Box>
                  </Grid>
                  {chartData.map((item) => (
                    <Grid item xs={6} key={item.name}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: item.color,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {item.name}: {item.value}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          {/* System Status */}
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <MemoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small" />
                System Status
              </Typography>
              
              {systemStatus && (
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Server:</Typography>
                    <Chip
                      label={systemStatus.server.status}
                      color="success"
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">License:</Typography>
                    <Chip
                      label={systemStatus.license.available ? 'Available' : 'Unavailable'}
                      color={systemStatus.license.available ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Uptime:</Typography>
                    <Typography variant="body2">
                      {formatUptime(systemStatus.server.uptime)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Memory:</Typography>
                    <Typography variant="body2">
                      {formatBytes(systemStatus.server.memory.heapUsed)}
                    </Typography>
                  </Box>
                  
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Queue:</Typography>
                    <Typography variant="body2">
                      {systemStatus.queue.queuedJobs} jobs
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Quick Actions */}
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SpeedIcon sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small" />
                Quick Actions
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  fullWidth
                  onClick={() => navigate('/projects/create')}
                >
                  Create Project
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<FolderIcon />}
                  fullWidth
                  onClick={() => navigate('/projects')}
                >
                  Browse Projects
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<PlayIcon />}
                  fullWidth
                  onClick={() => navigate('/jobs')}
                >
                  View All Jobs
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Platform Usage Statistics */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">
              <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small" />
              Platform Usage Statistics
            </Typography>
          </Box>
          
          {!statistics ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Combined Projects + Jobs Statistics */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small" />
                      Platform Overview
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={6}>
                        <Box textAlign="center">
                          <Typography variant="h3" color="primary">
                            {statistics.totals.projects}
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            Projects
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Active in workspace
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Box textAlign="center">
                          <Typography variant="h3" color="secondary">
                            {statistics.totals.jobs}
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            Jobs
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            All time executions
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Interactive Activity Overview */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        <DateRangeIcon sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small" />
                        Activity Overview
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Period</InputLabel>
                        <Select
                          value={selectedTimePeriod}
                          label="Period"
                          onChange={(e) => setSelectedTimePeriod(e.target.value as 'day' | 'week' | 'month')}
                        >
                          <MenuItem value="day">Daily</MenuItem>
                          <MenuItem value="week">Weekly</MenuItem>
                          <MenuItem value="month">Monthly</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    
                    <Grid container spacing={2}>
                      {selectedTimePeriod === 'day' && (
                        <>
                          <Grid item xs={6}>
                            <Box p={2} bgcolor="background.default" borderRadius={1}>
                              <Typography variant="subtitle2" color="primary">Today</Typography>
                              <Typography variant="h5">{statistics.timeBasedStats.today.jobsCreated}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                ✅ {statistics.timeBasedStats.today.jobsCompleted} completed, ❌ {statistics.timeBasedStats.today.jobsFailed} failed
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={6}>
                            <Box p={2} bgcolor="background.default" borderRadius={1}>
                              <Typography variant="subtitle2" color="primary">Yesterday</Typography>
                              <Typography variant="h5">{statistics.timeBasedStats.yesterday.jobsCreated}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                ✅ {statistics.timeBasedStats.yesterday.jobsCompleted} completed, ❌ {statistics.timeBasedStats.yesterday.jobsFailed} failed
                              </Typography>
                            </Box>
                          </Grid>
                        </>
                      )}
                      
                      {selectedTimePeriod === 'week' && (
                        <Grid item xs={12}>
                          <Box p={2} bgcolor="background.default" borderRadius={1}>
                            <Typography variant="subtitle2" color="primary">Last 7 Days</Typography>
                            <Typography variant="h4">{statistics.timeBasedStats.lastWeek.jobsCreated}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              ✅ {statistics.timeBasedStats.lastWeek.jobsCompleted} completed, ❌ {statistics.timeBasedStats.lastWeek.jobsFailed} failed
                            </Typography>
                            <Box mt={1}>
                              <Typography variant="caption" color="success.main">
                                Success Rate: {statistics.timeBasedStats.lastWeek.jobsCreated > 0 ? 
                                  ((statistics.timeBasedStats.lastWeek.jobsCompleted / (statistics.timeBasedStats.lastWeek.jobsCompleted + statistics.timeBasedStats.lastWeek.jobsFailed)) * 100).toFixed(1) : 0}%
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      )}
                      
                      {selectedTimePeriod === 'month' && (
                        <Grid item xs={12}>
                          <Box p={2} bgcolor="background.default" borderRadius={1}>
                            <Typography variant="subtitle2" color="primary">Last 30 Days</Typography>
                            <Typography variant="h4">{statistics.timeBasedStats.lastMonth.jobsCreated}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              ✅ {statistics.timeBasedStats.lastMonth.jobsCompleted} completed, ❌ {statistics.timeBasedStats.lastMonth.jobsFailed} failed
                            </Typography>
                            <Box mt={1}>
                              <Typography variant="caption" color="success.main">
                                Success Rate: {statistics.timeBasedStats.lastMonth.jobsCreated > 0 ? 
                                  ((statistics.timeBasedStats.lastMonth.jobsCompleted / (statistics.timeBasedStats.lastMonth.jobsCompleted + statistics.timeBasedStats.lastMonth.jobsFailed)) * 100).toFixed(1) : 0}%
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Most Active Projects */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        🔥 Most Active Projects
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate('/projects')}
                      >
                        View All
                      </Button>
                    </Box>
                    
                    {statistics.projectActivity.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No project activity found.
                      </Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Project</TableCell>
                              <TableCell align="right">Jobs</TableCell>
                              <TableCell align="right">Last Activity</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {statistics.projectActivity.slice(0, 5).map((project: any) => (
                              <TableRow 
                                key={project.id}
                                hover
                                sx={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/projects/${project.id}`)}
                              >
                                <TableCell>
                                  <Typography variant="body2" noWrap>
                                    {project.name}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={project.jobCount} 
                                    size="small" 
                                    color={project.jobCount > 0 ? "primary" : "default"}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="caption">
                                    {project.lastJobDate 
                                      ? new Date(project.lastJobDate).toLocaleDateString()
                                      : 'Never'
                                    }
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Activity Trend Chart */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small" />
                      Activity Trend
                    </Typography>
                    
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={
                        selectedTimePeriod === 'day' ? statistics.dailyActivity :
                        selectedTimePeriod === 'week' ? statistics.weeklyActivity :
                        statistics.monthlyActivity
                      }>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => {
                            if (selectedTimePeriod === 'day') {
                              return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }
                            return value; // For week and month, the date is already formatted
                          }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => {
                            if (selectedTimePeriod === 'day') {
                              return `Date: ${new Date(value).toLocaleDateString()}`;
                            }
                            return `Period: ${value}`;
                          }}
                          formatter={(value, name) => {
                            const labels = {
                              'jobsCreated': 'Jobs Created',
                              'jobsCompleted': 'Jobs Completed', 
                              'jobsFailed': 'Jobs Failed'
                            };
                            return [value, labels[name as keyof typeof labels] || name];
                          }}
                        />
                        <Bar dataKey="jobsCreated" fill={theme.palette.primary.main} name="jobsCreated" />
                        <Bar dataKey="jobsCompleted" fill={theme.palette.success.main} name="jobsCompleted" />
                        <Bar dataKey="jobsFailed" fill={theme.palette.error.main} name="jobsFailed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 