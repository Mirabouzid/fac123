const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["candidate", "employer", "admin"],
      required: true,
    },

    // --- Candidat ---
    firstName: String,
    lastName: String,
    phone: String,
    specialty: {
      type: String,
      enum: [
        "Chirurgien-Dentiste",
        "Orthodontiste",
        "Assistant(e) Dentaire",
        "Medecin Generaliste",
        "Medecin Specialiste",
        "Infirmier(e)",
        "Secretaire Medical(e)",
        "Autre",
      ],
    },
    experience: {
      type: String,
      enum: [
        "Debutant (0-2 ans)",
        "Junior (2-5 ans)",
        "Confirme (5-10 ans)",
        "Senior (10+ ans)",
      ],
    },
    city: String,
    availability: {
      type: String,
      enum: ["immediate", "1month", "3months", "6months"],
    },
    cvFile: String, // chemin relatif vers le fichier CV uploadé

    // Score IA interne (visible uniquement par l'admin)
    aiScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // --- Employeur ---
    company: String,
    address: String,
    contactEmail: String,

    // --- RGPD ---
    rgpdConsent: {
      type: Boolean,
      default: false,
    },
    rgpdConsentDate: Date,
    rgpdExpiresAt: Date, // consentDate + 24 mois
    isAnonymized: {
      type: Boolean,
      default: false,
    },

    // --- Reset mot de passe ---
    resetToken: String,
    resetTokenExpiration: Date,
  },
  { timestamps: true }
);

// Masquage des champs sensibles dans les réponses JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpiration;
  return obj;
};

// Masquage partiel de l'email (pour affichage côté employeur non débloqué)
userSchema.methods.maskedEmail = function () {
  const [local, domain] = this.email.split("@");
  return `${local[0]}***@${domain}`;
};

// Masquage partiel du téléphone
userSchema.methods.maskedPhone = function () {
  if (!this.phone) return null;
  return this.phone.replace(/(\d{2})\s?\d{2}\s?\d{2}\s?\d{2}\s?(\d{2})/, "$1 ** ** ** $2");
};

module.exports = mongoose.model("User", userSchema);
