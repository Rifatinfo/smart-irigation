import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import config from '../../config';
import AppError from './AppError';

const globalErrorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = 'Something went wrong';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else if (err.code === 'P2002') {
      statusCode = 409;
      message = 'Duplicate value';
    }
  } else if (err?.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON body';
  } else if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  if (statusCode >= 500) console.error('[error]', err);

  res.status(statusCode).json({
    success: false,
    message,
    error: details ?? (config.isProd || statusCode < 500 ? undefined : String(err?.message ?? err)),
  });
};

export default globalErrorHandler;
