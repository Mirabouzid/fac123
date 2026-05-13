const Application = require("../model/application");
const Job = require("../model/job");
const User = require("../model/user");
const AuditLog = require("../model/auditLog");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ─── Helper: Audit Log ────────────────────────────────────────────────────────

const logAction = async (
  action,
  req,
  targetType,
  targetId,
  targetLabel,
  metadata = {},
) => {
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

// ─── Helper: Masquer les coordonnées si non débloqué ─────────────────────────

const maskApplication = (app, employerId) => {
  const obj = app.toObject ? app.toObject() : { ...app };
  const isUnlocked = obj.unlockedBy?.some(
    (id) => id.toString() === employerId?.toString(),
  );
  if (!isUnlocked) {
    // Masquer email et téléphone
    if (obj.email) obj.email = obj.email.replace(/^(.).*@/, "$1***@");
    if (obj.phone)
      obj.phone = obj.phone.replace(/^(\d{2}).*(\d{2})$/, "$1 ** ** ** $2");
    if (obj.cvFile) obj.cvFile = null; // ne pas exposer le chemin CV
  }
  return { ...obj, isUnlocked };
};

// ─── GET /api/applications ────────────────────────────────────────────────────

exports.getApplications = async (req, res) => {
  try {
    let applications;

    if (req.userRole === "candidate") {
      // Le candidat voit ses propres candidatures
      applications = await Application.find({ candidate: req.userId })
        .populate("job", "title cabinet location urgency")
        .sort({ createdAt: -1 });
      return res.json({ applications });
    }

    if (req.userRole === "employer") {
      const { status, specialty, city, global } = req.query;
      let filter;

      if (global === "true") {
        // Mode Recherche Globale : l'employeur voit tous les candidats qualifiés (masqués)
        filter = { status: "qualified" };
      } else {
        // Mode Pipeline : l'employeur voit les candidatures liées à ses propres offres
        const jobs = await Job.find({ employer: req.userId }).select("_id");
        const jobIds = jobs.map((j) => j._id);
        filter = { job: { $in: jobIds } };
        if (status) filter.status = status;
      }

      if (specialty) filter.specialty = specialty;
      if (city) filter.city = { $regex: city, $options: "i" };

      const apps = await Application.find(filter)
        .populate("job", "title cabinet location")
        .sort({ createdAt: -1 });

      // Masquer les coordonnées si non débloqué
      applications = apps.map((app) => maskApplication(app, req.userId));
      return res.json({ applications });
    }

    if (req.userRole === "admin") {
      // L'admin voit tout sans masquage
      const { status, specialty } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (specialty) filter.specialty = specialty;

      console.log("🔍 Admin récupère candidatures avec filtre:", filter);
      applications = await Application.find(filter)
        .populate("job", "title cabinet location employer")
        .populate("candidate", "name email")
        .sort({ createdAt: -1 });
      console.log("📊 Nombre de candidatures trouvées:", applications.length);
      return res.json({ applications });
    }

    return res.status(403).json({ message: "Non autorisé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── POST /api/applications — Déposer une candidature (multipart) ─────────────

exports.createApplication = async (req, res) => {
  try {
    console.log("📝 Nouvelle candidature reçue");
    console.log("Utilisateur:", req.userId, req.userRole);
    console.log("Fichier CV:", req.file ? req.file.filename : "AUCUN FICHIER");
    console.log("Body:", req.body);

    if (req.userRole !== "candidate") {
      return res
        .status(403)
        .json({ message: "Seuls les candidats peuvent postuler" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Le CV est obligatoire" });
    }

    const {
      jobId,
      firstName,
      lastName,
      email,
      phone,
      specialty,
      experience,
      city,
      availability,
      coverLetter,
      rgpdConsent,
    } = req.body;

    if (!rgpdConsent || rgpdConsent === "false") {
      return res
        .status(400)
        .json({ message: "Le consentement RGPD est obligatoire" });
    }

    // Vérifier candidature déjà existante
    if (jobId) {
      const existing = await Application.findOne({
        job: jobId,
        candidate: req.userId,
      });
      if (existing) {
        return res
          .status(400)
          .json({ message: "Vous avez déjà postulé à cette offre" });
      }
    }

    // Score IA simulé basé sur l'expérience
    const scoreMap = {
      "Debutant (0-2 ans)": Math.floor(Math.random() * 20) + 60,
      "Junior (2-5 ans)": Math.floor(Math.random() * 15) + 68,
      "Confirme (5-10 ans)": Math.floor(Math.random() * 15) + 75,
      "Senior (10+ ans)": Math.floor(Math.random() * 10) + 85,
    };
    const aiScore = scoreMap[experience] || Math.floor(Math.random() * 30) + 60;

    const consentDate = new Date();
    const expiresAt = new Date(consentDate);
    expiresAt.setMonth(expiresAt.getMonth() + 24);

    const application = new Application({
      job: jobId || null,
      candidate: req.userId,
      firstName,
      lastName,
      email,
      phone,
      specialty,
      experience,
      city,
      availability,
      coverLetter,
      cvFile: req.file.filename,
      rgpdConsent: true,
      rgpdConsentDate: consentDate,
      rgpdExpiresAt: expiresAt,
      aiScore,
      status: "received",
      statusHistory: [{ status: "received", note: "Candidature reçue" }],
    });

    await application.save();
    console.log(
      "✅ Candidature sauvegardée avec ID:",
      application._id,
      "Statut:",
      application.status,
      "Job:",
      jobId || "Spontanée",
    );

    // Email de confirmation au candidat
    const confirmHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
        <h1 style="color:#1e40af;text-align:center;">Efficience Recrute</h1>
        <div style="background:#fff;padding:24px;border-radius:8px;border:1px solid #e5e7eb;">
          <h2 style="color:#111827;">✅ Candidature reçue !</h2>
          <p>Bonjour <strong>${firstName} ${lastName}</strong>,</p>
          <p>Nous avons bien reçu votre candidature pour le poste de <strong>${specialty}</strong>.</p>
          <div style="background:#eff6ff;padding:16px;border-radius:8px;margin:16px 0;">
            <h3 style="margin:0 0 8px;color:#1e40af;font-size:14px;">📊 Suivi de votre candidature</h3>
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="background:#1e40af;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">✓ Reçue</span>
              <span style="color:#9ca3af;">→</span>
              <span style="background:#e5e7eb;color:#6b7280;padding:4px 12px;border-radius:20px;font-size:12px;">En validation</span>
              <span style="color:#9ca3af;">→</span>
              <span style="background:#e5e7eb;color:#6b7280;padding:4px 12px;border-radius:20px;font-size:12px;">Qualifiée</span>
            </div>
          </div>
          <p style="color:#4b5563;font-size:14px;">Notre équipe examinera votre profil sous <strong>48h</strong>. Une validation humaine est effectuée à chaque étape.</p>
          <div style="background:#fef2f2;padding:12px;border-radius:6px;border-left:4px solid #ef4444;margin-top:16px;">
            <p style="margin:0;font-size:12px;color:#7f1d1d;"><strong>🔒 RGPD :</strong> Vos données sont conservées 24 mois (jusqu'au ${expiresAt.toLocaleDateString("fr-FR")}).</p>
          </div>
        </div>
      </div>
    `;
    await sendEmail(
      email,
      "Candidature reçue — Efficience Recrute",
      confirmHtml,
    );

    await logAction(
      "APPLICATION_SUBMITTED",
      req,
      "Application",
      application._id,
      `${firstName} ${lastName} — ${specialty}`,
      { city, experience, aiScore },
    );

    res
      .status(201)
      .json({ message: "Candidature soumise avec succès", application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── PUT /api/applications/:id — Mettre à jour le statut ─────────────────────

exports.updateApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application)
      return res.status(404).json({ message: "Candidature introuvable" });

    const { status, note } = req.body;
    const validStatuses = ["received", "validating", "qualified", "archived"];

    // Vérification des droits
    if (req.userRole === "employer") {
      // L'employeur peut uniquement modifier le stage pipeline (via la route pipeline)
      return res.status(403).json({
        message: "Utilisez le pipeline pour modifier les candidatures",
      });
    }

    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Non autorisé" });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    if (status && status !== application.status) {
      application.statusHistory.push({
        status,
        changedBy: req.userId,
        changedAt: new Date(),
        note: note || "",
      });
      application.status = status;

      // Email de notification au candidat si qualifié
      if (status === "qualified") {
        const candidate = await User.findById(application.candidate);
        if (candidate) {
          await sendEmail(
            application.email,
            "🎉 Bonne nouvelle — Votre candidature est qualifiée !",
            `<p>Bonjour ${application.firstName},</p><p>Votre candidature pour <strong>${application.specialty}</strong> a été <strong>qualifiée</strong> par notre équipe. Nous travaillons à vous mettre en relation avec des employeurs correspondant à votre profil.</p>`,
          );
        }
      }
    }

    await application.save();
    await logAction(
      "APPLICATION_STATUS_CHANGED",
      req,
      "Application",
      application._id,
      `${application.firstName} ${application.lastName}`,
      { newStatus: status, note },
    );

    res.json({ message: "Candidature mise à jour", application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── PUT /api/applications/:id/pipeline — Mettre à jour le stage employeur ────

exports.updateEmployerStage = async (req, res) => {
  try {
    const { stage } = req.body;
    const validStages = [
      "validating",
      "active",
      "sourcing",
      "interview",
      "closed",
    ];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: "Stage invalide" });
    }

    const application = await Application.findById(req.params.id);
    if (!application)
      return res.status(404).json({ message: "Candidature introuvable" });

    // Vérifier que l'employeur possède bien l'offre liée à cette candidature
    if (req.userRole !== "admin") {
      const job = await Job.findById(application.job);
      if (!job || job.employer.toString() !== req.userId) {
        return res.status(403).json({ message: "Non autorisé" });
      }
    }

    const oldStage = application.employerStage;
    application.employerStage = stage;
    await application.save();

    await logAction(
      "APPLICATION_STAGE_CHANGED",
      req,
      "Application",
      application._id,
      `${application.firstName} ${application.lastName}`,
      { from: oldStage, to: stage },
    );

    res.json({ message: "Stage mis à jour", application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── DELETE /api/applications/:id/anonymize — Anonymisation RGPD ──────────────

exports.anonymizeApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application)
      return res.status(404).json({ message: "Candidature introuvable" });

    // Anonymiser les données personnelles
    application.firstName = "Anonymisé";
    application.lastName = "RGPD";
    application.email = `anonyme_${application._id}@rgpd.local`;
    application.phone = "00 00 00 00 00";
    application.cvFile = null;
    application.coverLetter = null;
    application.status = "archived";

    await application.save();

    // Anonymiser aussi le compte utilisateur si c'est une candidature d'un compte
    if (application.candidate) {
      await User.findByIdAndUpdate(application.candidate, {
        isAnonymized: true,
        firstName: "Anonymisé",
        lastName: "RGPD",
        phone: null,
        cvFile: null,
      });
    }

    await logAction(
      "RGPD_ANONYMIZED",
      req,
      "Application",
      application._id,
      "Profil anonymisé",
      { reason: "RGPD - Délai 24 mois dépassé" },
    );

    res.json({ message: "Profil anonymisé avec succès (RGPD)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── Helper email ─────────────────────────────────────────────────────────────

async function sendEmail(to, subject, html) {
  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_SENDER,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email error:", err?.response?.body || err.message);
  }
}

// ─── GET /api/applications/candidate/stats ─────────────────────────────────────

exports.getCandidateStats = async (req, res) => {
  try {
    const [total, pending, interviews] = await Promise.all([
      Application.countDocuments({ candidate: req.userId }),
      Application.countDocuments({
        candidate: req.userId,
        status: { $in: ["received", "validating"] },
      }),
      Application.countDocuments({
        candidate: req.userId,
        employerStage: "interview",
      }),
    ]);

    res.json({
      stats: {
        total,
        pending,
        interviews,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
