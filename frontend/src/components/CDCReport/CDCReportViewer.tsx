import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Alert, 
  CircularProgress, 
  Card, 
  CardContent,
  Chip,
  useTheme
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { apiService } from '../../services/api';
import { CDCReportData } from '../../types';
import CDCSummaryChart from './CDCSummaryChart';
import CDCDetailsSection from './CDCDetailsSection';

interface CDCReportViewerProps {
  jobId: string;
}

const CDCReportViewer: React.FC<CDCReportViewerProps> = ({ jobId }) => {
  const [cdcData, setCdcData] = useState<CDCReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<'violations' | 'cautions' | 'evaluations' | null>(null);
  const theme = useTheme();

  useEffect(() => {
    loadCDCReport();
  }, [jobId]);

  const loadCDCReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getCDCReport(jobId);
      
      if (response.success && response.data) {
        setCdcData(response.data);
      } else {
        console.error('🔍 CDC API error:', response.error);
        setError(response.error || 'Failed to load CDC report');
      }
    } catch (err: any) {
      console.error('🔍 CDC load error:', err);
      setError(err.message || 'Failed to load CDC report');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: 'violations' | 'cautions' | 'evaluations') => {
    // Expand the clicked category and collapse others
    setExpandedCategory(category);
    
    // Scroll to the target element after a short delay to ensure the accordion has expanded
    setTimeout(() => {
      const targetElement = document.getElementById(`cdc-details-${category}`);
      if (targetElement) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const handleCategoryToggle = (category: 'violations' | 'cautions' | 'evaluations' | null) => {
    setExpandedCategory(category);
  };

  // Prepare data for the CDC categories bar chart
  const getCDCCategoryData = () => {
    if (!cdcData) return [];
    
    return [
      {
        name: 'Violations',
        value: cdcData.summary.violations,
        color: theme.palette.error.main,
        severity: 'violations'
      },
      {
        name: 'Cautions',
        value: cdcData.summary.cautions,
        color: theme.palette.warning.main,
        severity: 'cautions'
      },
      {
        name: 'Evaluations',
        value: cdcData.summary.evaluations,
        color: theme.palette.success.main,
        severity: 'evaluations'
      }
    ];
  };

  // Custom tooltip for the CDC chart
  const CDCCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0] && cdcData) {
      const data = payload[0].payload;
      const total = cdcData.summary.totalChecks;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 1.5,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            {data.name}: {data.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {percentage}% of total checks
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" height={200}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading CDC report...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <Typography variant="body1" fontWeight="bold">
              Failed to load CDC report
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!cdcData) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            <Typography variant="body1">
              No CDC report data available
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            🔄 CDC Report Analysis
            <Chip 
              label={cdcData.design} 
              color="primary" 
              variant="outlined"
              sx={{ ml: 2 }} 
            />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generated: {new Date(cdcData.timestamp).toLocaleString()}
          </Typography>
        </Box>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Top Row - Summary Charts */}
          <Grid item xs={12} md={4}>
            <CDCSummaryChart
              summary={cdcData.summary}
              animate={true}
            />
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Card elevation={0} variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 CDC Categories
                </Typography>
                
                {/* CDC Categories Bar Chart */}
                <Box height={200} mb={3}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getCDCCategoryData()}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: theme.palette.text.primary, fontSize: 12 }}
                        axisLine={{ stroke: theme.palette.divider }}
                      />
                      <YAxis
                        type="number"
                        tick={{ fill: theme.palette.text.primary, fontSize: 12 }}
                        axisLine={{ stroke: theme.palette.divider }}
                      />
                      <Tooltip content={<CDCCustomTooltip />} />
                      <Bar 
                        dataKey="value" 
                        fill="#8884d8"
                        radius={[4, 4, 0, 0]}
                        animationDuration={1000}
                      >
                        {getCDCCategoryData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                {/* Category Cards Grid */}
                <Grid container spacing={2}>
                  {/* Violations Card */}
                  <Grid item xs={12} md={4}>
                    <Card 
                      elevation={0} 
                      variant="outlined"
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'error.light',
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => handleCategoryClick('violations')}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="error.main" fontWeight="bold">
                            Violations
                          </Typography>
                          <Chip
                            label={cdcData?.summary.violations || 0}
                            size="small"
                            sx={{
                              backgroundColor: 'error.main',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Critical CDC issues that need immediate attention
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Cautions Card */}
                  <Grid item xs={12} md={4}>
                    <Card 
                      elevation={0} 
                      variant="outlined"
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'warning.light',
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => handleCategoryClick('cautions')}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="warning.main" fontWeight="bold">
                            Cautions
                          </Typography>
                          <Chip
                            label={cdcData?.summary.cautions || 0}
                            size="small"
                            sx={{
                              backgroundColor: 'warning.main',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Potential CDC issues that should be reviewed
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Evaluations Card */}
                  <Grid item xs={12} md={4}>
                    <Card 
                      elevation={0} 
                      variant="outlined"
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'success.light',
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => handleCategoryClick('evaluations')}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            Evaluations
                          </Typography>
                          <Chip
                            label={cdcData?.summary.evaluations || 0}
                            size="small"
                            sx={{
                              backgroundColor: 'success.main',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          CDC signals that passed analysis
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Total Summary */}
                <Box mt={2} pt={2} borderTop={1} borderColor="divider">
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight="bold">
                      Total Checks:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {cdcData?.summary.totalChecks || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Full-width CDC Details */}
          <Grid item xs={12}>
            <CDCDetailsSection 
              violations={cdcData.violations}
              cautions={cdcData.cautions}
              evaluations={cdcData.evaluations}
              jobId={jobId}
              expandedCategory={expandedCategory}
              onCategoryToggle={handleCategoryToggle}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default CDCReportViewer; 