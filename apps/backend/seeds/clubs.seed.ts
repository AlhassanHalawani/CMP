import { db } from '../src/config/database';

export function seedClubs() {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO clubs (name, name_ar, description, description_ar, leader_id) VALUES (?, ?, ?, ?, ?)'
  );

  // leader IDs correspond to the order in users.seed (2, 3, 4)
  const clubs = [
    {
      name: 'FCIT Coding Club',
      name_ar: 'نادي البرمجة',
      description: 'Competitive programming, hackathons, and coding workshops.',
      description_ar: 'البرمجة التنافسية والهاكاثونات وورش العمل البرمجية.',
      leader_id: 2,
    },
    {
      name: 'Cybersecurity Club',
      name_ar: 'نادي الأمن السيبراني',
      description: 'CTF competitions, security workshops, and awareness campaigns.',
      description_ar: 'مسابقات CTF وورش العمل الأمنية وحملات التوعية.',
      leader_id: 3,
    },
    {
      name: 'AI & Data Science Club',
      name_ar: 'نادي الذكاء الاصطناعي وعلم البيانات',
      description: 'Machine learning projects, Kaggle competitions, and research talks.',
      description_ar: 'مشاريع التعلم الآلي ومسابقات Kaggle والمحاضرات البحثية.',
      leader_id: 4,
    },
  ];

  const txn = db.transaction(() => {
    for (const c of clubs) {
      insert.run(c.name, c.name_ar, c.description, c.description_ar, c.leader_id);
    }
  });

  txn();
  console.log(`  seeded ${clubs.length} clubs`);
}
