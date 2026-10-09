/**
 * Logger Winston unique (motif `initLogger` des API du travail).
 * JSON en production (lisible par la plateforme d'hébergement), coloré en local.
 * Jamais de `console.log` dans le code applicatif.
 */
import winston from 'winston';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const formatLocal = printf(({ level, message, timestamp: horodatage, ...meta }) => {
  const details = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${horodatage} ${level} ${message}${details}`;
});

const niveauParDefaut = () => {
  if (process.env.NODE_ENV === 'test') return 'error';
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || niveauParDefaut(),
  format:
    process.env.NODE_ENV === 'production'
      ? combine(errors({ stack: true }), timestamp(), json())
      : combine(
          errors({ stack: true }),
          colorize(),
          timestamp({ format: 'HH:mm:ss' }),
          formatLocal,
        ),
  transports: [new winston.transports.Console()],
});

/**
 * Journalise chaque requête à la fin de sa réponse.
 * Le chemin est journalisé SANS la query string : un email ou un jeton passé en
 * paramètre ne doit jamais finir dans les logs.
 */
export const httpLogger = (req, res, next) => {
  const debut = process.hrtime.bigint();
  res.on('finish', () => {
    const dureeMs = Number(process.hrtime.bigint() - debut) / 1e6;
    const niveau = res.statusCode >= 500 ? 'error' : 'info';
    logger.log(niveau, `${req.method} ${req.path} ${res.statusCode}`, {
      dureeMs: Math.round(dureeMs),
    });
  });
  next();
};

export default logger;
