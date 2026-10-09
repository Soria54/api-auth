/** Spécification OpenAPI générée depuis les blocs `@swagger` des routes. */
import swaggerJSDoc from 'swagger-jsdoc';
import { lirePackage, lireVersion } from './utils/version.js';

const pkg = lirePackage();

export const specification = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: { title: 'API Auth', version: lireVersion(), description: pkg.description },
    components: {
      schemas: {
        Erreur: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            size: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      // @@securite-openapi
    },
  },
  apis: ['./routes/*.js'],
});

export default specification;
