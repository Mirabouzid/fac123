/**
 * Middleware de vérification des rôles.
 * Usage: router.get('/route', authMiddleware, requireRole('admin'), handler)
 * Ou multi-rôles: requireRole('admin', 'employer')
 */
module.exports = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        message: `Accès interdit. Rôle requis: ${roles.join(" ou ")}`,
      });
    }
    next();
  };
};
