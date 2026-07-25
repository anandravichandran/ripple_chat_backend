# Ripple Chat Application

A full-stack real-time chat application built with **Next.js**, **TypeScript**, **Express.js**, **PostgreSQL (Prisma)**, and **Socket.IO**.

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack React Query
- Axios
- React Hook Form
- Radix UI
- Socket.IO Client

### Backend
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO
- JWT Authentication
- Bcrypt
- Nodemailer

---

# Features

- User Authentication
- Email Verification (OTP)
- JWT Authentication
- Real-time Chat
- Private Rooms
- Public Rooms
- User Profile
- Online / Offline Status
- Notifications
- Admin Dashboard
- Role-based Authorization
- File Upload Support
- Prisma ORM
- PostgreSQL Database
- Responsive UI

---

# working flow after move to dhasboard --> create public any one can join in the public can chat it .

# still invite to another user not working still im wokring on it . 

# admin can monitor everything and delete same as make as admin for the another user all the premission accessing having

# frontend deployed in the vercel but backend also deployed successfully in the render but it have SMTP problem due to the google SMTP mail doesnt allow third party mailer so it has blocked if want to check in the frontend UI and UX check with vercel same as backend also run successfully but i have an error in SMTP  that ( it tired resend,brevo) they asked RESTAPI key which means sender have the own domain.

# Project Structure

```
Ripple Chat
│
├── ripple_chat_application_frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── public/
│   └── package.json
│
└── ripple_chat_backend/
    ├── prisma/
    ├── src/
    ├── uploads/
    ├── package.json
    └── tsconfig.json
```

---

# Prerequisites

Install the following before running the project.

- Node.js 22.x
- npm (comes with Node.js)
- PostgreSQL Database (or Neon PostgreSQL)
- Git

Verify installation:

```bash
node -v
npm -v
```

---

# Backend Installation

Go to backend directory

```bash
cd ripple_chat_backend
```

Install dependencies

```bash
npm install
```

Generate Prisma Client

```bash
npx prisma generate
```

Run Database Migration

```bash
npx prisma migrate dev
```

(Optional) Seed database

```bash
npm run prisma:seed
```

Start backend

```bash
npm run dev
```

Backend runs on

```
http://localhost:4000
```

---

# Frontend Installation

Open another terminal.

Go to frontend

```bash
cd ripple_chat_application_frontend
```

Install packages

```bash
npm install
```

Run frontend

```bash
npm run dev
```

Frontend runs on

```
http://localhost:3000
```

---

# Environment Variables

Create a `.env` file inside the backend project.

Required variables include:

```env
NODE_ENV=development

PORT=4000

CLIENT_URL=http://localhost:3000

DATABASE_URL=<your_postgresql_connection>

JWT_ACCESS_SECRET=<your_secret>

JWT_REFRESH_SECRET=<your_secret>

SMTP_HOST=smtp.gmail.com

SMTP_PORT=587

SMTP_USER=<gmail>

SMTP_PASS=<gmail_app_password>

EMAIL_FROM=<gmail>
```

---

# Available Scripts

## Backend

```bash
npm install
npm run dev
npm run build
npm start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run prisma:studio
```

## Frontend

```bash
npm install
npm run dev
npm run build
npm start
npm run lint
npm run typecheck
```

---

# Demo User Account

If you want to test immediately, use the following account.

**Role**

```
admin
```

**Email**

```
anandravichandran1201@gmail.com
```

**Password**

```
Anand1212#
```
user you can create it 
You may also register a new user from the application.

---

# Running the Application

Start backend

```bash
cd ripple_chat_backend
npm install
npm run dev
```

Open another terminal.

Start frontend

```bash
cd ripple_chat_application_frontend
npm install
npm run dev
```

Visit

```
http://localhost:3000
```

Login using the demo account or create a new account.

---

# Authentication Flow

1. Register
2. Email Verification (OTP)
3. Login
4. JWT Authentication
5. Access Chat Dashboard
6. Join or Create Rooms
7. Start Real-time Messaging

---

# Database

ORM

- Prisma

Database

- PostgreSQL (Neon Compatible)

Generate Prisma Client

```bash
npx prisma generate
```

Run Migration

```bash
npx prisma migrate dev
```

Open Prisma Studio

```bash
npx prisma studio
```

---

# Technologies Used

Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Query
- Axios

Backend

- Express.js
- Prisma
- PostgreSQL
- Socket.IO
- JWT
- Nodemailer
- Bcrypt

---

# Notes for Evaluators

- Clone the repository.
- Configure the backend `.env` file.
- Install dependencies for both frontend and backend.
- Run database migrations.
- Start backend first, then frontend.
- Login using the demo credentials or register a new account.
- Explore user authentication, room management, notifications, and real-time chat functionality.
