import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerAppDeTest } from '../helpers/harnais.js';
import { comparerSchema, lireSchemaMermaid } from '../helpers/schemaBdd.js';

let db;
let sequelize;

beforeAll(async () => {
  ({ db, sequelize } = await creerAppDeTest());
});

afterAll(async () => {
  await sequelize.close();
});

describe('docs/base-de-donnees.md', () => {
  it('les modèles respectent le schéma validé', () => {
    const schema = lireSchemaMermaid(readFileSync('docs/base-de-donnees.md', 'utf8'));
    expect(comparerSchema(schema, db)).toEqual([]);
  });
});
