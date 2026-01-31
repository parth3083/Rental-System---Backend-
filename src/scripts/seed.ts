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
    // Clear existing data
    logger.info('Cleaning up database...');
    // Delete in order to respect foreign keys
    await db.product.deleteMany({});
    await db.category.deleteMany({});
    await db.user.deleteMany({});

    // --- SEED USERS ---
    logger.info('Creating users...');
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

    // --- SEED CATEGORIES ---
    logger.info('Creating categories...');
    const catCameras = await db.category.create({ data: { name: 'Cameras' } });
    const catLaptops = await db.category.create({ data: { name: 'Laptops' } });
    const catDrones = await db.category.create({ data: { name: 'Drones' } });
    const catGaming = await db.category.create({ data: { name: 'Gaming' } });

    logger.info('✅ Created Categories: Cameras, Laptops, Drones, Gaming');

    // --- SEED PRODUCTS ---
    logger.info('Creating products...');

    // Cameras
    await db.product.createMany({
      data: [
        {
          name: 'Canon EOS R5',
          brand: 'Canon',
          color: 'Black',
          imageUrl:
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=500',
          description: 'Professional mirrorless camera with 8K video.',
          dailyPrice: 150.0,
          discountPercentage: 10,
          categoryId: catCameras.id,
          isAvailable: true,
        },
        {
          name: 'Sony A7 IV',
          brand: 'Sony',
          color: 'Black',
          imageUrl:
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=500', // Placeholder
          description: 'Hybrid full-frame mirrorless camera.',
          dailyPrice: 120.0,
          discountPercentage: 0,
          categoryId: catCameras.id,
          isAvailable: true,
        },
        {
          name: 'Nikon Z6 II',
          brand: 'Nikon',
          color: 'Black',
          imageUrl:
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=500', // Placeholder
          description: 'Multimedia powerhouse.',
          dailyPrice: 100.0,
          discountPercentage: 5,
          categoryId: catCameras.id,
          isAvailable: true,
        },
      ],
    });

    // Laptops
    await db.product.createMany({
      data: [
        {
          name: 'MacBook Pro 16 M3 Max',
          brand: 'Apple',
          color: 'Space Gray',
          imageUrl:
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?auto=format&fit=crop&q=80&w=500',
          description: 'Ultimate performance for pros.',
          dailyPrice: 80.0,
          discountPercentage: 0,
          categoryId: catLaptops.id,
          isAvailable: true,
        },
        {
          name: 'Dell XPS 15',
          brand: 'Dell',
          color: 'Silver',
          imageUrl:
            'https://images.unsplash.com/photo-1593642632823-8f78536788c6?auto=format&fit=crop&q=80&w=500',
          description: 'Stunning display and powerful specs.',
          dailyPrice: 60.0,
          discountPercentage: 15,
          categoryId: catLaptops.id,
          isAvailable: false, // Not available test
        },
      ],
    });

    // Drones
    await db.product.createMany({
      data: [
        {
          name: 'DJI Mavic 3 Pro',
          brand: 'DJI',
          color: 'Grey',
          imageUrl:
            'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80&w=500',
          description: 'Three-camera flagship drone.',
          dailyPrice: 95.0,
          discountPercentage: 0,
          categoryId: catDrones.id,
          isAvailable: true,
        },
        {
          name: 'DJI Mini 4 Pro',
          brand: 'DJI',
          color: 'Grey',
          imageUrl:
            'https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&q=80&w=500',
          description: 'Mini to the max.',
          dailyPrice: 45.0,
          discountPercentage: 5,
          categoryId: catDrones.id,
          isAvailable: true,
        },
      ],
    });

    // Gaming
    await db.product.createMany({
      data: [
        {
          name: 'PlayStation 5',
          brand: 'Sony',
          color: 'White',
          imageUrl:
            'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=500',
          description: 'Play Has No Limits.',
          dailyPrice: 25.0,
          discountPercentage: 0,
          categoryId: catGaming.id,
          isAvailable: true,
        },
        {
          name: 'Xbox Series X',
          brand: 'Microsoft',
          color: 'Black',
          imageUrl:
            'https://images.unsplash.com/photo-1621259182902-3b836c8afa0e?auto=format&fit=crop&q=80&w=500',
          description: 'Power your dreams.',
          dailyPrice: 25.0,
          discountPercentage: 0,
          categoryId: catGaming.id,
          isAvailable: true,
        },
      ],
    });

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
