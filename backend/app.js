const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const app = express();

// ─── Stripe Webhook — doit recevoir le raw body AVANT express.json() ──────────
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// ─── Middleware globaux ───────────────────────────────────────────────────────
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:5174",
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Fichiers statiques (CV, fiches de poste uploadés) ───────────────────────
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const jobRoutes = require("./routes/jobs");
const applicationRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admin");
const paymentRoutes = require("./routes/payments");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route introuvable" });
});

// ─── Gestion d'erreurs globale ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Erreur serveur:", err.message || err);
  res.status(err.status || 500).json({
    message: err.message || "Erreur serveur interne",
  });
});

// ─── Connexion MongoDB + démarrage serveur ────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ Connecté à MongoDB");

    // Seed default admin
    try {
      const User = require("./model/user");
      const bcrypt = require("bcryptjs");
      const defaultAdminEmail = "jemaanassim480@gmail.com";
      const existingAdmin = await User.findOne({ email: defaultAdminEmail });

      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash("admin", 12);
        const adminUser = new User({
          email: defaultAdminEmail,
          password: hashedPassword,
          name: "Admin Principal",
          role: "admin",
        });
        await adminUser.save();
        console.log(`✅ Compte admin par défaut créé (${defaultAdminEmail})`);
      }
    } catch (err) {
      console.error(
        "❌ Erreur lors de la création de l'admin par défaut:",
        err.message,
      );
    }

    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`   → API disponible sur http://localhost:${PORT}/api`);
    });
  })
  .catch((err) => {
    console.error("❌ Erreur connexion MongoDB:", err.message);
    process.exit(1);
  });
