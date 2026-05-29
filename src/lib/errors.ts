/**
 * ✅ BUG FIX #7: Proper error handling classes
 * 
 * Custom error classes for better error handling and security
 */

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} tidak ditemukan`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Terlalu banyak percobaan. Coba lagi nanti.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Safe error response for API routes
 * Hides internal error details from clients
 */
export function getSafeErrorResponse(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
} {
  // Known operational errors
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: any };
    
    switch (prismaError.code) {
      case 'P2002':
        return {
          message: 'Data sudah ada. Silakan gunakan data yang berbeda.',
          code: 'DUPLICATE_ENTRY',
          statusCode: 409,
        };
      case 'P2025':
        return {
          message: 'Data tidak ditemukan',
          code: 'NOT_FOUND',
          statusCode: 404,
        };
      case 'P2003':
        return {
          message: 'Operasi gagal karena data terkait tidak ditemukan',
          code: 'FOREIGN_KEY_CONSTRAINT',
          statusCode: 400,
        };
      default:
        // Don't expose Prisma error details
        console.error('[Prisma Error]', prismaError);
        return {
          message: 'Terjadi kesalahan pada database',
          code: 'DATABASE_ERROR',
          statusCode: 500,
        };
    }
  }

  // Generic errors - don't expose details
  console.error('[Unexpected Error]', error);
  return {
    message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
}

/**
 * Log error with context for debugging
 */
export function logError(error: unknown, context: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  };

  console.error('[Error Log]', JSON.stringify(errorInfo, null, 2));

  // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { contexts: { custom: context } });
  // }
}
