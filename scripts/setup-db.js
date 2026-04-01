const { execSync } = require('child_process');

// This script will use the DATABASE_URL from Vercel when deployed
console.log('Setting up database...');

try {
  // Run migrations
  console.log('Running migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  // Seed database
  console.log('Seeding database...');
  execSync('npx prisma db seed', { stdio: 'inherit' });

  console.log('✅ Database setup complete!');
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
}