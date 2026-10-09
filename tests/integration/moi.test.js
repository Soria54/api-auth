import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { creerAppDeTest, ipDeTest, jetonDeTest } from '../helpers/harnais.js';

let app;
let db;
let sequelize;

const MOT_DE_PASSE = 'un-mot-de-passe-long';

/** Crée un compte, le connecte, renvoie `{ jeton, jetonRafraichissement, id }`. */
const nouveauCompte = async (nom, extra = {}) => {
  vi.stubEnv('INSCRIPTION_OUVERTE', 'true');
  await request(app)
    .post('/api/auth/inscription')
    .set('X-Forwarded-For', ipDeTest())
    .send({ nom_utilisateur: nom, mot_de_passe: MOT_DE_PASSE, ...extra });
  const { body } = await request(app)
    .post('/api/auth/connexion')
    .set('X-Forwarded-For', ipDeTest())
    .send({ nom_utilisateur: nom, mot_de_passe: MOT_DE_PASSE });
  return {
    jeton: body.data.jeton,
    jetonRafraichissement: body.data.jeton_rafraichissement,
    id: body.data.utilisateur.id,
  };
};

const avec = (jeton) => ({ Authorization: `Bearer ${jeton}` });

beforeAll(async () => {
  ({ app, db, sequelize } = await creerAppDeTest());
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await sequelize.close();
});

describe('/api/moi', () => {
  it('refuse sans jeton, avec un jeton faux ou d’un compte supprimé (401)', async () => {
    expect((await request(app).get('/api/moi').set('X-Forwarded-For', ipDeTest())).status).toBe(
      401,
    );
    expect(
      (
        await request(app)
          .get('/api/moi')
          .set('X-Forwarded-For', ipDeTest())
          .set(avec('abc.def.ghi'))
      ).status,
    ).toBe(401);
    const orphelin = await jetonDeTest({ id: 999 });
    expect(
      (await request(app).get('/api/moi').set('X-Forwarded-For', ipDeTest()).set(avec(orphelin)))
        .status,
    ).toBe(401);
  });

  it('modifie les champs facultatifs ; null efface ; email modifié = non vérifié', async () => {
    const { jeton, id } = await nouveauCompte('emma', { email: 'emma@exemple.fr' });
    await db.Utilisateur.update({ email_verifie: true }, { where: { id } });

    const res = await request(app)
      .patch('/api/moi')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(jeton))
      .send({ ville: 'Metz', prenom: 'Emma', email: 'Emma2@Exemple.fr' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      ville: 'Metz',
      prenom: 'Emma',
      email: 'emma2@exemple.fr',
      email_verifie: false,
    });

    const efface = await request(app)
      .patch('/api/moi')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(jeton))
      .send({ ville: null });
    expect(efface.body.data.ville).toBeNull();
  });

  it('garde email_verifie si l’email ne change pas', async () => {
    const { jeton, id } = await nouveauCompte('fanny', { email: 'fanny@exemple.fr' });
    await db.Utilisateur.update({ email_verifie: true }, { where: { id } });
    const res = await request(app)
      .patch('/api/moi')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(jeton))
      .send({ email: 'fanny@exemple.fr' });
    expect(res.body.data.email_verifie).toBe(true);
  });

  it('refuse un email pris par un autre compte (409)', async () => {
    const { jeton } = await nouveauCompte('gael');
    const res = await request(app)
      .patch('/api/moi')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(jeton))
      .send({ email: 'fanny@exemple.fr' });
    expect(res.status).toBe(409);
  });

  it.each([
    ['corps vide', {}],
    ['nom d’utilisateur (non modifiable)', { nom_utilisateur: 'autre' }],
    ['rôle', { role: 'admin' }],
    ['mot de passe', { mot_de_passe: 'x'.repeat(20) }],
  ])('PATCH refuse : %s (400)', async (_cas, corps) => {
    const { jeton } = await nouveauCompte('hugo');
    const res = await request(app)
      .patch('/api/moi')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(jeton))
      .send(corps);
    expect(res.status).toBe(400);
  });
});

describe('quota par compte', () => {
  it('limite les modifications du profil, même en changeant d’adresse IP (429)', async () => {
    const { jeton } = await nouveauCompte('nina');
    const statuts = [];
    for (let i = 0; i < 11; i += 1) {
      statuts.push(
        // eslint-disable-next-line no-await-in-loop
        (
          await request(app)
            .patch('/api/moi')
            .set('X-Forwarded-For', ipDeTest())
            .set(avec(jeton))
            .send({ ville: `Ville ${i}` })
        ).status,
      );
    }
    expect(statuts.slice(0, 10).every((statut) => statut === 200)).toBe(true);
    expect(statuts[10]).toBe(429);
  });
});

describe('POST /api/moi/mot-de-passe', () => {
  it('change le mot de passe et ferme toutes les sessions', async () => {
    const { jeton, jetonRafraichissement } = await nouveauCompte('ines');
    const res = await request(app)
      .post('/api/moi/mot-de-passe')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(jeton))
      .send({ mot_de_passe_actuel: MOT_DE_PASSE, nouveau_mot_de_passe: 'nouveau-mot-de-passe' });
    expect(res.status).toBe(204);

    const rafraichi = await request(app)
      .post('/api/auth/rafraichir')
      .set('X-Forwarded-For', ipDeTest())
      .send({ jeton_rafraichissement: jetonRafraichissement });
    expect(rafraichi.status).toBe(401);

    const ancien = await request(app)
      .post('/api/auth/connexion')
      .set('X-Forwarded-For', ipDeTest())
      .send({ nom_utilisateur: 'ines', mot_de_passe: MOT_DE_PASSE });
    expect(ancien.status).toBe(401);
    const nouveau = await request(app)
      .post('/api/auth/connexion')
      .set('X-Forwarded-For', ipDeTest())
      .send({ nom_utilisateur: 'ines', mot_de_passe: 'nouveau-mot-de-passe' });
    expect(nouveau.status).toBe(200);
  });

  it('refuse un mot de passe actuel incorrect, ou un nouveau identique (400)', async () => {
    const { jeton } = await nouveauCompte('jules');
    const faux = await request(app)
      .post('/api/moi/mot-de-passe')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(jeton))
      .send({ mot_de_passe_actuel: 'pas-le-bon', nouveau_mot_de_passe: 'nouveau-mot-de-passe' });
    expect(faux.status).toBe(400);
    const identique = await request(app)
      .post('/api/moi/mot-de-passe')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(jeton))
      .send({ mot_de_passe_actuel: MOT_DE_PASSE, nouveau_mot_de_passe: MOT_DE_PASSE });
    expect(identique.status).toBe(400);
  });
});

describe('POST /api/moi/deconnexion-partout', () => {
  it('ferme toutes les sessions du compte, pas celles des autres', async () => {
    const kim = await nouveauCompte('kim');
    const leo = await nouveauCompte('leo');
    const res = await request(app)
      .post('/api/moi/deconnexion-partout')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(kim.jeton));
    expect(res.status).toBe(204);
    const rafraichir = (jeton) =>
      request(app)
        .post('/api/auth/rafraichir')
        .set('X-Forwarded-For', ipDeTest())
        .send({ jeton_rafraichissement: jeton });
    expect((await rafraichir(kim.jetonRafraichissement)).status).toBe(401);
    expect((await rafraichir(leo.jetonRafraichissement)).status).toBe(200);
  });

  it('refuse pour un compte supprimé (401)', async () => {
    const orphelin = await jetonDeTest({ id: 999 });
    const res = await request(app)
      .post('/api/moi/deconnexion-partout')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(orphelin));
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/moi', () => {
  it('refuse sans le bon mot de passe (400), puis supprime compte et sessions (204)', async () => {
    const { jeton, id } = await nouveauCompte('mia');
    const faux = await request(app)
      .delete('/api/moi')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(jeton))
      .send({ mot_de_passe: 'pas-le-bon' });
    expect(faux.status).toBe(400);

    const res = await request(app)
      .delete('/api/moi')
      .set('X-Forwarded-For', ipDeTest())
      .set(avec(jeton))
      .send({ mot_de_passe: MOT_DE_PASSE });
    expect(res.status).toBe(204);
    expect(await db.Utilisateur.findByPk(id)).toBeNull();
    expect(await db.JetonRafraichissement.count({ where: { id_utilisateur: id } })).toBe(0);
    expect(
      (await request(app).get('/api/moi').set('X-Forwarded-For', ipDeTest()).set(avec(jeton)))
        .status,
    ).toBe(401);
  });
});
