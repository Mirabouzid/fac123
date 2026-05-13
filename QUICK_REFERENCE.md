# 🎯 Quick Reference Card

## Start Development

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd fac-projet
npm run dev

# Open Browser
http://localhost:5173
```

---

## Quick API Calls

### Sign Up

```bash
POST http://localhost:3000/api/auth/signup
{
  "email": "john@example.com",
  "password": "Pass123!",
  "name": "John Doe",
  "role": "candidate"
}
```

### Login

```bash
POST http://localhost:3000/api/auth/login
{
  "email": "john@example.com",
  "password": "Pass123!"
}
```

### Get Profile

```bash
GET http://localhost:3000/api/users/profile
Authorization: Bearer <JWT_TOKEN>
```

### List Jobs

```bash
GET http://localhost:3000/api/jobs
```

### Apply for Job

```bash
POST http://localhost:3000/api/applications
Authorization: Bearer <JWT_TOKEN>
{
  "jobId": "64f9c3b2a1d2e3f4g5h6i7j8"
}
```

---

## Default Ports

| Service  | Port  | URL                   |
| -------- | ----- | --------------------- |
| Backend  | 3000  | http://localhost:3000 |
| Frontend | 5173  | http://localhost:5173 |
| MongoDB  | Cloud | Atlas                 |

---

## Environment Variables

### Backend (.env)

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_SENDER=sender@domain.com
```

---

## Login Test Accounts

After registration, use these credentials:

- Email: your-registered-email@example.com
- Password: your-chosen-password

---

## Key Endpoints

**Authentication**

- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login

**Users**

- `GET /api/users/profile` - Get profile
- `PUT /api/users/profile` - Update profile

**Jobs**

- `GET /api/jobs` - List all
- `GET /api/jobs/:id` - Get single
- `POST /api/jobs` - Create (employer only)
- `PUT /api/jobs/:id` - Update (employer only)
- `DELETE /api/jobs/:id` - Delete (employer only)

**Applications**

- `GET /api/applications` - List (role-filtered)
- `POST /api/applications` - Submit (candidate only)
- `PUT /api/applications/:id` - Update status (employer/admin)

---

## User Roles

**Candidate**

- Browse jobs
- Apply to positions
- Manage profile & CV
- Track applications

**Employer**

- Post jobs
- View applications
- Manage hiring
- Update statuses

**Admin**

- View all data
- Manage system
- Access audit logs
- Modify settings

---

## Common Issues & Fixes

| Issue                  | Solution                              |
| ---------------------- | ------------------------------------- |
| Backend won't start    | `npm install`, check port 3000        |
| Frontend can't connect | Ensure backend running, check CORS    |
| Login fails            | Verify email/password, check DB       |
| MongoDB error          | Check connection string, IP whitelist |
| Email not sent         | Verify SendGrid API key               |
| Token invalid          | Clear localStorage, login again       |

---

## Debug Commands

```bash
# Check backend running
curl http://localhost:3000/api/jobs

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Check token
console.log(localStorage.getItem('token'))
```

---

## File Locations

| File            | Location                  |
| --------------- | ------------------------- |
| Backend config  | backend/.env              |
| Frontend API    | fac-projet/src/lib/api.ts |
| Auth logic      | backend/controls/auth.js  |
| Database models | backend/model/            |
| Components      | fac-projet/components/    |
| Documentation   | README.md, SETUP.md       |

---

## Documentation Map

| File           | Contains            |
| -------------- | ------------------- |
| README.md      | Full technical docs |
| SETUP.md       | 5-min quick start   |
| INTEGRATION.md | Architecture guide  |
| CHECKLIST.md   | Completion status   |
| This file      | Quick reference     |

---

## Next 5 Minutes

1. ✅ Run `npm start` in backend/
2. ✅ Run `npm run dev` in fac-projet/
3. ✅ Open http://localhost:5173
4. ✅ Register new account
5. ✅ Test login flow

---

**Project Status:** ✅ READY TO USE

For more info → See README.md
