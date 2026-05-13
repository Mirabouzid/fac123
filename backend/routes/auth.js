const express = require("express");
const { check, body } = require("express-validator");
const router = express.Router();
const authController = require("../controls/auth");

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

router.post(
  "/signup",
  [
    check("email").isEmail().withMessage("Email invalide").normalizeEmail(),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Le mot de passe doit contenir au moins 6 caractères"),
    check("name").notEmpty().withMessage("Le nom est requis"),
    check("role")
      .isIn(["candidate", "employer"])
      .withMessage("Rôle invalide (candidate ou employer)"),
  ],
  authController.signup
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
    body("password").notEmpty().withMessage("Le mot de passe est requis"),
  ],
  authController.login
);

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Email invalide").normalizeEmail()],
  authController.forgotPassword
);

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token requis"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Mot de passe trop court"),
  ],
  authController.resetPassword
);

module.exports = router;
