const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Créer les dossiers si inexistants
const uploadsDir = path.join(__dirname, "../public/uploads");
const cvDir = path.join(uploadsDir, "cv");
const jobsDir = path.join(uploadsDir, "jobs");

[uploadsDir, cvDir, jobsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Types MIME autorisés ─────────────────────────────────────────────────────

const allowedMimes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Seuls les fichiers PDF, DOC et DOCX sont acceptés"), false);
  }
};

// ─── Storage CV candidats ─────────────────────────────────────────────────────

const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, cvDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `cv-${req.userId || "unknown"}-${unique}${ext}`);
  },
});

// ─── Storage fiches de poste employeur ───────────────────────────────────────

const jobFileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, jobsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `job-${req.userId || "unknown"}-${unique}${ext}`);
  },
});

// ─── Instances Multer ─────────────────────────────────────────────────────────

exports.uploadCV = multer({
  storage: cvStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("cv");

exports.uploadJobFile = multer({
  storage: jobFileStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("jobDescriptionFile");

// ─── Middleware de gestion d'erreur Multer ────────────────────────────────────

exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Le fichier ne peut pas dépasser 5 MB" });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
