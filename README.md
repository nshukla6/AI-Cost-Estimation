# AI Cost Estimation App

A dashboard for tracking AI vendor spend (Claude, OpenAI, Cursor, etc.)
across an organisation — by user, department, or the whole org. AI Tool
Admins upload monthly vendor cost sheets; AI Cost Managers get org-wide
reporting and downloadable exports; Viewers see their own (and, if they
manage people, their team's) usage.

## Tech stack

React + TypeScript + Vite, React Router, Tailwind CSS v4 + shadcn/ui,
TanStack React Query, Sonner.

## Getting started

```bash
npm install
cp .env.example .env.local   # point VITE_API_BASE_URL at your backend
npm run dev
```

## Project structure

```
src/
  config/        app identity, navigation, and role→permission config
  components/
    generic/     reusable, domain-agnostic UI (DataTable, SideSheet, FormField)
    layout/      app shell (Sidebar, Header, AppLayout)
    ui/          shadcn/ui primitives
    AuthContext.tsx   SSO (SAML) + Basic Auth, hasPermission()
  lib/api/       one *.api.ts file per feature, built on a shared apiRequest()
  pages/         Dashboard, Departments, Team, My Usage, Login, admin/*
  types/         domain types matching the backend API
```

See `docs/` for the original build prompt, button/color reference, and
error-notification conventions this app follows.

## Roles

| Role | Can do |
| --- | --- |
| Viewer | See own usage; team usage if they manage reports |
| AI Cost Manager | Org/department reporting, downloadable reports |
| AI Tool Admin | Manage vendors, upload cost sheets, manage user roles — no downloads |

## API

Endpoints are documented in `docs/AI_Cost_Tracking_API_Design.docx`
(base path `/api/v1`, Bearer JWT auth).
