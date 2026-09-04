/**
 * Kelas dasar error aplikasi Arum Seduh.
 * Mendukung kode error terstruktur, status code HTTP, dan penanda operasional.
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

/**
 * Error validasi input pengguna atau skema request DTO (HTTP 400).
 */
export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

/**
 * Error sumber daya tidak ditemukan di basis data (HTTP 404).
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} tidak ditemukan`, 404, 'NOT_FOUND');
  }
}

/**
 * Error pengguna belum terotentikasi / sesi habis (HTTP 401).
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Error hak akses tidak mencukupi / pelanggaran RBAC (HTTP 403).
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Error benturan status atau data duplikat (HTTP 409).
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Error limit pembatasan laju permintaan terlampaui (HTTP 429).
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Terlalu banyak percobaan. Coba lagi nanti.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Menghasilkan respons error aman untuk rute API Next.js tanpa membocorkan detail internal server.
 *
 * Menerjemahkan Prisma error codes (P2002, P2025, P2003) ke format ramah pengguna.
 *
 * @param {unknown} error - Objek error yang ditangkap di blok try-catch
 * @returns {{ message: string; code: string; statusCode: number }} Respons error terformat rapi
 *
 * @example
 * ```typescript
 * catch (error) {
 *   const safe = getSafeErrorResponse(error);
 *   return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.statusCode });
 * }
 * ```
 */
export function getSafeErrorResponse(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
} {
  // Operational errors yang diketahui
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  // Penanganan error Prisma
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: unknown };
    
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
        console.error('[Prisma Error]', prismaError);
        return {
          message: 'Terjadi kesalahan pada database',
          code: 'DATABASE_ERROR',
          statusCode: 500,
        };
    }
  }

  // Error tak terduga (sembunyikan detail sistem dari publik)
  console.error('[Unexpected Error]', error);
  return {
    message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
}

/**
 * Mencatat error ke konsol/monitoring bersama konteks metadata eksekusi.
 *
 * @param {unknown} error - Error yang ditangkap
 * @param {Record<string, unknown>} [context={}] - Metadata kontekstual tambahan (userId, orderId, dll.)
 *
 * @example
 * ```typescript
 * logError(err, { orderId: 'ord-123', action: 'checkout' });
 * ```
 */
export function logError(error: unknown, context: Record<string, unknown> = {}): void {
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
}
