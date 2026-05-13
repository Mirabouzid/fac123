const Job = require("../model/job");
const Application = require("../model/application");
const User = require("../model/user");
const AuditLog = require("../model/auditLog");
const Payment = require("../model/payment");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const logAction = async (action, req, targetType, targetId, targetLabel, metadata = {}) => {
  try {
    await AuditLog.create({
      action,
      actor: req.userId,
      actorEmail: req.userEmail,
      actorRole: req.userRole,
      targetType,
      targetId,
      targetLabel,
      metadata,
      ipAddress: req.ip,
    });
  } catch (err) {
    console.error("AuditLog error:", err.message);
  }
};

const sendEmail = async (to, subject, html) => {
  try {
    await sgMail.send({ to, from: process.env.SENDGRID_SENDER, subject, html });
  } catch (err) {
    console.error("Email error:", err?.response?.body || err.message);
  }
};

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      pendingOffers,
      activeOffers,
      pendingCandidates,
      qualifiedCandidates,
      totalPayments,
      rgpdAlerts,
    ] = await Promise.all([
      Job.countDocuments({ isValidated: false, status: "open" }),
      Job.countDocuments({ isValidated: true, status: "open" }),
      Application.countDocuments({ status: "received" }),
      Application.countDocuments({ status: "qualified" }),
      Payment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Application.countDocuments({ rgpdExpiresAt: { $lt: new Date() }, status: { $ne: "archived" } }),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const paymentsToday = await Payment.aggregate([
      { $match: { status: "paid", paidAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      stats: {
        pendingOffers,
        activeOffers,
        pendingCandidates,
        qualifiedCandidates,
        totalPayments: totalPayments[0]?.total || 0,
        paymentsToday: paymentsToday[0]?.total || 0,
        rgpdAlerts,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── GET /api/admin/pending-offers ───────────────────────────────────────────

exports.getPendingOffers = async (req, res) => {
  try {
    const offers = await Job.find({ isValidated: false, status: "open" })
      .populate("employer", "name company email")
      .sort({ createdAt: -1 });
    res.json({ offers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── POST /api/admin/validate-offer/:id ──────────────────────────────────────

exports.validateOffer = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("employer", "email name");
    if (!job) return res.status(404).json({ message: "Offre introuvable" });

    job.isValidated = true;
    job.validatedAt = new Date();
    job.validatedBy = req.userId;
    job.pipelineStage = "active";
    await job.save();

    // Notifier l'employeur
    if (job.employer?.email) {
      await sendEmail(
        job.employer.email,
        "✅ Votre offre a été validée — Efficience Recrute",
        `<p>Bonjour ${job.employer.name},</p><p>Votre offre <strong>${job.title}</strong> vient d'être validée et est maintenant visible sur notre plateforme.</p>`
      );
    }

    await logAction("JOB_VALIDATED", req, "Job", job._id, `${job.title} — ${job.cabinet}`);
    res.json({ message: "Offre validée et publiée", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── POST /api/admin/reject-offer/:id ────────────────────────────────────────

exports.rejectOffer = async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await Job.findById(req.params.id).populate("employer", "email name");
    if (!job) return res.status(404).json({ message: "Offre introuvable" });

    job.rejectedAt = new Date();
    job.rejectionReason = reason || "Non conforme";
    job.status = "closed";
    await job.save();

    if (job.employer?.email) {
      await sendEmail(
        job.employer.email,
        "❌ Votre offre n'a pas été validée — Efficience Recrute",
        `<p>Bonjour ${job.employer.name},</p><p>Votre offre <strong>${job.title}</strong> n'a pas été validée.</p><p><strong>Motif :</strong> ${reason || "Non conforme"}</p><p>Vous pouvez soumettre une nouvelle offre corrigée.</p>`
      );
    }

    await logAction("JOB_REJECTED", req, "Job", job._id, job.title, { reason });
    res.json({ message: "Offre refusée", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── GET /api/admin/pending-applications ─────────────────────────────────────

exports.getPendingApplications = async (req, res) => {
  try {
    const applications = await Application.find({ status: "received" })
      .populate("job", "title cabinet location")
      .sort({ createdAt: -1 });
    res.json({ applications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── POST /api/admin/qualify/:id ─────────────────────────────────────────────

exports.qualifyCandidate = async (req, res) => {
  try {
    const { note } = req.body;
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Candidature introuvable" });

    application.status = "qualified";
    application.statusHistory.push({
      status: "qualified",
      changedBy: req.userId,
      changedAt: new Date(),
      note: note || "Qualifié par l'équipe Efficience",
    });
    await application.save();

    await sendEmail(
      application.email,
      "🎉 Votre candidature est qualifiée — Efficience Recrute",
      `<div style="font-family:Arial,sans-serif;padding:24px;"><h2 style="color:#1e40af;">Bonne nouvelle, ${application.firstName} !</h2><p>Votre candidature pour le poste de <strong>${application.specialty}</strong> a été <strong>qualifiée</strong> par notre équipe.</p><p>Nous travaillons activement à vous mettre en relation avec des employeurs correspondant à votre profil.</p></div>`
    );

    await logAction("CANDIDATE_QUALIFIED", req, "Application", application._id,
      `${application.firstName} ${application.lastName} — ${application.specialty}`, { note });

    res.json({ message: "Candidat qualifié", application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── POST /api/admin/archive/:id ─────────────────────────────────────────────

exports.archiveCandidate = async (req, res) => {
  try {
    const { note } = req.body;
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Candidature introuvable" });

    application.status = "archived";
    application.statusHistory.push({
      status: "archived",
      changedBy: req.userId,
      changedAt: new Date(),
      note: note || "Archivé",
    });
    await application.save();

    await logAction("CANDIDATE_ARCHIVED", req, "Application", application._id,
      `${application.firstName} ${application.lastName}`, { note });

    res.json({ message: "Candidature archivée", application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── GET /api/admin/rgpd-alerts ──────────────────────────────────────────────

exports.getRgpdAlerts = async (req, res) => {
  try {
    const expired = await Application.find({
      rgpdExpiresAt: { $lt: new Date() },
      status: { $ne: "archived" },
    }).select("firstName lastName email specialty createdAt rgpdExpiresAt");

    const expiringSoon = await Application.find({
      rgpdExpiresAt: {
        $gt: new Date(),
        $lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // dans 30 jours
      },
    }).select("firstName lastName email specialty rgpdExpiresAt");

    res.json({
      expired,
      expiringSoon,
      totalExpired: expired.length,
      totalExpiringSoon: expiringSoon.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── POST /api/admin/anonymize-all-expired ───────────────────────────────────

exports.anonymizeExpired = async (req, res) => {
  try {
    const expired = await Application.find({
      rgpdExpiresAt: { $lt: new Date() },
      status: { $ne: "archived" },
    });

    let count = 0;
    for (const app of expired) {
      app.firstName = "Anonymisé";
      app.lastName = "RGPD";
      app.email = `anonyme_${app._id}@rgpd.local`;
      app.phone = "00 00 00 00 00";
      app.cvFile = null;
      app.coverLetter = null;
      app.status = "archived";
      await app.save();
      count++;
    }

    await logAction("RGPD_BATCH_ANONYMIZED", req, "System", null,
      `${count} profils anonymisés`, { count });

    res.json({ message: `${count} profil(s) anonymisé(s) avec succès` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── GET /api/admin/audit-log ─────────────────────────────────────────────────

exports.getAuditLog = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, targetType } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── GET /api/admin/payments ──────────────────────────────────────────────────

exports.getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("employer", "name company email")
        .populate("application", "firstName lastName specialty")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(filter),
    ]);

    res.json({ payments, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

exports.getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    res.json({ users: users.map((u) => u.toJSON()), total, page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── POST /api/admin/create-admin ─────────────────────────────────────────────

exports.createAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: "Email, mot de passe et nom sont requis" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Un compte avec cet email existe déjà" });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 12);

    const adminUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: "admin",
    });

    await adminUser.save();

    await logAction("ADMIN_CREATED", req, "User", adminUser._id, `${name} (Admin)`);

    res.status(201).json({ message: "Compte administrateur créé avec succès", user: adminUser.toJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
