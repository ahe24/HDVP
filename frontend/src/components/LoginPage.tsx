import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Container
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Security as SecurityIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { useAuth } from '../services/auth';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      sx={{
        background: 'linear-gradient(135deg, #232720, #2d3542, 100%)',
        position: 'relative',
        overflow: 'hidden',
        py: 4,
      }}
    >
      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={8}
          sx={{
            p: 3,
            borderRadius: 2,
            background: 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            minWidth: 0,
          }}
        >
          {/* Header Section */}
          <Box textAlign="center" mb={2}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Advanced HDL simulation and formal verification Web interface
            </Typography>
            <Divider sx={{ my: 1.5 }} />
          </Box>

          {/* Login Form */}
          <Box>
            <Box display="flex" alignItems="center" mb={2}>
              <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" color="primary.main">
                관리자 인증
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <TextField
                label="관리자 비밀번호"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                fullWidth
                margin="normal"
                autoFocus
                required
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: <LoginIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                sx={{
                  mt: 2,
                  mb: 1,
                  borderRadius: 2,
                  py: 1.2,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  textTransform: 'none',
                  boxShadow: 2,
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s',
                }}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  '로그인'
                )}
              </Button>
            </form>
          </Box>

          {/* Footer Section */}
          <Box textAlign="center" mt={2}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary">
              © 2024 EDMFG • EDA Team • Developed by cs.jo
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Secure access to HDL verification tools and project management
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage; 