const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    actorEmail: String,
    actorRole: String,

    targetType: {
      type: String,
      enum: ["Job", "Application", "User", "Payment", "System"],
    },
    targetId: {
      type: Schema.Types.ObjectId,
    },
    targetLabel: String,

    // Détails additionnels
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // IP pour traçabilité RGPD
    ipAddress: String,
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
