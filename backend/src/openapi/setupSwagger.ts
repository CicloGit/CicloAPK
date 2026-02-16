import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openApiDocument';

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/api/openapi.json', (_request, response) => {
    response.status(200).json(openApiDocument);
  });
}
