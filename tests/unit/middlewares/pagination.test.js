import { describe, expect, it, vi } from 'vitest';
import { pagination } from '../../../middlewares/pagination.js';
import { PAGINATION_TAILLE_DEFAUT, PAGINATION_TAILLE_MAX } from '../../../config/constantes.js';

const appliquer = (query) => {
  const req = { query };
  const next = vi.fn();
  pagination(req, {}, next);
  expect(next).toHaveBeenCalled();
  return req.pagination;
};

describe('middlewares/pagination', () => {
  it('valeurs par défaut', () => {
    expect(appliquer({})).toEqual({
      page: 1,
      size: PAGINATION_TAILLE_DEFAUT,
      limit: PAGINATION_TAILLE_DEFAUT,
      offset: 0,
    });
  });

  it('calcule le décalage', () => {
    expect(appliquer({ page: '3', size: '10' })).toMatchObject({ offset: 20, limit: 10 });
  });

  it('borne la taille au maximum', () => {
    expect(appliquer({ size: '5000' }).size).toBe(PAGINATION_TAILLE_MAX);
  });

  it('ignore les valeurs invalides', () => {
    expect(appliquer({ page: '-2', size: 'abc' })).toMatchObject({
      page: 1,
      size: PAGINATION_TAILLE_DEFAUT,
    });
  });
});
