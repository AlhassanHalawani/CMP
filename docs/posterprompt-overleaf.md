# Poster Prompt for LaTeX Overleaf

Replace the bracketed placeholders before using this prompt.

```text
Generate a complete, compilable LaTeX poster for Overleaf as a single `.tex` file for an A1 portrait academic poster about a software engineering project called "FCIT Clubs Management Platform (CMP)".

The poster must be designed for Overleaf and should compile cleanly using standard Overleaf packages only. Prefer a poster-friendly LaTeX setup such as `tikzposter`, `beamerposter`, or an equivalent layout that reliably supports A1 portrait formatting. The output must be self-contained and must not depend on external image assets, custom fonts, or local files. If icons are needed, create them with simple TikZ shapes or omit them.

Visual style:
- Match a light-mode neobrutalist web app design
- Pale lavender page background
- White secondary panels
- Strong purple accent color
- Black borders with square corners
- Hard offset shadows on content cards
- High-contrast black typography
- Subtle black grid background across the full poster
- Bold, modern, dashboard-like composition
- No dark mode
- No glossy gradients
- No rounded glassmorphism
- No stock photos

Use a subtle page-wide grid in the background, similar to a dashboard canvas. Use thick bordered rectangular content blocks with clear spacing and hierarchy. The design should feel like a polished poster adaptation of a React admin dashboard with neobrutalist cards.

Important output requirements:
- Return only the LaTeX code for the final poster
- Make sure the code is complete and compilable in Overleaf
- Use comments in the LaTeX to mark where I can replace the official header and names
- Do not invent fake results, statistics, percentages, or evaluation numbers
- Keep the poster fully in English
- Keep the layout balanced and readable from a distance
- Use concise academic poster wording

Poster format and structure:
1. A full-width reserved top header area with a visible placeholder labeled "Insert official poster-day header here"
2. A title block under the header with:
   - Project title: FCIT Clubs Management Platform (CMP)
   - Subtitle: A full-stack bilingual platform for managing university clubs, events, attendance, KPI reporting, and achievement verification
   - Name placeholders:
     - Student 1: [Your Name]
     - Student 2: [Partner Name]
     - Supervisor: [Supervisor Name]
3. A full-width Abstract section
4. A two-column middle section:
   - Left column: Problem and Solution
   - Right column: Key Features and Tools Used
5. A full-width Architecture section below that with a layered system diagram drawn in LaTeX using TikZ
6. A bottom row with two panels:
   - Left: Impact / Expected Benefits
   - Right: Future Work and Demo / QR placeholder

Design instructions for the LaTeX layout:
- Use A1 portrait dimensions
- Keep margins modest but not too tight
- Use large bold sans-serif headings
- Use medium-sized body text with good line spacing
- Make section headers visually prominent
- Use rectangular blocks with thick black outlines
- Use hard-shadow styling by offsetting a darker rectangle behind key blocks if possible
- Keep all corners square
- Use purple accent labels or bars for emphasis
- Use black arrows and labeled blocks in the architecture diagram
- Make the Abstract and Architecture sections slightly larger than the others

Use the following exact content, but improve line breaks and typographic formatting for poster readability without changing the meaning.

Title:
FCIT Clubs Management Platform (CMP)

Subtitle:
A full-stack bilingual platform for managing university clubs, events, attendance, KPI reporting, and achievement verification.

Abstract:
FCIT Clubs Management Platform (CMP) is a full-stack web application designed to unify club operations at the Faculty of Computing and Information Technology at King Abdulaziz University. Instead of relying on disconnected forms, spreadsheets, and manual follow-up, CMP centralizes club profiles, event management, QR-based attendance, role-based access control, KPI dashboards, and verifiable achievement reports in one bilingual platform. The system improves operational efficiency, data accuracy, transparency, and recognition of student participation while providing a scalable foundation for future university club services.

Problem:
- Club operations are often scattered across multiple tools and manual processes.
- Event approvals and follow-up can be slow and inconsistent.
- Attendance verification is difficult to manage accurately at scale.
- Student achievements and club KPIs are hard to track in a reliable, unified way.

Solution:
- A centralized web platform for students, club leaders, supervisors, and admins.
- Structured event lifecycle and club management workflows.
- QR-based attendance to reduce manual check-in errors.
- KPI dashboards and verified reports to support data-driven decisions and recognition.

Key Features:
- Event lifecycle management for club activities
- QR-based event attendance check-in
- KPI dashboards and club leaderboards
- Verified achievement reports with QR validation
- Secure role-based authentication and authorization
- English and Arabic support with RTL readiness

Architecture:
Create a clean layered architecture diagram using these blocks:
- Users: Students, Club Leaders, Supervisors, Admins
- Frontend: React 19, Vite, TypeScript, Tailwind CSS, Radix UI
- Backend API: Node.js, Express, TypeScript
- Data Layer: SQLite
- Authentication: Keycloak with OIDC
- Platform Services: QR generation, PDF reporting, notifications, analytics
- Deployment: Docker, k3s on Raspberry Pi cluster, Nginx Ingress, Cloudflare

Tools Used:
- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4, Radix UI
- Backend: Node.js, Express, TypeScript
- Data and Auth: SQLite, Keycloak, OIDC
- Supporting Libraries: React Query, i18next, Recharts, QR and PDF tooling
- Deployment: Docker, k3s, Nginx Ingress, Cloudflare

Impact / Expected Benefits:
- Reduces fragmented club administration workflows
- Improves attendance accuracy and operational traceability
- Supports transparent event approval and management
- Makes student achievements and club performance easier to measure and verify
- Creates a stronger digital foundation for university club operations

Future Work:
- Expand notification workflows and communication channels
- Strengthen semester KPI exports and analytics views
- Extend membership and club engagement features
- Continue production hardening and deployment improvements

Demo / QR Placeholder:
Include a clearly labeled placeholder box where a QR code or demo link can be added later.

Implementation guidance:
- Add comments in the LaTeX source for editable placeholders
- Keep the code organized and readable
- If needed, define a small custom color palette with names such as `cmpbg`, `cmpaccent`, `cmppanel`, and `cmpborder`
- Use TikZ for the architecture diagram and optional header/demo placeholders
- Avoid fragile package combinations that often fail on Overleaf
- Prioritize compile reliability and clean visual structure
```
