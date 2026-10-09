import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { creerLimiteur } from '../../../middlewares/limiteur.js';

describe('middlewares/limiteur', () => {
  it('répond 429 au-delà du quota, avec le format d’erreur commun', async () => {
    const app = express();
    app.use(creerLimiteur({ limite: 1 }));
    app.get('/', (_req, res) => res.json({ ok: true }));

    expect((await request(app).get('/')).status).toBe(200);
    const res = await request(app).get('/');
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('QUOTA_DEPASSE');
  });

  it('deux limiteurs ne partagent pas leurs compteurs', async () => {
    const app = express();
    app.get('/a', creerLimiteur({ limite: 1 }), (_req, res) => res.end());
    app.get('/b', creerLimiteur({ limite: 1 }), (_req, res) => res.end());

    await request(app).get('/a');
    expect((await request(app).get('/b')).status).toBe(200);
  });
});
