import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

type Source = 'body' | 'query' | 'params';

/** Validates + replaces req[source] with the parsed value. Parsed query is exposed on res.locals.query (Express 5 query is read-only). */
const validate =
  (schema: ZodType, source: Source = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) return next(parsed.error);
    if (source === 'body') req.body = parsed.data;
    else res.locals[source] = parsed.data;
    next();
  };

export default validate;
