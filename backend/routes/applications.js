const express = require("express");
const router = express.Router();
const applicationsController = require("../controls/applications");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/role");
const { uploadCV, handleMulterError } = require("../util/upload");

// ─── Lister les candidatures (selon le rôle) ──────────────────────────────────
// GET /api/applications?status=&specialty=&city=
router.get("/", authMiddleware, applicationsController.getApplications);

router.get(
  "/candidate/stats",
  authMiddleware,
  requireRole("candidate"),
  applicationsController.getCandidateStats
);

// ─── Candidat : déposer une candidature (avec CV obligatoire) ─────────────────
// POST /api/applications (multipart/form-data)
router.post(
  "/",
  authMiddleware,
  requireRole("candidate"),
  uploadCV,
  handleMulterError,
  applicationsController.createApplication
);

// ─── Mettre à jour le statut (admin) ─────────────────────────────────────────
// PUT /api/applications/:id
router.put(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  applicationsController.updateApplication
);

// ─── Anonymiser un profil (admin, RGPD) ──────────────────────────────────────
// DELETE /api/applications/:id/anonymize
router.delete(
  "/:id/anonymize",
  authMiddleware,
  requireRole("admin"),
  applicationsController.anonymizeApplication
);

// ─── Mettre à jour le stage pipeline (employeur) ─────────────────────────────
// PUT /api/applications/:id/pipeline
router.put(
  "/:id/pipeline",
  authMiddleware,
  requireRole("employer"),
  applicationsController.updateEmployerStage
);

module.exports = router;
