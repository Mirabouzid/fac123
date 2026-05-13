# Migration Node.js → FastAPI - Guide Complet

Ce guide explique comment utiliser le nouveau backend FastAPI et comment l'intégrer avec le frontend React existant.

## 🎯 Différences principales

### Architecture

| Aspect     | Express.js         | FastAPI               |
| ---------- | ------------------ | --------------------- |
| Framework  | Express            | FastAPI + Uvicorn     |
| Langage    | JavaScript/Node.js | Python 3.9+           |
| Async      | Callback-based     | Native async/await    |
| Validation | express-validator  | Pydantic              |
| ODM        | Mongoose           | Motor (async MongoDB) |

### Endpoints

Tous les endpoints restent **identiques** en termes de URL et comportement:

```
/api/auth/*
/api/users/*
/api/jobs/*
/api/applications/*
/api/payments/*
/api/admin/*
```

## 🚀 Démarrage rapide

### 1. Installation

```bash
cd backend_fastapi

# Virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# ou: venv\Scripts\activate  # Windows

# Dépendances
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env avec vos valeurs:
# - MONGODB_URI: votre connection string MongoDB
# - JWT_SECRET: une clé secrète (32+ caractères)
# - STRIPE_SECRET_KEY: votre clé Stripe
# - STRIPE_WEBHOOK_SECRET: secret du webhook Stripe
```

### 3. Démarrage

```bash
# Développement (avec rechargement automatique)
python -m uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Le serveur sera disponible à: `http://localhost:8000`

## 🔄 Migration de données

Aucune migration de données n'est nécessaire! Le backend FastAPI utilise la **même base de données MongoDB** que le système Express.js original.

### Vérifier la connexion

```python
# Tester la connexion
curl http://localhost:8000/health

# Voir la documentation API
# http://localhost:8000/docs
```

## 📱 Intégration Frontend

### Changement du host du backend

Dans votre frontend React, mettez à jour l'URL de l'API:

**Avant (Express.js)**:

```javascript
const API_URL = "http://localhost:3000";
```

**Après (FastAPI)**:

```javascript
const API_URL = "http://localhost:8000";
```

### Exemple avec fetch

```javascript
// Login
const response = await fetch("http://localhost:8000/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "user@example.com",
    password: "password123",
  }),
});

const data = await response.json();
const token = data.token;

// Utiliser le token pour les requêtes suivantes
const profileResponse = await fetch("http://localhost:8000/api/users/profile", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## 🧪 Test des endpoints

### Avec curl

```bash
# Signup
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "candidate@example.com",
    "password": "password123",
    "name": "John Doe",
    "role": "candidate",
    "firstName": "John",
    "lastName": "Doe",
    "specialty": "Infirmier",
    "experience": "junior",
    "city": "Paris",
    "availability": "Immédiate",
    "rgpdConsent": true
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "candidate@example.com",
    "password": "password123"
  }'

# Profil (avec token)
curl -X GET http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Avec Swagger UI

Visitez: `http://localhost:8000/docs`

Vous pouvez tester tous les endpoints directement depuis l'interface Swagger.

## 📤 Upload de fichiers

### CV (Candidatures)

```javascript
const formData = new FormData();
formData.append("jobId", "job123");
formData.append("coverLetter", "Ma lettre de motivation...");
formData.append("cv", fileInput.files[0]); // File object

const response = await fetch("http://localhost:8000/api/applications", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

### Description d'offre

```javascript
const formData = new FormData();
formData.append("title", "Infirmier");
formData.append("cabinet", "Clinique X");
formData.append("description", "Description du poste...");
formData.append("location", "Paris");
formData.append("salary", JSON.stringify({ min: 2000, max: 2500 }));
formData.append("requirements", JSON.stringify(["Diplôme", "Expérience"]));
formData.append("jobDescriptionFile", fileInput.files[0]); // File object

const response = await fetch("http://localhost:8000/api/jobs", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

## 💳 Intégration Stripe

### Frontend (React)

```javascript
import { loadStripe } from "@stripe/js";

// Create checkout session
const response = await fetch(
  "http://localhost:8000/api/payments/create-checkout-session",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ applicationId: "app123" }),
  },
);

const { data } = await response.json();
const stripe = await loadStripe("pk_test_...");
await stripe.redirectToCheckout({ sessionId: data.sessionId });
```

Ou avec Stripe Elements:

```javascript
// Create payment intent
const response = await fetch(
  "http://localhost:8000/api/payments/create-payment-intent",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ applicationId: "app123" }),
  },
);

const { data } = await response.json();

// Setup Stripe.js
const stripe = await loadStripe("pk_test_...");
const elements = stripe.elements({ clientSecret: data.clientSecret });

// Mount card element
elements.create("card").mount("#card-element");

// Handle payment submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const result = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: `${window.location.origin}/payment-success`,
    },
  });
});
```

## 🔒 Authentification

### JWT Token Format

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "candidate",
  "exp": 1234567890
}
```

### Rôles disponibles

- `candidate` - Candidat job
- `employer` - Employeur/Cabinet
- `admin` - Administrateur

### Exemple avec Context API (React)

```javascript
import { createContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "{}"),
  );

  const login = async (email, password) => {
    const response = await fetch("http://localhost:8000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  return (
    <AuthContext.Provider value={{ token, user, login }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## 📝 Validation des données

FastAPI utilise Pydantic pour la validation. Les erreurs de validation retournent 422 avec détails:

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "invalid email format",
      "type": "value_error.email"
    }
  ]
}
```

## 🐛 Débogage

### Logs

FastAPI affiche les logs dans la console:

```
INFO:     Application startup complete
INFO:     Server running at http://0.0.0.0:8000
```

### Mode développement

```bash
# Avec rechargement en temps réel
python -m uvicorn main:app --reload --port 8000 --log-level debug
```

### Vérifier la base de données

```bash
# Avec MongoDB Compass ou mongosh
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/"

# Voir les collections
show collections

# Voir un document
db.users.findOne()
```

## 🚨 Gestion des erreurs

Tous les endpoints retournent des codes HTTP standards:

| Code | Signification        |
| ---- | -------------------- |
| 200  | ✅ Succès            |
| 400  | ❌ Données invalides |
| 401  | 🔒 Non authentifié   |
| 403  | 🚫 Non autorisé      |
| 404  | ❓ Non trouvé        |
| 500  | 💥 Erreur serveur    |

## ⚙️ Configuration avancée

### Nombre de workers (production)

```bash
uvicorn main:app --workers 4
```

### HTTPS/SSL

```bash
uvicorn main:app --ssl-keyfile=key.pem --ssl-certfile=cert.pem
```

### Reverse proxy (Nginx)

```nginx
upstream fastapi {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://fastapi;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Monitoring

### Health check

```bash
curl http://localhost:8000/health
```

### Prometheus metrics (optionnel)

```python
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)
```

## 🎓 Ressources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Motor (Async MongoDB)](https://motor.readthedocs.io/)
- [Pydantic](https://pydantic-settings.readthedocs.io/)
- [Stripe API](https://stripe.com/docs/api)

---

**Besoin d'aide?** Consultez le README.md ou les logs du serveur FastAPI.
