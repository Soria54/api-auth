import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  sendCreated,
  sendError,
  sendNoContent,
  sendNotFound,
  sendPaginated,
  sendSuccess,
} from '../../../utils/reponse.js';

const fauxRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.end = vi.fn(() => res);
  return res;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('utils/reponse', () => {
  it('sendSuccess enveloppe dans { data }', () => {
    const res = fauxRes();
    sendSuccess(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { id: 1 } });
  });

  it('sendCreated répond 201', () => {
    const res = fauxRes();
    sendCreated(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('sendNoContent répond 204 sans corps', () => {
    const res = fauxRes();
    sendNoContent(res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('sendPaginated calcule totalPages', () => {
    const res = fauxRes();
    sendPaginated(res, [1, 2], { total: 41, page: 2, size: 20 });
    expect(res.json).toHaveBeenCalledWith({
      data: [1, 2],
      pagination: { total: 41, page: 2, size: 20, totalPages: 3 },
    });
  });

  it('sendError masque details en production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = fauxRes();
    sendError(res, 'Requête invalide.', 400, { code: 'X', details: [{ champ: 'a' }] });
    expect(res.json).toHaveBeenCalledWith({ message: 'Requête invalide.', code: 'X' });
  });

  it('sendError transmet details hors production', () => {
    const res = fauxRes();
    sendError(res, 'Requête invalide.', 400, { details: [{ champ: 'a' }] });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Requête invalide.',
      details: [{ champ: 'a' }],
    });
  });

  it('sendNotFound répond 404', () => {
    const res = fauxRes();
    sendNotFound(res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
