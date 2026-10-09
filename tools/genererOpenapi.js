/** Écrit `openapi/openapi.json` depuis les annotations `@swagger`. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { specification } from '../swagger.js';

mkdirSync('openapi', { recursive: true });
writeFileSync('openapi/openapi.json', `${JSON.stringify(specification, null, 2)}\n`);
console.log(`openapi/openapi.json : ${Object.keys(specification.paths ?? {}).length} chemins`);
