const express = require("express");
const router = express.Router();
const paymentsController = require("../controls/payments");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/role");

// ─── POST /api/payments/create-checkout-session ───────────────────────────────
// Employeur crée une session Stripe pour débloquer un profil
router.post(
  "/create-checkout-session",
  authMiddleware,
  requireRole("employer"),
  paymentsController.createCheckoutSession
);

// Employeur crée un PaymentIntent pour débloquer un profil (Stripe Elements)
router.post(
  "/create-payment-intent",
  authMiddleware,
  requireRole("employer"),
  paymentsController.createPaymentIntent
);

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Webhook Stripe — PAS de JSON parser ici (raw body requis)
// Le middleware express.raw() est appliqué dans app.js pour cette route
router.post("/webhook", paymentsController.stripeWebhook);

// ─── GET /api/payments/history ────────────────────────────────────────────────
// Historique des paiements de l'employeur connecté
router.get(
  "/history",
  authMiddleware,
  requireRole("employer", "admin"),
  paymentsController.getPaymentHistory
);

// Vérifier manuellement le statut d'un paiement (utile si webhook échoue ou local dev)
router.post(
  "/verify-payment",
  authMiddleware,
  requireRole("employer"),
  paymentsController.verifyPayment
);

module.exports = router;
