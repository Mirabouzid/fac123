# Production Deployment Guide

Ce guide explique comment déployer le backend FastAPI en production.

## 🚀 Options de déploiement

### Option 1: Heroku (Simple)

```bash
# 1. Créer compte Heroku
# https://www.heroku.com

# 2. Installer Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# 3. Login
heroku login

# 4. Créer l'app
heroku create efficience-recrute-api

# 5. Ajouter Procfile
cat > Procfile << EOF
web: uvicorn main:app --host 0.0.0.0 --port $PORT
EOF

# 6. Déployer
git push heroku main

# 7. Configurer les variables d'environnement
heroku config:set MONGODB_URI="mongodb+srv://..."
heroku config:set JWT_SECRET="your-secret"
heroku config:set STRIPE_SECRET_KEY="sk_live_..."
heroku config:set STRIPE_WEBHOOK_SECRET="whsec_..."

# 8. Logs
heroku logs --tail
```

### Option 2: AWS EC2 + Nginx

#### 1. Lancer une instance EC2

```bash
# Type: t3.micro (eligible free tier)
# OS: Ubuntu 22.04 LTS
# Security Group: Allow ports 80, 443, 22
```

#### 2. SSH dans l'instance

```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

#### 3. Installer les dépendances

```bash
# Update système
sudo apt update && sudo apt upgrade -y

# Python
sudo apt install python3.11 python3.11-venv python3-pip -y

# Nginx
sudo apt install nginx -y

# Certbot (SSL)
sudo apt install certbot python3-certbot-nginx -y
```

#### 4. Setup de l'app

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/your-repo/recruitment-api.git
cd recruitment-api/backend_fastapi

# Virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Dépendances
pip install -r requirements.txt

# Configuration
sudo cp .env.example .env
sudo nano .env  # Éditer les variables
```

#### 5. Configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/api.example.com
```

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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_buffering off;
    }

    location /uploads {
        alias /opt/recruitment-api/backend_fastapi/public/uploads;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/api.example.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. SSL avec Certbot

```bash
sudo certbot --nginx -d api.example.com
sudo systemctl reload nginx
```

#### 7. Systemd Service

```bash
sudo nano /etc/systemd/system/fastapi.service
```

```ini
[Unit]
Description=FastAPI Application
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/recruitment-api/backend_fastapi
Environment="PATH=/opt/recruitment-api/backend_fastapi/venv/bin"
ExecStart=/opt/recruitment-api/backend_fastapi/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 4

[Install]
WantedBy=multi-user.target
```

```bash
# Enable et start service
sudo systemctl enable fastapi
sudo systemctl start fastapi
sudo systemctl status fastapi
```

### Option 3: Docker + DigitalOcean App Platform

#### 1. Build Docker image

```bash
docker build -t efficience-recrute-api .
docker tag efficience-recrute-api registry.digitalocean.com/your-registry/efficience-recrute-api
docker push registry.digitalocean.com/your-registry/efficience-recrute-api
```

#### 2. Créer app.yaml

```yaml
name: efficience-recrute-api
services:
  - name: api
    image:
      registry: digitalocean
      registry_slug: your-registry
      name: efficience-recrute-api
      tag: latest
    http_port: 8000
    health_check:
      http_path: /health
    env:
      - key: MONGODB_URI
        value: ${MONGODB_URI}
      - key: JWT_SECRET
        value: ${JWT_SECRET}
      - key: STRIPE_SECRET_KEY
        value: ${STRIPE_SECRET_KEY}
    run_command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
    resource_requests:
      cpus: 512
      memory_mi: 512
```

### Option 4: Render.com (Gratuit)

```bash
# 1. Créer compte sur https://render.com
# 2. Connecter GitHub repo
# 3. Créer Web Service
# 4. Ajouter variables d'environnement
# 5. Deploy automatique à chaque push
```

## 🔐 Configuration de sécurité

### Variables d'environnement obligatoires

```env
# Production MUST-HAVE
JWT_SECRET=generate-a-strong-secret-with-openssl
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
ENVIRONMENT=production

# Optionnel mais recommandé
SENDGRID_API_KEY=SG.xxxxx
FRONTEND_URL=https://app.example.com
```

### Générer une clé JWT sécurisée

```bash
openssl rand -hex 32
# Exemple output: 3d8f2a1c5e9b4f6a7c2e8d9f1a3b5c7d
```

### CORS en production

```python
# Modifier app/core/config.py
ALLOWED_ORIGINS = [
    "https://app.example.com",
    "https://www.example.com"
]
```

## 📊 Monitoring et Logs

### Avec Sentry

```bash
pip install sentry-sdk

# Dans main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="https://your-sentry-dsn@sentry.io/project-id",
    integrations=[FastApiIntegration()],
    environment="production"
)
```

### Avec ELK Stack (Elasticsearch, Logstash, Kibana)

```python
# Dans main.py
from pythonjsonlogger import jsonlogger
import logging

logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)
```

## 🗄️ Backup et Récupération

### MongoDB Atlas Backups

```bash
# Automatic daily backups are included in MongoDB Atlas
# Configurer dans: Atlas Dashboard > Backup
```

### Sauvegarde manuelle

```bash
# Dump
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net/" --out ./backup

# Restore
mongorestore --uri "mongodb+srv://user:pass@cluster.mongodb.net/" ./backup
```

## 📈 Performance Tuning

### Uvicorn workers

```bash
# Formula: (2 × CPU cores) + 1
# Pour t3.micro (1 core): workers = 3
uvicorn main:app --workers 3
```

### Database indexing

Les indexes sont créés automatiquement par FastAPI sur les collections principales.

## 🚨 Gestion des erreurs

### Logs erreurs

```bash
# Tail logs Heroku
heroku logs --tail

# Tail logs systemd
journalctl -u fastapi -f

# Docker logs
docker logs -f container-name
```

### Webhook Stripe non reçu?

1. Vérifier le STRIPE_WEBHOOK_SECRET
2. Vérifier l'URL du webhook dans Stripe Dashboard
3. Tester manuellement dans Stripe CLI:

```bash
stripe listen --forward-to api.example.com/api/payments/webhook
stripe trigger payment_intent.succeeded
```

## 🔄 CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          cd backend_fastapi
          pip install -r requirements.txt

      - name: Run tests
        run: |
          cd backend_fastapi
          pytest

      - name: Deploy to Heroku
        if: success()
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
        run: |
          git push https://heroku:$HEROKU_API_KEY@git.heroku.com/app-name.git main
```

## 🧪 Health Checks

```bash
# Vérifier que le service est up
curl https://api.example.com/health

# Vérifier les logs
curl https://api.example.com/health -v
```

## 🎓 Checklist de déploiement

- [ ] Variables d'environnement configurées
- [ ] MONGODB_URI pointant vers production
- [ ] JWT_SECRET changé (32+ caractères)
- [ ] CORS configuré pour le bon domaine
- [ ] SSL/HTTPS activé
- [ ] Monitoring et logs configurés
- [ ] Backups automatiques activés
- [ ] Webhooks Stripe configurés
- [ ] Tests de paiement réussis
- [ ] Admin account créé
- [ ] GDPR consentements vérifiés
- [ ] Rate limiting envisagé
- [ ] CDN pour les uploads envisagé

---

**Besoin d'aide?** Consultez la documentation des services utilisés ou ouvrez une issue sur GitHub.
