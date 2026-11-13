import { Response } from 'express';

/** Uniform envelope: { success, message, meta, data } */
const sendResponse = <T>(
  res: Response,
  body: {
    statusCode: number;
    success: boolean;
    message: string;
    meta?: Record<string, unknown> | null;
    data?: T | null;
  },
) => {
  res.status(body.statusCode).json({
    success: body.success,
    message: body.message,
    meta: body.meta ?? null,
    data: body.data ?? null,
  });
};

export default sendResponse;
