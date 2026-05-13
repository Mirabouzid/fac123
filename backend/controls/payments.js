const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Application = require("../model/application");
const Payment = require("../model/payment");
const AuditLog = require("../model/auditLog");
require("dotenv").config();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const CV_UNLOCK_PRICE = 4900; // 49 EUR en centimes

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

// ─── POST /api/payments/create-checkout-session ───────────────────────────────

exports.createCheckoutSession = async (req, res) => {
  try {
    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(400).json({ message: "applicationId requis" });
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: "Candidature introuvable" });
    }

    // Vérifier si déjà débloqué
    const alreadyUnlocked = application.unlockedBy?.some(
      (id) => id.toString() === req.userId
    );
    if (alreadyUnlocked) {
      return res.status(400).json({ message: "Ce profil est déjà débloqué" });
    }

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Déblocage profil — ${application.firstName} ${application.lastName[0]}.`,
              description: `Accès complet aux coordonnées — Spécialité: ${application.specialty}`,
            },
            unit_amount: CV_UNLOCK_PRICE,
          },
          quantity: 1,
        },
      ],
      metadata: {
        applicationId: applicationId,
        employerId: req.userId,
      },
      success_url: `${FRONTEND_URL}/employer/pipeline?payment=success&applicationId=${applicationId}`,
      cancel_url: `${FRONTEND_URL}/employer/pipeline?payment=cancel`,
    });

    // Enregistrer le paiement en attente
    await Payment.create({
      employer: req.userId,
      application: applicationId,
      stripeSessionId: session.id,
      amount: 49,
      status: "pending",
    });

    await logAction("PAYMENT_INITIATED", req, "Application", applicationId,
      `${application.firstName} ${application.lastName}`, { sessionId: session.id });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ message: "Erreur lors de la création du paiement" });
  }
};

// ─── POST /api/payments/create-payment-intent ──────────────────────────────────

exports.createPaymentIntent = async (req, res) => {
  try {
    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(400).json({ message: "applicationId requis" });
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: "Candidature introuvable" });
    }

    // Vérifier si déjà débloqué
    const alreadyUnlocked = application.unlockedBy?.some(
      (id) => id.toString() === req.userId
    );
    if (alreadyUnlocked) {
      return res.status(400).json({ message: "Ce profil est déjà débloqué" });
    }

    // Créer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: CV_UNLOCK_PRICE,
      currency: "eur",
      metadata: {
        applicationId: applicationId,
        employerId: req.userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Enregistrer le paiement en attente
    await Payment.create({
      employer: req.userId,
      application: applicationId,
      stripePaymentIntentId: paymentIntent.id,
      amount: 49,
      status: "pending",
    });

    await logAction("PAYMENT_INTENT_CREATED", req, "Application", applicationId,
      `${application.firstName} ${application.lastName}`, { paymentIntentId: paymentIntent.id });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ message: "Erreur lors de la création de l'intention de paiement" });
  }
};

// ─── POST /api/payments/webhook — Stripe Webhook ──────────────────────────────

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { applicationId, employerId } = session.metadata;
    await processSuccessfulPayment(session.id, session.payment_intent, applicationId, employerId, session.customer_email);
  } else if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const { applicationId, employerId } = paymentIntent.metadata;
    await processSuccessfulPayment(null, paymentIntent.id, applicationId, employerId, paymentIntent.receipt_email);
  }

  res.json({ received: true });
};

// ─── POST /api/payments/verify-payment ────────────────────────────────────────

exports.verifyPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ message: "paymentIntentId requis" });
    }

    // Récupérer le PaymentIntent depuis Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      const { applicationId, employerId } = paymentIntent.metadata;

      // Procéder au déblocage si ce n'est pas déjà fait par le webhook
      await processSuccessfulPayment(null, paymentIntentId, applicationId, employerId, paymentIntent.receipt_email);

      return res.json({ success: true, message: "Paiement vérifié et profil débloqué" });
    } else {
      return res.status(400).json({ 
        success: false, 
        status: paymentIntent.status, 
        message: "Le paiement n'a pas encore réussi" 
      });
    }
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ message: "Erreur lors de la vérification du paiement" });
  }
};

const processSuccessfulPayment = async (sessionId, paymentIntentId, applicationId, employerId, customerEmail) => {
  try {
    // Mettre à jour le paiement
    const query = sessionId ? { stripeSessionId: sessionId } : { stripePaymentIntentId: paymentIntentId };
    
    await Payment.findOneAndUpdate(
      query,
      {
        status: "paid",
        stripePaymentIntentId: paymentIntentId,
        paidAt: new Date(),
      }
    );

    // Débloquer le profil
    await Application.findByIdAndUpdate(applicationId, {
      $addToSet: { unlockedBy: employerId },
    });

    await AuditLog.create({
      action: "PAYMENT_RECEIVED",
      actorEmail: customerEmail || "employer",
      targetType: "Application",
      targetId: applicationId,
      targetLabel: "Profil débloqué après paiement",
      metadata: { sessionId, paymentIntentId, amount: 49 },
    });

    console.log(`✅ Profil ${applicationId} débloqué pour l'employeur ${employerId}`);
  } catch (err) {
    console.error("Payment processing error:", err);
  }
};

// ─── GET /api/payments/history ────────────────────────────────────────────────

exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ employer: req.userId })
      .populate("application", "firstName lastName specialty city")
      .sort({ createdAt: -1 });

    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
