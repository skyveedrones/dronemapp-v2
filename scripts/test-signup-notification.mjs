/**
 * Test script to send a new user signup notification
 * This simulates what happens when a real user signs up
 */

import { upsertUser } from '../server/db.ts';

async function testSignupNotification() {
  console.log('🧪 Testing new user signup notification...\n');

  const testUser = {
    openId: 'test-signup-' + Date.now(),
    email: 'test-newuser@example.com',
    name: 'Test New User',
    loginMethod: 'OAuth',
    organization: 'Test Company Inc.',
  };

  console.log('Creating test user with details:');
  console.log(`  Name: ${testUser.name}`);
  console.log(`  Email: ${testUser.email}`);
  console.log(`  Organization: ${testUser.organization}`);
  console.log(`  Login Method: ${testUser.loginMethod}\n`);

  try {
    await upsertUser(testUser);
    console.log('✅ Test user created successfully!');
    console.log('📬 Check your Manus notifications for the signup alert.\n');
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    process.exit(1);
  }
}

testSignupNotification();
