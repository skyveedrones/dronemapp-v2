/**
 * Test script to send owner notification email
 */

import { sendOwnerNotificationEmail } from '../server/owner-notification-email';

async function testOwnerEmailNotification() {
  console.log('🧪 Testing owner email notification...\n');

  const testData = {
    userName: 'Test New User',
    userEmail: 'test-newuser@example.com',
    loginMethod: 'OAuth',
    organization: 'Test Company Inc.',
  };

  console.log('Sending email notification with details:');
  console.log(`  User Name: ${testData.userName}`);
  console.log(`  User Email: ${testData.userEmail}`);
  console.log(`  Organization: ${testData.organization}`);
  console.log(`  Login Method: ${testData.loginMethod}\n`);

  try {
    const result = await sendOwnerNotificationEmail(testData);
    
    if (result.success) {
      console.log('✅ Email notification sent successfully!');
      console.log('📧 Check clay@skyveedrones.com for the notification email.\n');
    } else {
      console.log('❌ Failed to send email notification');
      console.log(`Error: ${result.error}\n`);
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    process.exit(1);
  }
}

testOwnerEmailNotification();
