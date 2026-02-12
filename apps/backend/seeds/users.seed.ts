import { db } from '../src/config/database';

export function seedUsers() {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO users (keycloak_id, email, name, role) VALUES (?, ?, ?, ?)'
  );

  const users = [
    { keycloak_id: 'admin-001', email: 'admin@fcit.edu.sa', name: 'System Admin', role: 'admin' },
    { keycloak_id: 'leader-001', email: 'ahmed@fcit.edu.sa', name: 'Ahmed Al-Rashid', role: 'club_leader' },
    { keycloak_id: 'leader-002', email: 'fatima@fcit.edu.sa', name: 'Fatima Al-Zahrani', role: 'club_leader' },
    { keycloak_id: 'leader-003', email: 'omar@fcit.edu.sa', name: 'Omar Al-Ghamdi', role: 'club_leader' },
    { keycloak_id: 'student-001', email: 'sara@stu.fcit.edu.sa', name: 'Sara Al-Otaibi', role: 'student' },
    { keycloak_id: 'student-002', email: 'khalid@stu.fcit.edu.sa', name: 'Khalid Al-Harbi', role: 'student' },
    { keycloak_id: 'student-003', email: 'noura@stu.fcit.edu.sa', name: 'Noura Al-Qahtani', role: 'student' },
    { keycloak_id: 'student-004', email: 'youssef@stu.fcit.edu.sa', name: 'Youssef Al-Malki', role: 'student' },
    { keycloak_id: 'student-005', email: 'layla@stu.fcit.edu.sa', name: 'Layla Al-Shehri', role: 'student' },
    { keycloak_id: 'student-006', email: 'hassan@stu.fcit.edu.sa', name: 'Hassan Al-Dosari', role: 'student' },
    { keycloak_id: 'student-007', email: 'reem@stu.fcit.edu.sa', name: 'Reem Al-Subaie', role: 'student' },
    { keycloak_id: 'student-008', email: 'abdulrahman@stu.fcit.edu.sa', name: 'Abdulrahman Al-Mutairi', role: 'student' },
    { keycloak_id: 'student-009', email: 'maha@stu.fcit.edu.sa', name: 'Maha Al-Juhani', role: 'student' },
    { keycloak_id: 'student-010', email: 'turki@stu.fcit.edu.sa', name: 'Turki Al-Tamimi', role: 'student' },
  ];

  const txn = db.transaction(() => {
    for (const u of users) {
      insert.run(u.keycloak_id, u.email, u.name, u.role);
    }
  });

  txn();
  console.log(`  seeded ${users.length} users`);
}
