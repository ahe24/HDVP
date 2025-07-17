import React, { useEffect, useState } from 'react';
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
  CheckCircle as CheckIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { CDCReportData, CDCDetail } from '../../types';
import CDCCodeViewerModal from './CDCCodeViewerModal';
import CDCSplitCodeViewerModal from './CDCSplitCodeViewerModal';

const CDCDetailView: React.FC = () => {
  const { jobId, category } = useParams<{ jobId: string; category: string }>();
  const navigate = useNavigate();
  const [cdcData, setCdcData] = useState<CDCReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    filename: string;
    lineNumber?: number;
  } | null>(null);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [selectedCDCDetail, setSelectedCDCDetail] = useState<CDCDetail | null>(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Validate category parameter
  const validCategories = ['violations', 'cautions', 'evaluations'];
  const isValidCategory = category && validCategories.includes(category);

  useEffect(() => {
    if (!isValidCategory) {
      setError('Invalid CDC category. Please select violations, cautions, or evaluations.');
      setLoading(false);
      return;
    }
    loadCDCReport();
  }, [jobId, category, isValidCategory]);

  const loadCDCReport = async () => {
    if (!jobId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getCDCReport(jobId);
      
      if (response.success && response.data) {
        setCdcData(response.data);
      } else {
        setError(response.error || 'Failed to load CDC report');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load CDC report');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryConfig = (category: string) => {
    const configs = {
      violations: { 
        icon: <ErrorIcon color="error" />, 
        color: 'error',
        title: 'CDC Violations',
        description: 'Critical clock domain crossing issues that need immediate attention'
      },
      cautions: { 
        icon: <WarningIcon color="warning" />, 
        color: 'warning',
        title: 'CDC Cautions',
        description: 'Potential clock domain crossing issues that should be reviewed'
      },
      evaluations: { 
        icon: <CheckIcon color="success" />, 
        color: 'success',
        title: 'CDC Evaluations',
        description: 'Properly synchronized clock domain crossings'
      }
    };
    return configs[category as keyof typeof configs];
  };

  const formatCDCDetail = (detail: CDCDetail) => {
    return (
      <Box>
        {/* Issue Type Header with Split View Button */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" fontWeight="bold" color="primary" sx={{ flex: 1, mr: 2 }}>
            {detail.issueType}
          </Typography>
          <Tooltip title="View both start and end code in split view" arrow>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CompareIcon />}
              onClick={() => handleSplitViewClick(detail)}
              sx={{
                fontSize: '0.75rem',
                py: 0.5,
                px: 1.5,
                minWidth: 'auto',
                flexShrink: 0
              }}
            >
              Split View
            </Button>
          </Tooltip>
        </Box>
        
        {/* Start Point */}
        <Box mb={2}>
          <Typography variant="body1" fontWeight="bold" gutterBottom>
            Clock Domain Crossing:
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Start:</strong> {detail.start.clock} : {detail.start.signal}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <FolderIcon fontSize="small" color="secondary" />
                  <Typography variant="caption" color="text.secondary">
                    File:
                  </Typography>
                  <Tooltip title={`${detail.start.file} (click to view code)`} arrow>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      onClick={() => handleFileClick(detail.start.file, detail.start.line)}
                      sx={{ 
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
                        fontSize: '0.85rem',
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
                      {detail.start.file}
                    </Typography>
                  </Tooltip>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <CodeIcon fontSize="small" color="primary" />
                  <Typography variant="caption" color="text.secondary">
                    Line:
                  </Typography>
                  <Chip 
                    label={detail.start.line}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* End Point */}
        <Box mb={2}>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>End:</strong> {detail.end.clock} : {detail.end.signal}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <FolderIcon fontSize="small" color="secondary" />
                  <Typography variant="caption" color="text.secondary">
                    File:
                  </Typography>
                  <Tooltip title={`${detail.end.file} (click to view code)`} arrow>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      onClick={() => handleFileClick(detail.end.file, detail.end.line)}
                      sx={{ 
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
                        fontSize: '0.85rem',
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
                      {detail.end.file}
                    </Typography>
                  </Tooltip>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <CodeIcon fontSize="small" color="primary" />
                  <Typography variant="caption" color="text.secondary">
                    Line:
                  </Typography>
                  <Chip 
                    label={detail.end.line}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* Additional Information */}
        {detail.synchronizerId && (
          <Typography variant="body2" color="text.secondary">
            <strong>Synchronizer ID:</strong> {detail.synchronizerId}
          </Typography>
        )}
        {detail.synchronizerLength && (
          <Typography variant="body2" color="text.secondary">
            <strong>Synchronizer Length:</strong> {detail.synchronizerLength} stages
          </Typography>
        )}
        {detail.additionalInfo && (
          <Typography variant="body2" color="text.secondary">
            <strong>Additional Info:</strong> {detail.additionalInfo}
          </Typography>
        )}
      </Box>
    );
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

  const handleSplitViewClick = (detail: CDCDetail) => {
    setSelectedCDCDetail(detail);
    setSplitModalOpen(true);
  };

  const handleSplitModalClose = () => {
    setSplitModalOpen(false);
    setSelectedCDCDetail(null);
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
          Loading CDC details...
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
              Failed to load CDC details
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

  const config = getCategoryConfig(category as string);
  const items = (cdcData[category as keyof CDCReportData] as CDCDetail[]) || [];

  // Calculate pagination
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

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
            CDC Report
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
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Chip 
              label={`${totalItems} items`}
              color={config.color as any}
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              Found in {cdcData.design} design
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Generated: {new Date(cdcData.timestamp).toLocaleString()}
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
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} items
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

      {/* Items List */}
      {totalItems === 0 ? (
        <Card>
          <CardContent>
            <Alert severity="info">
              <Typography variant="body1">
                No {category} found in this CDC analysis.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Detailed {config.title} ({totalItems} items)
            </Typography>
            <List>
              {paginatedItems.map((item, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={formatCDCDetail(item)}
                    />
                  </ListItem>
                  {index < paginatedItems.length - 1 && <Divider />}
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

      {/* CDC Code Viewer Modal */}
      {selectedFile && (
        <CDCCodeViewerModal
          open={modalOpen}
          onClose={handleModalClose}
          jobId={jobId!}
          filename={selectedFile.filename}
          lineNumber={selectedFile.lineNumber}
        />
      )}

      {/* CDC Split Code Viewer Modal */}
      {selectedCDCDetail && (
        <CDCSplitCodeViewerModal
          open={splitModalOpen}
          onClose={handleSplitModalClose}
          jobId={jobId!}
          startFile={{
            filename: selectedCDCDetail.start.file,
            lineNumber: selectedCDCDetail.start.line
          }}
          endFile={{
            filename: selectedCDCDetail.end.file,
            lineNumber: selectedCDCDetail.end.line
          }}
        />
      )}
    </Box>
  );
};

export default CDCDetailView; 