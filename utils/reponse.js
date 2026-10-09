/**
 * Format JSON unique des réponses (mêmes formes que `@menergies/standard26/response`).
 *
 * Succès     : { data }
 * Paginé     : { data: [...], pagination: { total, page, size, totalPages } }
 * Erreur     : { message, code?, details? }  — `details` jamais émis en production
 *
 * Les contrôleurs n'appellent jamais `res.json` directement : toujours ces fonctions.
 */

export const sendSuccess = (res, data, status = 200) => res.status(status).json({ data });

export const sendCreated = (res, data) => sendSuccess(res, data, 201);

export const sendNoContent = (res) => res.status(204).end();

export const sendPaginated = (res, rows, { total, page, size }) =>
  res.status(200).json({
    data: rows,
    pagination: { total, page, size, totalPages: Math.ceil(total / size) },
  });

export const sendError = (res, message, status = 500, { code, details } = {}) => {
  const corps = { message };
  if (code) corps.code = code;
  if (details !== undefined && process.env.NODE_ENV !== 'production') corps.details = details;
  return res.status(status).json(corps);
};

export const sendNotFound = (res, message = 'Ressource introuvable.') =>
  sendError(res, message, 404, { code: 'INTROUVABLE' });
