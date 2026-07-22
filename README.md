<div align="center">
  <div style="background: linear-gradient(135deg, #2575ff, #6d3cf0); width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
    <h1 style="color: white; margin: 0; font-family: sans-serif; font-size: 32px;">H</h1>
  </div>
  <h1>Helix</h1>
  <p><strong>The world's most premium AI-native Project Management Platform.</strong></p>
  <p>Ship faster. Think clearer. Designed for teams who demand speed without sacrificing clarity.</p>
</div>

<br />

## ✦ Overview

Helix is a state-of-the-art project management platform featuring an award-worthy, handcrafted UI, enterprise-grade architecture, and seamless AI integration. Built from the ground up for engineering teams that move fast, Helix offers issue tracking, sprint cycles, and automated workflows, wrapped in a breathtaking visual design system.

## ✦ Features

- **Premium UI/UX:** A bespoke, timeless design system with fluid micro-animations, glassmorphism, and a highly polished dark/light mode experience.
- **AI-Native Intelligence:** Built-in AI assistant to surface insights, manage tasks, and predict blockers.
- **Secure Authentication:** Robust JWT-based auth system with HTTP-only cookies, automatic token refresh, and Google/GitHub OAuth integrations.
- **High-Performance Architecture:** Lightning-fast backend built with FastAPI and a modern Next.js App Router frontend.
- **Real-Time Ready:** Architecture prepared for live cursors, presence indicators, and instant sync.

## ✦ Tech Stack

### Frontend (`/frontend`)
- **Framework:** Next.js 15 (App Router), React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Framer Motion, Radix UI
- **State Management:** Zustand, TanStack Query
- **Forms & Validation:** React Hook Form, Zod

### Backend (`/backend`)
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL with SQLAlchemy & Alembic
- **Authentication:** OAuth2 (Google/GitHub), JWT with refresh token rotation
- **Security:** Passlib (Bcrypt), RBAC policies

### Halo Landing Page (`/halo-landing`)
- A premium, fintech-style standalone landing page for a stablecoin product built with React, Vite, and Tailwind CSS.

## ✦ Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- PostgreSQL

### 1. Backend Setup

```bash
cd backend
# Install dependencies using Poetry
poetry install

# Set up environment variables
cp .env.example .env

# Run database migrations
poetry run alembic upgrade head

# Start the API server
poetry run uvicorn src.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start the development server
npm run dev
```

### 3. Halo Landing Page (Optional)

```bash
cd halo-landing
npm install
npm run dev
```

## ✦ Development

- Backend runs at `http://localhost:8000`
- API documentation is available at `http://localhost:8000/docs`
- Frontend runs at `http://localhost:3000`
- Halo landing runs at `http://localhost:5173`

## ✦ Architecture & Security

- **OAuth Flow:** Secure server-side OAuth flow with temporary code exchange. Access and refresh tokens are securely transmitted and stored.
- **CORS:** Strictly configured CORS origins for local and production environments.
- **Design Tokens:** Comprehensive CSS variable-based design token system in `globals.css` driving the Tailwind v4 integration.

<br />

<div align="center">
  <sub>Built with precision and passion.</sub>
</div>
