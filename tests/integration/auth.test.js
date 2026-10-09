import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Op } from 'sequelize';
import { creerAppDeTest, ipDeTest } from '../helpers/harnais.js';

let app;
let db;
let sequelize;

const IDENTIFIANTS = { nom_utilisateur: 'Alice', mot_de_passe: 'un-mot-de-passe-long' };

const connecter = (corps = IDENTIFIANTS) =>
  request(app).post('/api/auth/connexion').set('X-Forwarded-For', ipDeTest()).send(corps);
const rafraichir = (jeton) =>
  request(app)
    .post('/api/auth/rafraichir')
    .set('X-Forwarded-For', ipDeTest())
    .send({ jeton_rafraichissement: jeton });

beforeAll(async () => {
  ({ app, db, sequelize } = await creerAppDeTest());
});

beforeEach(() => {
  vi.stubEnv('INSCRIPTION_OUVERTE', 'true');
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await sequelize.close();
});

describe('POST /api/auth/inscription', () => {
  it('refuse l’inscription quand elle est fermée (403)', async () => {
    vi.stubEnv('INSCRIPTION_OUVERTE', 'false');
    const res = await request(app)
      .post('/api/auth/inscription')
      .set('X-Forwarded-For', ipDeTest())
      .send(IDENTIFIANTS);
    expect(res.status).toBe(403);
  });

  it('inscrit avec le seul nom et mot de passe (201), sans jamais renvoyer le hash', async () => {
    const res = await request(app)
      .post('/api/auth/inscription')
      .set('X-Forwarded-For', ipDeTest())
      .send(IDENTIFIANTS);
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: expect.any(Number),
      nom_utilisateur: 'alice',
      role: 'utilisateur',
      prenom: null,
      sexe: null,
      email: null,
      email_verifie: false,
      ville: null,
      date_naissance: null,
      derniere_connexion: null,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/scrypt/);
  });

  it('inscrit avec les champs facultatifs, normalisés', async () => {
    const res = await request(app)
      .post('/api/auth/inscription')
      .set('X-Forwarded-For', ipDeTest())
      .send({
        nom_utilisateur: 'bob',
        mot_de_passe: 'un-autre-mot-de-passe',
        prenom: ' Bob ',
        sexe: 'homme',
        email: ' Bob@Exemple.FR ',
        ville: 'Nancy',
        date_naissance: '1990-04-12',
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      prenom: 'Bob',
      sexe: 'homme',
      email: 'bob@exemple.fr',
      ville: 'Nancy',
      date_naissance: '1990-04-12',
    });
  });

  it('refuse un nom déjà pris, sans tenir compte de la casse (409)', async () => {
    const res = await request(app)
      .post('/api/auth/inscription')
      .set('X-Forwarded-For', ipDeTest())
      .send({ ...IDENTIFIANTS, nom_utilisateur: 'ALICE' });
    expect(res.status).toBe(409);
  });

  it('refuse un email déjà utilisé (409)', async () => {
    const res = await request(app)
      .post('/api/auth/inscription')
      .set('X-Forwarded-For', ipDeTest())
      .send({
        nom_utilisateur: 'charlie',
        mot_de_passe: 'un-mot-de-passe-long',
        email: 'BOB@exemple.fr',
      });
    expect(res.status).toBe(409);
  });

  it.each([
    ['mot de passe trop court', { mot_de_passe: 'court' }],
    ['nom trop court', { nom_utilisateur: 'ab' }],
    ['nom avec espace', { nom_utilisateur: 'jean dupont' }],
    ['sexe inconnu', { sexe: 'x' }],
    ['email invalide', { email: 'pas-un-email' }],
    ['naissance future', { date_naissance: '2999-01-01' }],
    ['naissance trop ancienne', { date_naissance: '1850-01-01' }],
    ['adresse postale (champ inconnu)', { adresse: '1 rue de la Paix' }],
    ['rôle imposé (champ inconnu)', { role: 'admin' }],
  ])('refuse : %s (400)', async (_cas, champ) => {
    const res = await request(app)
      .post('/api/auth/inscription')
      .set('X-Forwarded-For', ipDeTest())
      .send({ nom_utilisateur: 'dora', mot_de_passe: 'un-mot-de-passe-long', ...champ });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/connexion', () => {
  it('connecte (nom insensible à la casse) et renvoie une session utilisable sur /moi', async () => {
    const res = await connecter({ ...IDENTIFIANTS, nom_utilisateur: ' ALICE ', appareil: 'tel' });
    expect(res.status).toBe(200);
    const { jeton, jeton_rafraichissement: jetonRafraichissement, utilisateur } = res.body.data;
    expect(jetonRafraichissement).toEqual(expect.any(String));
    expect(utilisateur.derniere_connexion).not.toBeNull();

    const moi = await request(app)
      .get('/api/moi')
      .set('X-Forwarded-For', ipDeTest())
      .set('Authorization', `Bearer ${jeton}`);
    expect(moi.status).toBe(200);
    expect(moi.body.data.nom_utilisateur).toBe('alice');

    const ligne = await db.JetonRafraichissement.findOne({ order: [['id', 'DESC']] });
    expect(ligne.appareil).toBe('tel');
    expect(ligne.jeton_hash).not.toBe(jetonRafraichissement);
  });

  it('même 401 pour un mauvais mot de passe et un nom inconnu', async () => {
    const mauvais = await connecter({ ...IDENTIFIANTS, mot_de_passe: 'pas-le-bon-mot-de-passe' });
    const inconnu = await connecter({
      nom_utilisateur: 'personne',
      mot_de_passe: 'pas-le-bon-mot-de-passe',
    });
    expect(mauvais.status).toBe(401);
    expect(inconnu.status).toBe(401);
    expect(mauvais.body).toEqual(inconnu.body);
  });
});

describe('limite de tentatives', () => {
  it('bloque la connexion après 10 essais depuis la même adresse (429)', async () => {
    const ip = ipDeTest();
    const essais = [];
    for (let i = 0; i < 11; i += 1) {
      essais.push(
        // eslint-disable-next-line no-await-in-loop
        (
          await request(app)
            .post('/api/auth/connexion')
            .set('X-Forwarded-For', ip)
            .send(IDENTIFIANTS)
        ).status,
      );
    }
    expect(essais.slice(0, 10).every((statut) => statut === 200)).toBe(true);
    expect(essais[10]).toBe(429);
  });
});

describe('POST /api/auth/rafraichir', () => {
  /** Vieillit la dernière ligne de session : révocation ou ouverture dans le passé. */
  const vieillir = (champs) =>
    db.JetonRafraichissement.update(champs, {
      where: { id: db.sequelize.literal('(SELECT MAX(id) FROM jeton_rafraichissement)') },
    });
  const ilYA = (ms) => new Date(Date.now() - ms);

  it('remplace le jeton (rotation) : l’ancien ne sert plus', async () => {
    const { jeton_rafraichissement: premier } = (await connecter()).body.data;
    const res = await rafraichir(premier);
    expect(res.status).toBe(200);
    expect(res.body.data.jeton_rafraichissement).not.toBe(premier);
    expect(res.body.data.jeton).toEqual(expect.any(String));
    expect((await rafraichir(premier)).status).toBe(401);
  });

  it('garde la date d’ouverture de la session à chaque rotation', async () => {
    const { jeton_rafraichissement: premier } = (await connecter()).body.data;
    const debut = ilYA(5 * 24 * 3600 * 1000);
    await vieillir({ debut_session: debut });
    await rafraichir(premier);
    const suite = await db.JetonRafraichissement.findOne({ order: [['id', 'DESC']] });
    expect(new Date(suite.debut_session).getTime()).toBe(debut.getTime());
  });

  it('un jeton rejoué après sa rotation ferme toutes les sessions du compte', async () => {
    const { jeton_rafraichissement: vole } = (await connecter()).body.data;
    const { jeton_rafraichissement: autreAppareil } = (await connecter()).body.data;
    const legitime = await rafraichir(vole);
    expect(legitime.status).toBe(200);
    await db.JetonRafraichissement.update(
      { revoque_le: ilYA(60 * 1000) },
      { where: { motif_revocation: 'rotation' } },
    );

    expect((await rafraichir(vole)).status).toBe(401);
    expect((await rafraichir(legitime.body.data.jeton_rafraichissement)).status).toBe(401);
    expect((await rafraichir(autreAppareil)).status).toBe(401);
  });

  it('rejoué juste après la rotation (deux onglets) : refusé, sans fermer le reste', async () => {
    const { jeton_rafraichissement: jeton } = (await connecter()).body.data;
    const premier = await rafraichir(jeton);
    expect((await rafraichir(jeton)).status).toBe(401);
    expect((await rafraichir(premier.body.data.jeton_rafraichissement)).status).toBe(200);
  });

  it('un jeton fermé par déconnexion est refusé sans fermer les autres sessions', async () => {
    const { jeton_rafraichissement: ferme } = (await connecter()).body.data;
    const { jeton_rafraichissement: autre } = (await connecter()).body.data;
    await request(app)
      .post('/api/auth/deconnexion')
      .set('X-Forwarded-For', ipDeTest())
      .send({ jeton_rafraichissement: ferme });
    await db.JetonRafraichissement.update(
      { revoque_le: ilYA(60 * 1000) },
      { where: { motif_revocation: 'deconnexion' } },
    );
    expect((await rafraichir(ferme)).status).toBe(401);
    expect((await rafraichir(autre)).status).toBe(200);
  });

  it('refuse un jeton inconnu ou expiré (401)', async () => {
    expect((await rafraichir('inconnu')).status).toBe(401);
    const { jeton_rafraichissement: jeton } = (await connecter()).body.data;
    await vieillir({ expire_le: ilYA(1000) });
    expect((await rafraichir(jeton)).status).toBe(401);
  });

  it('refuse une session ouverte depuis plus de 90 jours, même rafraîchie (401)', async () => {
    const { jeton_rafraichissement: jeton } = (await connecter()).body.data;
    await vieillir({ debut_session: ilYA(91 * 24 * 3600 * 1000) });
    expect((await rafraichir(jeton)).status).toBe(401);
  });

  it('purge les sessions expirées du compte à la connexion suivante', async () => {
    const { id } = (await connecter()).body.data.utilisateur;
    await vieillir({ expire_le: ilYA(1000) });
    const expirees = () =>
      db.JetonRafraichissement.count({
        where: { id_utilisateur: id, expire_le: { [Op.lte]: new Date() } },
      });
    expect(await expirees()).toBeGreaterThan(0);
    await connecter();
    expect(await expirees()).toBe(0);
  });

  it('refuse une session dont le compte a été supprimé entre-temps (401)', async () => {
    const { jeton_rafraichissement: jeton } = (await connecter()).body.data;
    vi.spyOn(db.Utilisateur, 'findByPk').mockResolvedValueOnce(null);
    expect((await rafraichir(jeton)).status).toBe(401);
    vi.restoreAllMocks();
  });

  it('un double appel simultané : un seul gagne, l’autre est refusé', async () => {
    const { jeton_rafraichissement: jeton } = (await connecter()).body.data;
    // Simule l'appel concurrent qui révoque la ligne entre la lecture et la mise à jour.
    vi.spyOn(db.JetonRafraichissement, 'update').mockResolvedValueOnce([0]);
    expect((await rafraichir(jeton)).status).toBe(401);
    vi.restoreAllMocks();
    expect((await rafraichir(jeton)).status).toBe(200);
  });

  it('annule la rotation si l’émission échoue : l’ancien jeton reste valable', async () => {
    const { jeton_rafraichissement: jeton } = (await connecter()).body.data;
    vi.spyOn(db.JetonRafraichissement, 'create').mockRejectedValueOnce(new Error('panne'));
    expect((await rafraichir(jeton)).status).toBe(500);
    vi.restoreAllMocks();
    expect((await rafraichir(jeton)).status).toBe(200);
  });
});

describe('POST /api/auth/deconnexion', () => {
  it('ferme la session (204) ; même réponse pour un jeton inconnu', async () => {
    const { jeton_rafraichissement: jeton } = (await connecter()).body.data;
    const res = await request(app)
      .post('/api/auth/deconnexion')
      .set('X-Forwarded-For', ipDeTest())
      .send({ jeton_rafraichissement: jeton });
    expect(res.status).toBe(204);
    expect((await rafraichir(jeton)).status).toBe(401);

    const inconnu = await request(app)
      .post('/api/auth/deconnexion')
      .set('X-Forwarded-For', ipDeTest())
      .send({ jeton_rafraichissement: 'inconnu' });
    expect(inconnu.status).toBe(204);
  });
});

describe('garde par défaut', () => {
  it('accepte le schéma « bearer » en minuscules', async () => {
    const { jeton } = (await connecter()).body.data;
    const res = await request(app)
      .get('/api/moi')
      .set('X-Forwarded-For', ipDeTest())
      .set('Authorization', `bearer ${jeton}`);
    expect(res.status).toBe(200);
  });

  it('les routes métier sont protégées', async () => {
    const res = await request(app)
      .get('/api/une-route-quelconque')
      .set('X-Forwarded-For', ipDeTest());
    expect(res.status).toBe(401);
  });

  it('publie la clé publique sur /.well-known/jwks.json', async () => {
    const res = await request(app).get('/.well-known/jwks.json').set('X-Forwarded-For', ipDeTest());
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('max-age');
    expect(res.body.keys[0]).toMatchObject({ kty: 'OKP', crv: 'Ed25519', alg: 'EdDSA' });
    expect(res.body.keys[0]).not.toHaveProperty('d');
  });
});
