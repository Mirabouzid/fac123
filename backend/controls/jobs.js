const Job = require("../model/job");
const Application = require("../model/application");
const AuditLog = require("../model/auditLog");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ─── Helper: Audit Log ────────────────────────────────────────────────────────

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

// ─── GET /api/jobs — Offres validées avec filtres ─────────────────────────────

exports.getJobs = async (req, res) => {
  try {
    const { position, city, urgency, page = 1, limit = 20 } = req.query;

    const filter = { isValidated: true, status: "open" };
    if (position) filter.title = { $regex: position, $options: "i" };
    if (city) filter.location = { $regex: city, $options: "i" };
    if (urgency === "true") filter.urgency = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("employer", "name company")
        .sort({ urgency: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Job.countDocuments(filter),
    ]);

    res.json({ jobs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── GET /api/jobs/my-jobs — Offres de l'employeur connecté ──────────────────

exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.userId })
      .sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── GET /api/jobs/:id ────────────────────────────────────────────────────────

exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("employer", "name company email");
    if (!job) return res.status(404).json({ message: "Offre introuvable" });
    res.json({ job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── POST /api/jobs — Créer une offre (employeur) ────────────────────────────

exports.createJob = async (req, res) => {
  try {
    const {
      title, cabinet, description, requirements,
      location, address, contactEmail,
      salaryMin, salaryMax, contractType, urgency,
    } = req.body;

    const jobData = {
      title,
      cabinet,
      description,
      requirements: requirements ? JSON.parse(requirements) : [],
      location,
      address,
      contactEmail,
      salary: {
        min: salaryMin ? Number(salaryMin) : undefined,
        max: salaryMax ? Number(salaryMax) : undefined,
      },
      contractType: contractType || "CDI",
      urgency: urgency === "true" || urgency === true,
      employer: req.userId,
      pipelineStage: "validating",
      isValidated: false,
    };

    // Fichier fiche de poste
    if (req.file) {
      jobData.jobDescriptionFile = req.file.filename;
    }

    const job = new Job(jobData);
    await job.save();

    await logAction("JOB_CREATED", req, "Job", job._id, `${title} - ${cabinet}`, { location, urgency });

    res.status(201).json({ message: "Offre soumise — en attente de validation (24-48h)", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── PUT /api/jobs/:id — Modifier une offre ───────────────────────────────────

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Offre introuvable" });

    if (job.employer.toString() !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({ message: "Non autorisé" });
    }

    // Champs non modifiables par l'employeur
    const forbidden = ["employer", "isValidated", "validatedAt", "validatedBy"];
    const updates = { ...req.body };
    if (req.userRole !== "admin") forbidden.forEach((f) => delete updates[f]);

    Object.assign(job, updates);
    await job.save();

    await logAction("JOB_UPDATED", req, "Job", job._id, job.title, { updates: Object.keys(updates) });

    res.json({ message: "Offre mise à jour", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── DELETE /api/jobs/:id ─────────────────────────────────────────────────────

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Offre introuvable" });

    if (job.employer.toString() !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({ message: "Non autorisé" });
    }

    await Job.findByIdAndDelete(req.params.id);
    await logAction("JOB_DELETED", req, "Job", job._id, job.title);

    res.json({ message: "Offre supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── PUT /api/jobs/pipeline/:id — Mettre à jour le stage pipeline ─────────────

exports.updatePipelineStage = async (req, res) => {
  try {
    const { stage } = req.body;
    const validStages = ["validating", "active", "sourcing", "interview", "closed"];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: "Stage invalide" });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Offre introuvable" });

    if (job.employer.toString() !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const oldStage = job.pipelineStage;
    job.pipelineStage = stage;
    if (stage === "closed") job.status = "closed";
    await job.save();

    await logAction("JOB_STAGE_CHANGED", req, "Job", job._id, job.title, { from: oldStage, to: stage });

    res.json({ message: "Stage mis à jour", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─── GET /api/jobs/employer/stats ─────────────────────────────────────────────

exports.getEmployerStats = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.userId }).select("_id");
    const jobIds = jobs.map((j) => j._id);

    const [activeOffers, totalApplications, pendingReview, interviews] = await Promise.all([
      Job.countDocuments({ employer: req.userId, status: "open", isValidated: true }),
      Application.countDocuments({ job: { $in: jobIds } }),
      Application.countDocuments({ job: { $in: jobIds }, employerStage: "validating" }),
      Application.countDocuments({ job: { $in: jobIds }, employerStage: "interview" }),
    ]);

    res.json({
      stats: {
        activeOffers,
        totalApplications,
        pendingReview,
        interviews,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
