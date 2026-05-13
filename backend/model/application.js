const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const applicationSchema = new Schema(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
    },

    // Référence au candidat (compte utilisateur)
    candidate: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Informations personnelles (remplies au moment du dépôt)
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },

    // Informations professionnelles
    specialty: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    availability: String,
    coverLetter: String,

    // Fichier CV uploadé
    cvFile: {
      type: String,
      required: true,
    },

    // Statuts de la candidature (pipeline candidat)
    status: {
      type: String,
      enum: ["received", "validating", "qualified", "archived"],
      default: "received",
    },

    // Statut dans le pipeline de l'employeur
    employerStage: {
      type: String,
      enum: ["validating", "active", "sourcing", "interview", "closed"],
      default: "validating",
    },

    // Score IA interne (visible uniquement par admin)
    aiScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // Consentement RGPD
    rgpdConsent: {
      type: Boolean,
      required: true,
      default: false,
    },
    rgpdConsentDate: {
      type: Date,
      required: true,
    },
    rgpdExpiresAt: {
      type: Date, // +24 mois
      required: true,
    },

    // Employeurs ayant débloqué ce profil (après paiement Stripe)
    unlockedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Historique des changements de statut
    statusHistory: [
      {
        status: String,
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  { timestamps: true },
);

// Index
applicationSchema.index({ status: 1, specialty: 1, city: 1 });
applicationSchema.index({ rgpdExpiresAt: 1 }); // pour alertes RGPD

module.exports = mongoose.model("Application", applicationSchema);
