/** Contrôleur `/api/moi` : toujours le compte du jeton (`req.auth.id`). */
import * as service from '../services/compte.service.js';
import { sendNoContent, sendSuccess } from '../utils/reponse.js';

export const lire = async (req, res) => sendSuccess(res, await service.lire(req.auth.id));

export const modifier = async (req, res) =>
  sendSuccess(res, await service.modifier(req.auth.id, req.valide.corps));

export const changerMotDePasse = async (req, res) => {
  await service.changerMotDePasse(req.auth.id, req.valide.corps);
  return sendNoContent(res);
};

export const deconnecterPartout = async (req, res) => {
  await service.deconnecterPartout(req.auth.id);
  return sendNoContent(res);
};

export const supprimer = async (req, res) => {
  await service.supprimer(req.auth.id, req.valide.corps);
  return sendNoContent(res);
};
