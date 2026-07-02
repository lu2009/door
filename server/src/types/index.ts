import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    username: string;
    databaseName: string;
    displayName: string;
    registrant: string;
  };
}

export interface ApiResponse {
  code: number;
  data?: unknown;
  message?: string;
  total?: number;
  page?: number;
  pages?: number;
  [key: string]: unknown;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type DoorType = 'ping' | 'diao';
