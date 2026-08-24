# AI Cost Estimation App — Build Prompt

Project Summary:

Build a new React application called "AI Cost Estimation App" — a tool for
tracking and estimating AI usage costs (models, pricing, usage and reports to download) for internal use.

Project Description:

AI Cost Estimation App is to keep track on AI cost of organisation,various departments, users with various AI tool licenses like(Open AI, claude, lovable, etc.)
An org has various departments and one department have many users, and one user can use many AI tools,
we want to design a dashboard where leadership can see the statistics for any user, any department or group of departments and the whole org.

Managers can also see the usage of their reportee.

AI tool admin  will upload a cost sheet in csv/excel format for every AI vendor and we need to put that csv/excel in our database.

Later we will fetch this data in form of UI tables.

our app has three roles:

1. Viewer - an individual user or a manager
2. AI cost manager - can view org,departments,user data and also can download reports.(every screen has download report button with date filter )
3. AI Tool Admin - can upload cost sheet in csv/excel , can see all the screens but can not download the reports.



## TECH STACK
- React + TypeScript, Vite, React Router
- Tailwind CSS v4 + shadcn/ui components
- TanStack React Query for API calls
- Sonner for toast notifications
- Inter font (Google Fonts)

## ARCHITECTURE
- /config/app.config.ts       — app identity, API base URL, branding, feature flags
- /config/navigation.config.ts — sidebar menu items (role-restricted)
- /config/roles.config.ts     — roles, permissions, role→permission map
- /components/generic/        — DataTable, SideSheet, FormField (reusable, no
  domain logic)
- /components/AuthContext.tsx — SSO (SAML) + Basic Auth, hasPermission() checks
- /lib/api/                   — one *.api.ts file per feature, apiRequest() client
- /pages/                     — Home, Dashboard, Admin (user management), plus
  feature pages for this domain

## AUTHENTICATION
- Dual auth: SSO (SAML) and Basic Auth, both toggleable via config
- Role-based access control gating both routes and individual buttons/actions

## API used to fetch the data

Please use @docs/AI_Cost_Tracking_API_Design.docx
for API endpoints.

ignore phase-2 endpoints

## THEME — reuse exactly, do not invent new colors
- Primary action buttons: bg-[#1b3e65], hover bg-[#0a273d], white text
- Outline/secondary buttons: standard shadcn outline variant
- Active tab: bg-[#6ebbee] with white text; inactive tab hover: bg-[#def2ff]
- Logo container background: bg-[#059688] (teal), rounded-2xl
- Destructive/alert badges: bg-[#ef5858]
- Selected checkbox: bg-[#1b3e65] border-[#1b3e65]
- Font: Inter (400/500/600/700), base font-size 16px
- Border radius: 0.625rem (shadcn default), light theme only unless dark
  mode is explicitly requested
- Toasts: Sonner, always position 'top-right', success/error/info/warning
  variants

## FEATURE PAGES FOR THIS APP (adjust as needed)

1. Dashboard- where all org data will be there

Header- Total Spend, Active licenses(total ai users),total number of departments

Main - Table

Department|Spend|Top Tool|

2. Department - where per user spend on all AI tools in left Table and total department spend by various AI tools/model in right area.
 2a. Engineering
 2b. Sales
 2c. Marketing
 2d. IT

User | Spend 

3. User - where a logged in user can see his/her spend data, total spend data, per tool basis spend data in tabular format.






## VALIDATION / ERROR HANDLING CONVENTIONS
- Toast on validation failure before submit (e.g. "Please fill in all
  mandatory fields")
- Toast on API success/failure after mutations, with fallback message
  "Failed to [create/update/delete] [entity]"
- Disable submit buttons until required fields are filled and (in edit mode)
  until something has actually changed
- Session expiry (401/403) clears auth storage and redirects to
  /login?reason=session_expired with a toast

Do not add ISMS-specific concepts (audits, questionnaires, controls) — this
is a clean instantiation of the generic template for the AI Cost Estimation
domain only.

---
## Refer below files for any clarifiation

- docs/SETUP.md — config walkthrough, just update the example values
- docs/CUSTOMIZATION.md — component/API/theming patterns, no ISMS content
- docs/TEMPLATE_SUMMARY.md — template feature overview

- docs/INSTANTIATION_SUMMARY.md → new version documenting the new app's actual
  config once set (app name, API URLs, branding)

- docs/guidelines/Guidelines.md — follow for project guidelines

- docs/BUTTON_COLORS_REFERENCE.md - for button colors
- docs/ERROR_NOTIFICATIONS_GUIDE.md - for error notification


Ask clarifying questions if any.