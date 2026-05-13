const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    employer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    application: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },

    // Stripe
    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true,
    },

    amount: {
      type: Number,
      required: true,
      default: 49, // EUR
    },
    currency: {
      type: String,
      default: "eur",
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    paidAt: Date,
    refundedAt: Date,
  },
  { timestamps: true }
);

paymentSchema.index({ employer: 1, status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
