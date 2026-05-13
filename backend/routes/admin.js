const express = require("express");
const router = express.Router();
const adminController = require("../controls/admin");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/role");

// Toutes les routes admin nécessitent authentification + rôle admin
router.use(authMiddleware, requireRole("admin"));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/stats", adminController.getDashboardStats);

// ─── Gestion des offres ───────────────────────────────────────────────────────
router.get("/pending-offers", adminController.getPendingOffers);
router.post("/validate-offer/:id", adminController.validateOffer);
router.post("/reject-offer/:id", adminController.rejectOffer);

// ─── Gestion des candidatures ─────────────────────────────────────────────────
router.get("/pending-applications", adminController.getPendingApplications);
router.post("/qualify/:id", adminController.qualifyCandidate);
router.post("/archive/:id", adminController.archiveCandidate);

// ─── RGPD ─────────────────────────────────────────────────────────────────────
router.get("/rgpd-alerts", adminController.getRgpdAlerts);
router.post("/anonymize-all-expired", adminController.anonymizeExpired);

// ─── Journal d'audit ──────────────────────────────────────────────────────────
router.get("/audit-log", adminController.getAuditLog);

// ─── Paiements ────────────────────────────────────────────────────────────────
router.get("/payments", adminController.getPayments);

// ─── Utilisateurs ─────────────────────────────────────────────────────────────
router.get("/users", adminController.getUsers);
router.post("/create-admin", adminController.createAdmin);

module.exports = router;
