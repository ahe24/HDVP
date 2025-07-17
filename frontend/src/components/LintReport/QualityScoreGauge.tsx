import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Chip, useTheme } from '@mui/material';
import { Speed as SpeedIcon, TrendingUp as TrendingUpIcon, EmojiEvents as TrophyIcon } from '@mui/icons-material';

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
      setAnimatedScore(0); // Reset to 0 for animation
      const duration = 2000; // 2 seconds
      const steps = 60;
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
      setAnimatedScore(score);
    }
  }, [score, animate]); // Removed animatedScore from dependencies

  const getScoreInfo = (score: number): QualityRange => {
    return qualityRanges.find(range => score >= range.min && score <= range.max) || qualityRanges[qualityRanges.length - 1];
  };

  const scoreInfo = getScoreInfo(score);
  const displayScore = animate ? animatedScore : score;

  // Calculate needle angle (180 degrees = semicircle)
  const needleAngle = (displayScore / 100) * 180 - 90; // -90 to 90 degrees

  // Calculate needle end position
  const needleLength = 80;
  const centerX = 150;
  const centerY = 140;
  const needleX = centerX + needleLength * Math.cos((needleAngle * Math.PI) / 180);
  const needleY = centerY + needleLength * Math.sin((needleAngle * Math.PI) / 180);

  // Create SVG paths for colored segments
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = (startAngle * Math.PI) / 180;
    const end = (endAngle * Math.PI) / 180;
    const x1 = centerX + radius * Math.cos(start);
    const y1 = centerY + radius * Math.sin(start);
    const x2 = centerX + radius * Math.cos(end);
    const y2 = centerY + radius * Math.sin(end);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

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
          {/* SVG Gauge */}
          <Box sx={{ position: 'relative', width: 300, height: 180 }}>
            <svg width="300" height="180" viewBox="0 0 300 180">
              {/* Background segments */}
              {qualityRanges.reverse().map((range, index) => {
                const startAngle = (range.min / 100) * 180 - 90;
                const endAngle = (range.max / 100) * 180 - 90;
                return (
                  <path
                    key={index}
                    d={createArcPath(startAngle, endAngle, 70)}
                    stroke={range.color}
                    strokeWidth="12"
                    fill="none"
                    opacity={0.3}
                    strokeLinecap="round"
                  />
                );
              })}
              
              {/* Active progress arc */}
              <path
                d={createArcPath(-90, needleAngle, 70)}
                stroke={scoreInfo.color}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 8px ${scoreInfo.color}50)`,
                  transition: animate ? 'all 0.1s ease-out' : 'none'
                }}
              />

              {/* Needle */}
              <line
                x1={centerX}
                y1={centerY}
                x2={needleX}
                y2={needleY}
                stroke={scoreInfo.color}
                strokeWidth="4"
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 2px 4px ${scoreInfo.color}40)`,
                  transition: animate ? 'all 0.1s ease-out' : 'none'
                }}
              />

              {/* Center circle */}
              <circle
                cx={centerX}
                cy={centerY}
                r="8"
                fill={scoreInfo.color}
                style={{
                  filter: `drop-shadow(0 2px 6px ${scoreInfo.color}60)`
                }}
              />

              {/* Scale markers */}
              {[0, 25, 50, 75, 100].map(value => {
                const angle = (value / 100) * 180 - 90;
                const x1 = centerX + 60 * Math.cos((angle * Math.PI) / 180);
                const y1 = centerY + 60 * Math.sin((angle * Math.PI) / 180);
                const x2 = centerX + 55 * Math.cos((angle * Math.PI) / 180);
                const y2 = centerY + 55 * Math.sin((angle * Math.PI) / 180);
                
                return (
                  <g key={value}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={theme.palette.text.secondary}
                      strokeWidth="2"
                    />
                    <text
                      x={centerX + 45 * Math.cos((angle * Math.PI) / 180)}
                      y={centerY + 45 * Math.sin((angle * Math.PI) / 180) + 4}
                      textAnchor="middle"
                      fontSize="12"
                      fill={theme.palette.text.secondary}
                    >
                      {value}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Center score display */}
            <Box 
              sx={{ 
                position: 'absolute', 
                top: '65%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                textAlign: 'center',
                background: theme.palette.background.paper,
                borderRadius: 2,
                padding: 1,
                boxShadow: theme.shadows[2]
              }}
            >
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                sx={{ 
                  color: scoreInfo.color,
                  background: scoreInfo.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}
              >
                {displayScore.toFixed(1)}%
              </Typography>
              <Typography variant="h6" sx={{ color: scoreInfo.color, fontWeight: 'bold' }}>
                {scoreInfo.icon} {scoreInfo.label}
              </Typography>
            </Box>
          </Box>

          {/* Additional metrics */}
          <Box mt={2} display="flex" gap={1} flexWrap="wrap" justifyContent="center">
            <Chip 
              icon={<SpeedIcon />} 
              label="Industry Avg: 78%" 
              size="small" 
              variant="outlined"
            />
          </Box>

          {/* Metadata */}
          {(design || timestamp) && (
            <Box mt={2} textAlign="center">
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