import request from 'supertest';
import app from '../src/app.js';

describe('Auth API Endpoints', () => {
  let authToken: string;

  // Customer test user (firstName + lastName will be concatenated to fullName)
  const testCustomer = {
    firstName: 'Test',
    lastName: 'User',
    email: `test${Date.now()}@example.com`,
    password: 'testpassword123',
    role: 'CUSTOMER' as const,
  };

  // Admin test user
  const testAdmin = {
    firstName: 'Test',
    lastName: 'Admin',
    email: `admin${Date.now()}@example.com`,
    password: 'adminpassword123',
    role: 'CUSTOMER' as const, // Note: For testing, we register as customer
  };

  // Vendor test user with additional fields
  const testVendor = {
    firstName: 'Vendor',
    lastName: 'Test',
    email: `vendor${Date.now()}@example.com`,
    password: 'vendorpassword123',
    role: 'VENDOR' as const,
    companyName: 'Test Company Pvt Ltd',
    productCategory: 'Electronics',
    gstNumber: '22AAAAA0000A1Z5',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new customer successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testCustomer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe(testCustomer.email);
      expect(res.body.data.user.role).toBe('CUSTOMER');
      // Full name should be firstName + lastName
      expect(res.body.data.user.username).toBe(
        `${testCustomer.firstName} ${testCustomer.lastName}`
      );

      authToken = res.body.data.token;
    });

    it('should register a new vendor successfully with additional fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testVendor);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.role).toBe('VENDOR');
      // Full name should be firstName + lastName
      expect(res.body.data.user.username).toBe(
        `${testVendor.firstName} ${testVendor.lastName}`
      );
    });

    it('should register another customer as admin for testing', async () => {
      const res = await request(app).post('/api/auth/register').send(testAdmin);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should fail to register with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testCustomer);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User with this email already exists');
    });

    it('should fail with invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'test',
        lastName: 'user',
        email: 'invalid-email',
        password: 'password123',
        role: 'CUSTOMER',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should fail with short password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'test',
        lastName: 'user',
        email: 'valid@email.com',
        password: '123',
        role: 'CUSTOMER',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should fail with missing required fields', async () => {
      const res = await request(app).post('/api/auth/register').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail vendor registration without required vendor fields', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Vendor',
        lastName: 'Test',
        email: 'vendor_incomplete@example.com',
        password: 'password123',
        role: 'VENDOR',
        // Missing: companyName, productCategory, gstNumber
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should fail vendor registration with invalid GST number format', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Vendor',
        lastName: 'Test',
        email: 'vendor_invalid_gst@example.com',
        password: 'password123',
        role: 'VENDOR',
        companyName: 'Test Company',
        productCategory: 'Electronics',
        gstNumber: 'INVALID_GST',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testCustomer.email,
        password: testCustomer.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(testCustomer.email);

      authToken = res.body.data.token;
    });

    it('should fail with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testCustomer.email,
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should fail with invalid email format', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'invalid-email',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('username');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('role');
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access token required');
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/users (Admin Only)', () => {
    it('should fail with customer token (not admin)', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Insufficient permissions.');
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/auth/users');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
