import { NextResponse } from 'next/server';

/**
 * 错误响应结构
 */
interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

/**
 * 创建成功响应
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * 创建错误响应
 */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  const error: ErrorResponse = {
    code,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details !== undefined) {
    error.details = details;
  }

  return NextResponse.json({ error }, { status });
}

/**
 * 创建 204 No Content 响应
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * 常见错误响应快捷方法
 */
export const ApiError = {
  notFound(message: string = '资源不存在'): NextResponse {
    return errorResponse('NOT_FOUND', message, 404);
  },

  badRequest(message: string, details?: unknown): NextResponse {
    return errorResponse('BAD_REQUEST', message, 400, details);
  },

  validationError(message: string = '请求数据验证失败', details?: unknown): NextResponse {
    return errorResponse('VALIDATION_ERROR', message, 400, details);
  },

  internalError(message: string = '服务器内部错误，请稍后重试', details?: unknown): NextResponse {
    return errorResponse('INTERNAL_ERROR', message, 500, details);
  },

  databaseError(message: string = '数据库操作失败，请稍后重试', details?: unknown): NextResponse {
    return errorResponse('DATABASE_ERROR', message, 500, details);
  },

  custom(code: string, message: string, status: number, details?: unknown): NextResponse {
    return errorResponse(code, message, status, details);
  },
};
