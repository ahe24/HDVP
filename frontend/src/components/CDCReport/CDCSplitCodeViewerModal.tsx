import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Button,
  Tooltip,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Sync as SyncIcon,
  SyncDisabled as SyncDisabledIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface CDCSplitCodeViewerModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  startFile: {
    filename: string;
    lineNumber: number;
  };
  endFile: {
    filename: string;
    lineNumber: number;
  };
}

const CDCSplitCodeViewerModal: React.FC<CDCSplitCodeViewerModalProps> = ({
  open,
  onClose,
  jobId,
  startFile,
  endFile,
}) => {
  const [startContent, setStartContent] = useState<string>('');
  const [endContent, setEndContent] = useState<string>('');
  const [startLoading, setStartLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [syncScrolling, setSyncScrolling] = useState(false);
  
  const startCodeRef = useRef<HTMLPreElement>(null);
  const endCodeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (open && jobId) {
      loadFileContent();
    }
  }, [open, jobId, startFile.filename, endFile.filename]);

  // Auto-scroll to highlighted lines when content loads (sequential)
  useEffect(() => {
    console.log('Auto-scroll effect triggered:', {
      hasStartContent: !!startContent,
      hasEndContent: !!endContent,
      hasStartRef: !!startCodeRef.current,
      hasEndRef: !!endCodeRef.current,
      startLine: startFile.lineNumber,
      endLine: endFile.lineNumber
    });
    
    if (startContent && endContent && startCodeRef.current && endCodeRef.current) {
      console.log('Starting auto-scroll sequence...');
      
      // No need to manage synchronized scrolling since it's disabled by default
      
      // Wait for content to be fully rendered and DOM to be stable
      const waitForContent = () => {
        const startLines = startCodeRef.current?.querySelectorAll('.code-line');
        const endLines = endCodeRef.current?.querySelectorAll('.code-line');
        
        console.log('Checking content readiness:', {
          startLinesCount: startLines?.length,
          endLinesCount: endLines?.length,
          startContentLength: startContent.split('\n').length,
          endContentLength: endContent.split('\n').length
        });
        
        // Check if all lines are rendered
        if (startLines && endLines && 
            startLines.length >= startContent.split('\n').length &&
            endLines.length >= endContent.split('\n').length) {
          
          console.log('Content fully rendered, starting scroll...');
          
          // Scroll start panel first
          setTimeout(() => {
            console.log('Scrolling start panel to line', startFile.lineNumber);
            if (startCodeRef.current) {
              scrollToLine(startCodeRef.current, startFile.lineNumber);
            }
          }, 100);
          
          // Scroll end panel after delay
          setTimeout(() => {
            console.log('Scrolling end panel to line', endFile.lineNumber);
            if (endCodeRef.current) {
              scrollToLine(endCodeRef.current, endFile.lineNumber);
            }
            
            // Auto-scroll complete
            console.log('Auto-scroll sequence completed');
          }, 600);
          
        } else {
          // Content not ready, try again
          console.log('Content not ready, retrying in 200ms...');
          setTimeout(waitForContent, 200);
        }
      };
      
      // Start checking for content readiness
      setTimeout(waitForContent, 200);
    }
  }, [startContent, endContent, startFile.lineNumber, endFile.lineNumber]);

  const loadFileContent = async () => {
    // Load start file
    setStartLoading(true);
    setStartError(null);
    try {
      const startResponse = await apiService.getSourceFileContent(jobId, startFile.filename);
      if (startResponse.success && startResponse.data) {
        setStartContent(startResponse.data.content);
      } else {
        setStartError(startResponse.error || 'Failed to load start file');
      }
    } catch (err: any) {
      setStartError(err.message || 'Failed to load start file');
    } finally {
      setStartLoading(false);
    }

    // Load end file
    setEndLoading(true);
    setEndError(null);
    try {
      const endResponse = await apiService.getSourceFileContent(jobId, endFile.filename);
      if (endResponse.success && endResponse.data) {
        setEndContent(endResponse.data.content);
      } else {
        setEndError(endResponse.error || 'Failed to load end file');
      }
    } catch (err: any) {
      setEndError(err.message || 'Failed to load end file');
    } finally {
      setEndLoading(false);
    }
  };

  const scrollToLine = (element: HTMLElement, lineNumber: number) => {
    console.log('Scrolling to line:', lineNumber, 'in element:', element);
    
    if (!element) {
      console.error('Element is null, cannot scroll');
      return;
    }
    
    // Try to find the actual line element first
    const lineElements = element.querySelectorAll('.code-line');
    const targetLineElement = lineElements[lineNumber - 1] as HTMLElement;
    
    if (targetLineElement) {
      console.log('Found target line element, using scrollIntoView');
      targetLineElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      return;
    }
    
    // Fallback to manual calculation if element not found
    const attemptScroll = (attempt: number = 1) => {
      if (!element || !element.clientHeight) {
        console.error('Element not ready for scrolling, attempt:', attempt);
        return;
      }
      
      // Calculate actual line height from the first line element
      const firstLineElement = element.querySelector('.code-line') as HTMLElement;
      const actualLineHeight = firstLineElement ? firstLineElement.offsetHeight : 21;
      
      const containerHeight = element.clientHeight;
      const scrollHeight = element.scrollHeight;
      
      console.log('Element dimensions (attempt', attempt, '):', {
        clientHeight: containerHeight,
        scrollHeight: scrollHeight,
        actualLineHeight: actualLineHeight
      });
      
      if (scrollHeight <= containerHeight) {
        console.log('Content fits in container, no scrolling needed');
        return;
      }
      
      // Calculate target scroll position using actual line height
      const targetScrollTop = (lineNumber - 1) * actualLineHeight - (containerHeight / 2) + (actualLineHeight / 2);
      
      // Ensure scroll position is within bounds
      const maxScrollTop = scrollHeight - containerHeight;
      const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
      
      console.log('Scroll calculation (attempt', attempt, '):', {
        actualLineHeight,
        containerHeight,
        targetScrollTop,
        maxScrollTop,
        finalScrollTop,
        currentScrollTop: element.scrollTop
      });
      
      // Try immediate scroll first
      element.scrollTop = finalScrollTop;
      
      // Check if scroll was successful
      setTimeout(() => {
        const actualScrollTop = element.scrollTop;
        console.log('Actual scroll position after attempt', attempt, ':', actualScrollTop);
        
        // If scroll didn't work and we haven't tried too many times, try again
        if (Math.abs(actualScrollTop - finalScrollTop) > 50 && attempt < 3) {
          console.log('Scroll not accurate, retrying...');
          setTimeout(() => attemptScroll(attempt + 1), 200);
        } else if (attempt >= 3) {
          console.log('Max attempts reached, trying smooth scroll as fallback');
          element.scrollTo({
            top: finalScrollTop,
            behavior: 'smooth'
          });
        }
      }, 100);
    };
    
    // Start with a small delay to ensure content is rendered
    setTimeout(() => attemptScroll(), 100);
  };

  const handleScroll = (source: 'start' | 'end') => {
    if (!syncScrolling) return;
    
    const sourceRef = source === 'start' ? startCodeRef.current : endCodeRef.current;
    const targetRef = source === 'start' ? endCodeRef.current : startCodeRef.current;
    
    if (sourceRef && targetRef) {
      const scrollPercentage = sourceRef.scrollTop / (sourceRef.scrollHeight - sourceRef.clientHeight);
      const targetScrollTop = scrollPercentage * (targetRef.scrollHeight - targetRef.clientHeight);
      targetRef.scrollTop = targetScrollTop;
    }
  };

  const copyToClipboard = async (content: string, fileType: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderCodeWithLineNumbers = (
    content: string, 
    lineNumber: number, 
    fileType: 'start' | 'end',
    onScroll: () => void
  ) => {
    const lines = content.split('\n');
    
    return (
      <pre
        ref={fileType === 'start' ? startCodeRef : endCodeRef}
        onScroll={onScroll}
        style={{
          margin: 0,
          padding: '16px 0',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
          fontSize: '14px',
          lineHeight: '1.5',
          background: 'transparent',
          overflow: 'auto',
          maxHeight: '60vh',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {lines.map((line, index) => {
          const currentLineNumber = index + 1;
          const isHighlighted = lineNumber === currentLineNumber;
          
          return (
            <div
              key={currentLineNumber}
              className="code-line"
              style={{
                display: 'flex',
                backgroundColor: isHighlighted ? '#fff3cd' : 'transparent',
                borderLeft: isHighlighted ? '4px solid #f0ad4e' : '4px solid transparent',
                paddingLeft: '8px',
                paddingRight: '16px',
                minHeight: '21px'
              }}
            >
              <span
                style={{
                  color: '#999',
                  minWidth: '40px',
                  textAlign: 'right',
                  marginRight: '16px',
                  userSelect: 'none',
                  fontWeight: isHighlighted ? 'bold' : 'normal'
                }}
              >
                {currentLineNumber}
              </span>
              <span style={{ flex: 1, whiteSpace: 'pre' }}>
                {line || ' '}
              </span>
            </div>
          );
        })}
      </pre>
    );
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getLanguageFromExtension = (extension: string) => {
    switch (extension) {
      case 'v':
      case 'sv':
        return 'verilog';
      case 'vh':
      case 'svh':
        return 'systemverilog';
      case 'vhd':
      case 'vhdl':
        return 'vhdl';
      case 'tcl':
        return 'tcl';
      default:
        return 'text';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh',
          width: '90vw',
          maxWidth: '1600px',
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">
            🔄 CDC Code Analysis
          </Typography>
          <Chip 
            label="Split View" 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
                  <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Scroll to highlighted lines">
              <Button
                size="small"
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={() => {
                  console.log('Manual scroll button clicked');
                  if (startCodeRef.current && endCodeRef.current) {
                    console.log('Scrolling both panels manually...');
                    
                    scrollToLine(startCodeRef.current, startFile.lineNumber);
                    setTimeout(() => {
                      scrollToLine(endCodeRef.current!, endFile.lineNumber);
                    }, 500);
                  }
                }}
                sx={{ 
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  textTransform: 'none'
                }}
              >
                Go to Lines
              </Button>
            </Tooltip>
            <Tooltip title={syncScrolling ? "Disable synchronized scrolling" : "Enable synchronized scrolling"}>
              <IconButton
                size="small"
                onClick={() => setSyncScrolling(!syncScrolling)}
                color={syncScrolling ? "primary" : "default"}
              >
                {syncScrolling ? <SyncIcon /> : <SyncDisabledIcon />}
              </IconButton>
            </Tooltip>
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {/* File Headers */}
        <Box display="flex" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {/* Start File Header */}
          <Box flex={1} p={2} sx={{ borderRight: 1, borderColor: 'divider' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1" fontWeight="bold" color="error.main">
                  Start Point
                </Typography>
                <Chip 
                  label={`Line ${startFile.lineNumber}`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              </Box>
              <Box display="flex" gap={1}>
                <Tooltip title="Copy to clipboard">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(startContent, 'start')}
                    disabled={!startContent}
                  >
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download file">
                  <IconButton
                    size="small"
                    onClick={() => downloadFile(startContent, startFile.filename)}
                    disabled={!startContent}
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" fontFamily="'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace">
              {startFile.filename}
            </Typography>
          </Box>

          {/* End File Header */}
          <Box flex={1} p={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                  End Point
                </Typography>
                <Chip 
                  label={`Line ${endFile.lineNumber}`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Box>
              <Box display="flex" gap={1}>
                <Tooltip title="Copy to clipboard">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(endContent, 'end')}
                    disabled={!endContent}
                  >
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download file">
                  <IconButton
                    size="small"
                    onClick={() => downloadFile(endContent, endFile.filename)}
                    disabled={!endContent}
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" fontFamily="'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace">
              {endFile.filename}
            </Typography>
          </Box>
        </Box>

        {/* Code Content */}
        <Box display="flex" flex={1} sx={{ minHeight: 0, overflow: 'hidden' }}>
          {/* Start File Content */}
          <Box flex={1} p={2} sx={{ borderRight: 1, borderColor: 'divider', overflow: 'hidden' }}>
            {startLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                <CircularProgress />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading start file...
                </Typography>
              </Box>
            ) : startError ? (
              <Alert severity="error">
                <Typography variant="body2">
                  {startError}
                </Typography>
              </Alert>
            ) : (
              renderCodeWithLineNumbers(
                startContent, 
                startFile.lineNumber, 
                'start',
                () => handleScroll('start')
              )
            )}
          </Box>

          {/* End File Content */}
          <Box flex={1} p={2} sx={{ overflow: 'hidden' }}>
            {endLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                <CircularProgress />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading end file...
                </Typography>
              </Box>
            ) : endError ? (
              <Alert severity="error">
                <Typography variant="body2">
                  {endError}
                </Typography>
              </Alert>
            ) : (
              renderCodeWithLineNumbers(
                endContent, 
                endFile.lineNumber, 
                'end',
                () => handleScroll('end')
              )
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CDCSplitCodeViewerModal; 