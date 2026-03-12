/**
 * Direct test of notification API
 */

import { notifyOwner } from '../server/_core/notification';

async function testNotification() {
  console.log('🧪 Testing notification API directly...\n');

  const testNotification = {
    title: '🎉 New User Signup',
    content: `A new user has signed up to MAPit!

Name: Test New User
Email: test-newuser@example.com
Login Method: OAuth
Organization: Test Company Inc.`,
  };

  console.log('Sending notification:');
  console.log(`  Title: ${testNotification.title}`);
  console.log(`  Content: ${testNotification.content.substring(0, 100)}...\n`);

  try {
    const result = await notifyOwner(testNotification);
    
    if (result) {
      console.log('✅ Notification sent successfully!');
      console.log('📬 Check your Manus notifications panel.\n');
      console.log('Where to find notifications:');
      console.log('  1. Look for a bell icon 🔔 in the Manus interface');
      console.log('  2. Check the top-right corner of the Manus dashboard');
      console.log('  3. Notifications may appear as a popup or in a notifications panel\n');
    } else {
      console.log('⚠️  Notification API returned false (service may be unavailable)');
      console.log('This could mean:');
      console.log('  - The notification service is temporarily down');
      console.log('  - There was a network issue');
      console.log('  - The API endpoint is not responding\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
    process.exit(1);
  }
}

testNotification();
