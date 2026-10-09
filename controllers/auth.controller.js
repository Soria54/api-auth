/** Contrôleur `/api/auth`. */
import * as service from '../services/auth.service.js';
import { sendCreated, sendSuccess } from '../utils/reponse.js';

export const inscrire = async (req, res) =>
  sendCreated(res, await service.inscrire(req.valide.corps));

export const connecter = async (req, res) =>
  sendSuccess(res, await service.connecter(req.valide.corps));

export const moi = async (req, res) => sendSuccess(res, await service.moi(req.auth.id));
