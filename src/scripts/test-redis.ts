import 'dotenv/config';
import { redis } from '../config/redis.config.js';

async function testRedis() {
  const testEmail = 'test@example.com';
  const testCode = '123456';

  console.log('===== REDIS PASSWORD RESET TEST =====');
  console.log(`Test email: ${testEmail}`);
  console.log(`Test code: ${testCode} (type: ${typeof testCode})`);

  // Store the code
  console.log('\n1. Storing code in Redis...');
  const key = `password_reset:code:${testEmail}`;
  await redis.set(key, testCode, { ex: 900 });
  console.log(`   Stored key: ${key}`);
  console.log(`   Stored value: ${testCode} (type: ${typeof testCode})`);

  // Retrieve the code - WITHOUT type parameter
  console.log('\n2. Retrieving code from Redis (no type)...');
  const rawCode = await redis.get(key);
  console.log(`   Raw value: "${rawCode}"`);
  console.log(`   Type: ${typeof rawCode}`);
  console.log(`   JSON stringify: ${JSON.stringify(rawCode)}`);
  console.log(`   Is number: ${typeof rawCode === 'number'}`);
  console.log(`   Constructor name: ${rawCode?.constructor?.name}`);

  // Compare directly
  console.log('\n3. Direct comparison...');
  console.log(`   rawCode === testCode: ${rawCode === testCode}`);
  console.log(`   rawCode == testCode: ${rawCode == testCode}`);
  console.log(
    `   String(rawCode) === testCode: ${String(rawCode) === testCode}`
  );
  console.log(
    `   rawCode?.toString() === testCode: ${rawCode?.toString() === testCode}`
  );

  // Cleanup
  console.log('\n4. Cleaning up...');
  await redis.del(key);
  console.log('   Deleted test key');

  console.log('\n===== TEST COMPLETE =====');
  process.exit(0);
}

testRedis().catch(console.error);
