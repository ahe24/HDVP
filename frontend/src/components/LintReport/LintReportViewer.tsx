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
  Divider
} from '@mui/material';
import { apiService } from '../../services/api';
import { LintReportData } from '../../types';
import QualityScoreGauge from './QualityScoreGauge';
import CheckSummaryCard from './CheckSummaryCard';
import CheckDetailsSection from './CheckDetailsSection';

interface LintReportViewerProps {
  jobId: string;
}

const LintReportViewer: React.FC<LintReportViewerProps> = ({ jobId }) => {
  const [lintData, setLintData] = useState<LintReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLintReport();
  }, [jobId]);

  const loadLintReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getLintReport(jobId);
      
      if (response.success && response.data) {
        setLintData(response.data);
      } else {
        setError(response.error || 'Failed to load lint report');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load lint report');
    } finally {
      setLoading(false);
    }
  };

  const handleSeverityClick = (severity: 'error' | 'warning' | 'info') => {
    const targetElement = document.getElementById(`check-details-${severity}`);
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" height={200}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading lint report...
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
              Failed to load lint report
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!lintData) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            <Typography variant="body1">
              No lint report data available
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
            📋 Lint Report Analysis
            <Chip 
              label={lintData.design} 
              color="primary" 
              variant="outlined"
              sx={{ ml: 2 }} 
            />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generated: {new Date(lintData.timestamp).toLocaleString()}
          </Typography>
        </Box>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Top Row - Quality Score and Summary */}
          <Grid item xs={12} md={4}>
            <QualityScoreGauge
              score={lintData.designQualityScore}
              design={lintData.design}
              timestamp={lintData.timestamp}
              animate={true}
            />
          </Grid>
          
          <Grid item xs={12} md={8}>
            <CheckSummaryCard
              summary={lintData.summary}
              animate={true}
              onSeverityClick={handleSeverityClick}
            />
          </Grid>

          {/* Design Information Card */}
          {lintData.designInfo && (
            <Grid item xs={12} md={6}>
              <Card elevation={0} variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🏗️ Design Information
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(lintData.designInfo).map(([key, value]) => (
                      <Grid item xs={6} key={key}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Quick Stats Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📈 Quick Stats
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Total Checks:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {lintData.checkDetails.length}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Total Issues:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {lintData.summary.error + lintData.summary.warning + lintData.summary.info}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Database:</Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace", fontSize: '0.8rem' }}>
                      {lintData.database.split('/').pop()}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="error.main">Critical Issues:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="error.main">
                      {lintData.summary.error}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Full-width Check Details */}
          <Grid item xs={12}>
            <CheckDetailsSection checkDetails={lintData.checkDetails} jobId={jobId} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default LintReportViewer;