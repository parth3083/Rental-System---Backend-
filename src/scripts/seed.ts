import { db } from '../config/db.config.js';
import { authHelper } from '../helpers/auth.helper.js';
import { logger } from '../config/logger.config.js';

interface SeedUser {
  username: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
}

const seedUsers: SeedUser[] = [
  {
    username: 'admin',
    email: 'admin@rental.com',
    password: 'admin123',
    role: 'ADMIN',
  },
  {
    username: 'vendor1',
    email: 'vendor1@rental.com',
    password: 'vendor123',
    role: 'VENDOR',
  },
  {
    username: 'vendor2',
    email: 'vendor2@rental.com',
    password: 'vendor123',
    role: 'VENDOR',
  },
  {
    username: 'customer1',
    email: 'customer1@rental.com',
    password: 'customer123',
    role: 'CUSTOMER',
  },
  {
    username: 'customer2',
    email: 'customer2@rental.com',
    password: 'customer123',
    role: 'CUSTOMER',
  },
];

async function seed() {
  logger.info('🌱 Starting database seed...');

  try {
    // Clear existing users (optional - comment out if you want to keep existing data)
    logger.info('Clearing existing users...');
    await db.user.deleteMany({});

    // Create seed users
    for (const userData of seedUsers) {
      const hashedPassword = authHelper.hashPassword(userData.password);

      const user = await db.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
        },
      });

      logger.info(
        `✅ Created ${userData.role}: ${user.username} (${user.email})`
      );
    }

    logger.info('🎉 Database seed completed successfully!');
    logger.info('');
    logger.info('Test credentials:');
    logger.info('================');
    seedUsers.forEach(user => {
      logger.info(`${user.role}: ${user.email} / ${user.password}`);
    });
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run seed
seed()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
