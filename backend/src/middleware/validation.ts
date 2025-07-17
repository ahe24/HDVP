import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/app';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : undefined,
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined,
      }))
    });
  }
  next();
};

/**
 * Rate limiting middleware
 */
export const rateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindow,
  max: config.security.rateLimitMax,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Project validation rules
 */
export const validateProject = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Project name can only contain letters, numbers, underscores, and hyphens'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  handleValidationErrors,
];

/**
 * Job validation rules
 */
export const validateJob = [
  body('projectId')
    .isString()
    .notEmpty()
    .withMessage('Project ID is required'),
  
  body('type')
    .isIn(['simulation', 'formal', 'compile'])
    .withMessage('Job type must be simulation, formal, or compile'),
  
  body('config.dutTop')
    .isString()
    .notEmpty()
    .withMessage('DUT top module is required')
    .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .withMessage('DUT top module must be a valid identifier'),
  
  body('config.simulationTime')
    .optional()
    .isString()
    .matches(/^\d+(\.\d+)?(ns|us|ms|s)$/)
    .withMessage('Simulation time must be in format: number + unit (ns, us, ms, s)'),
  
  body('config.formalMode')
    .optional()
    .isIn(['lint', 'cdc', 'rdc'])
    .withMessage('Formal mode must be lint, cdc, or rdc'),
  
  body('config.includeDirectories')
    .optional()
    .isArray()
    .withMessage('Include directories must be an array'),
  
  body('config.defines')
    .optional()
    .isObject()
    .withMessage('Defines must be an object'),

  handleValidationErrors,
];

/**
 * File upload validation
 */
export const validateFileUpload = [
  body('files')
    .custom((files) => {
      if (!Array.isArray(files)) {
        throw new Error('Files must be an array');
      }
      
      if (files.length === 0) {
        throw new Error('At least one file is required');
      }
      
      if (files.length > config.upload.maxFiles) {
        throw new Error(`Maximum ${config.upload.maxFiles} files allowed`);
      }
      
      return true;
    }),

  handleValidationErrors,
];

/**
 * ID parameter validation
 */
export const validateId = [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('ID parameter is required'),

  handleValidationErrors,
];

/**
 * Project ID parameter validation
 */
export const validateProjectId = [
  param('projectId')
    .isString()
    .notEmpty()
    .withMessage('Project ID parameter is required'),

  handleValidationErrors,
];

/**
 * Query parameter validation for pagination
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  handleValidationErrors,
];

/**
 * File extension validation
 */
export const validateFileExtension = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? config.upload.allowedExtensions.includes(`.${ext}`) : false;
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}; 