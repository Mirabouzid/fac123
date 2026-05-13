const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const AuditLog = require("../model/auditLog");
const sgMail = require("@sendgrid/mail");
const { validationResult } = require("express-validator");

require("dotenv").config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sendEmail = async (to, subject, html) => {
  // L'envoi via SendGrid est désactivé à la demande de l'utilisateur
  // pour éviter l'erreur "Maximum credits exceeded".
  console.log("📧 Email simulé (non envoyé) :");
  console.log(`- À : ${to}`);
  console.log(`- Sujet : ${subject}`);
  // Vous pouvez décommenter le code ci-dessous si vous reprenez un abonnement SendGrid :
  /*
  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_SENDER,
      subject,
      html,
    });
  } catch (err) {
    console.error("Erreur envoi email:", err?.response?.body || err.message);
  }
  */
};

const logAction = async (action, actor, targetType, targetId, targetLabel, metadata = {}, ipAddress = "") => {
  try {
    await AuditLog.create({
      action,
      actor: actor?._id || actor,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      targetType,
      targetId,
      targetLabel,
      metadata,
      ipAddress,
    });
  } catch (err) {
    console.error("Erreur audit log:", err.message);
  }
};

// ─── Signup ───────────────────────────────────────────────────────────────────

exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation échouée", errors: errors.array() });
    }

    const {
      email, password, name, role,
      firstName, lastName, phone,
      specialty, experience, city, availability,
      company, rgpdConsent,
    } = req.body;

    // Vérifier que le rôle n'est pas "admin" (créé uniquement manuellement)
    if (role === "admin") {
      return res.status(403).json({ message: "Impossible de créer un compte admin via l'inscription" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Un compte avec cet email existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userData = {
      email,
      password: hashedPassword,
      name,
      role,
    };

    if (role === "candidate") {
      if (!rgpdConsent) {
        return res.status(400).json({ message: "Le consentement RGPD est obligatoire" });
      }
      Object.assign(userData, {
        firstName, lastName, phone,
        specialty, experience, city, availability,
        rgpdConsent: true,
        rgpdConsentDate: new Date(),
        rgpdExpiresAt: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000), // ~24 mois
      });
    }

    if (role === "employer") {
      if (!rgpdConsent) {
        return res.status(400).json({ message: "Le consentement RGPD est obligatoire" });
      }
      Object.assign(userData, { 
        company,
        rgpdConsent: true,
        rgpdConsentDate: new Date(),
        rgpdExpiresAt: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000)
      });
    }

    const user = new User(userData);
    await user.save();

    // Email de bienvenue
    const welcomeHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#1e40af;font-size:24px;margin:0;">Efficience Recrute</h1>
          <p style="color:#6b7280;margin:4px 0 0;">Recrutement médical & paramédical</p>
        </div>
        <div style="background:#fff;padding:24px;border-radius:8px;border:1px solid #e5e7eb;">
          <h2 style="color:#111827;font-size:18px;">Bienvenue, ${name} ! 👋</h2>
          <p style="color:#4b5563;">Votre compte <strong>${role === "candidate" ? "Candidat" : "Cabinet/Employeur"}</strong> a bien été créé.</p>
          ${role === "candidate" ? `
          <p style="color:#4b5563;">Votre CV sera examiné par notre équipe sous <strong>48h</strong>. Vous recevrez une notification dès validation.</p>
          <div style="background:#eff6ff;padding:12px;border-radius:6px;border-left:4px solid #3b82f6;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#1e40af;"><strong>📋 RGPD :</strong> Vos données sont conservées 24 mois conformément à votre consentement.</p>
          </div>
          ` : `
          <p style="color:#4b5563;">Vous pouvez dès maintenant déposer vos annonces. Chaque offre sera validée par notre équipe sous <strong>24-48h</strong>.</p>
          `}
          <a href="${FRONTEND_URL}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:12px;">
            Accéder à mon espace
          </a>
        </div>
        <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px;">
          Efficience Recrute — contact@efficience-recrute.fr — Conformité RGPD garantie
        </p>
      </div>
    `;
    await sendEmail(email, "Bienvenue sur Efficience Recrute !", welcomeHtml);

    await logAction("USER_REGISTERED", user, "User", user._id, `${name} (${role})`, { role }, req.ip);

    res.status(201).json({ message: "Compte créé avec succès", user: user.toJSON() });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation échouée", errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    if (user.isAnonymized) {
      return res.status(401).json({ message: "Ce compte a été anonymisé (RGPD)" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    await logAction("USER_LOGIN", user, "User", user._id, user.email, {}, req.ip);

    res.json({ message: "Connexion réussie", token, user: user.toJSON() });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────

exports.updateProfile = async (req, res) => {
  try {
    const forbidden = ["password", "email", "role", "rgpdConsent", "isAnonymized", "aiScore"];
    const updates = { ...req.body };
    forbidden.forEach((f) => delete updates[f]);

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    res.json({ message: "Profil mis à jour", user: user.toJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requis" });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Toujours répondre OK pour éviter l'énumération d'emails
    if (!user) {
      return res.json({ message: "Si ce compte existe, un email a été envoyé." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiration = Date.now() + 3600000; // 1h
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
        <h2 style="color:#1e40af;">Réinitialisation du mot de passe</h2>
        <p>Vous avez demandé une réinitialisation de votre mot de passe.</p>
        <p>Ce lien est valable <strong>1 heure</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          Réinitialiser mon mot de passe
        </a>
        <p style="font-size:12px;color:#9ca3af;margin-top:16px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `;
    await sendEmail(email, "Réinitialisation de mot de passe — Efficience Recrute", html);

    res.json({ message: "Si ce compte existe, un email a été envoyé." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token et mot de passe requis" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Token invalide ou expiré" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    await logAction("PASSWORD_RESET", user, "User", user._id, user.email, {}, req.ip);

    res.json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
