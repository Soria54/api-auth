/** Contrôleur `/api/auth`. */
import * as service from '../services/auth.service.js';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/reponse.js';

export const inscrire = async (req, res) =>
  sendCreated(res, await service.inscrire(req.valide.corps));

export const connecter = async (req, res) =>
  sendSuccess(res, await service.connecter(req.valide.corps));

export const rafraichir = async (req, res) =>
  sendSuccess(res, await service.rafraichir(req.valide.corps));

export const deconnecter = async (req, res) => {
  await service.deconnecter(req.valide.corps);
  return sendNoContent(res);
};
