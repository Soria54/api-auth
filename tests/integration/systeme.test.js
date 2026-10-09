import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { creerAppDeTest } from '../helpers/harnais.js';

let app;
let sequelize;

beforeAll(async () => {
  ({ app, sequelize } = await creerAppDeTest());
});

afterAll(async () => {
  await sequelize.close();
});

describe('routes système', () => {
  it('GET / renvoie le nom et la version', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('version');
  });

  it('GET /version renvoie l’environnement', async () => {
    const res = await request(app).get('/version');
    expect(res.status).toBe(200);
    expect(res.body.environment).toBe('test');
  });

  it('GET /healthz répond sans base', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('up');
  });

  it('GET /ping répond pong', async () => {
    const res = await request(app).get('/ping');
    expect(res.body).toEqual({ pong: true });
  });

  it('GET /dbcheck signale une base connectée', async () => {
    const res = await request(app).get('/dbcheck');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('connected');
  });

  it('GET /dbcheck signale une base injoignable sans erreur 500', async () => {
    const { app: appSansBase, sequelize: base } = await creerAppDeTest();
    await base.close();
    const res = await request(appSansBase).get('/dbcheck');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('disconnected');
  });
});

describe('fin de chaîne', () => {
  it('une route inconnue répond 404 JSON', async () => {
    const res = await request(app).get('/route-inconnue');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Route introuvable.', code: 'ROUTE_INTROUVABLE' });
  });

  it('un JSON malformé répond 400 sans détail interne', async () => {
    const res = await request(app)
      .post('/route-inconnue')
      .set('Content-Type', 'application/json')
      .send('{ pas du json');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('JSON_INVALIDE');
    expect(JSON.stringify(res.body)).not.toMatch(/at |node_modules/);
  });

  it('ne divulgue pas Express', async () => {
    const res = await request(app).get('/healthz');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
