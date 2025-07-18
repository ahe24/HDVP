import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: 'primary.main',
        color: 'white',
      }}
    >
      <Container maxWidth="lg">
        {/* Desktop Layout */}
        <Box 
          sx={{ 
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          {/* Left Logo - HSC */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '120px' }}>
            <img 
              src="/hsc_logo.svg" 
              alt="HSC Logo" 
              style={{ 
                height: '40px', 
                width: 'auto',
                filter: 'brightness(0) invert(1)' // Make SVG white
              }} 
            />
          </Box>

          {/* Center Content */}
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="body2">
              © {currentYear} EDMFG • EDA Team • Developed by cs.jo
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9, fontWeight: 500 }}>
              Technical Advisory: Sungmo Kang (Hanwha Systems)
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
              HDL Design Verification Portal
            </Typography>
          </Box>

          {/* Right Logo - EDMFG */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '120px', justifyContent: 'flex-end' }}>
            <img 
              src="/edmfg_logo.png" 
              alt="EDMFG Logo" 
              style={{ 
                height: '40px', 
                width: 'auto'
              }} 
            />
          </Box>
        </Box>

        {/* Mobile Layout */}
        <Box 
          sx={{ 
            display: { xs: 'block', md: 'none' },
            textAlign: 'center'
          }}
        >
          {/* Logos side by side */}
          <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mb: 2 }}>
            <img 
              src="/hsc_logo.svg" 
              alt="HSC Logo" 
              style={{ 
                height: '35px', 
                width: 'auto',
                filter: 'brightness(0) invert(1)'
              }} 
            />
            <img 
              src="/edmfg_logo.png" 
              alt="EDMFG Logo" 
              style={{ 
                height: '35px', 
                width: 'auto'
              }} 
            />
          </Box>
          
          {/* Text content */}
          <Typography variant="body2">
            © {currentYear} EDMFG • EDA Team • Developed by cs.jo
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9, fontWeight: 500 }}>
            Technical Advisory: Sungmo Kang (Hanwha Systems)
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
            HDL Design Verification Portal
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 