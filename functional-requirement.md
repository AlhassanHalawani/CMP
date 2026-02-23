\subsection{Functional Requirements}

% Overview table retained for quick reference
\begin{table}[h!]
\centering

\begin{tabularx}{\textwidth}{|p{1.7cm}|X|p{1.8cm}|p{3.6cm}|}
\hline
\textbf{ID} & \textbf{Title} & \textbf{Priority} & \textbf{Primary Actor(s)} \\
\hline
FR-001 & Student Achievement Report Generation & High & Student \\
FR-002 & Event Approval Workflow & High & Club manager, Supervisor/admin \\
FR-003 & QR Code Attendance Tracking & High & Student, Club manager \\
FR-004 & Semester KPI Report Generation & High & Supervisor/admin \\
FR-005 & Club Registration \& Membership & High & Student, Club manager \\
FR-006 & User Authentication \& Authorization (SSO RBAC) & High & Student, Club manager, Supervisor/admin \\
FR-007 & Event Calendar \& Discovery & Medium & Student \\
FR-008 & Notification System & Medium & Student, Club manager, Supervisor/admin \\
FR-009 & Club Profile Management & Medium & Club manager \\
FR-010 & Attendance Report for Club Managers & Medium & Club manager \\
\hline
\end{tabularx}
\caption{Overview of Functional Requirements}\label{tab:fr-overview}
\end{table}

\vspace{0.6em}

% -------- FR CARDS (Unnumbered, compact narrative style) --------
\clearpage
\noindent\textbf{FR-001 — Student Achievement Report Generation}\\
\textbf{UserStory:} As a \emph{Student}, I want to view and download a verified report of my achievements for a selected term so I can present official proof of participation and awards.\\
\textbf{Priority:} High\\
The reason why we placed this priority as high, Is because it was mentioned by The stakeholders as One of the most important features to have in the system.\\
\textbf{FunctionalDetails:}\\ Students select a semester and optional filters (activity type, club). The system compiles verified attendances, awards, and volunteer hours into a formatted PDF. Each report includes student name/ID, term range, summary totals, and a verification code/QR for authenticity checks.\\
\textbf{AcceptanceCriteria:}\\ (1) Report reflects only verified data;\\ (2) Generated PDF contains student identifiers, term, entries, and totals;\\ (3) Unique verification code/QR is present;\\ (4) Regeneration with unchanged data yields identical results.

\vspace{0.6em}

\noindent\textbf{FR-002 — Event Approval Workflow}\\
\textbf{UserStory:} As a \emph{Club manager}, I want to submit event proposals and receive timely approvals from the \emph{Supervisor/admin} so events appear tIn order for it to be a club management platform. It needs some basic functionalities like CRUD And admins should be able to approve or reject those.\\
\textbf{FunctionalDetails:}\\ Club managers draft proposals with objectives, schedule, venue, capacity, and resources, then submit for review. Supervisor/admin users approve or return with comments. States include Draft, Submitted, Approved, and Rejected. All decisions carry timestamps and are recorded in immutable audit logs. Only Approved events are discoverable by Students.\\
\textbf{AcceptanceCriteria:}\\ (1) Manager can submit a complete proposal;\\ (2) Supervisor/admin can approve or reject with notes;\\ (3) State transitions are logged;\\ (4) Only Approved events appear on the student calendar;\\ (5) Returned proposals preserve prior inputs for quick resubmission.
\clearpage

\noindent\textbf{FR-003 — QR Code Attendance Tracking}\\
\textbf{UserStory:} As a \emph{Student}, I want to check in quickly at events via QR so my attendance is captured without manual queues.\\
\textbf{Priority:} High\\
One of the features we mentioned to the stakeholders and they approved that this is a requirement that is good to have in the system.\\
\textbf{FunctionalDetails:}\\ Each Approved event generates a secure QR check-in endpoint. Students scan on-site; the system validates eligibility (e.g., capacity, time window) and prevents duplicates. Club managers can open/close check-in windows and later finalize the session.\\
\textbf{AcceptanceCriteria:}\\ (1) Successful scan records a single attendance per Student per event;\\ (2) Closed sessions reject new scans;\\ (3) Capacity rules are enforced;\\ (4) Timestamps and event IDs are stored;\\ (5) Attendance appears in Student history and club summaries.

\vspace{0.6em}

\noindent\textbf{FR-004 — Semester KPI Report Generation}\\
\textbf{UserStory:} As a \emph{Supervisor/admin}, I want standardized KPI reports so I can recognize top Students and clubs for a semester.\\
\textbf{Priority:} High\\
This was mentioned by the stakeholders as one of the main functional requirements that they want in the system.\\
\textbf{FunctionalDetails:}\\ The reporting console aggregates verified attendances and achievements to compute KPIs (e.g., participation counts, hours, awards) for Students and clubs. Filters include department, club, and date range. Outputs support on-screen review and export to CSV/PDF.\\
\textbf{AcceptanceCriteria:}\\ (1) Selecting a semester produces deterministic KPI values;\\ (2) Leaderboards list top Students/clubs with tied ranks handled;\\ (3) Exports match on-screen results;\\ (4) Date/club filters narrow results correctly;\\ (5) Only Approved events and verified achievements contribute.

\clearpage
\noindent\textbf{FR-005 — Club Registration \& Membership}\\
\textbf{UserStory:} As a \emph{Student}, I want to join and leave clubs easily so my membership stays current.\\
\textbf{Priority:} High\\
Its high priority because It is basic functionalities for a management system. \\
\textbf{FunctionalDetails:}\\ Students request membership from a club profile. Club managers approve or decline. Membership status (Pending, Active, Inactive) is tracked with dates. Members receive club communications and see member-only events if configured.\\
\textbf{AcceptanceCriteria:}\\ (1) Student can request membership;\\ (2) Club manager can approve/decline;\\ (3) Status updates appear immediately;\\ (4) Active members are eligible for member-only events;\\ (5) Leaving a club updates status to Inactive and stops member messages.

\vspace{0.6em}

\noindent\textbf{FR-006 — User Authentication \& Authorization (SSO RBAC)}\\
\textbf{UserStory:} As a \emph{Supervisor/admin}, I need secure sign-in and role-based permissions so users only see what they are allowed to manage.\\
\textbf{Priority:} High\\
Basic functionalities for any system with role based access control.\\
\textbf{FunctionalDetails:}\\ CMP integrates with university SSO (OIDC/SAML). Roles (Student, Club manager, Supervisor/admin) constrain navigation and API access. Sessions expire after inactivity; all privileged actions are logged.\\
\textbf{AcceptanceCriteria:}\\ (1) SSO login succeeds for valid users;\\ (2) Role determines visible menus and endpoints;\\ (3) Unauthorized actions are blocked with clear messaging;\\ (4) Session timeout enforced;\\ (5) Audit logs capture actor, action, timestamp.

\clearpage
\noindent\textbf{FR-007 — Event Calendar \& Discovery}\\
\textbf{UserStory:} As a \emph{Student}, I want to browse and filter upcoming events so I can plan my participation.\\
\textbf{Priority:} Medium\\
\textbf{FunctionalDetails:}\\ The calendar lists Approved events with filters for date, club, category, and location. Each event page shows details, available seats, and registration actions. Calendar and individual events support ICS export.\\
\textbf{AcceptanceCriteria:}\\ (1) Only Approved events are listed;\\ (2) Filters narrow results correctly;\\ (3) Event detail pages show capacity and registration state;\\ (4) ICS export imports into common calendar clients;

\vspace{0.6em}

\noindent\textbf{FR-008 — Notification System}\\
\textbf{UserStory:} As a \emph{Student} or \emph{Club manager}, I want timely notifications about approvals, reminders, and report availability.\\
\textbf{Priority:} Medium\\
\textbf{FunctionalDetails:}\\ Users can opt in to email or WhatsApp notifications. Triggers include event approval decisions, registration confirmations, reminders before start time, and report/KPI generation completion. Preferences are editable per user.\\
\textbf{AcceptanceCriteria:}\\ (1) Opt-in settings control delivery;\\ (2) Event approval sends a message to the submitting Club manager;\\ (3) Registered Students receive a reminder before the event;\\ (4) Notifications include clear action links;\\ (5) Delivery status is logged.
\vspace{0.6em}

\noindent\textbf{FR-009 — Club Profile Management}\\
\textbf{UserStory:} As a \emph{Club manager}, I want to maintain an accurate club profile so Students can discover and trust our activities.\\
\textbf{Priority:} Medium\\
\textbf{FunctionalDetails:}\\ Managers can edit club name, description, logo, contact channels, and showcase recent events. Public pages display verified stats and upcoming events.\\
\clearpage
\textbf{AcceptanceCriteria:}\\ (1) Only the Club manager can modify the profile;\\ (2) Public view updates immediately;\\ (3) Media assets render correctly;\\ (4) Recent events section reflects Approved events;




\noindent\textbf{FR-010 — Attendance Report for Club Managers}\\
\textbf{UserStory:} As a \emph{Club manager}, I need exportable attendance reports to review participation and submit summaries to the department.\\
\textbf{Priority:} Medium\\
\textbf{FunctionalDetails:} For a selected event or date range, managers generate on-screen and downloadable (CSV/PDF) attendance summaries with filters by status (present, no-show).\\
\\\textbf{AcceptanceCriteria:}\\ (1) Report includes event details, counts, and attendee list;\\ (2) Filters adjust totals correctly;\\ (3) Exports match on-screen data;\\ (4) Only data from the manager’s club is accessible;\\ (5) Time range selection is enforced.
