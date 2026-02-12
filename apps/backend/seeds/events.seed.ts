import { db } from '../src/config/database';

export function seedEvents() {
  const insertEvent = db.prepare(
    `INSERT OR IGNORE INTO events (club_id, title, title_ar, description, description_ar, location, starts_at, ends_at, capacity, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertReg = db.prepare(
    'INSERT OR IGNORE INTO registrations (event_id, user_id, status) VALUES (?, ?, ?)'
  );

  const insertAttendance = db.prepare(
    'INSERT OR IGNORE INTO attendance (event_id, user_id, method) VALUES (?, ?, ?)'
  );

  const events = [
    {
      club_id: 1, title: 'Intro to Competitive Programming', title_ar: 'مقدمة في البرمجة التنافسية',
      description: 'Learn the basics of competitive programming.', description_ar: 'تعلم أساسيات البرمجة التنافسية.',
      location: 'Hall A', starts_at: '2026-03-01T10:00:00', ends_at: '2026-03-01T12:00:00',
      capacity: 50, status: 'published', created_by: 2,
    },
    {
      club_id: 1, title: 'FCIT Hackathon 2026', title_ar: 'هاكاثون كلية الحاسبات 2026',
      description: '24-hour hackathon for FCIT students.', description_ar: 'هاكاثون 24 ساعة لطلاب كلية الحاسبات.',
      location: 'Innovation Lab', starts_at: '2026-04-15T09:00:00', ends_at: '2026-04-16T09:00:00',
      capacity: 100, status: 'published', created_by: 2,
    },
    {
      club_id: 2, title: 'CTF Workshop', title_ar: 'ورشة CTF',
      description: 'Hands-on Capture The Flag training.', description_ar: 'تدريب عملي على مسابقات التقاط العلم.',
      location: 'Lab 201', starts_at: '2026-03-10T14:00:00', ends_at: '2026-03-10T17:00:00',
      capacity: 30, status: 'published', created_by: 3,
    },
    {
      club_id: 3, title: 'ML with Python Workshop', title_ar: 'ورشة التعلم الآلي مع بايثون',
      description: 'Build your first ML model.', description_ar: 'ابنِ أول نموذج تعلم آلي.',
      location: 'Hall B', starts_at: '2026-03-20T10:00:00', ends_at: '2026-03-20T13:00:00',
      capacity: 40, status: 'published', created_by: 4,
    },
    {
      club_id: 3, title: 'Kaggle Competition Prep', title_ar: 'التحضير لمسابقات Kaggle',
      description: 'Strategies for Kaggle competitions.', description_ar: 'استراتيجيات لمسابقات Kaggle.',
      location: 'Online', starts_at: '2026-05-01T18:00:00', ends_at: '2026-05-01T20:00:00',
      capacity: null, status: 'draft', created_by: 4,
    },
  ];

  const txn = db.transaction(() => {
    for (const e of events) {
      insertEvent.run(
        e.club_id, e.title, e.title_ar, e.description, e.description_ar,
        e.location, e.starts_at, e.ends_at, e.capacity, e.status, e.created_by
      );
    }

    // Register some students for events
    const studentIds = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // ids from user seed
    for (const sid of studentIds.slice(0, 6)) {
      insertReg.run(1, sid, 'confirmed'); // event 1
    }
    for (const sid of studentIds.slice(0, 4)) {
      insertReg.run(3, sid, 'confirmed'); // event 3
    }

    // Attendance for event 1 (past-like scenario)
    for (const sid of studentIds.slice(0, 4)) {
      insertAttendance.run(1, sid, 'qr');
    }
  });

  txn();
  console.log(`  seeded ${events.length} events with registrations and attendance`);
}
