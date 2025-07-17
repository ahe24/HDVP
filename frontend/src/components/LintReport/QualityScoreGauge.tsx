import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SpeedIcon from '@mui/icons-material/Speed';

interface QualityRange {
  min: number;
  max: number;
  color: string;
  label: string;
  icon: string;
  gradient: string;
}

const qualityRanges: QualityRange[] = [
  { min: 95, max: 100, color: '#2e7d32', label: 'EXCELLENT', icon: '🏆', gradient: 'linear-gradient(135deg, #2e7d32, #4caf50)' },
  { min: 90, max: 94,  color: '#388e3c', label: 'GOOD',      icon: '✅', gradient: 'linear-gradient(135deg, #388e3c, #66bb6a)' },
  { min: 70, max: 89,  color: '#f57c00', label: 'FAIR',      icon: '⚠️', gradient: 'linear-gradient(135deg, #f57c00, #ff9800)' },
  { min: 50, max: 69,  color: '#ef6c00', label: 'POOR',      icon: '🔶', gradient: 'linear-gradient(135deg, #ef6c00, #ff5722)' },
  { min: 0,  max: 49,  color: '#d32f2f', label: 'BAD',       icon: '❌', gradient: 'linear-gradient(135deg, #d32f2f, #f44336)' }
];

interface QualityScoreGaugeProps {
  score: number;
  design?: string;
  timestamp?: string;
  animate?: boolean;
}

const QualityScoreGauge: React.FC<QualityScoreGaugeProps> = ({ 
  score, 
  design = '',
  timestamp = '',
  animate = true 
}) => {
  const theme = useTheme();
  const [animatedScore, setAnimatedScore] = useState(animate ? 0 : score);

  useEffect(() => {
    if (animate) {
      // Reset to 0 and start animation
      setAnimatedScore(0);
      const duration = 1200;
      const steps = 30;
      const stepValue = score / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        const newScore = Math.min(stepValue * currentStep, score);
        setAnimatedScore(newScore);

        if (currentStep >= steps || newScore >= score) {
          clearInterval(interval);
          setAnimatedScore(score);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    } else {
      // If not animating, show final score immediately
      setAnimatedScore(score);
    }
  }, [score, animate]);

  const getScoreInfo = (score: number): QualityRange => {
    return qualityRanges.find(range => score >= range.min && score <= range.max) || qualityRanges[qualityRanges.length - 1];
  };

  const scoreInfo = getScoreInfo(score);
  const displayScore = animate ? animatedScore : score;

  return (
    <Card 
      sx={{ 
        height: '100%', 
        background: `linear-gradient(135deg, ${scoreInfo.color}15, transparent)`,
        border: `2px solid ${scoreInfo.color}20`,
        position: 'relative',
        overflow: 'visible'
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" sx={{ color: scoreInfo.color }}>
          🎯 Design Quality Score
        </Typography>
        
        <Box display="flex" flexDirection="column" alignItems="center" position="relative">
          {/* Main Score Display */}
          <Box 
            sx={{ 
              textAlign: 'center',
              background: theme.palette.background.paper,
              borderRadius: 3,
              padding: 3,
              boxShadow: theme.shadows[3],
              border: `2px solid ${scoreInfo.color}30`,
              mb: 3,
              minWidth: 200
            }}
          >
            <Typography 
              variant="h2" 
              fontWeight="bold" 
              sx={{ 
                color: scoreInfo.color,
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                lineHeight: 1.2,
                mb: 1
              }}
            >
              {displayScore.toFixed(1)}%
            </Typography>
            <Typography variant="h5" sx={{ color: scoreInfo.color, fontWeight: 'bold' }}>
              {scoreInfo.icon} {scoreInfo.label}
            </Typography>
          </Box>

          {/* Horizontal Progress Bar */}
          <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
            {/* Background bar with quality ranges */}
            <Box sx={{ position: 'relative', height: 40, mb: 2 }}>
              {/* Background quality ranges */}
              {qualityRanges.map((range, index) => {
                const rangeWidth = ((range.max - range.min) / 100) * 100;
                const rangeLeft = (range.min / 100) * 100;
                
                return (
                  <Box
                    key={index}
                    sx={{
                      position: 'absolute',
                      left: `${rangeLeft}%`,
                      width: `${rangeWidth}%`,
                      height: '100%',
                      backgroundColor: range.color,
                      opacity: 0.2,
                      borderRadius: 1
                    }}
                  />
                );
              })}
              
              {/* Progress bar */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: `${displayScore}%`,
                  height: '100%',
                  background: scoreInfo.gradient,
                  borderRadius: 1,
                  transition: animate ? 'width 0.1s ease-out' : 'none',
                  boxShadow: `0 0 10px ${scoreInfo.color}40`
                }}
              />
              
              {/* Needle indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  left: `${displayScore}%`,
                  top: -5,
                  width: 4,
                  height: 50,
                  backgroundColor: scoreInfo.color,
                  borderRadius: 2,
                  transform: 'translateX(-50%)',
                  transition: animate ? 'left 0.1s ease-out' : 'none',
                  boxShadow: `0 0 8px ${scoreInfo.color}60`,
                  zIndex: 2
                }}
              />

              {/* Scale markers */}
              {[0, 25, 50, 75, 100].map(value => (
                <Box
                  key={value}
              sx={{ 
                position: 'absolute', 
                    left: `${value}%`,
                    top: 0,
                    width: 2,
                    height: '100%',
                    backgroundColor: theme.palette.text.secondary,
                    opacity: 0.3,
                    transform: 'translateX(-50%)'
                  }}
                />
              ))}
              
              {/* Scale labels */}
              {[0, 25, 50, 75, 100].map(value => (
              <Typography 
                  key={value}
                  variant="caption"
                sx={{ 
                    position: 'absolute',
                    left: `${value}%`,
                    top: 45,
                    transform: 'translateX(-50%)',
                    color: theme.palette.text.secondary,
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}
                >
                  {value}
              </Typography>
              ))}
            </Box>
          </Box>

          {/* Additional metrics */}
          <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center" mb={2}>
            <Chip 
              icon={<SpeedIcon />} 
              label="Industry Avg: 78%" 
              size="small" 
              variant="outlined"
            />
          </Box>

          {/* Metadata */}
          {(design || timestamp) && (
            <Box textAlign="center">
              {design && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Design: {design}
                </Typography>
              )}
              {timestamp && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Generated: {new Date(timestamp).toLocaleString()}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </CardContent>

      {/* Decorative elements for excellent scores */}
      {score >= 95 && (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              fontSize: '24px',
              animation: 'bounce 2s infinite',
              '@keyframes bounce': {
                '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
                '40%': { transform: 'translateY(-10px)' },
                '60%': { transform: 'translateY(-5px)' }
              }
            }}
          >
            ⭐
          </Box>
          <Box
            sx={{
              position: 'absolute',
              top: 20,
              left: 10,
              fontSize: '20px',
              animation: 'bounce 2s infinite 0.5s',
              '@keyframes bounce': {
                '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
                '40%': { transform: 'translateY(-8px)' },
                '60%': { transform: 'translateY(-4px)' }
              }
            }}
          >
            ✨
          </Box>
        </>
      )}
    </Card>
  );
};

export default QualityScoreGauge; 