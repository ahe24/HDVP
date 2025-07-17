import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Alert,
  Chip,
  Button,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Home as HomeIcon,
  Folder as ProjectIcon,
  Verified as JobIcon,
} from '@mui/icons-material';

// Services
import { apiService } from './services/api';
import { websocketService } from './services/websocket';
import { AuthProvider, useAuth } from './services/auth';

// Components
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import JobList from './components/JobList';
import JobDetail from './components/JobDetail';
import CreateProject from './components/CreateProject';
import SystemStatus from './components/SystemStatus';
import Footer from './components/Footer';
import CDCDetailView from './components/CDCReport/CDCDetailView';
import LintCheckDetailView from './components/LintReport/LintCheckDetailView';
import LoginPage from './components/LoginPage';

// Types
import { SystemStatus as SystemStatusType } from './types';

// Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#ff8533',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
    // Custom typography variants for technical data
    technicalData: {
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    technicalDataSmall: {
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
    technicalDataXSmall: {
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
      fontSize: '0.7rem',
      lineHeight: 1.3,
    },
  },
  components: {
    // Add custom component styles
    MuiTypography: {
      variants: [
        {
          props: { variant: 'technicalData' },
          style: {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
            fontSize: '0.875rem',
            lineHeight: 1.5,
          },
        },
        {
          props: { variant: 'technicalDataSmall' },
          style: {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
            fontSize: '0.75rem',
            lineHeight: 1.4,
          },
        },
        {
          props: { variant: 'technicalDataXSmall' },
          style: {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
            fontSize: '0.7rem',
            lineHeight: 1.3,
          },
        },
      ],
    },
    // Enhance Chip component for technical data
    MuiChip: {
      styleOverrides: {
        root: {
          '&.technical-chip': {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
            fontSize: '0.75rem',
            '& .MuiChip-label': {
              fontFamily: 'inherit',
              fontSize: 'inherit',
            },
          },
        },
      },
    },
    // Enhance TableCell for technical data
    MuiTableCell: {
      styleOverrides: {
        root: {
          '&.technical-cell': {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace",
            fontSize: '0.875rem',
          },
        },
      },
    },
  },
});

// Header component with navigation
const AppHeader: React.FC<{ systemStatus: SystemStatusType | null; wsConnected: boolean }> = ({ 
  systemStatus, 
  wsConnected 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/projects') return 'Projects';
    if (path === '/projects/create') return 'Create Project';
    if (path.startsWith('/projects/')) return 'Project Details';
    if (path === '/jobs') return 'Jobs';
    if (path.startsWith('/jobs/') && path.includes('/cdc/')) return 'CDC Details';
    if (path.startsWith('/jobs/') && path.includes('/lint/')) return 'Lint Check Details';
    if (path.startsWith('/jobs/')) return 'Job Details';
    if (path === '/system') return 'System Status';
    return 'Dashboard';
  };

  const isCurrentPage = (path: string) => {
    const currentPath = location.pathname;
    if (path === '/dashboard') return currentPath === '/' || currentPath === '/dashboard';
    if (path === '/projects') return currentPath === '/projects' || currentPath.startsWith('/projects');
    if (path === '/jobs') return currentPath === '/jobs' || currentPath.startsWith('/jobs');
    return false;
  };

  return (
    <AppBar position="fixed" elevation={1} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 3 } }}>
        
        {/* Left Section: Logo/Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: { xs: '200px', md: '280px' } }}>
          <Button
            startIcon={<MemoryIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ 
              color: 'white', 
              textTransform: 'none',
              fontSize: { xs: '1rem', md: '1.25rem' },
              fontWeight: 500,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            HDL Design Verification Portal
          </Button>
        </Box>
        
        {/* Center Section: Navigation Menu */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            mx: 2
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '4px',
              gap: 0.5
            }}
          >
            <Button
              startIcon={<HomeIcon />}
              onClick={() => navigate('/dashboard')}
              sx={{ 
                color: 'white',
                textTransform: 'none',
                borderRadius: '20px',
                px: 2,
                py: 0.5,
                backgroundColor: isCurrentPage('/dashboard') ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
                minWidth: 'auto'
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                Dashboard
              </Box>
            </Button>
            <Button
              startIcon={<ProjectIcon />}
              onClick={() => navigate('/projects')}
              sx={{ 
                color: 'white',
                textTransform: 'none',
                borderRadius: '20px',
                px: 2,
                py: 0.5,
                backgroundColor: isCurrentPage('/projects') ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
                minWidth: 'auto'
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                Projects
              </Box>
            </Button>
            <Button
              startIcon={<JobIcon />}
              onClick={() => navigate('/jobs')}
              sx={{ 
                color: 'white',
                textTransform: 'none',
                borderRadius: '20px',
                px: 2,
                py: 0.5,
                backgroundColor: isCurrentPage('/jobs') ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
                minWidth: 'auto'
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                Jobs
              </Box>
            </Button>
          </Box>
          
          {/* Current page indicator */}
          {getPageTitle() !== 'Dashboard' && getPageTitle() !== 'Projects' && getPageTitle() !== 'Jobs' && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255,255,255,0.8)', 
                ml: 2,
                display: { xs: 'none', md: 'block' },
                fontWeight: 500
              }}
            >
              / {getPageTitle()}
            </Typography>
          )}
        </Box>
        
        {/* Right Section: Status Indicators */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 1, 
            alignItems: 'center',
            minWidth: { xs: '120px', md: '200px' },
            justifyContent: 'flex-end'
          }}
        >
          <Chip
            icon={wsConnected ? <CheckCircleIcon /> : <ErrorIcon />}
            label={
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                {wsConnected ? 'Connected' : 'Disconnected'}
              </Box>
            }
            size="small"
            sx={{
              backgroundColor: wsConnected ? '#4caf50' : '#f44336',
              color: 'white',
              fontWeight: 500,
              '& .MuiChip-icon': {
                color: 'white'
              },
              '& .MuiChip-label': {
                fontSize: '0.75rem'
              }
            }}
          />
          
          {systemStatus && (
            <Chip
              icon={systemStatus.license.available ? <CheckCircleIcon /> : <ErrorIcon />}
              label={
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {systemStatus.license.available ? 'License OK' : 'No License'}
                </Box>
              }
              size="small"
              sx={{
                backgroundColor: systemStatus.license.available ? '#4caf50' : '#f44336',
                color: 'white',
                fontWeight: 500,
                '& .MuiChip-icon': {
                  color: 'white'
                },
                '& .MuiChip-label': {
                  fontSize: '0.75rem'
                }
              }}
            />
          )}
          {isAuthenticated && (
            <Button color="inherit" onClick={logout} sx={{ ml: 2 }}>
              로그아웃
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

// Route protection wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
};

function App() {
  const [systemStatus, setSystemStatus] = useState<SystemStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Initialize system
    initializeSystem();

    // Setup WebSocket event handlers
    websocketService.on('connect', () => setWsConnected(true));
    websocketService.on('disconnect', () => setWsConnected(false));
    websocketService.on('systemStatusChanged', (data) => {
      setSystemStatus(data);
    });

    return () => {
      websocketService.off('connect');
      websocketService.off('disconnect');
      websocketService.off('systemStatusChanged');
    };
  }, []);

  const initializeSystem = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 App: Initializing system...');
      const response = await apiService.getSystemStatus();
      console.log('📡 App: System status response:', response);
      
      if (response.success && response.data) {
        setSystemStatus(response.data);
        console.log('✅ App: System initialized successfully');
      } else {
        throw new Error(`System status request failed: ${JSON.stringify(response)}`);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to connect to HDL Design Verification Portal';
      setError(`Connection Error: ${errorMessage}`);
      console.error('❌ App: System initialization error:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="background.default"
        >
          <Typography variant="h6" color="text.secondary">
            🚀 Loading HDL Design Verification Portal...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <Chip
                label="Retry"
                onClick={initializeSystem}
                color="error"
                variant="outlined"
              />
            }
          >
            <Typography variant="h6" gutterBottom>
              Connection Error
            </Typography>
            {error}
          </Alert>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Header */}
            <AppHeader systemStatus={systemStatus} wsConnected={wsConnected} />
            {/* Toolbar spacer to push content below fixed header */}
            <Toolbar />
            {/* Main Content */}
            <Container maxWidth="xl" sx={{ mt: 3, mb: 3, flex: 1 }}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/projects" element={<ProjectList />} />
                      <Route path="/projects/create" element={<CreateProject />} />
                      <Route path="/projects/:id" element={<ProjectDetail />} />
                      <Route path="/jobs" element={<JobList />} />
                      <Route path="/jobs/:id" element={<JobDetail />} />
                      <Route path="/jobs/:jobId/cdc/:category" element={<CDCDetailView />} />
                      <Route path="/jobs/:jobId/lint/:severity" element={<LintCheckDetailView />} />
                      <Route path="/system" element={<SystemStatus />} />
                    </Routes>
                  </ProtectedRoute>
                } />
              </Routes>
            </Container>
            {/* Footer */}
            <Footer />
          </Box>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
