import { describe, expect, it, vi } from 'vitest';
import { gestionnaireErreurs } from '../../../middlewares/gestionErreurs.js';
import { AppError, erreurs } from '../../../utils/erreurs.js';

const fauxRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const traiter = (err) => {
  const res = fauxRes();
  gestionnaireErreurs(err, { method: 'GET', path: '/x' }, res, vi.fn());
  return { status: res.status.mock.calls[0][0], corps: res.json.mock.calls[0][0] };
};

describe('middlewares/gestionErreurs', () => {
  it('une AppError garde son statut et son message', () => {
    expect(traiter(erreurs.introuvable('Tâche introuvable.'))).toEqual({
      status: 404,
      corps: { message: 'Tâche introuvable.', code: 'INTROUVABLE' },
    });
  });

  it('les fabriques couvrent 400, 401, 403, 409', () => {
    expect(traiter(erreurs.requeteInvalide()).status).toBe(400);
    expect(traiter(erreurs.nonAuthentifie()).status).toBe(401);
    expect(traiter(erreurs.interdit()).status).toBe(403);
    expect(traiter(erreurs.conflit()).status).toBe(409);
  });

  it('une AppError 5xx est journalisée et renvoyée', () => {
    expect(traiter(new AppError('Service indisponible.', 503, 'INDISPONIBLE')).status).toBe(503);
  });

  it('une contrainte unique devient 409', () => {
    expect(traiter({ name: 'SequelizeUniqueConstraintError' }).status).toBe(409);
  });

  it('une clé étrangère devient 409', () => {
    expect(traiter({ name: 'SequelizeForeignKeyConstraintError' }).corps.code).toBe('CONTRAINTE');
  });

  it('une validation Sequelize devient 400 avec les champs', () => {
    const { status, corps } = traiter({
      name: 'SequelizeValidationError',
      errors: [{ path: 'titre', validatorKey: 'notNull' }],
    });
    expect(status).toBe(400);
    expect(corps.details).toEqual([{ champ: 'titre', code: 'notNull' }]);
  });

  it('un corps trop volumineux devient 413', () => {
    expect(traiter({ type: 'entity.too.large' }).status).toBe(413);
  });

  it('une erreur inconnue devient 500 générique, sans le message d’origine', () => {
    const { status, corps } = traiter(new Error('SELECT * FROM secret échoue'));
    expect(status).toBe(500);
    expect(corps).toEqual({ message: 'Erreur interne.', code: 'ERREUR_INTERNE' });
  });
});
