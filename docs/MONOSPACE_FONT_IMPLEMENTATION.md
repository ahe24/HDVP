# Monospace Font Implementation Guide

## Overview

This guide explains how to implement monospace fonts consistently across all technical data displays in the Questa Web Interface. Monospace fonts improve readability and professionalism for technical content like code, logs, file paths, job IDs, and configuration values.

## Font Stack

We use this optimized monospace font stack:

```css
'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace
```

**Benefits:**
- **JetBrains Mono**: Excellent for code/technical data with great readability
- **Fira Code**: Popular programming font with ligature support
- **SF Mono**: Apple's system monospace font (macOS)
- **Roboto Mono**: Google's clean monospace font
- **Fallbacks**: Cross-platform compatibility (Monaco, Consolas, Courier New)

## Implementation Methods

### 1. CSS Custom Properties (Recommended)

Use these CSS variables defined in `index.css`:

```css
:root {
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Roboto Mono', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace;
  --font-mono-size-xs: 0.7rem;    /* For timestamps, small technical data */
  --font-mono-size-sm: 0.75rem;   /* For chips, labels */
  --font-mono-size-md: 0.875rem;  /* For standard technical content */
  --font-mono-size-lg: 1rem;      /* For headers, important data */
}
```

### 2. CSS Utility Classes

Apply these classes directly to HTML elements:

```css
.technical-data       /* Standard technical content */
.technical-data-sm    /* Small technical content */
.technical-data-xs    /* Extra small technical content */
.job-id, .project-id  /* Specific for IDs */
.file-path, .directory-path  /* For file system paths */
.config-value         /* Configuration values */
.timestamp, .duration /* Time-related data */
.log-content         /* Log file content */
```

### 3. Material-UI Typography Variants

Use custom typography variants in React components:

```jsx
<Typography variant="technicalData">
  Standard technical content
</Typography>

<Typography variant="technicalDataSmall">
  Small technical content (chips, labels)
</Typography>

<Typography variant="technicalDataXSmall">
  Extra small technical content (timestamps)
</Typography>
```

### 4. Material-UI Component Classes

Use theme-aware classes for consistent styling:

```jsx
<TableCell className="technical-cell">
  {job.config.dutTop}
</TableCell>

<Chip className="technical-chip" label={directory} />
```

## When to Use Monospace Fonts

### ✅ **ALWAYS use monospace for:**

1. **Job and Project IDs**
   ```jsx
   <Typography variant="technicalDataSmall">
     {job.id.substring(0, 8)}...
   </Typography>
   ```

2. **File Paths and Directory Names**
   ```jsx
   <Chip className="technical-chip" label="/path/to/file.v" />
   ```

3. **Configuration Values**
   ```jsx
   <TableCell className="technical-cell">
     {job.config.dutTop}
   </TableCell>
   ```

4. **Log Content**
   ```jsx
   <Box sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-mono-size-md)' }}>
     {logContent}
   </Box>
   ```

5. **Simulation Time Values**
   ```jsx
   <Typography variant="technicalData">
     1000ns
   </Typography>
   ```

6. **Command Line Output**
   ```jsx
   <pre className="log-content">
     vlog -work work +incdir+./include ./src/*.v
   </pre>
   ```

7. **Technical Metadata**
   ```jsx
   <Typography variant="technicalDataXSmall">
     Database: /path/to/formal.db
   </Typography>
   ```

8. **JSON and Structured Data**
   ```jsx
   <JsonViewer data={job} style={{ fontFamily: 'var(--font-mono)' }} />
   ```

9. **Timestamps with Precise Values**
   ```jsx
   <Typography className="timestamp">
     {formatSimTime(occurrence.timeStamp)}
   </Typography>
   ```

10. **Test Result Details**
    ```jsx
    <Typography variant="technicalDataSmall">
      Violation at line 42
    </Typography>
    ```

### ❌ **DON'T use monospace for:**

- Regular UI text (buttons, labels, descriptions)
- Human-readable content (project descriptions, user messages)
- Navigation elements
- Status messages (unless they contain technical details)

## Size Guidelines

| Variant | Size | Use Case | Example |
|---------|------|----------|---------|
| `xs` | 0.7rem | Timestamps, small metadata | `2024-01-15 14:30:25` |
| `sm` | 0.75rem | Chips, labels, short IDs | Job ID chips, file names |
| `md` | 0.875rem | Standard technical content | Configuration values, log lines |
| `lg` | 1rem | Headers, important data | Major technical headings |

## Implementation Examples

### JobDetail Component Updates

```jsx
// ✅ Project ID (already implemented)
<TableCell className="technical-cell">
  {job.projectId.substring(0, 20)}...
</TableCell>

// ✅ DUT Top configuration (already implemented)
<TableCell className="technical-cell">
  {job.config.dutTop}
</TableCell>

// ✅ Include directories (already implemented)
<Chip className="technical-chip" label={dir} />
```

### LogViewer Component

```jsx
// ✅ Log content with syntax highlighting
<div style={{
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--font-mono-size-md)',
  lineHeight: 1.4
}}>
  {line}
</div>
```

### TestResults Component

```jsx
// ✅ Simulation timestamps
<Typography className="timestamp">
  {formatSimTime(occurrence.timeStamp)}
</Typography>
```

## Theme Integration

The theme in `App.tsx` includes custom variants:

```jsx
const theme = createTheme({
  typography: {
    technicalData: {
      fontFamily: "'JetBrains Mono', ...",
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    // ... other variants
  },
  components: {
    MuiChip: {
      styleOverrides: {
        root: {
          '&.technical-chip': {
            fontFamily: "'JetBrains Mono', ...",
            fontSize: '0.75rem',
          },
        },
      },
    },
    // ... other components
  },
});
```

## Browser Compatibility

The font stack provides excellent cross-platform support:

- **Windows**: Consolas, Courier New
- **macOS**: SF Mono, Monaco
- **Linux**: Ubuntu Mono, Consolas
- **Web fonts**: JetBrains Mono, Fira Code, Roboto Mono

## Performance Considerations

- Fonts are loaded via Google Fonts with `display=swap` for fast rendering
- Fallback fonts ensure immediate display while web fonts load
- CSS custom properties minimize bundle size
- Utility classes reduce inline styles

## Migration Checklist

### For Existing Components:

1. **Replace inline `fontFamily: 'monospace'`** with utility classes or Typography variants
2. **Update `fontSize` values** to use CSS custom properties
3. **Add `className="technical-chip"`** to technical Chip components
4. **Use `className="technical-cell"`** for technical TableCell components
5. **Apply Typography variants** for new technical content

### For New Components:

1. **Start with Typography variants** for consistent sizing
2. **Use CSS utility classes** for simple styling
3. **Apply component classes** for complex styling
4. **Test across different browsers** to ensure font fallbacks work

## Testing

1. **Font Loading**: Verify fonts load correctly across browsers
2. **Readability**: Ensure technical data is clearly readable
3. **Consistency**: Check that all technical data uses monospace
4. **Performance**: Monitor font loading impact on page speed
5. **Accessibility**: Verify text remains accessible at different zoom levels

## Future Enhancements

1. **Dark Mode**: Adjust monospace font weights for dark themes
2. **Font Ligatures**: Consider enabling programming ligatures for code
3. **Variable Fonts**: Explore variable font support for better performance
4. **User Preferences**: Allow users to choose preferred monospace fonts 