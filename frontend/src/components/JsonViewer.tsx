import React, { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

interface JsonViewerProps {
  data: any;
  name?: string;
  collapsed?: boolean;
  style?: React.CSSProperties;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ 
  data, 
  name, 
  collapsed = false, 
  style = {} 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const getDataType = (val: any): string => {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  };

  const getValueColor = (type: string): string => {
    switch (type) {
      case 'string': return '#4CAF50'; // Green
      case 'number': return '#2196F3'; // Blue
      case 'boolean': return '#FF9800'; // Orange
      case 'null': return '#9E9E9E'; // Grey
      default: return '#000000'; // Black
    }
  };

  const renderValue = (val: any, key?: string | number): React.ReactNode => {
    const type = getDataType(val);
    
    if (type === 'object' && val !== null) {
      return (
        <JsonViewer 
          key={key} 
          data={val} 
          name={key?.toString()} 
          collapsed={false}
        />
      );
    }
    
    if (type === 'array') {
      return (
        <JsonViewer 
          key={key} 
          data={val} 
          name={key?.toString()} 
          collapsed={false}
        />
      );
    }

    return (
      <span style={{ color: getValueColor(type) }}>
        {type === 'string' ? `"${val}"` : String(val)}
      </span>
    );
  };

  const renderObject = (obj: any): React.ReactNode => {
    const keys = Object.keys(obj);
    
    return (
      <Box sx={{ ml: 2 }}>
        {keys.map((key, index) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
            <Typography 
              component="span" 
              sx={{ 
                color: '#E91E63', // Pink for keys
                fontWeight: 'bold',
                mr: 1,
                fontFamily: 'monospace'
              }}
            >
              "{key}":
            </Typography>
            <Box sx={{ flex: 1 }}>
              {renderValue(obj[key], key)}
            </Box>
            {index < keys.length - 1 && (
              <Typography component="span" sx={{ color: '#666' }}>,</Typography>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  const renderArray = (arr: any[]): React.ReactNode => {
    return (
      <Box sx={{ ml: 2 }}>
        {arr.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
            <Typography 
              component="span" 
              sx={{ 
                color: '#9C27B0', // Purple for array indices
                mr: 1,
                fontFamily: 'monospace',
                minWidth: '20px'
              }}
            >
              [{index}]:
            </Typography>
            <Box sx={{ flex: 1 }}>
              {renderValue(item, index)}
            </Box>
            {index < arr.length - 1 && (
              <Typography component="span" sx={{ color: '#666' }}>,</Typography>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  const isExpandable = (val: any): boolean => {
    return (typeof val === 'object' && val !== null) || Array.isArray(val);
  };

  const getPreview = (val: any): string => {
    if (Array.isArray(val)) {
      return `Array(${val.length})`;
    }
    if (typeof val === 'object' && val !== null) {
      const keys = Object.keys(val);
      return `Object{${keys.length} ${keys.length === 1 ? 'key' : 'keys'}}`;
    }
    return String(val);
  };

  const dataType = getDataType(data);
  const expandable = isExpandable(data);

  return (
    <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', ...style }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {expandable && (
          <IconButton
            size="small"
            onClick={() => setIsCollapsed(!isCollapsed)}
            sx={{ p: 0.5, mr: 0.5 }}
          >
            {isCollapsed ? <ExpandMore /> : <ExpandLess />}
          </IconButton>
        )}
        
        {name && (
          <Typography 
            component="span" 
            sx={{ 
              color: '#E91E63', 
              fontWeight: 'bold',
              mr: 1 
            }}
          >
            "{name}":
          </Typography>
        )}
        
        {dataType === 'array' && (
          <Typography component="span" sx={{ color: '#666' }}>
            [
          </Typography>
        )}
        
        {dataType === 'object' && data !== null && (
          <Typography component="span" sx={{ color: '#666' }}>
            {'{'}
          </Typography>
        )}
        
        {isCollapsed && expandable && (
          <Typography 
            component="span" 
            sx={{ 
              color: '#999', 
              fontStyle: 'italic',
              ml: 1 
            }}
          >
            {getPreview(data)}
          </Typography>
        )}
      </Box>

      {!isCollapsed && (
        <>
          {dataType === 'object' && data !== null && renderObject(data)}
          {dataType === 'array' && renderArray(data)}
          {!expandable && (
            <Box sx={{ ml: expandable ? 2 : 0 }}>
              {renderValue(data)}
            </Box>
          )}
        </>
      )}

      {!isCollapsed && dataType === 'array' && (
        <Typography component="span" sx={{ color: '#666' }}>
          ]
        </Typography>
      )}
      
      {!isCollapsed && dataType === 'object' && data !== null && (
        <Typography component="span" sx={{ color: '#666' }}>
          {'}'}
        </Typography>
      )}
    </Box>
  );
};

export default JsonViewer;