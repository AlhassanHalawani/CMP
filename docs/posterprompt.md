# Poster Prompt for Canva

Replace the bracketed placeholders before using this in Canva AI.

```text
Create an A1 portrait academic poster for a university Poster Day presentation about a software engineering project called "FCIT Clubs Management Platform (CMP)". I will provide the official header separately, so reserve a full-width header area at the very top for that external header and do not invent a different university banner.

Match the visual style of an existing web app that uses light-mode neobrutalism. The poster should feel bold, clean, playful, and academic at the same time. Use a pale lavender main background, white secondary panels, a vivid purple accent color, black 2 px borders, square corners, and hard black drop shadows around cards and buttons. Use a subtle black grid background across the page with evenly spaced lines, similar to a 56 px grid. Keep everything high-contrast and readable from a distance. Avoid dark mode, glossy effects, gradients, glassmorphism, soft shadows, and stock photos.

Use a strong top-to-bottom reading flow with clear section hierarchy. Keep the layout polished and information-dense but not crowded.

Poster layout:
1. A reserved full-width top header strip labeled "Insert official poster-day header here".
2. A title block directly under the header with:
   - Project title: FCIT Clubs Management Platform (CMP)
      - Subtitle: A full-stack bilingual platform for managing university clubs, events, attendance, KPI reporting, and achievement verification
         - Team placeholders:
              - Student 1: [Your Name]
                   - Student 2: [Partner Name]
                        - Supervisor: [Supervisor Name]
                        3. A full-width Abstract card below the title block.
                        4. A two-column middle section:
                           - Left column: Problem and Solution
                              - Right column: Key Features and Tools Used
                              5. A full-width Architecture section under the middle section with a clean layered system diagram.
                              6. A bottom row with two panels:
                                 - Left: Impact / Expected Benefits
                                    - Right: Future Work or Demo / QR placeholder

                                    Design direction:
                                    - Use bold section headers inside rectangular label tags.
                                    - Use large black headings and medium-weight body text.
                                    - Use rectangular cards with thick borders and hard shadows.
                                    - Add small iconography for clubs, calendar/events, QR attendance, analytics, reports, and security.
                                    - Use arrows and simple labeled blocks in the architecture area.
                                    - Make the abstract and architecture sections slightly larger than the others because they are the anchors of the poster.
                                    - Keep consistent spacing, alignment, and visual rhythm.
                                    - The result should look like the poster version of a modern React dashboard with neobrutalist cards.

                                    Use the following exact poster content, but feel free to improve line breaks and typography without changing the meaning.

                                    Title:
                                    FCIT Clubs Management Platform (CMP)

                                    Subtitle:
                                    A full-stack Gamified platform for managing university clubs, events, attendance, KPI reporting, and achievement verification.

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
                                    Show a layered architecture diagram with arrows using these blocks:
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
                                    - Supporting Libraries: React
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

                                    Important constraints:
                                    - Do not invent fake statistics, accuracy percentages, or evaluation numbers.
                                    - Do not use screenshots unless they are represented as clean placeholder frames.
                                    - Keep the poster fully in English.
                                    - Preserve an academic tone, but make it visually bold and contemporary.