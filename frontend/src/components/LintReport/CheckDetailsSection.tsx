import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Alert, 
  Box, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip,
  Button
} from '@mui/material';
import { 
  CheckCircle, 
  ExpandMore as ExpandMoreIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { LintCheckDetail } from '../../types';
import CodeViewerModal from './CodeViewerModal';
import { useNavigate } from 'react-router-dom';

interface CheckDetailsSectionProps {
  checkDetails: LintCheckDetail[];
  jobId: string;
}

const CheckDetailsSection: React.FC<CheckDetailsSectionProps> = ({ checkDetails, jobId }) => {
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    filename: string;
    lineNumber?: number;
  } | null>(null);
  const navigate = useNavigate();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <CheckCircle color="success" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'success';
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

  const toggleCheck = (checkId: string) => {
    const newExpanded = new Set(expandedChecks);
    if (newExpanded.has(checkId)) {
      newExpanded.delete(checkId);
    } else {
      newExpanded.add(checkId);
    }
    setExpandedChecks(newExpanded);
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

  const handleViewDetails = (severity: string) => {
    navigate(`/jobs/${jobId}/lint/${severity}`);
  };

  // Filter checks based on showOnlyCritical
  const filteredChecks = showOnlyCritical 
    ? checkDetails.filter(check => check.severity === 'error' || check.severity === 'warning')
    : checkDetails;

  // Group checks by severity
  const groupedChecks = filteredChecks.reduce((acc, check) => {
    if (!acc[check.severity]) {
      acc[check.severity] = [];
    }
    acc[check.severity].push(check);
    return acc;
  }, {} as Record<string, LintCheckDetail[]>);

  const severityOrder = ['error', 'warning', 'info', 'resolved'];

  if (checkDetails.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔍 Check Details (0 checks)
          </Typography>
          <Alert severity="success" icon={<CheckCircle />}>
            No issues found! Your design meets all quality standards.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" gutterBottom>
              🔍 Check Details ({filteredChecks.length} of {checkDetails.length} checks)
            </Typography>
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

          {filteredChecks.length === 0 ? (
            <Alert severity="info">
              No critical issues found when filtering is applied.
            </Alert>
          ) : (
            <Box>
              {severityOrder.map(severity => {
                const checks = groupedChecks[severity];
                if (!checks || checks.length === 0) return null;

                return (
                  <Box key={severity} mb={3} id={`check-details-${severity}`}>
                    <Typography variant="h6" color={getSeverityColor(severity)} gutterBottom>
                      {getSeverityIcon(severity)} {severity.charAt(0).toUpperCase() + severity.slice(1)} ({checks.length})
                    </Typography>
                    
                    {checks.map((check, index) => {
                      const checkId = `${severity}-${index}`;
                      const isExpanded = expandedChecks.has(checkId);
                      const totalViolations = check.violations.length;
                      const showViewDetails = totalViolations > 10;
                      
                      return (
                        <Card key={checkId} variant="outlined" sx={{ mb: 2 }}>
                          <Accordion 
                            expanded={isExpanded}
                            onChange={() => toggleCheck(checkId)}
                            elevation={0}
                          >
                            <AccordionSummary 
                              expandIcon={<ExpandMoreIcon />}
                              sx={{ 
                                backgroundColor: 'transparent',
                                '&:hover': { backgroundColor: 'action.hover' }
                              }}
                            >
                              <Box sx={{ width: '100%' }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Chip 
                                      size="small" 
                                      label={check.severity.toUpperCase()} 
                                      color={getSeverityColor(check.severity)} 
                                    />
                                    <Typography variant="h6" fontWeight="bold">
                                      {check.checkName}
                                    </Typography>
                                    <Chip 
                                      size="small" 
                                      label={`${check.violations.length} violations`}
                                      variant="outlined"
                                    />
                                  </Box>
                                  {showViewDetails && (
                                    <Button
                                      size="small"
                                      endIcon={<ArrowForwardIcon />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewDetails(severity);
                                      }}
                                      sx={{ ml: 2 }}
                                    >
                                      View Details
                                    </Button>
                                  )}
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                  {cleanMessage(check.message)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Category: {check.category} | Alias: {check.alias}
                                </Typography>
                              </Box>
                            </AccordionSummary>
                            
                            <AccordionDetails>
                              <Divider sx={{ mb: 2 }} />
                              
                              {check.violations.length === 0 ? (
                                <Alert severity="info">
                                  No specific violations detailed for this check.
                                </Alert>
                              ) : (
                                <List dense>
                                  {check.violations.slice(0, 10).map((violation, vIndex) => (
                                    <ListItem key={vIndex} sx={{ py: 1, px: 0 }}>
                                      <ListItemText
                                        primary={
                                          <Box>
                                            <Typography variant="body2" gutterBottom>
                                              {cleanMessage(violation.description)}
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
                                      {vIndex < Math.min(10, check.violations.length - 1) && <Divider />}
                                    </ListItem>
                                  ))}
                                  {check.violations.length > 10 && (
                                    <ListItem>
                                      <Box display="flex" justifyContent="center" width="100%">
                                        <Typography variant="body2" color="text.secondary">
                                          ... and {check.violations.length - 10} more violations
                                        </Typography>
                                      </Box>
                                    </ListItem>
                                  )}
                                </List>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        </Card>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
      
      {/* Code Viewer Modal */}
      {selectedFile && (
        <CodeViewerModal
          open={modalOpen}
          onClose={handleModalClose}
          jobId={jobId}
          filename={selectedFile.filename}
          lineNumber={selectedFile.lineNumber}
        />
      )}
    </>
  );
};

export default CheckDetailsSection;