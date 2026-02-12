import { seedUsers } from './users.seed';
import { seedClubs } from './clubs.seed';
import { seedEvents } from './events.seed';

console.log('Seeding database...');
seedUsers();
seedClubs();
seedEvents();
console.log('\nSeeding complete.');
