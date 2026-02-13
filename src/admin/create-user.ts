import { env } from '../config.js';
import { getDb } from '../database/setup.js';
import { createAdminUser } from './auth.js';

async function main() {
  // Initialize DB
  getDb();

  const username = process.argv[2] || env.adminUsername;
  const password = process.argv[3] || env.adminPassword;

  await createAdminUser(username, password);
  console.log(`Admin user "${username}" created/updated successfully.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to create admin user:', err);
  process.exit(1);
});
