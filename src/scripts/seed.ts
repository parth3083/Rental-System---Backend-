import { db } from '../config/db.config.js';
import { authHelper } from '../helpers/auth.helper.js';
import { logger } from '../config/logger.config.js';
import type {
  UsersRole,
  OrderStatus,
  PaymentPlan,
  DeliveryStatus,
} from '../generated/prisma/client.js';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: UsersRole;
  companyName?: string;
  gstin?: string;
  productCategory?: string;
}

const seedUsers: SeedUser[] = [
  {
    name: 'Admin User',
    email: 'admin@rental.com',
    password: 'admin123',
    role: 'ADMIN',
  },
  {
    name: 'Vendor One',
    email: 'vendor1@rental.com',
    password: 'vendor123',
    role: 'VENDOR',
    companyName: 'Vendor One Enterprises',
    gstin: '22AAAAA0000A1Z5',
  },
  {
    name: 'Vendor Two',
    email: 'vendor2@rental.com',
    password: 'vendor123',
    role: 'VENDOR',
    companyName: 'Vendor Two Corp',
    gstin: '27BBBBB1111B2Y6',
  },
  {
    name: 'Customer One',
    email: 'customer1@rental.com',
    password: 'customer123',
    role: 'CUSTOMER',
  },
  {
    name: 'Customer Two',
    email: 'customer2@rental.com',
    password: 'customer123',
    role: 'CUSTOMER',
  },
];

async function seed() {
  logger.info('🌱 Starting database seed...');

  try {
    // Clear existing data in proper order (respect foreign key constraints)
    logger.info('Clearing existing data...');
    await db.wishlist.deleteMany({});
    await db.cart.deleteMany({});
    await db.paymentLedger.deleteMany({});
    await db.salesInvoice.deleteMany({});
    await db.salesOrderDetail.deleteMany({});
    await db.salesOrder.deleteMany({});
    await db.stockTransaction.deleteMany({});
    await db.stock.deleteMany({});
    await db.product.deleteMany({});
    await db.category.deleteMany({});
    await db.users.deleteMany({});

    // =====================
    // 1. Create seed users
    // =====================
    logger.info('Creating users...');
    const createdUsers: Record<string, string> = {};

    for (const userData of seedUsers) {
      const hashedPassword = authHelper.hashPassword(userData.password);

      const user = await db.users.create({
        data: {
          name: userData.name,
          email: userData.email,
          passwordHash: hashedPassword,
          role: userData.role,
          companyName: userData.companyName ?? null,
          gstin: userData.gstin ?? null,
        },
      });

      createdUsers[userData.email] = user.id;
      logger.info(`✅ Created ${userData.role}: ${user.name} (${user.email})`);
    }

    // =====================
    // 2. Create categories
    // =====================
    logger.info('Creating categories...');
    const categories = await Promise.all([
      db.category.create({ data: { name: 'Electronics' } }),
      db.category.create({ data: { name: 'Furniture' } }),
      db.category.create({ data: { name: 'Vehicles' } }),
      db.category.create({ data: { name: 'Tools & Equipment' } }),
      db.category.create({ data: { name: 'Party & Events' } }),
    ]);
    logger.info(`✅ Created ${categories.length} categories`);

    const [
      electronicsCategory,
      furnitureCategory,
      vehiclesCategory,
      toolsCategory,
      partyCategory,
    ] = categories;

    // =====================
    // 3. Create products
    // =====================
    logger.info('Creating products...');
    const vendor1Id = createdUsers['vendor1@rental.com']!;
    const vendor2Id = createdUsers['vendor2@rental.com']!;

    const products = await Promise.all([
      // Electronics - Vendor 1
      db.product.create({
        data: {
          vendorId: vendor1Id,
          name: 'Professional DSLR Camera',
          brand: 'Canon',
          color: 'Black',
          imageUrl: 'https://example.com/images/camera.jpg',
          description:
            'Canon EOS 5D Mark IV - Perfect for professional photography and videography',
          dailyPrice: 150,
          discountPercentage: 10,
          securityDeposit: 500,
          isAvailable: true,
          isPublished: true,
          categoryId: electronicsCategory.id,
        },
      }),
      db.product.create({
        data: {
          vendorId: vendor1Id,
          name: 'MacBook Pro 16"',
          brand: 'Apple',
          color: 'Space Gray',
          imageUrl: 'https://example.com/images/macbook.jpg',
          description:
            'Latest MacBook Pro with M3 chip, ideal for content creators',
          dailyPrice: 100,
          discountPercentage: 5,
          securityDeposit: 1000,
          isAvailable: true,
          isPublished: true,
          categoryId: electronicsCategory.id,
        },
      }),
      db.product.create({
        data: {
          vendorId: vendor1Id,
          name: 'DJ Sound System',
          brand: 'JBL',
          color: 'Black',
          imageUrl: 'https://example.com/images/speakers.jpg',
          description:
            'Complete DJ sound system with speakers, mixer, and subwoofer',
          dailyPrice: 300,
          discountPercentage: 15,
          securityDeposit: 800,
          isAvailable: true,
          isPublished: true,
          categoryId: partyCategory.id,
        },
      }),
      // Furniture - Vendor 2
      db.product.create({
        data: {
          vendorId: vendor2Id,
          name: 'Executive Office Chair',
          brand: 'Herman Miller',
          color: 'Black',
          imageUrl: 'https://example.com/images/chair.jpg',
          description: 'Premium ergonomic office chair for maximum comfort',
          dailyPrice: 25,
          discountPercentage: 0,
          securityDeposit: 200,
          isAvailable: true,
          isPublished: true,
          categoryId: furnitureCategory.id,
        },
      }),
      db.product.create({
        data: {
          vendorId: vendor2Id,
          name: 'Conference Table Set',
          brand: 'IKEA Business',
          color: 'Walnut',
          imageUrl: 'https://example.com/images/table.jpg',
          description: '8-person conference table with matching chairs',
          dailyPrice: 75,
          discountPercentage: 10,
          securityDeposit: 400,
          isAvailable: true,
          isPublished: true,
          categoryId: furnitureCategory.id,
        },
      }),
      // Vehicles - Vendor 1
      db.product.create({
        data: {
          vendorId: vendor1Id,
          name: 'Electric Scooter',
          brand: 'Xiaomi',
          color: 'White',
          imageUrl: 'https://example.com/images/scooter.jpg',
          description: 'Xiaomi Mi Electric Scooter Pro 2 - Up to 45km range',
          dailyPrice: 35,
          discountPercentage: 5,
          securityDeposit: 150,
          isAvailable: true,
          isPublished: true,
          categoryId: vehiclesCategory.id,
        },
      }),
      // Tools - Vendor 2
      db.product.create({
        data: {
          vendorId: vendor2Id,
          name: 'Professional Power Drill Kit',
          brand: 'DeWalt',
          color: 'Yellow',
          imageUrl: 'https://example.com/images/drill.jpg',
          description: 'Complete power drill kit with bits and accessories',
          dailyPrice: 20,
          discountPercentage: 0,
          securityDeposit: 100,
          isAvailable: true,
          isPublished: true,
          categoryId: toolsCategory.id,
        },
      }),
      db.product.create({
        data: {
          vendorId: vendor2Id,
          name: 'Pressure Washer',
          brand: 'Karcher',
          color: 'Yellow/Black',
          imageUrl: 'https://example.com/images/washer.jpg',
          description: 'High-pressure washer for outdoor cleaning',
          dailyPrice: 40,
          discountPercentage: 10,
          securityDeposit: 200,
          isAvailable: true,
          isPublished: true,
          categoryId: toolsCategory.id,
        },
      }),
    ]);
    logger.info(`✅ Created ${products.length} products`);

    // =====================
    // 4. Create stock for products
    // =====================
    logger.info('Creating stock records...');
    const stockRecords = await Promise.all(
      products.map((product, index) =>
        db.stock.create({
          data: {
            productId: product.id,
            totalPhysicalQuantity: (index + 1) * 5, // Varying quantities
          },
        })
      )
    );
    logger.info(`✅ Created ${stockRecords.length} stock records`);

    // =====================
    // 5. Create stock transactions
    // =====================
    logger.info('Creating stock transactions...');
    const stockTransactions = await Promise.all([
      db.stockTransaction.create({
        data: {
          productId: products[0].id,
          moveType: 'IN',
          quantity: 10,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-01'),
        },
      }),
      db.stockTransaction.create({
        data: {
          productId: products[0].id,
          moveType: 'OUT',
          quantity: 2,
          startDate: new Date('2026-01-15'),
          endDate: new Date('2026-01-20'),
        },
      }),
      db.stockTransaction.create({
        data: {
          productId: products[1].id,
          moveType: 'IN',
          quantity: 15,
          startDate: new Date('2026-01-05'),
          endDate: new Date('2026-01-05'),
        },
      }),
      db.stockTransaction.create({
        data: {
          productId: products[3].id,
          moveType: 'IN',
          quantity: 20,
          startDate: new Date('2026-01-10'),
          endDate: new Date('2026-01-10'),
        },
      }),
    ]);
    logger.info(`✅ Created ${stockTransactions.length} stock transactions`);

    // =====================
    // 6. Create sales orders
    // =====================
    logger.info('Creating sales orders...');
    const customer1Id = createdUsers['customer1@rental.com']!;
    const customer2Id = createdUsers['customer2@rental.com']!;

    const salesOrders = await Promise.all([
      // Order 1: Customer 1 renting from Vendor 1 (Camera + MacBook)
      db.salesOrder.create({
        data: {
          customerId: customer1Id,
          vendorId: vendor1Id,
          status: 'CONFIRMED' as OrderStatus,
          paymentPlan: 'FULL_UPFRONT' as PaymentPlan,
          totalOrderValue: 1250,
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-05'),
        },
      }),
      // Order 2: Customer 2 renting from Vendor 2 (Furniture)
      db.salesOrder.create({
        data: {
          customerId: customer2Id,
          vendorId: vendor2Id,
          status: 'APPROVED' as OrderStatus,
          paymentPlan: 'PARTIAL_MONTHLY' as PaymentPlan,
          totalOrderValue: 500,
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-15'),
        },
      }),
      // Order 3: Customer 1 renting party equipment
      db.salesOrder.create({
        data: {
          customerId: customer1Id,
          vendorId: vendor1Id,
          status: 'DRAFT' as OrderStatus,
          paymentPlan: 'FULL_UPFRONT' as PaymentPlan,
          totalOrderValue: 600,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-02'),
        },
      }),
      // Order 4: Completed order
      db.salesOrder.create({
        data: {
          customerId: customer2Id,
          vendorId: vendor1Id,
          status: 'CONFIRMED' as OrderStatus,
          paymentPlan: 'FULL_UPFRONT' as PaymentPlan,
          totalOrderValue: 175,
          startDate: new Date('2026-01-20'),
          endDate: new Date('2026-01-25'),
        },
      }),
    ]);
    logger.info(`✅ Created ${salesOrders.length} sales orders`);

    // =====================
    // 7. Create sales order details
    // =====================
    logger.info('Creating sales order details...');
    const orderDetails = await Promise.all([
      // Order 1 details
      db.salesOrderDetail.create({
        data: {
          orderId: salesOrders[0].id,
          productId: products[0].id, // Camera
          quantity: 1,
          unitPrice: 150,
          subtotal: 750, // 5 days
          totalDepositAmount: 500, // 1 * 500
        },
      }),
      db.salesOrderDetail.create({
        data: {
          orderId: salesOrders[0].id,
          productId: products[1].id, // MacBook
          quantity: 1,
          unitPrice: 100,
          subtotal: 500, // 5 days
          totalDepositAmount: 1000, // 1 * 1000
        },
      }),
      // Order 2 details
      db.salesOrderDetail.create({
        data: {
          orderId: salesOrders[1].id,
          productId: products[3].id, // Office Chair
          quantity: 4,
          unitPrice: 25,
          subtotal: 500, // 5 days, 4 chairs
          totalDepositAmount: 800, // 4 * 200
        },
      }),
      // Order 3 details
      db.salesOrderDetail.create({
        data: {
          orderId: salesOrders[2].id,
          productId: products[2].id, // DJ Sound System
          quantity: 1,
          unitPrice: 300,
          subtotal: 600, // 2 days
          totalDepositAmount: 800, // 1 * 800
        },
      }),
      // Order 4 details
      db.salesOrderDetail.create({
        data: {
          orderId: salesOrders[3].id,
          productId: products[5].id, // Electric Scooter
          quantity: 1,
          unitPrice: 35,
          subtotal: 175, // 5 days
          totalDepositAmount: 150, // 1 * 150
        },
      }),
    ]);
    logger.info(`✅ Created ${orderDetails.length} sales order details`);

    // =====================
    // 8. Create sales invoices
    // =====================
    logger.info('Creating sales invoices...');
    const invoices = await Promise.all([
      db.salesInvoice.create({
        data: {
          orderId: salesOrders[0].id,
          invoiceNumber: 'INV-2026-0001',
          deliveryStatus: 'DELIVERED' as DeliveryStatus,
          taxAmount: 225, // 18% GST
          grandTotal: 1475,
          isPaid: true,
        },
      }),
      db.salesInvoice.create({
        data: {
          orderId: salesOrders[1].id,
          invoiceNumber: 'INV-2026-0002',
          deliveryStatus: 'PROCESSING' as DeliveryStatus,
          taxAmount: 90,
          grandTotal: 590,
          isPaid: false,
        },
      }),
      db.salesInvoice.create({
        data: {
          orderId: salesOrders[3].id,
          invoiceNumber: 'INV-2026-0003',
          deliveryStatus: 'RETURNED' as DeliveryStatus,
          taxAmount: 31.5,
          grandTotal: 206.5,
          isPaid: true,
        },
      }),
    ]);
    logger.info(`✅ Created ${invoices.length} sales invoices`);

    // =====================
    // 9. Create payment ledger entries
    // =====================
    logger.info('Creating payment ledger entries...');
    const payments = await Promise.all([
      // Full payment for Order 1
      db.paymentLedger.create({
        data: {
          orderId: salesOrders[0].id,
          amountPaid: 1475,
          paidPeriodStart: new Date('2026-02-01'),
          paidPeriodEnd: new Date('2026-02-05'),
          paymentReference: 'PAY-2026-001-RAZORPAY',
        },
      }),
      // Partial payments for Order 2
      db.paymentLedger.create({
        data: {
          orderId: salesOrders[1].id,
          amountPaid: 200,
          paidPeriodStart: new Date('2026-02-10'),
          paidPeriodEnd: new Date('2026-02-12'),
          paymentReference: 'PAY-2026-002-RAZORPAY',
        },
      }),
      db.paymentLedger.create({
        data: {
          orderId: salesOrders[1].id,
          amountPaid: 195,
          paidPeriodStart: new Date('2026-02-13'),
          paidPeriodEnd: new Date('2026-02-15'),
          paymentReference: 'PAY-2026-003-RAZORPAY',
        },
      }),
      // Full payment for Order 4
      db.paymentLedger.create({
        data: {
          orderId: salesOrders[3].id,
          amountPaid: 206.5,
          paidPeriodStart: new Date('2026-01-20'),
          paidPeriodEnd: new Date('2026-01-25'),
          paymentReference: 'PAY-2026-004-RAZORPAY',
        },
      }),
    ]);
    logger.info(`✅ Created ${payments.length} payment ledger entries`);

    // =====================
    // 10. Create cart items
    // =====================
    logger.info('Creating cart items...');
    const cartItems = await Promise.all([
      db.cart.create({
        data: {
          userId: customer1Id,
          productId: products[3].id, // Office chair
          quantity: 2,
          startDate: new Date('2026-02-20'),
          endDate: new Date('2026-02-22'),
          isService: true,
        },
      }),
      db.cart.create({
        data: {
          userId: customer2Id,
          productId: products[5].id, // Electric Scooter
          quantity: 1,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
          isService: true,
        },
      }),
    ]);
    logger.info(`✅ Created ${cartItems.length} cart items`);

    // =====================
    // 11. Create wishlist items
    // =====================
    logger.info('Creating wishlist items...');
    const wishlistItems = await Promise.all([
      db.wishlist.create({
        data: {
          userId: customer1Id,
          productId: products[2].id, // DJ System
        },
      }),
      db.wishlist.create({
        data: {
          userId: customer2Id,
          productId: products[1].id, // MacBook
        },
      }),
    ]);
    logger.info(`✅ Created ${wishlistItems.length} wishlist items`);

    // =====================
    // Summary
    // =====================
    logger.info('');
    logger.info('🎉 Database seed completed successfully!');
    logger.info('');
    logger.info('📊 Seed Summary:');
    logger.info('================');
    logger.info(`   Users:              ${seedUsers.length}`);
    logger.info(`   Categories:         ${categories.length}`);
    logger.info(`   Products:           ${products.length}`);
    logger.info(`   Stock Records:      ${stockRecords.length}`);
    logger.info(`   Stock Transactions: ${stockTransactions.length}`);
    logger.info(`   Sales Orders:       ${salesOrders.length}`);
    logger.info(`   Order Details:      ${orderDetails.length}`);
    logger.info(`   Invoices:           ${invoices.length}`);
    logger.info(`   Invoices:           ${invoices.length}`);
    logger.info(`   Payment Entries:    ${payments.length}`);
    logger.info(`   Cart Items:         ${cartItems.length}`);
    logger.info(`   Wishlist Items:     ${wishlistItems.length}`);
    logger.info('');
    logger.info('🔐 Test Credentials:');
    logger.info('====================');
    seedUsers.forEach(user => {
      logger.info(
        `   ${user.role.padEnd(10)} ${user.email} / ${user.password}`
      );
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
