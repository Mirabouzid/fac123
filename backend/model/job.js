const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const jobSchema = new Schema(
  {
    // Informations cabinet/employeur
    title: {
      type: String,
      required: true,
      trim: true,
    },
    cabinet: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: [String],
    address: String,
    location: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
    },

    // Conditions
    salary: {
      min: Number,
      max: Number,
    },
    contractType: {
      type: String,
      enum: ["CDI", "CDD", "Liberal", "Interim", "Stage"],
      default: "CDI",
    },
    urgency: {
      type: Boolean,
      default: false,
    },

    // Fiche de poste (fichier uploadé)
    jobDescriptionFile: String,

    // Référence employeur
    employer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Statut pipeline
    pipelineStage: {
      type: String,
      enum: ["validating", "active", "sourcing", "interview", "closed"],
      default: "validating",
    },

    // Validation admin
    isValidated: {
      type: Boolean,
      default: false,
    },
    validatedAt: Date,
    validatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: Date,
    rejectionReason: String,

    // Statut global
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
  },
  { timestamps: true }
);

// Index pour les recherches fréquentes
jobSchema.index({ location: 1, title: 1, urgency: 1, isValidated: 1 });

module.exports = mongoose.model("Job", jobSchema);
