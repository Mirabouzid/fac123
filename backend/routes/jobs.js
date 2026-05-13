const express = require("express");
const { check } = require("express-validator");
const router = express.Router();
const jobsController = require("../controls/jobs");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/role");
const { uploadJobFile, handleMulterError } = require("../util/upload");

// ─── Public ───────────────────────────────────────────────────────────────────
// GET /api/jobs?position=&city=&urgency=&page=&limit=
router.get("/", jobsController.getJobs);
router.get("/:id", jobsController.getJob);

// ─── Employeur : ses propres offres ──────────────────────────────────────────
// GET /api/jobs/employer/my-jobs
router.get(
  "/employer/my-jobs",
  authMiddleware,
  requireRole("employer", "admin"),
  jobsController.getMyJobs
);

router.get(
  "/employer/stats",
  authMiddleware,
  requireRole("employer", "admin"),
  jobsController.getEmployerStats
);

// ─── Employeur : créer une offre (avec fichier optionnel) ─────────────────────
// POST /api/jobs
router.post(
  "/",
  authMiddleware,
  requireRole("employer"),
  uploadJobFile,
  handleMulterError,
  [
    check("title").notEmpty().withMessage("Le titre est requis"),
    check("cabinet").notEmpty().withMessage("Le nom du cabinet est requis"),
    check("description").notEmpty().withMessage("La description est requise"),
    check("location").notEmpty().withMessage("La ville est requise"),
    check("contactEmail").isEmail().withMessage("Email de contact invalide"),
  ],
  jobsController.createJob
);

// ─── Modifier une offre ───────────────────────────────────────────────────────
// PUT /api/jobs/:id
router.put("/:id", authMiddleware, requireRole("employer", "admin"), jobsController.updateJob);

// ─── Modifier le stage pipeline ───────────────────────────────────────────────
// PUT /api/jobs/:id/pipeline
router.put(
  "/:id/pipeline",
  authMiddleware,
  requireRole("employer", "admin"),
  jobsController.updatePipelineStage
);

// ─── Supprimer une offre ──────────────────────────────────────────────────────
// DELETE /api/jobs/:id
router.delete("/:id", authMiddleware, requireRole("employer", "admin"), jobsController.deleteJob);

module.exports = router;
