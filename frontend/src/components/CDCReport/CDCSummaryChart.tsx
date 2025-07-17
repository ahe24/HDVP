import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import { CDCSummary } from '../../types';

interface CDCSummaryChartProps {
  summary: CDCSummary;
  animate?: boolean;
}

const CDCSummaryChart: React.FC<CDCSummaryChartProps> = ({ summary, animate = false }) => {
  const chartData = {
    labels: ['Violations', 'Cautions', 'Evaluations'],
    datasets: [
      {
        data: [summary.violations, summary.cautions, summary.evaluations],
        backgroundColor: [
          '#f44336', // Red for violations
          '#ff9800', // Orange for cautions
          '#4caf50', // Green for evaluations
        ],
        borderColor: [
          '#d32f2f',
          '#f57c00',
          '#388e3c',
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          '#d32f2f',
          '#f57c00',
          '#388e3c',
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = summary.totalChecks;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    animation: {
      animateRotate: animate,
      animateScale: animate,
    },
  };

  return (
    <Card elevation={0} variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom align="center">
          🔄 CDC Summary
        </Typography>
        <Box height={200} position="relative">
          <Doughnut data={chartData} options={chartOptions} />
        </Box>
        <Box mt={2} textAlign="center">
          <Typography variant="h4" color="primary" fontWeight="bold">
            {summary.totalChecks}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Checks
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CDCSummaryChart; 