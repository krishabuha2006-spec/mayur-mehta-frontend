# Mayur Mehta Design - Architectural Practice Management Platform

Modern, multi-tenant enterprise frontend web application for Mayur Mehta Design practice and platform administration.

- **Stack:** React 18, Vite 6, React Router 6, Axios, Recharts, Lucide Icons
- **Design System:** Architectural Taupe (`#7A6A58`), Champagne Accent (`#B89A74`), Warm Sand (`#F6F2EC`), Obsidian Charcoal (`#1E1A17`)
- **Backend Integration:** 100% Dynamic, RESTful API driven via Axios with silent token refresh, strict validation, and role-based access control.

---

## Project Structure

```
frontend/
├── .env                  # Active environment variables
├── vite.config.js        # Vite build & reverse-proxy configuration
├── package.json          # Dependencies and build scripts
├── index.html            # Single page app entry HTML
├── public/               # Static assets, favicon, official logos
└── src/
    ├── components/       # Reusable UI components
    │   ├── common/       # Atomic widgets (Button, Modal, Input, Badge, Table, Cards)
    │   ├── guards/       # ProtectedRoute, RoleGuards, Session boundary
    │   ├── layout/       # AppLayout, Header (Universal Search), Sidebar, Breadcrumbs
    │   └── dashboard/    # Modular KPI & analytics widgets
    ├── config/           # Application configuration & theme presets
    ├── constants/        # Enums, Routes, Messages, Navigation registry
    ├── context/          # React Contexts (AuthContext, AdminAuthContext, ThemeContext)
    ├── hooks/            # Custom React hooks (useAuth, useGreeting, utilityHooks)
    ├── pages/            # View pages (Projects, Tasks, Dashboard, Admin, Billing, etc.)
    ├── services/         # API service layer (apiClient, projectService, taskService, etc.)
    ├── styles/           # Design system tokens, reset, typography, and utility classes
    └── utils/            # Pure helper utilities (errorHandler, formatDate, formatCurrency)
```

---

## Environment Setup

Create or adjust `.env` in the `frontend` root:

```env
# Backend Server Base URL (set to live URL or local development backend)
VITE_BACKEND_URL=https://mayurmaheta.vercel.app

# API Path Prefix
VITE_API_URL=/api/v1

# App Meta
VITE_APP_NAME=Mayur Mehta Design
VITE_SUPPORT_EMAIL=support@mayurmehtadesign.com
```

---

## Development & Build

```bash
# Install dependencies
npm install

# Start local development server (http://localhost:5173)
npm run dev

# Compile production build
npm run build

# Preview production build locally
npm run preview
```
