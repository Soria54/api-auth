/** Propage l'erreur d'un handler async au gestionnaire terminal (pas de try/catch répétés). */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
