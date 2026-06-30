export interface AppErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: AppErrorDetail[];

  constructor(
    message: string,
    statusCode = 400,
    code = 'GENERIC_ERROR',
    details?: AppErrorDetail[],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static badRequest(message: string, details?: AppErrorDetail[]) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Access denied') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static validation(message: string, details: AppErrorDetail[]) {
    return new AppError(message, 422, 'VALIDATION_ERROR', details);
  }

  static conflict(message: string) {
    return new AppError(message, 409, 'CONFLICT');
  }

  toJSON() {
    return {
      status: 'error',
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}
