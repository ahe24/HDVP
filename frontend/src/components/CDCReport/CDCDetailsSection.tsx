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
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Tooltip,
  Grid
} from '@mui/material';
import { 
  CheckCircle, 
  ExpandMore as ExpandMoreIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import { CDCDetail } from '../../types';
import { useNavigate } from 'react-router-dom';
import CDCCodeViewerModal from './CDCCodeViewerModal';
import CDCSplitCodeViewerModal from './CDCSplitCodeViewerModal';

interface CDCDetailsSectionProps {
  violations: CDCDetail[];
  cautions: CDCDetail[];
  evaluations: CDCDetail[];
  jobId: string;
  expandedCategory?: 'violations' | 'cautions' | 'evaluations' | null;
  onCategoryToggle?: (category: 'violations' | 'cautions' | 'evaluations' | null) => void;
}

const CDCDetailsSection: React.FC<CDCDetailsSectionProps> = ({ 
  violations, 
  cautions, 
  evaluations, 
  jobId,
  expandedCategory = null,
  onCategoryToggle
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    filename: string;
    lineNumber?: number;
  } | null>(null);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [selectedCDCDetail, setSelectedCDCDetail] = useState<CDCDetail | null>(null);
  const navigate = useNavigate();

  // Component initialized

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'violations':
        return 'error';
      case 'cautions':
        return 'warning';
      case 'evaluations':
        return 'success';
      default:
        return 'info';
    }
  };

  const toggleSection = (sectionId: string) => {
    if (onCategoryToggle) {
      const category = sectionId as 'violations' | 'cautions' | 'evaluations';
      if (expandedCategory === category) {
        onCategoryToggle(null); // Collapse if already expanded
      } else {
        onCategoryToggle(category); // Expand the clicked category
      }
    }
  };

  const handleViewDetails = (category: string) => {
    navigate(`/jobs/${jobId}/cdc/${category}`);
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

  const formatCDCDetail = (detail: CDCDetail) => {
    return (
      <Box>
        {/* Issue Type Header with Split View Button */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="body2" fontWeight="bold" sx={{ flex: 1, mr: 2 }}>
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
        <Box mb={1}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Start: {detail.start.clock} : {detail.start.signal}
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

        {/* End Point */}
        <Box mb={1}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            End: {detail.end.clock} : {detail.end.signal}
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

        {/* Additional Information */}
        {detail.synchronizerId && (
          <Typography variant="body2" color="text.secondary">
            Synchronizer ID: {detail.synchronizerId}
          </Typography>
        )}
        {detail.synchronizerLength && (
          <Typography variant="body2" color="text.secondary">
            Synchronizer Length: {detail.synchronizerLength}
          </Typography>
        )}
        {detail.additionalInfo && (
          <Typography variant="body2" color="text.secondary">
            {detail.additionalInfo}
          </Typography>
        )}
      </Box>
    );
  };

  const totalItems = violations.length + cautions.length + evaluations.length;

  if (totalItems === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔍 CDC Details (0 items)
          </Typography>
          <Alert severity="success" icon={<CheckCircle />}>
            No CDC issues found! Your design meets all clock domain crossing standards.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const sections = [
    { id: 'violations', title: 'Violations', data: violations, icon: <ErrorIcon /> },
    { id: 'cautions', title: 'Cautions', data: cautions, icon: <WarningIcon /> },
    { id: 'evaluations', title: 'Evaluations', data: evaluations, icon: <CheckCircle /> }
  ];

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔍 CDC Details ({totalItems} items)
          </Typography>

          {sections.map((section) => {
            const isExpanded = expandedCategory === section.id;
            const hasItems = section.data.length > 0;

            if (!hasItems) return null;

            return (
              <Card key={section.id} variant="outlined" sx={{ mb: 2 }} id={`cdc-details-${section.id}`}>
                <Accordion 
                  expanded={isExpanded}
                  onChange={() => toggleSection(section.id)}
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
                            label={section.title.toUpperCase()} 
                            color={getCategoryColor(section.id)} 
                          />
                          <Box sx={{ color: getCategoryColor(section.id) === 'error' ? 'error.main' : 
                                     getCategoryColor(section.id) === 'warning' ? 'warning.main' : 'success.main' }}>
                            {section.icon}
                          </Box>
                          <Typography variant="h6" fontWeight="bold">
                            {section.title}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={`${section.data.length} items`}
                            variant="outlined"
                          />
                        </Box>
                        <Button
                          size="small"
                          endIcon={<ArrowForwardIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(section.id);
                          }}
                          sx={{ ml: 2 }}
                        >
                          View Details
                        </Button>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {section.data.length} {section.title.toLowerCase()} found in CDC analysis
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {section.data.slice(0, 5).map((detail, index) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemText
                              primary={formatCDCDetail(detail)}
                            />
                          </ListItem>
                          {index < Math.min(5, section.data.length - 1) && <Divider />}
                        </React.Fragment>
                      ))}
                      {section.data.length > 5 && (
                        <ListItem>
                          <Box display="flex" justifyContent="center" width="100%">
                            <Typography variant="body2" color="text.secondary">
                              ... and {section.data.length - 5} more items
                            </Typography>
                          </Box>
                        </ListItem>
                      )}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* CDC Code Viewer Modal */}
      {selectedFile && (
        <CDCCodeViewerModal
          open={modalOpen}
          onClose={handleModalClose}
          jobId={jobId}
          filename={selectedFile.filename}
          lineNumber={selectedFile.lineNumber}
        />
      )}

      {/* CDC Split Code Viewer Modal */}
      {selectedCDCDetail && (
        <CDCSplitCodeViewerModal
          open={splitModalOpen}
          onClose={handleSplitModalClose}
          jobId={jobId}
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
    </>
  );
};

export default CDCDetailsSection; 