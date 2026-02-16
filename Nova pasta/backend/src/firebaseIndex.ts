import { onRequest } from 'firebase-functions/v2/https';
import { app } from './app';

export const agroApi = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  app,
);
