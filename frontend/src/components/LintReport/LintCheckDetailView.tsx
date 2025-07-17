import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Chip, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Tooltip,
  Grid,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { LintReportData } from '../../types';
import CodeViewerModal from './CodeViewerModal';

const LintCheckDetailView: React.FC = () => {
  const { jobId, severity } = useParams<{ jobId: string; severity: string }>();
  const navigate = useNavigate();
  const [lintData, setLintData] = useState<LintReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    filename: string;
    lineNumber?: number;
  } | null>(null);
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Validate severity parameter
  const validSeverities = ['error', 'warning', 'info', 'resolved'];
  const isValidSeverity = severity && validSeverities.includes(severity);

  const loadLintReport = useCallback(async () => {
    if (!jobId) return;
    
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
  }, [jobId]);

  useEffect(() => {
    if (!isValidSeverity) {
      setError('Invalid severity level. Please select error, warning, info, or resolved.');
      setLoading(false);
      return;
    }
    loadLintReport();
  }, [isValidSeverity, loadLintReport]);

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'error':
        return {
          title: 'Error Checks',
          description: 'Critical design issues that must be resolved',
          icon: <ErrorIcon />,
          color: 'error'
        };
      case 'warning':
        return {
          title: 'Warning Checks',
          description: 'Potential issues that should be reviewed',
          icon: <WarningIcon />,
          color: 'warning'
        };
      case 'info':
        return {
          title: 'Info Checks',
          description: 'Informational messages about the design',
          icon: <InfoIcon />,
          color: 'info'
        };
      case 'resolved':
        return {
          title: 'Resolved Checks',
          description: 'Issues that have been successfully resolved',
          icon: <CheckIcon />,
          color: 'success'
        };
      default:
        return {
          title: 'Unknown Checks',
          description: 'Unknown check category',
          icon: <InfoIcon />,
          color: 'info'
        };
    }
  };

  const cleanMessage = (message: string) => {
    // Remove [uninspected] or [inspected] and clean up the message
    let cleaned = message.replace(/\[(uninspected|inspected)\]/, '').trim();
    
    // Replace long file paths with just filenames in the description
    // Pattern 1: Full workspace paths
    cleaned = cleaned.replace(/\/home\/[^\/]+\/[^\/]+\/[^\/]+\/workspace\/jobs\/[^\/]+\/[^\/]+\/([^\/\s]+\.(v|sv|vhd|vhdl))/g, '$1');
    
    // Pattern 2: General long paths (4+ directories)
    cleaned = cleaned.replace(/\/[^\/\s]*\/[^\/\s]*\/[^\/\s]*\/[^\/\s]*\/([^\/\s]+\.(v|sv|vhd|vhdl))/g, '$1');
    
    // Pattern 3: Any absolute path with filename
    cleaned = cleaned.replace(/\/[\w\-\.]+(?:\/[\w\-\.]+)*\/([^\/\s]+\.(v|sv|vhd|vhdl))/g, '$1');
    
    // Remove 'File' prefix if it appears at the start
    cleaned = cleaned.replace(/^File\s+'([^']+)'/, '$1').replace(/^File\s+([^\s,]+)/, '$1');
    
    return cleaned;
  };

  const handleBack = () => {
    navigate(`/jobs/${jobId}`);
  };

  const handleFileClick = (filename: string, lineNumber?: number) => {
    setSelectedFile({
      filename: filename.split('/').pop() || filename, // Extract just the filename
      lineNumber
    });
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedFile(null);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
    setItemsPerPage(Number(event.target.value));
    setPage(1); // Reset to first page when changing items per page
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading lint check details...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <Typography variant="body1" fontWeight="bold">
              Failed to load lint check details
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

  const config = getSeverityConfig(severity as string);
  const checks = lintData.checkDetails.filter(check => check.severity === severity);
  
  // Filter checks based on showOnlyCritical
  const filteredChecks = showOnlyCritical 
    ? checks.filter(check => check.severity === 'error' || check.severity === 'warning')
    : checks;

  // Calculate pagination
  const totalItems = filteredChecks.reduce((total, check) => total + check.violations.length, 0);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Flatten all violations from all checks
  const allViolations = filteredChecks.flatMap(check => 
    check.violations.map(violation => ({
      ...violation,
      checkName: check.checkName,
      category: check.category,
      alias: check.alias,
      message: check.message,
      severity: check.severity
    }))
  );

  const paginatedViolations = allViolations.slice(startIndex, endIndex);

  return (
    <Box>
      {/* Header with Breadcrumbs */}
      <Box mb={3}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleBack();
            }}
          >
            Job Details
          </Link>
          <Link
            underline="hover"
            color="inherit"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleBack();
            }}
          >
            Lint Report
          </Link>
          <Typography color="text.primary">{config.title}</Typography>
        </Breadcrumbs>

        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ color: `${config.color}.main` }}>
              {config.icon}
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {config.title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {config.description}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={handleBack}
          >
            Back to Summary
          </Button>
        </Box>
      </Box>

      {/* Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Chip 
                label={`${totalItems} violations`}
                color={config.color as any}
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                Found in {lintData.design} design
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Chip 
                label={showOnlyCritical ? "Show All" : "Critical Only"}
                icon={showOnlyCritical ? <VisibilityIcon /> : <VisibilityOffIcon />}
                onClick={() => setShowOnlyCritical(!showOnlyCritical)}
                color={showOnlyCritical ? "primary" : "default"}
                variant={showOnlyCritical ? "filled" : "outlined"}
                clickable
              />
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Generated: {new Date(lintData.timestamp).toLocaleString()}
          </Typography>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="body2" color="text.secondary">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} violations
                </Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Per Page</InputLabel>
                  <Select
                    value={itemsPerPage}
                    label="Per Page"
                    onChange={handleItemsPerPageChange}
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange}
                color="primary"
                showFirstButton 
                showLastButton
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Violations List */}
      {totalItems === 0 ? (
        <Card>
          <CardContent>
            <Alert severity="info">
              <Typography variant="body1">
                No {severity} violations found in this lint analysis.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Detailed {config.title} ({totalItems} violations)
            </Typography>
            <List>
              {paginatedViolations.map((violation, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={
                        <Box>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Chip 
                              size="small" 
                              label={violation.severity.toUpperCase()} 
                              color={config.color as any} 
                            />
                            <Typography variant="h6" fontWeight="bold">
                              {violation.checkName}
                            </Typography>
                          </Box>
                          <Typography variant="body2" gutterBottom>
                            {cleanMessage(violation.description)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" gutterBottom>
                            Category: {violation.category} | Alias: {violation.alias}
                          </Typography>
                          <Grid container spacing={2}>
                            {violation.module && (
                              <Grid item xs={12} sm={4}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <CodeIcon fontSize="small" color="primary" />
                                  <Typography variant="caption" color="text.secondary">
                                    Module:
                                  </Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    {violation.module}
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                            {violation.file && (
                              <Grid item xs={12} sm={5}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <FolderIcon fontSize="small" color="secondary" />
                                  <Typography variant="caption" color="text.secondary">
                                    File:
                                  </Typography>
                                  <Tooltip title={`${violation.file} (click to view code)`} arrow>
                                    <Typography 
                                      variant="body2" 
                                      fontWeight="bold"
                                      onClick={() => violation.file && handleFileClick(violation.file, violation.line)}
                                      sx={{ 
                                        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
                                        fontSize: '0.85rem',
                                        wordBreak: 'break-all',
                                        cursor: 'pointer',
                                        textDecoration: 'underline dotted',
                                        textDecorationColor: 'rgba(0,0,0,0.3)',
                                        color: 'primary.main',
                                        '&:hover': {
                                          backgroundColor: 'primary.light',
                                          color: 'white',
                                          textDecoration: 'none'
                                        }
                                      }}
                                    >
                                      {violation.file.split('/').pop()}
                                    </Typography>
                                  </Tooltip>
                                </Box>
                              </Grid>
                            )}
                            {violation.line && (
                              <Grid item xs={12} sm={3}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                    Line:
                                  </Typography>
                                  <Chip 
                                    label={violation.line}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                          {violation.hierarchy && (
                            <Box mt={1}>
                              <Typography variant="caption" color="text.secondary">
                                Hierarchy: 
                              </Typography>
                              <Typography 
                                variant="body2" 
                                component="span"
                                sx={{ 
                                  fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
                                  fontSize: '0.8rem',
                                  ml: 0.5
                                }}
                              >
                                {violation.hierarchy}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < paginatedViolations.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Bottom Pagination */}
      {totalItems > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="center">
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange}
                color="primary"
                showFirstButton 
                showLastButton
                size="large"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Code Viewer Modal */}
      {selectedFile && (
        <CodeViewerModal
          open={modalOpen}
          onClose={handleModalClose}
          jobId={jobId!}
          filename={selectedFile.filename}
          lineNumber={selectedFile.lineNumber}
        />
      )}
    </Box>
  );
};

export default LintCheckDetailView; 