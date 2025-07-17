import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  FormControlLabel,
  Checkbox,
  Pagination,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assessment as ChartIcon,
  Timer as TimerIcon,
  Assignment as PlanIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { VsimResultSummary, TestCaseResult, TestPlanData, TestPlanEntry } from '../types';
import apiService from '../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

interface TestResultsProps {
  jobId: string;
  projectTestPlan?: TestPlanData;
}

interface EnrichedTestResult extends TestCaseResult {
  planEntry?: TestPlanEntry;
  inTestPlan: boolean;
}

const TestResults: React.FC<TestResultsProps> = ({ jobId, projectTestPlan }) => {
  const theme = useTheme();
  const [testResults, setTestResults] = useState<VsimResultSummary | null>(null);
  const [enrichedResults, setEnrichedResults] = useState<EnrichedTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlyPlanned, setShowOnlyPlanned] = useState(false);
  const [showOnlyFailed, setShowOnlyFailed] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchTestResults = async () => {
      try {
        setLoading(true);
        const response = await apiService.getJobTestResults(jobId);
        
        if (response.success && response.data) {
          setTestResults(response.data);
          enrichTestResults(response.data, projectTestPlan);
        } else {
          setError(response.error || 'Failed to load test results');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load test results');
      } finally {
        setLoading(false);
      }
    };

    fetchTestResults();
  }, [jobId, projectTestPlan]);

  const enrichTestResults = (results: VsimResultSummary, testPlan?: TestPlanData) => {
    const enriched: EnrichedTestResult[] = results.testResults.map(result => {
      let planEntry: TestPlanEntry | undefined;
      let inTestPlan = false;

      if (testPlan) {
        planEntry = testPlan.entries.find(entry => 
          entry.testPlanId === result.testId ||
          entry.requirementId === result.testId
        );

        if (!planEntry) {
          const reqIdMatch = result.testId.match(/TC-([A-Z]+)-(\d+)/);
          if (reqIdMatch) {
            const [, category, number] = reqIdMatch;
            planEntry = testPlan.entries.find(entry => 
              entry.requirementId.includes(`${category}-${number}`) ||
              entry.testPlanId.includes(`${category}-${number}`)
            );
          }
        }

        inTestPlan = !!planEntry;
      }

      return {
        ...result,
        planEntry,
        inTestPlan
      };
    });

    setEnrichedResults(enriched);
  };

  const getFilteredResults = () => {
    let filtered = enrichedResults;

    if (showOnlyPlanned) {
      filtered = filtered.filter(result => result.inTestPlan);
    }

    if (showOnlyFailed) {
      filtered = filtered.filter(result => result.status === 'FAIL');
    }

    return filtered;
  };

  const getPaginatedResults = () => {
    const filtered = getFilteredResults();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredResults();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckIcon color="success" fontSize="small" />;
      case 'FAIL':
        return <ErrorIcon color="error" fontSize="small" />;
      default:
        return <ScheduleIcon color="disabled" fontSize="small" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'success';
      case 'FAIL': return 'error';
      default: return 'default';
    }
  };

  const toggleRowExpansion = (testId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedRows(newExpanded);
  };

  // Chart data preparation
  const getChartData = () => {
    if (!testResults) return null;

    const statusData = {
      labels: ['Passed', 'Failed', 'Not Tested'],
      datasets: [
        {
          data: [testResults.passedTests, testResults.failedTests, testResults.notTestedTests],
          backgroundColor: [
            theme.palette.success.main,
            theme.palette.error.main,
            theme.palette.grey[400]
          ],
          borderWidth: 0,
        },
      ],
    };

    const runData = {
      labels: enrichedResults.slice(0, 10).map(r => r.testId), // Limit to first 10 for readability
      datasets: [
        {
          label: 'Pass',
          data: enrichedResults.slice(0, 10).map(r => r.passCount),
          backgroundColor: theme.palette.success.main,
        },
        {
          label: 'Fail',
          data: enrichedResults.slice(0, 10).map(r => r.failCount),
          backgroundColor: theme.palette.error.main,
        },
      ],
    };

    return { statusData, runData };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          generateLabels: (chart: any) => {
            const dataset = chart.data.datasets[0];
            const labels = chart.data.labels;
            
            return labels.map((label: string, index: number) => {
              const value = dataset.data[index];
              const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? ((value * 100) / total).toFixed(1) : '0.0';
              
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[index],
                strokeStyle: dataset.backgroundColor[index],
                lineWidth: 0,
                hidden: false,
                index: index
              };
            });
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed * 100) / total).toFixed(1);
            return `${label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    },
    // Add data labels directly on chart slices
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: '#ffffff',
      }
    },
    interaction: {
      intersect: false,
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            return context[0].label;
          },
          label: function(context: any) {
            const datasetLabel = context.dataset.label;
            const value = context.parsed.y;
            return `${datasetLabel}: ${value}`;
          },
          afterBody: function(context: any) {
            // Calculate pass rate for this test case
            const testCaseIndex = context[0].dataIndex;
            const passData = context[0].chart.data.datasets.find((d: any) => d.label === 'Pass');
            const failData = context[0].chart.data.datasets.find((d: any) => d.label === 'Fail');
            
            if (passData && failData) {
              const passCount = passData.data[testCaseIndex];
              const failCount = failData.data[testCaseIndex];
              const total = passCount + failCount;
              const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : '0.0';
              return `Pass Rate: ${passRate}%`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <Box textAlign="center">
              <CircularProgress />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Loading test results...
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            <Typography variant="subtitle1" gutterBottom>
              Test Results Not Available
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!testResults || testResults.testResults.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <ChartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Test Cases Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No test case verification results found in simulation output.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const filteredResults = getFilteredResults();
  const paginatedResults = getPaginatedResults();
  const totalPages = getTotalPages();
  const chartData = getChartData();

  return (
    <Box>
      {/* Functional Requirement Verification Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ChartIcon color="primary" />
            Test Case Verification Summary
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                <Typography variant="h4" color="text.primary" fontWeight="bold">
                  {testResults.totalTests}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Test Cases
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={1} sx={{ color: 'success.contrastText' }}>
                <Typography variant="h4" color="success.dark" fontWeight="bold">
                  {testResults.passedTests}
                </Typography>
                <Typography variant="body2" color="success.dark">
                  Passed
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(testResults.passedTests / testResults.totalTests) * 100}
                  color="success"
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center" p={2} bgcolor="error.light" borderRadius={1} sx={{ color: 'error.contrastText' }}>
                <Typography variant="h4" color="error.dark" fontWeight="bold">
                  {testResults.failedTests}
                </Typography>
                <Typography variant="body2" color="error.dark">
                  Failed
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(testResults.failedTests / testResults.totalTests) * 100}
                  color="error"
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={1}>
                <Typography variant="h4" color="text.secondary" fontWeight="bold">
                  {testResults.notTestedTests}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Not Tested
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(testResults.notTestedTests / testResults.totalTests) * 100}
                  sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: 'grey.300', '& .MuiLinearProgress-bar': { bgcolor: 'grey.600' } }}
                />
              </Box>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {testResults.executionTime && (
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={1}>
                  <TimerIcon color="action" fontSize="small" />
                  <Typography variant="body2">
                    <strong>Execution Time:</strong> {testResults.executionTime}
                  </Typography>
                </Box>
              </Grid>
            )}
            
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <PlanIcon color={projectTestPlan ? "primary" : "action"} fontSize="small" />
                <Typography variant="body2" color={projectTestPlan ? "primary" : "text.secondary"}>
                  {projectTestPlan ? (
                    <>
                      <strong>Test Case Coverage:</strong> {enrichedResults.filter(r => r.inTestPlan).length} of {testResults.totalTests} test cases in plan
                    </>
                  ) : (
                    <>
                      <strong>Test Plan Status:</strong> No test plan available - {testResults.totalTests} test cases without plan context
                    </>
                  )}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Charts Section */}
      {chartData && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Results Overview
                </Typography>
                <Box height={300}>
                  <Pie data={chartData.statusData} options={chartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pass/Fail Statistics by Test Case (Top 10)
                </Typography>
                <Box height={300}>
                  <Bar data={chartData.runData} options={barChartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" flexWrap="wrap" gap={3} alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  checked={showOnlyPlanned}
                  onChange={(e) => {
                    setShowOnlyPlanned(e.target.checked);
                    setCurrentPage(1);
                  }}
                  disabled={!projectTestPlan}
                />
              }
              label={projectTestPlan ? "Show only test cases in test plan" : "Show only test cases in test plan (no plan available)"}
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={showOnlyFailed}
                  onChange={(e) => {
                    setShowOnlyFailed(e.target.checked);
                    setCurrentPage(1);
                  }}
                />
              }
              label="Show only failed test cases"
            />

            <Chip 
              label={`Showing ${filteredResults.length} of ${testResults.totalTests} test cases`}
              variant="outlined" 
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Test Case Result Details */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Case Result Details
          </Typography>
          
          {!projectTestPlan && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>No Test Plan Available:</strong> The test case results below were extracted from simulation output 
                but cannot be mapped to a test plan. These results show the functional verification outcomes without 
                test plan context or requirements traceability.
              </Typography>
            </Alert>
          )}
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Test Case ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Test Plan Status</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Results</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedResults.map((result) => (
                  <React.Fragment key={result.testId}>
                    <TableRow 
                      hover 
                      onClick={() => result.occurrences && result.occurrences.length > 0 && toggleRowExpansion(result.testId)}
                      sx={{
                        cursor: result.occurrences && result.occurrences.length > 0 ? 'pointer' : 'default',
                        '&:hover': {
                          backgroundColor: result.occurrences && result.occurrences.length > 0 ? 'action.hover' : 'inherit'
                        }
                      }}
                    >
                      <TableCell>
                        <Chip 
                          label={result.testId} 
                          variant="outlined" 
                          size="small" 
                          sx={{ fontFamily: 'monospace' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={result.name} placement="top">
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {result.name}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {projectTestPlan ? (
                          <Chip
                            label={result.inTestPlan ? 'In Plan' : 'Not in Plan'}
                            color={result.inTestPlan ? 'success' : 'warning'}
                            size="small"
                            icon={result.inTestPlan ? <CheckIcon /> : <ErrorIcon />}
                          />
                        ) : (
                          <Chip
                            label="No Test Plan"
                            color="default"
                            size="small"
                            icon={<ScheduleIcon />}
                          />
                        )}
                        {result.planEntry && projectTestPlan && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {result.planEntry.title}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(result.status)}
                          label={result.status}
                          color={getStatusColor(result.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box textAlign="center">
                            <Typography variant="h6">{result.totalRuns}</Typography>
                            <Typography variant="caption" color="text.secondary">Total</Typography>
                          </Box>
                          {result.totalRuns > 0 && (
                            <>
                              <Box textAlign="center">
                                <Typography variant="h6" color="success.main">{result.passCount}</Typography>
                                <Typography variant="caption" color="text.secondary">Pass</Typography>
                              </Box>
                              <Box textAlign="center">
                                <Typography variant="h6" color="error.main">{result.failCount}</Typography>
                                <Typography variant="caption" color="text.secondary">Fail</Typography>
                              </Box>
                              <Box width={80}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={(result.passCount / result.totalRuns) * 100}
                                  color="success"
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                                  {Math.round((result.passCount / result.totalRuns) * 100)}%
                                </Typography>
                              </Box>
                            </>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {result.occurrences && result.occurrences.length > 0 ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click when clicking icon
                                toggleRowExpansion(result.testId);
                              }}
                            >
                              {expandedRows.has(result.testId) ? (
                                <ExpandLessIcon />
                              ) : (
                                <ExpandMoreIcon />
                              )}
                            </IconButton>
                            <Typography variant="caption" color="text.secondary">
                              {result.occurrences.length} runs
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            No history
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                    
                    {/* Expandable Row for Test Occurrences - Improved Timeline */}
                    {result.occurrences && (
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                          <Collapse in={expandedRows.has(result.testId)} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <TimeIcon color="primary" fontSize="small" />
                                Execution History ({result.occurrences.length} runs)
                              </Typography>
                              
                              {/* Horizontal Timeline Layout */}
                              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                {/* Timeline Container with Horizontal Scroll */}
                                <Box 
                                  sx={{ 
                                    position: 'relative',
                                    overflowX: 'auto',
                                    overflowY: 'visible',
                                    pb: 4,
                                    pt: 2,
                                    px: 3, // Add padding to prevent cutoff
                                    minHeight: '100px'
                                  }}
                                >
                                  {(() => {
                                    const sortedOccurrences = result.occurrences.sort((a, b) => parseFloat(a.timeStamp) - parseFloat(b.timeStamp));
                                    const minTime = parseFloat(sortedOccurrences[0]?.timeStamp || '0');
                                    const maxTime = parseFloat(sortedOccurrences[sortedOccurrences.length - 1]?.timeStamp || '0');
                                    const timeRange = maxTime - minTime || 1; // Avoid division by zero
                                    const minWidth = Math.max(600, sortedOccurrences.length * 80);
                                    
                                    const formatSimTime = (timeStr: string) => {
                                      const time = parseFloat(timeStr);
                                      if (time >= 1e9) return `${(time / 1e9).toFixed(1)}s`;
                                      if (time >= 1e6) return `${(time / 1e6).toFixed(1)}ms`;
                                      if (time >= 1e3) return `${(time / 1e3).toFixed(1)}μs`;
                                      return `${time}ns`;
                                    };
                                    
                                    return (
                                      <>
                                        {/* Timeline Container */}
                                        <Box 
                                          sx={{ 
                                            position: 'relative',
                                            minWidth: `${minWidth + 32}px`,
                                            height: '70px',
                                            mt: 2
                                          }}
                                        >
                                          {/* Timeline Axis */}
                                          <Box 
                                            sx={{ 
                                              position: 'absolute',
                                              top: '20px',
                                              left: '16px',
                                              right: '16px',
                                              height: '2px',
                                              bgcolor: 'grey.300',
                                              minWidth: `${minWidth}px`
                                            }}
                                          />
                                          
                                          {/* Timeline Events */}
                                          {sortedOccurrences.map((occurrence, idx) => {
                                            // Calculate position based on actual time, not index
                                            const currentTime = parseFloat(occurrence.timeStamp);
                                            const timePosition = timeRange > 0 ? ((currentTime - minTime) / timeRange) * 100 : 0;
                                            const leftPosition = 16 + (timePosition * (minWidth - 32)) / 100; // 16px padding on each side
                                            
                                            return (
                                              <Tooltip
                                                key={idx}
                                                title={
                                                  <Box>
                                                    <Typography variant="subtitle2" gutterBottom>
                                                      Run #{idx + 1}: {occurrence.status}
                                                    </Typography>
                                                    <Typography variant="body2" gutterBottom>
                                                      Simulation Time: {formatSimTime(occurrence.timeStamp)}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                                      {occurrence.description}
                                                    </Typography>
                                                  </Box>
                                                }
                                                placement="top"
                                                arrow
                                              >
                                                <Box
                                                  sx={{
                                                    position: 'absolute',
                                                    left: `${leftPosition}px`,
                                                    top: '20px',
                                                    transform: 'translateX(-50%)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    zIndex: 2
                                                  }}
                                                >
                                                  {/* Event Marker - Positioned ON the axis */}
                                                  <Box
                                                    sx={{
                                                      width: 12,
                                                      height: 12,
                                                      borderRadius: '50%',
                                                      bgcolor: occurrence.status === 'PASS' ? 'success.main' : 'error.main',
                                                      border: 2,
                                                      borderColor: 'background.paper',
                                                      boxShadow: 1,
                                                      transform: 'translateY(-50%)', // Center on the axis line
                                                      transition: 'all 0.2s',
                                                      '&:hover': {
                                                        transform: 'translateY(-50%) scale(1.4)',
                                                        boxShadow: 3,
                                                        zIndex: 10
                                                      }
                                                    }}
                                                  />
                                                  
                                                  {/* Simulation Time Below Axis */}
                                                  <Typography 
                                                    variant="caption" 
                                                    sx={{ 
                                                      fontSize: '0.7rem',
                                                      fontFamily: 'monospace',
                                                      color: 'text.secondary',
                                                      textAlign: 'center',
                                                      whiteSpace: 'nowrap',
                                                      mt: 1,
                                                      bgcolor: 'background.paper',
                                                      px: 0.5,
                                                      py: 0.25,
                                                      borderRadius: 0.5,
                                                      border: '1px solid',
                                                      borderColor: 'grey.200'
                                                    }}
                                                  >
                                                    {formatSimTime(occurrence.timeStamp)}
                                                  </Typography>
                                                </Box>
                                              </Tooltip>
                                            );
                                          })}
                                        </Box>
                                      </>
                                    );
                                  })()}
                                </Box>
                                
                                {/* Timeline Legend and Summary */}
                                <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'grey.200' }}>
                                  <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                                    <Box display="flex" alignItems="center" gap={2}>
                                      <Typography variant="caption" color="text.secondary">
                                        Timeline: {result.occurrences.length} executions
                                      </Typography>
                                      <Box display="flex" alignItems="center" gap={1}>
                                        <Box
                                          sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            bgcolor: 'success.main'
                                          }}
                                        />
                                        <Typography variant="caption">Pass</Typography>
                                      </Box>
                                      <Box display="flex" alignItems="center" gap={1}>
                                        <Box
                                          sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            bgcolor: 'error.main'
                                          }}
                                        />
                                        <Typography variant="caption">Fail</Typography>
                                      </Box>
                                    </Box>
                                    
                                    <Box display="flex" gap={1}>
                                      <Chip 
                                        icon={<CheckIcon fontSize="small" />}
                                        label={result.passCount}
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                      />
                                      <Chip 
                                        icon={<ErrorIcon fontSize="small" />}
                                        label={result.failCount}
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                      />
                                    </Box>
                                  </Box>
                                  
                                  {/* Time Range */}
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    {(() => {
                                      const sorted = result.occurrences.sort((a, b) => parseFloat(a.timeStamp) - parseFloat(b.timeStamp));
                                      const formatSimTime = (timeStr: string) => {
                                        const time = parseFloat(timeStr);
                                        if (time >= 1e9) return `${(time / 1e9).toFixed(1)}s`;
                                        if (time >= 1e6) return `${(time / 1e6).toFixed(1)}ms`;
                                        if (time >= 1e3) return `${(time / 1e3).toFixed(1)}μs`;
                                        return `${time}ns`;
                                      };
                                      return sorted.length > 1 
                                        ? `Time range: ${formatSimTime(sorted[0]?.timeStamp)} → ${formatSimTime(sorted[sorted.length - 1]?.timeStamp)}`
                                        : `Time: ${formatSimTime(sorted[0]?.timeStamp)}`;
                                    })()}
                                  </Typography>
                                </Box>
                                
                              </Paper>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, newPage) => setCurrentPage(newPage)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default TestResults; 