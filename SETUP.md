# Quick Start Guide - Efficience Recrute

## ⚡ 5-Minute Setup

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier available)
- SendGrid account (free tier available)

### Step 1: Backend Setup (2 minutes)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
```

**Expected Output:** Server running on http://localhost:3000

### Step 2: Frontend Setup (2 minutes)

```bash
cd fac-projet
npm install
npm run dev
```

**Expected Output:** Frontend running on http://localhost:5173

### Step 3: Test the Application (1 minute)

1. Open `http://localhost:5173` in browser
2. Click on role (Candidate, Employer, or Admin)
3. Click "S'inscrire" to create account
4. Use new credentials to login

---

## 📋 Configuration Checklist

### Backend (.env)

- [ ] MongoDB URI from Atlas
- [ ] SendGrid API Key
- [ ] SendGrid sender email verified
- [ ] JWT_SECRET set to random string

### Frontend (lib/api.ts)

- [ ] API_BASE_URL points to `http://localhost:3000/api`

### Database

- [ ] MongoDB Atlas cluster created
- [ ] Network access enabled for your IP
- [ ] User created with appropriate permissions

---

## 🚀 Key Features

### Candidates Can:

- Register and manage profile
- Upload/update CV and skills
- Browse job openings
- Apply to positions
- Track applications

### Employers Can:

- Register company
- Post job openings
- View applications
- Manage recruitment pipeline
- Track hiring progress

### Admins Can:

- View all users
- Monitor all applications
- Access audit logs
- Manage system settings

---

## 📁 Important File Locations

| File                                      | Purpose                       |
| ----------------------------------------- | ----------------------------- |
| `backend/.env`                            | Backend environment variables |
| `backend/app.js`                          | Main Express server           |
| `backend/model/*`                         | Database schemas              |
| `backend/controls/*`                      | Business logic                |
| `fac-projet/src/contexts/AuthContext.tsx` | Authentication state          |
| `fac-projet/src/lib/api.ts`               | API service client            |
| `fac-projet/src/App.tsx`                  | Main routing logic            |

---

## 🔍 Troubleshooting

### Backend won't start

```bash
# Check Node version
node --version

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### MongoDB Connection Error

```
Error: querySrv ENOTFOUND
```

**Solution:**

1. Verify MONGODB_URI in .env is correct
2. Check MongoDB Atlas IP whitelist settings
3. Ensure cluster is active

### Frontend can't reach backend

```
Error: Failed to fetch from http://localhost:3000
```

**Solution:**

1. Ensure backend is running on port 3000
2. Check CORS is enabled in backend
3. Verify API_BASE_URL in `lib/api.ts`

### JWT Token Invalid

```
Error: Token invalid or expired
```

**Solution:**

1. Clear localStorage in browser DevTools
2. Re-login
3. Check JWT_SECRET matches backend .env

---

## 📞 Support & Resources

- **Backend Issues:** Check backend/.logs or console output
- **Frontend Issues:** Check browser DevTools > Console
- **Database Issues:** Check MongoDB Atlas dashboard
- **Email Issues:** Check SendGrid dashboard for delivery status

---

## 🔒 Security Notes

⚠️ **Before Production:**

1. Change `JWT_SECRET` to a random 32+ character string
2. Use environment-specific `.env` files
3. Enable HTTPS
4. Add rate limiting
5. Implement CSRF protection
6. Add input validation on all endpoints
7. Setup proper CORS whitelist
8. Use secure password requirements
9. Implement refresh tokens
10. Add logging and monitoring

---

## 📚 Next Steps

1. **Customize:** Modify colors, texts, and branding
2. **Add Features:** Email verification, password reset, 2FA
3. **Deploy:** Use services like Heroku, AWS, or Vercel
4. **Monitor:** Setup error tracking (Sentry) and analytics
5. **Scale:** Optimize database queries and add caching

---

## 💡 Development Tips

### Enable Debug Logging

```javascript
// In backend app.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

### Test API Endpoints

Use Postman or VS Code REST Client:

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Monitor Database Queries

```javascript
mongoose.set("debug", true);
```

---

**Last Updated:** May 1, 2026
**Version:** 1.0.0
