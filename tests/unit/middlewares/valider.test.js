import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validerCorps, validerParams, validerQuery } from '../../../middlewares/valider.js';

const fauxRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe('middlewares/valider', () => {
  const schema = z.strictObject({ titre: z.string().min(1) });

  it('écrit le corps validé dans req.valide.corps sans toucher req.body', () => {
    const req = { body: { titre: 'A' } };
    const next = vi.fn();
    validerCorps(schema)(req, fauxRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.valide.corps).toEqual({ titre: 'A' });
  });

  it('rejette une clé inconnue en 400 sans appeler next', () => {
    const res = fauxRes();
    const next = vi.fn();
    validerCorps(schema)({ body: { titre: 'A', admin: true } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].code).toBe('REQUETE_INVALIDE');
  });

  it('cumule params et query', () => {
    const req = { params: { id: '4' }, query: { q: 'x' } };
    validerParams(z.object({ id: z.coerce.number() }))(req, fauxRes(), vi.fn());
    validerQuery(z.object({ q: z.string() }))(req, fauxRes(), vi.fn());
    expect(req.valide).toEqual({ params: { id: 4 }, query: { q: 'x' } });
  });
});
