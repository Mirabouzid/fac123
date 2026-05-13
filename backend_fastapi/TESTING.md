# API Testing Guide

Guide pour tester tous les endpoints du backend FastAPI.

## 🚀 Démarrage du serveur

```bash
# Terminal 1: Démarrer le serveur
python -m uvicorn main:app --reload --port 8000

# Terminal 2: Exécuter les tests
```

## 📋 Variables globales à utiliser

```bash
# Base URL
BASE_URL="http://localhost:8000"

# Users (create during tests)
CANDIDATE_ID=""
EMPLOYER_ID=""
ADMIN_ID=""
CANDIDATE_TOKEN=""
EMPLOYER_TOKEN=""
ADMIN_TOKEN=""
JOB_ID=""
APP_ID=""
PAYMENT_ID=""
```

## 🧪 Scénario complet de test

### 1️⃣ AUTHENTIFICATION

#### Signup - Candidat

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "candidate@example.com",
    "password": "password123",
    "name": "John Doe",
    "role": "candidate",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "0612345678",
    "specialty": "Infirmier",
    "experience": "junior",
    "city": "Paris",
    "availability": "Immédiate",
    "rgpdConsent": true
  }' | jq .
```

**Response:**

```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "candidate@example.com",
    "name": "John Doe",
    "role": "candidate",
    "firstName": "John",
    "lastName": "Doe",
    ...
  }
}
```

Sauvegarder le token:

```bash
CANDIDATE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
CANDIDATE_ID="507f1f77bcf86cd799439011"
```

#### Signup - Employeur

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employer@example.com",
    "password": "password123",
    "name": "Clinique X",
    "role": "employer",
    "company": "Clinique X",
    "address": "123 Rue de Paris",
    "contactEmail": "contact@cliniquex.fr",
    "rgpdConsent": true
  }'
```

Sauvegarder:

```bash
EMPLOYER_TOKEN="..."
EMPLOYER_ID="..."
```

#### Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "candidate@example.com",
    "password": "password123"
  }' | jq .
```

#### Forgot Password

```bash
curl -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "candidate@example.com"
  }' | jq .
```

### 2️⃣ UTILISATEURS

#### Get Profile

```bash
curl -X GET http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" | jq .
```

#### Update Profile

```bash
curl -X PUT http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Lyon",
    "availability": "2 mois"
  }' | jq .
```

### 3️⃣ JOBS

#### Create Job (Employeur)

```bash
curl -X POST http://localhost:8000/api/jobs \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" \
  -F "title=Infirmier" \
  -F "cabinet=Clinique X" \
  -F "description=Nous recherchons un infirmier..." \
  -F "location=Paris" \
  -F "address=123 Rue de Paris" \
  -F "salary={\"min\": 2000, \"max\": 2500}" \
  -F "contractType=CDI" \
  -F "urgency=true" \
  -F "requirements=[\"Diplôme\", \"Expérience\"]" | jq .
```

Sauvegarder:

```bash
JOB_ID="..."
```

#### Get Jobs (Public)

```bash
curl -X GET "http://localhost:8000/api/jobs?position=Infirmier&city=Paris" | jq .
```

#### Get Job Details

```bash
curl -X GET http://localhost:8000/api/jobs/$JOB_ID | jq .
```

#### Get Employer's Jobs

```bash
curl -X GET http://localhost:8000/api/jobs/employer/my-jobs \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" | jq .
```

#### Get Employer Stats

```bash
curl -X GET http://localhost:8000/api/jobs/employer/stats \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" | jq .
```

### 4️⃣ CANDIDATURES

#### Create Application (Candidat)

```bash
curl -X POST http://localhost:8000/api/applications \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  -F "jobId=$JOB_ID" \
  -F "coverLetter=Je suis intéressé par ce poste..." \
  -F "cv=@/path/to/cv.pdf" | jq .
```

Sauvegarder:

```bash
APP_ID="..."
```

#### Get Applications (Candidat)

```bash
curl -X GET http://localhost:8000/api/applications \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" | jq .
```

#### Get Applications (Employeur)

```bash
curl -X GET "http://localhost:8000/api/applications?status=received" \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" | jq .
```

#### Get Applications Global (Employeur)

```bash
curl -X GET "http://localhost:8000/api/applications?global=true" \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" | jq .
```

#### Get Candidate Stats

```bash
curl -X GET http://localhost:8000/api/applications/candidate/stats \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" | jq .
```

### 5️⃣ PAIEMENTS

#### Create Checkout Session

```bash
curl -X POST http://localhost:8000/api/payments/create-checkout-session \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"applicationId\": \"$APP_ID\"}" | jq .
```

**Response:**

```json
{
  "message": "Checkout session created successfully",
  "data": {
    "sessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/pay/...",
    "paymentId": "..."
  }
}
```

Ouvrir l'URL dans un navigateur pour tester le paiement Stripe.

#### Create Payment Intent

```bash
curl -X POST http://localhost:8000/api/payments/create-payment-intent \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"applicationId\": \"$APP_ID\"}" | jq .
```

#### Get Payment History

```bash
curl -X GET http://localhost:8000/api/payments/history \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" | jq .
```

### 6️⃣ ADMIN

#### Create Admin

```bash
curl -X POST http://localhost:8000/api/admin/create-admin \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@example.com",
    "password": "admin123",
    "name": "Admin User"
  }' | jq .
```

#### Get Dashboard Stats

```bash
curl -X GET http://localhost:8000/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

#### Get Pending Offers

```bash
curl -X GET http://localhost:8000/api/admin/pending-offers \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

#### Validate Offer

```bash
curl -X POST http://localhost:8000/api/admin/validate-offer/$JOB_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

#### Reject Offer

```bash
curl -X POST http://localhost:8000/api/admin/reject-offer/$JOB_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rejectionReason": "Description insuffisante"}' | jq .
```

#### Get Pending Applications

```bash
curl -X GET http://localhost:8000/api/admin/pending-applications \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

#### Qualify Candidate

```bash
curl -X POST http://localhost:8000/api/admin/qualify/$APP_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

#### Get GDPR Alerts

```bash
curl -X GET http://localhost:8000/api/admin/rgpd-alerts \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

#### Get Audit Log

```bash
curl -X GET "http://localhost:8000/api/admin/audit-log?action=USER_LOGIN&page=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

#### Get Users

```bash
curl -X GET "http://localhost:8000/api/admin/users?role=candidate&page=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

## ✅ Test de succès attendus

| Endpoint                               | Status | Action               |
| -------------------------------------- | ------ | -------------------- |
| POST /auth/signup                      | 200    | Créer utilisateur    |
| POST /auth/login                       | 200    | Obtenir token        |
| GET /users/profile                     | 200    | Lecture profile      |
| POST /jobs                             | 201    | Créer offre          |
| GET /jobs                              | 200    | Lister offres        |
| POST /applications                     | 201    | Candidater           |
| GET /applications                      | 200    | Lister candidatures  |
| POST /payments/create-checkout-session | 200    | Créer session Stripe |
| GET /admin/stats                       | 200    | Stats admin          |

## 🔴 Erreurs attendues

| Cas                | Status | Réponse                                  |
| ------------------ | ------ | ---------------------------------------- |
| Email déjà utilisé | 400    | "User with this email already exists"    |
| Token invalide     | 401    | "Invalid or expired token"               |
| Pas autorisé       | 403    | "Not authorized to access this resource" |
| Ressource absente  | 404    | "Not found"                              |
| Données invalides  | 422    | Détails de validation Pydantic           |

## 🧩 Intégration Stripe (Test)

### Test Cards

```
# Succès
4242 4242 4242 4242

# Décline
4000 0000 0000 0002

# Authentification 3D Secure
4000 0025 0000 0003
```

### Webhooks Stripe

Utiliser Stripe CLI pour tester les webhooks:

```bash
# Terminal 1: Listen for events
stripe listen --forward-to localhost:8000/api/payments/webhook

# Terminal 2: Trigger test event
stripe trigger payment_intent.succeeded
```

## 🐛 Debugging

### Voir les logs

```bash
# FastAPI logs
# Vous verrez tous les requests/responses dans le terminal du serveur

# MongoDB logs
# Activer le logging dans Motor pour voir les requêtes DB
```

### Tester avec Swagger UI

Visitez: http://localhost:8000/docs

Vous pouvez:

- Voir tous les endpoints
- Tester directement depuis le navigateur
- Voir les schémas requis/réponses

### Tester avec Postman

1. Télécharger Postman
2. Importer la collection:
   - New > File > Import > Postman collection.json
3. Configurer environment:
   - base_url: http://localhost:8000
   - token: (mis à jour après chaque login)

---

**Prêt à tester?** Démarrez le serveur et suivez les étapes ci-dessus! 🚀
