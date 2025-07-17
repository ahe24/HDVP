import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface LogViewerProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  filename: string;
  description: string;
}

const LogViewer: React.FC<LogViewerProps> = ({ open, onClose, jobId, filename, description }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && jobId && filename) {
      loadLogContent();
    }
  }, [open, jobId, filename]);

  const loadLogContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getLogFileContent(jobId, filename);
      if (response.success && response.data) {
        setContent(response.data.content);
      } else {
        setError(response.error || 'Failed to load log content');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load log content');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const downloadUrl = apiService.getLogFileDownloadUrl(jobId, filename);
    window.open(downloadUrl, '_blank');
  };

  const formatLogContent = (content: string) => {
    // Add basic syntax highlighting for common log patterns
    return content
      .split('\n')
      .map((line, index) => {
        let className = 'log-line';
        let style: React.CSSProperties = {};
        
        // Error lines
        if (line.includes('Error:') || line.includes('** Error')) {
          style.color = '#d32f2f';
          style.fontWeight = 'bold';
        }
        // Warning lines
        else if (line.includes('Warning:') || line.includes('** Warning')) {
          style.color = '#f57c00';
          style.fontWeight = 'bold';
        }
        // Success/info lines
        else if (line.includes('Top level modules:') || line.includes('Errors: 0, Warnings: 0')) {
          style.color = '#2e7d32';
          style.fontWeight = 'bold';
        }
        // Timestamps and stages
        else if (line.includes('Start time:') || line.includes('End time:') || line.includes('===')) {
          style.color = '#ff8533';
          style.fontWeight = 'bold';
        }
        // Module names and compilation steps
        else if (line.includes('-- Loading') || line.includes('-- Compiling') || line.includes('-- Inlining') || line.includes('-- Optimizing')) {
          style.color = '#7b1fa2';
        }

        return (
          <div key={index} style={{ ...style, fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: 1.4 }}>
            <span style={{ color: '#666', marginRight: '8px', minWidth: '40px', display: 'inline-block' }}>
              {index + 1}
            </span>
            {line}
          </div>
        );
      });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{ '& .MuiDialog-paper': { height: '80vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" component="div">
            {description}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filename}
          </Typography>
        </Box>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={loadLogContent} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton onClick={handleDownload}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ padding: 0 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box p={2}>
            <Alert severity="error" action={
              <Button color="inherit" size="small" onClick={loadLogContent}>
                Retry
              </Button>
            }>
              {error}
            </Alert>
          </Box>
        ) : (
          <Paper
            sx={{
              backgroundColor: '#f5f5f5',
              padding: 2,
              margin: 0,
              overflow: 'auto',
              maxHeight: '100%',
              fontFamily: 'monospace'
            }}
            variant="outlined"
          >
            {content ? (
              <Box sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {formatLogContent(content)}
              </Box>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No content available
              </Typography>
            )}
          </Paper>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleDownload} startIcon={<DownloadIcon />}>
          Download
        </Button>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogViewer; 