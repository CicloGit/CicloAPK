import { NextFunction, Request, Response } from 'express';
import { z, ZodTypeAny } from 'zod';

export function validateRequest(schema: {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (schema.body) {
      request.body = schema.body.parse(request.body);
    }
    if (schema.params) {
      request.params = schema.params.parse(request.params);
    }
    if (schema.query) {
      request.query = schema.query.parse(request.query as unknown as z.infer<typeof schema.query>);
    }
    next();
  };
}
