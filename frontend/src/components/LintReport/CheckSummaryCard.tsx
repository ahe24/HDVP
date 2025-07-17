import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Grid, Chip, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Error as ErrorIcon, 
  Warning as WarningIcon, 
  Info as InfoIcon, 
  CheckCircle
} from '@mui/icons-material';

interface CheckSummaryData {
  error: number;
  warning: number;
  info: number;
}

interface CheckSummaryCardProps {
  summary: CheckSummaryData;
  animate?: boolean;
  onSeverityClick?: (severity: 'error' | 'warning' | 'info') => void;
}

const CheckSummaryCard: React.FC<CheckSummaryCardProps> = ({ 
  summary, 
  animate = true,
  onSeverityClick
}) => {
  const theme = useTheme();
  const [animatedData, setAnimatedData] = useState<CheckSummaryData>({ error: 0, warning: 0, info: 0 });

  const getSeverityConfig = (severity: keyof CheckSummaryData) => {
    const configs = {
      error: { 
        color: theme.palette.error.main, 
        icon: <ErrorIcon />, 
        label: 'Errors',
        lightColor: theme.palette.error.light 
      },
      warning: { 
        color: theme.palette.warning.main, 
        icon: <WarningIcon />, 
        label: 'Warnings',
        lightColor: theme.palette.warning.light 
      },
      info: { 
        color: theme.palette.info.main, 
        icon: <InfoIcon />, 
        label: 'Info',
        lightColor: theme.palette.info.light 
      }
    };
    return configs[severity];
  };

  // No animation - just show final data immediately
  useEffect(() => {
    setAnimatedData(summary);
  }, [summary]);

  // Prepare data for the bar chart using animated data
  const chartData = Object.entries(animatedData)
    .filter(([_, value]) => (value as number) >= 0)
    .map(([severity, value]) => {
      const config = getSeverityConfig(severity as keyof CheckSummaryData);
      return {
        name: config.label,
        value: value as number,
        color: config.color,
        severity
      };
    });

  // Chart data preparation - optimized without debug logs

  const totalIssues = animatedData.error + animatedData.warning + animatedData.info;
  const hasIssues = totalIssues > 0;

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      const percentage = hasIssues ? ((data.value / totalIssues) * 100).toFixed(1) : '0';
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
            {percentage}% of total issues
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center">
            📊 Check Summary
          </Typography>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="primary">
              {totalIssues}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Issues
            </Typography>
          </Box>
        </Box>
        
        {!hasIssues ? (
          <Box 
            display="flex" 
            alignItems="center" 
            justifyContent="center" 
            height={200}
            color="text.secondary"
            flexDirection="column"
          >
            <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" color="success.main">Perfect!</Typography>
            <Typography variant="body2">No issues found</Typography>
          </Box>
        ) : (
          <>
            {/* Vertical Bar Chart - Restored Working Version */}
            <Box height={200} mb={2}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
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
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    fill="#8884d8"
                    radius={[4, 4, 0, 0]}
                    animationDuration={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </>
        )}

        {/* Statistics Grid */}
        <Grid container spacing={1}>
          {Object.entries(animatedData).map(([severity, count]) => {
            const config = getSeverityConfig(severity as keyof CheckSummaryData);
            const percentage = hasIssues ? ((count / totalIssues) * 100).toFixed(1) : '0';
            const isClickable = onSeverityClick && count > 0;
            
            return (
              <Grid item xs={4} key={severity}>
                <Box 
                  onClick={isClickable ? () => onSeverityClick(severity as 'error' | 'warning' | 'info') : undefined}
                  sx={{ 
                    p: 1.5, 
                    border: 1, 
                    borderColor: config.color + '30',
                    borderRadius: 1,
                    backgroundColor: config.color + '08',
                    transition: 'all 0.2s ease',
                    cursor: isClickable ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: config.color + '15',
                      transform: isClickable ? 'translateY(-1px)' : 'none',
                      boxShadow: isClickable ? 1 : 0
                    }
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Box sx={{ color: config.color, fontSize: '16px' }}>
                        {config.icon}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {config.label}
                      </Typography>
                    </Box>
                    <Chip
                      label={count as number}
                      size="small"
                      sx={{
                        backgroundColor: config.color,
                        color: 'white',
                        fontWeight: 'bold',
                        minWidth: '28px'
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {percentage}% of total
                    {isClickable && (
                      <Typography component="span" variant="caption" sx={{ ml: 0.5, fontStyle: 'italic', opacity: 0.7 }}>
                        (click to view)
                      </Typography>
                    )}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Priority indicator */}
        {summary.error > 0 && (
          <Box mt={2}>
            <Chip
              icon={<ErrorIcon />}
              label={`${summary.error} Critical Issue${summary.error > 1 ? 's' : ''} Need Attention`}
              color="error"
              variant="outlined"
              sx={{ 
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.7 },
                  '100%': { opacity: 1 }
                }
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CheckSummaryCard; 