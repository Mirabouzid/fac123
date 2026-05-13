# Efficience Recrute - Medical & Dental Recruitment Platform

## Project Overview

A complete full-stack application for medical and dental professionals to find and post job opportunities. Built with **React/TypeScript** frontend and **Node.js/Express** backend with **MongoDB** database.

---

## Architecture

### Backend (Node.js/Express)

- REST API with JWT authentication
- MongoDB database integration
- Role-based access control (Candidate, Employer, Admin)
- Email notifications via SendGrid

**Location:** `/backend`

### Frontend (React + TypeScript)

- Modern UI with Radix UI components
- Real-time authentication context
- Tailwind CSS styling
- Vite build tool

**Location:** `/fac-projet`

---

## Backend Setup

### Installation

```bash
cd backend
npm install
```

### Environment Variables (.env)

```
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_SENDER=your_email@domain.com
JWT_SECRET=your-super-secret-jwt-key
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster
```

### Running the Backend

```bash
npm start          # Production mode
npm run dev        # Development mode with nodemon
```

**Server runs on:** `http://localhost:3000`

### API Endpoints

#### Authentication

- **POST** `/api/auth/signup` - Register new user
- **POST** `/api/auth/login` - Login user

#### Users

- **GET** `/api/users/profile` - Get user profile (requires auth)
- **PUT** `/api/users/profile` - Update user profile (requires auth)

#### Jobs

- **GET** `/api/jobs` - List all jobs
- **GET** `/api/jobs/:id` - Get job details
- **POST** `/api/jobs` - Create new job (employers only)
- **PUT** `/api/jobs/:id` - Update job (job owner or admin)
- **DELETE** `/api/jobs/:id` - Delete job (job owner or admin)

#### Applications

- **GET** `/api/applications` - Get applications (role-based)
- **POST** `/api/applications` - Submit application (candidates)
- **PUT** `/api/applications/:id` - Update application status

---

## Frontend Setup

### Installation

```bash
cd fac-projet
npm install
```

### Running the Frontend

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

**Frontend runs on:** `http://localhost:5173`

### Features by Role

#### Candidates

- Browse and search job offers
- Upload CV and profile information
- Apply to positions
- Track applications

#### Employers

- Post job openings
- View candidate applications
- Manage recruitment pipeline
- Track hiring process

#### Admins

- View all users and applications
- Audit logs
- System settings
- Manage platform content

---

## Database Schema

### User Model

```javascript
{
  email: String (unique),
  password: String (hashed),
  name: String,
  role: String (enum: ['candidate', 'employer', 'admin']),
  cv: String (URL/path),
  skills: [String],
  experience: Number (years),
  company: String,
  phone: String,
  address: String,
  createdAt: Date
}
```

### Job Model

```javascript
{
  title: String,
  description: String,
  requirements: [String],
  location: String,
  salary: { min: Number, max: Number },
  type: String (enum: ['full-time', 'part-time', 'contract']),
  employer: ObjectId (ref: User),
  status: String (enum: ['open', 'closed']),
  createdAt: Date
}
```

### Application Model

```javascript
{
  job: ObjectId (ref: Job),
  candidate: ObjectId (ref: User),
  status: String (enum: ['pending', 'reviewed', 'accepted', 'rejected']),
  coverLetter: String,
  appliedAt: Date
}
```

---

## Authentication Flow

1. **User Registration**
   - POST `/api/auth/signup` with email, password, name, role
   - Backend creates hashed password and new user
   - Welcome email sent via SendGrid

2. **User Login**
   - POST `/api/auth/login` with email and password
   - Backend validates credentials
   - Returns JWT token valid for 24 hours
   - Token stored in localStorage on frontend

3. **Protected Routes**
   - All protected endpoints require `Authorization: Bearer <token>` header
   - Frontend AuthContext automatically adds token to all API calls
   - Backend middleware verifies token and extracts user info

---

## Key Technologies

### Frontend

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **React Router** - Navigation

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **SendGrid** - Email service

---

## Project Structure

```
recrut-projet/
├── backend/
│   ├── app.js
│   ├── package.json
│   ├── .env
│   ├── controls/
│   │   ├── auth.js
│   │   ├── jobs.js
│   │   └── applications.js
│   ├── middleware/
│   │   └── auth.js
│   ├── model/
│   │   ├── user.js
│   │   ├── job.js
│   │   └── application.js
│   └── routes/
│       ├── auth.js
│       ├── users.js
│       ├── jobs.js
│       └── applications.js
│
└── fac-projet/
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── contexts/
    │   │   └── AuthContext.tsx
    │   └── lib/
    │       └── api.ts
    ├── components/
    │   ├── auth/
    │   │   └── login-page.tsx
    │   ├── candidate/
    │   │   ├── candidate-dashboard.tsx
    │   │   ├── cv-upload-form.tsx
    │   │   └── job-offers.tsx
    │   ├── employer/
    │   │   ├── employer-dashboard.tsx
    │   │   ├── post-job-form.tsx
    │   │   └── recruitment-pipeline.tsx
    │   └── admin/
    │       ├── admin-dashboard.tsx
    │       ├── admin-settings.tsx
    │       └── audit-log.tsx
    └── package.json
```

---

## Testing the Integration

### 1. Start Backend

```bash
cd backend
npm start
```

### 2. Start Frontend

```bash
cd fac-projet
npm run dev
```

### 3. Test Registration

1. Open `http://localhost:5173`
2. Select role (Candidate/Employer/Admin)
3. Register with email/password
4. Should see welcome message

### 4. Test Login

1. Use registered credentials
2. Redirected to dashboard
3. Check localStorage for JWT token

### 5. Test Job Features

- **Employers:** Post a job offer
- **Candidates:** Browse and apply to jobs
- **Check Backend:** All API calls logged to console

---

## Common Issues & Solutions

### MongoDB Connection Failed

- Verify MongoDB URI in `.env`
- Check MongoDB Atlas IP whitelist
- Ensure network access enabled

### JWT Token Errors

- Clear localStorage and re-login
- Check `JWT_SECRET` matches between backend and frontend
- Ensure token is sent in `Authorization` header

### CORS Issues

- Backend includes `cors()` middleware
- Ensure frontend API_BASE_URL matches backend origin
- Check browser console for specific CORS errors

### Email Not Sending

- Verify SendGrid API key is valid
- Check sender email is verified in SendGrid
- Review SendGrid dashboard for delivery status

---

## Future Enhancements

- [ ] Video interview integration
- [ ] Advanced analytics dashboard
- [ ] Email templates customization
- [ ] Payment integration for premium features
- [ ] Mobile app (React Native)
- [ ] Social media login (OAuth)
- [ ] Real-time notifications (WebSockets)
- [ ] Automated resume parsing
- [ ] Job recommendations algorithm

---

## Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

---

## License

ISC License - See LICENSE file for details

---

## Support

For issues or questions, contact: jemaanassim480@gmail.com
