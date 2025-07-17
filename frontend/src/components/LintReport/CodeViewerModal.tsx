import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface CodeViewerModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  filename: string;
  lineNumber?: number;
  highlightedText?: string;
}

const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  open,
  onClose,
  jobId,
  filename,
  lineNumber,
  highlightedText
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (open && filename) {
      loadFileContent();
    }
  }, [open, filename, jobId]);

  useEffect(() => {
    if (content && lineNumber && codeRef.current) {
      // Scroll to the highlighted line after content loads
      setTimeout(() => {
        const lineElements = codeRef.current?.querySelectorAll('.code-line');
        if (lineElements && lineElements[lineNumber - 1]) {
          lineElements[lineNumber - 1].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 100);
    }
  }, [content, lineNumber]);

  const loadFileContent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getSourceFileContent(jobId, filename);
      
      if (response.success && response.data) {
        setContent(response.data.content);
      } else {
        setError(response.error || 'Failed to load file content');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load file content');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
  };

  const handleDownload = () => {
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

  const renderCodeWithLineNumbers = () => {
    const lines = content.split('\n');
    
    return (
      <pre
        ref={codeRef}
        style={{
          margin: 0,
          padding: '16px 0',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
          fontSize: '14px',
          lineHeight: '1.5',
          background: 'transparent',
          overflow: 'auto',
          maxHeight: '60vh'
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

  const getLanguageLabel = (filename: string) => {
    const ext = getFileExtension(filename);
    switch (ext) {
      case 'v': return 'Verilog';
      case 'sv': return 'SystemVerilog';
      case 'vhd':
      case 'vhdl': return 'VHDL';
      default: return 'HDL';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', maxHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <CodeIcon color="primary" />
            <Typography variant="h6">{filename}</Typography>
            <Chip
              label={getLanguageLabel(filename)}
              size="small"
              color="primary"
              variant="outlined"
            />
            {lineNumber && (
              <Chip
                label={`Line ${lineNumber}`}
                size="small"
                color="warning"
                variant="filled"
              />
            )}
          </Box>
          <Box display="flex" gap={1}>
            <IconButton onClick={handleCopyContent} size="small" title="Copy content">
              <CopyIcon />
            </IconButton>
            <IconButton onClick={handleDownload} size="small" title="Download file">
              <DownloadIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small" title="Close">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={200}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading {filename}...
            </Typography>
          </Box>
        ) : error ? (
          <Box p={2}>
            <Alert severity="error">
              <Typography variant="body1" fontWeight="bold">
                Failed to load file
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
          </Box>
        ) : content ? (
          <Box sx={{ backgroundColor: '#f8f9fa', height: '100%', overflow: 'auto' }}>
            {renderCodeWithLineNumbers()}
          </Box>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" height={200}>
            <Typography variant="body1" color="text.secondary">
              No content to display
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CodeViewerModal; 