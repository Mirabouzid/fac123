# Efficience Recrute - FastAPI Backend

Backend FastAPI complet remplaçant le système Express.js/Node.js original.

## ✨ Fonctionnalités

✅ **Authentification & Autorisation**

- JWT tokens (24h expiration)
- Bcrypt password hashing
- RBAC (Role-Based Access Control)
- Inscription/Login/Password Reset

✅ **Gestion des Emplois**

- Listing et recherche d'offres d'emploi
- Validation des offres par admin
- Gestion du pipeline d'offres
- Upload de fichiers de description

✅ **Candidatures**

- Soumission de candidatures
- Statut de candidature
- Upload de CV
- Masquage des informations de contact (privacy-first)

✅ **Paiements Stripe**

- Intégration Stripe Checkout & Payment Elements
- Webhooks de paiement
- Déblocage de profils (€49)

✅ **Conformité GDPR**

- Gestion des consentements (24 mois)
- Anonymisation des données
- Audit logging complet
- Alertes d'expiration

✅ **Administration**

- Dashboard avec statistiques
- Gestion des utilisateurs
- Logs d'audit
- Gestion GDPR

## 🚀 Installation

### 1. Prérequis

- Python 3.9+
- MongoDB Atlas (ou instance locale)
- Stripe account (pour les paiements)

### 2. Setup du projet

```bash
# Créer un virtual environment
python -m venv venv

# Activer le virtual environment
# Sur Windows:
venv\Scripts\activate
# Sur macOS/Linux:
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

### 3. Configuration

```bash
# Créer un fichier .env basé sur .env.example
cp .env.example .env

# Remplir les variables d'environnement:
# - MONGODB_URI: URI de connexion MongoDB
# - JWT_SECRET: Secret pour les JWT tokens
# - STRIPE_SECRET_KEY: Clé secrète Stripe
# - STRIPE_WEBHOOK_SECRET: Secret du webhook Stripe
```

## 🏃 Démarrage

### Mode développement

```bash
python -m uvicorn main:app --reload --port 8000
```

### Mode production

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 📚 API Documentation

Une fois le serveur démarré, accédez à:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🗂️ Structure du projet

```
backend_fastapi/
├── app/
│   ├── core/              # Configuration et sécurité
│   │   ├── config.py      # Settings
│   │   ├── database.py    # Connexion MongoDB
│   │   └── security.py    # JWT & Password hashing
│   ├── models/            # Schémas de base de données
│   │   ├── user.py
│   │   ├── job.py
│   │   ├── application.py
│   │   ├── payment.py
│   │   └── audit_log.py
│   ├── schemas/           # Schémas Pydantic de validation
│   │   ├── auth.py
│   │   ├── job.py
│   │   ├── application.py
│   │   └── payment.py
│   ├── services/          # Logique métier
│   │   ├── auth_service.py
│   │   ├── job_service.py
│   │   ├── application_service.py
│   │   ├── payment_service.py
│   │   └── admin_service.py
│   ├── routes/            # Endpoints API
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── jobs.py
│   │   ├── applications.py
│   │   ├── payments.py
│   │   └── admin.py
│   └── middleware/        # Middleware et dépendances
│       └── dependencies.py
├── public/uploads/        # Fichiers uploadés
│   ├── cv/               # CVs des candidats
│   └── jobs/             # Descriptions d'offres
├── main.py               # Application FastAPI
├── requirements.txt      # Dépendances Python
└── README.md            # Cette documentation
```

## 🔌 API Endpoints

### Authentification

- `POST /api/auth/signup` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/forgot-password` - Demande reset
- `POST /api/auth/reset-password` - Reset password

### Utilisateurs

- `GET /api/users/profile` - Profil utilisateur
- `PUT /api/users/profile` - Mise à jour profil

### Emplois

- `GET /api/jobs` - Lister offres (public)
- `GET /api/jobs/{id}` - Détails offre (public)
- `POST /api/jobs` - Créer offre (employer)
- `PUT /api/jobs/{id}` - Modifier offre (employer)
- `DELETE /api/jobs/{id}` - Supprimer offre (employer)
- `GET /api/jobs/employer/my-jobs` - Mes offres
- `GET /api/jobs/employer/stats` - Statistiques

### Candidatures

- `GET /api/applications` - Lister candidatures
- `POST /api/applications` - Soumettre candidature
- `PUT /api/applications/{id}` - Update status (admin)
- `PUT /api/applications/{id}/pipeline` - Update stage (employer)
- `DELETE /api/applications/{id}/anonymize` - Anonymiser (admin)
- `GET /api/applications/candidate/stats` - Stats candidat

### Paiements

- `POST /api/payments/create-checkout-session` - Session Stripe
- `POST /api/payments/create-payment-intent` - Payment Intent
- `POST /api/payments/webhook` - Webhook Stripe
- `GET /api/payments/history` - Historique paiements
- `POST /api/payments/verify-payment` - Vérifier paiement

### Admin

- `GET /api/admin/stats` - Dashboard
- `GET /api/admin/pending-offers` - Offres en attente
- `POST /api/admin/validate-offer/{id}` - Valider offre
- `POST /api/admin/reject-offer/{id}` - Rejeter offre
- `GET /api/admin/pending-applications` - Candidatures en attente
- `POST /api/admin/qualify/{id}` - Qualifier candidat
- `POST /api/admin/archive/{id}` - Archiver candidat
- `GET /api/admin/rgpd-alerts` - Alertes GDPR
- `POST /api/admin/anonymize-all-expired` - Anonymiser expiré
- `GET /api/admin/audit-log` - Log d'audit
- `GET /api/admin/payments` - Paiements
- `GET /api/admin/users` - Utilisateurs
- `POST /api/admin/create-admin` - Créer admin

## 🔐 Authentification

Tous les endpoints protégés nécessitent un JWT token dans l'header:

```
Authorization: Bearer <token>
```

## 📋 Variables d'environnement

```env
# Server
PORT=8000
ENVIRONMENT=development

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=name

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Frontend
FRONTEND_URL=http://localhost:5173
FRONTEND_URL_ALT=http://localhost:5174

# Email (SendGrid)
SENDGRID_API_KEY=your-key
SENDGRID_SENDER=noreply@efficience-recrute.fr

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🧪 Tests

```bash
# Vérifier la connexion à la base de données
curl http://localhost:8000/health

# Obtenir la documentation API
# http://localhost:8000/docs
```

## 📝 Notes importantes

1. **Admin par défaut**: Un compte admin est créé automatiquement au premier démarrage
2. **Upload de fichiers**: CV (max 5MB), Description d'offre (max 5MB)
3. **GDPR**: Consentements valides 24 mois, anonymisation automatique des expiré
4. **Stripe**: Montant fixe de €49 pour débloquer un profil
5. **Masquage**: Les infos de contact sont masquées jusqu'au paiement

## 🐛 Dépannage

**Erreur de connexion MongoDB**:

- Vérifier la URI dans .env
- Vérifier la whitelist IP dans MongoDB Atlas

**Stripe webhook ne fonctionne pas**:

- Vérifier le secret du webhook
- Vérifier l'URL du webhook dans Stripe dashboard

**Uploads ne fonctionnent pas**:

- Vérifier les permissions du dossier `public/uploads`
- Vérifier l'espace disque disponible

## 📈 Prochaines étapes

1. Connecter le frontend React à ce backend
2. Ajouter les templates d'email (SendGrid)
3. Ajouter le rate limiting
4. Ajouter les logs persistants (ELK, Datadog)
5. Configurer CI/CD (GitHub Actions)
6. Deploy en production

## 📞 Support

Pour toute question ou problème, consultez la documentation FastAPI:

- https://fastapi.tiangolo.com/
- https://docs.mongodb.com/drivers/motor/

---

**Version**: 1.0.0  
**Dernier update**: 2026-05-11
