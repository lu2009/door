import { Response } from 'express';

export function ok(res: Response, data?: unknown, message?: string, extra?: Record<string, unknown>): void {
  const body: Record<string, unknown> = { code: 200 };
  if (data !== undefined) body.data = data;
  if (message !== undefined) body.message = message;
  if (extra) Object.assign(body, extra);
  res.json(body);
}

export function fail(res: Response, message: string, code = 400, httpStatus = 400): void {
  res.status(httpStatus).json({ code, message });
}

export function notFound(res: Response, message = '资源不存在'): void {
  res.status(404).json({ code: 404, message });
}
