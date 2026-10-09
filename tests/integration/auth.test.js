import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { creerAppDeTest, jetonDeTest } from '../helpers/harnais.js';

let app;
let sequelize;

const IDENTIFIANTS = { email: 'Alice@Exemple.fr', mot_de_passe: 'un-mot-de-passe-long' };

beforeAll(async () => {
  ({ app, sequelize } = await creerAppDeTest());
});

beforeEach(() => {
  vi.stubEnv('INSCRIPTION_OUVERTE', 'true');
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await sequelize.close();
});

describe('/api/auth', () => {
  it('refuse l’inscription quand elle est fermée (403)', async () => {
    vi.stubEnv('INSCRIPTION_OUVERTE', 'false');
    const res = await request(app).post('/api/auth/inscription').send(IDENTIFIANTS);
    expect(res.status).toBe(403);
  });

  it('inscrit (201) sans jamais renvoyer le hash', async () => {
    const res = await request(app).post('/api/auth/inscription').send(IDENTIFIANTS);
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: expect.any(Number),
      email: 'alice@exemple.fr',
      role: 'utilisateur',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/scrypt/);
  });

  it('refuse un email déjà utilisé (409)', async () => {
    const res = await request(app).post('/api/auth/inscription').send(IDENTIFIANTS);
    expect(res.status).toBe(409);
  });

  it('refuse un mot de passe trop court (400)', async () => {
    const res = await request(app)
      .post('/api/auth/inscription')
      .send({ email: 'bob@exemple.fr', mot_de_passe: 'court' });
    expect(res.status).toBe(400);
  });

  it('connecte et renvoie un jeton utilisable sur /moi', async () => {
    const connexion = await request(app).post('/api/auth/connexion').send(IDENTIFIANTS);
    expect(connexion.status).toBe(200);
    const { jeton } = connexion.body.data;

    const moi = await request(app).get('/api/auth/moi').set('Authorization', `Bearer ${jeton}`);
    expect(moi.status).toBe(200);
    expect(moi.body.data.email).toBe('alice@exemple.fr');
  });

  it('même 401 pour un mauvais mot de passe et un email inconnu', async () => {
    const mauvais = await request(app)
      .post('/api/auth/connexion')
      .send({ ...IDENTIFIANTS, mot_de_passe: 'pas-le-bon-mot-de-passe' });
    const inconnu = await request(app)
      .post('/api/auth/connexion')
      .send({ email: 'personne@exemple.fr', mot_de_passe: 'pas-le-bon-mot-de-passe' });
    expect(mauvais.status).toBe(401);
    expect(inconnu.status).toBe(401);
    expect(mauvais.body).toEqual(inconnu.body);
  });

  it('refuse /moi sans jeton, avec un jeton faux ou d’un utilisateur supprimé', async () => {
    expect((await request(app).get('/api/auth/moi')).status).toBe(401);
    expect(
      (await request(app).get('/api/auth/moi').set('Authorization', 'Bearer abc.def.ghi')).status,
    ).toBe(401);
    const jetonOrphelin = await jetonDeTest({ id: 999 });
    expect(
      (await request(app).get('/api/auth/moi').set('Authorization', `Bearer ${jetonOrphelin}`))
        .status,
    ).toBe(401);
  });

  it('les routes métier sont protégées par défaut', async () => {
    const res = await request(app).get('/api/une-route-quelconque');
    expect(res.status).toBe(401);
  });
});
