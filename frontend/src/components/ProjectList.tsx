import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Fab,
  Pagination,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';

import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import { Project } from '../types';

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    loadProjects();
    
    // Setup WebSocket listeners
    websocketService.on('jobCompleted', loadProjects);
    
    return () => {
      websocketService.off('jobCompleted');
    };
  }, []);

  useEffect(() => {
    // Filter projects based on search term
    let filtered;
    if (searchTerm.trim() === '') {
      filtered = projects;
    } else {
      filtered = projects.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Sort by creation time (most recent first)
    filtered = filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    setFilteredProjects(filtered);
    
    // Reset to first page when filters change
    setPage(1);
  }, [projects, searchTerm]);

  // Calculate paginated projects
  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading projects...');
      const response = await apiService.getProjects();
      
      if (response.success && response.data) {
        console.log('✅ Projects loaded successfully', { count: response.data.length, projects: response.data.map(p => p.name) });
        setProjects(response.data);
      } else {
        console.error('❌ Failed to load projects', response.error);
        throw new Error(response.error || 'Failed to load projects');
      }
    } catch (err: any) {
      console.error('❌ Project loading error:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    
    try {
      setDeleting(true);
      const response = await apiService.deleteProject(projectToDelete.id);
      
      if (response.success) {
        await loadProjects(); // Reload projects
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
      } else {
        throw new Error(response.error || 'Failed to delete project');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const getFileTypeStyle = (type: string) => {
    switch (type) {
      case 'verilog':
        return {
          backgroundColor: '#E3F2FD', // Light blue
          color: '#1565C0', // Dark blue text
          borderColor: '#1976D2',
        };
      case 'systemverilog':
        return {
          backgroundColor: '#E0F2F1', // Light teal
          color: '#00695C', // Dark teal text
          borderColor: '#00796B',
        };
      case 'vhdl':
        return {
          backgroundColor: '#E8F5E8', // Light green
          color: '#2E7D32', // Dark green text
          borderColor: '#4CAF50',
        };
      case 'testbench':
        return {
          backgroundColor: '#F3E5F5', // Light purple
          color: '#7B1FA2', // Dark purple text
          borderColor: '#9C27B0',
        };
      case 'constraint':
        return {
          backgroundColor: '#FFF3E0', // Light amber
          color: '#E65100', // Dark orange text
          borderColor: '#FF9800',
        };
      case 'other':
        return {
          backgroundColor: '#F5F5F5', // Light gray
          color: '#424242', // Dark gray text
          borderColor: '#757575',
        };
      default:
        return {
          backgroundColor: '#F5F5F5', // Light gray
          color: '#424242', // Dark gray text
          borderColor: '#757575',
        };
    }
  };

  const getFileTypeStats = (files: any[]) => {
    const stats = files.reduce((acc, file) => {
      acc[file.type] = (acc[file.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats).map(([type, count]) => {
      const style = getFileTypeStyle(type);
      return (
        <Chip
          key={type}
          label={`${type}: ${count}`}
          size="small"
          sx={{ 
            mr: 0.5, 
            mb: 0.5,
            backgroundColor: style.backgroundColor,
            color: style.color,
            border: `1px solid ${style.borderColor}`,
            fontWeight: 500,
            '&:hover': {
              backgroundColor: style.backgroundColor,
              opacity: 0.8,
            }
          }}
        />
      );
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={loadProjects}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          📁 Projects ({filteredProjects.length} {searchTerm ? 'found' : 'total'})
        </Typography>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            onClick={loadProjects}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/projects/create')}
          >
            Create Project
          </Button>
        </Box>
      </Box>

      {/* Search Bar */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search projects..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Box textAlign="center" py={6}>
          <FolderIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'No projects found matching your search' : 'No projects yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchTerm ? 'Try a different search term' : 'Create your first project to get started'}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/projects/create')}
            >
              Create Your First Project
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {paginatedProjects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, elevation 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    elevation: 4,
                  }
                }}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6" noWrap>
                      {project.name}
                    </Typography>
                    <Chip
                      icon={<CodeIcon />}
                      label={`${project.files.length} files`}
                      size="small"
                      sx={{
                        backgroundColor: '#F0F0F0', // Light gray background
                        color: '#424242', // Dark gray text
                        border: '1px solid #757575',
                        fontWeight: 500,
                        '& .MuiChip-icon': {
                          color: '#424242', // Dark gray icon
                        },
                        '&:hover': {
                          backgroundColor: '#F0F0F0',
                          opacity: 0.8,
                        }
                      }}
                    />
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {project.description || 'No description provided'}
                  </Typography>

                  {/* File Type Statistics */}
                  <Box mb={2}>
                    {getFileTypeStats(project.files)}
                  </Box>

                  {/* Timestamps */}
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Created: {new Date(project.createdAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Updated: {new Date(project.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                  <Button
                    size="small"
                    startIcon={<PlayIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${project.id}`);
                    }}
                  >
                    Open
                  </Button>
                  
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
            ))}
          </Grid>

          {/* Pagination Controls */}
          {filteredProjects.length > pageSize && (
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
              mt={4}
              flexWrap="wrap"
              gap={2}
            >
              <Typography variant="body2" color="text.secondary">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} projects
              </Typography>
              
              <Box display="flex" alignItems="center" gap={2}>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1); // Reset to first page when changing page size
                    }}
                    variant="outlined"
                  >
                    <MenuItem value={6}>6</MenuItem>
                    <MenuItem value={12}>12</MenuItem>
                    <MenuItem value={18}>18</MenuItem>
                    <MenuItem value={24}>24</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary">
                  per page
                </Typography>
                
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  shape="rounded"
                  showFirstButton
                  showLastButton
                />
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/projects/create')}
      >
        <AddIcon />
      </Fab>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the project "{projectToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. All project files will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete}
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectList; 