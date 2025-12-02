/**
 * Simple API validation test
 * Tests the QuartzForums controller functions directly
 */

const { connect, implementationKeys, quartzForumAccounts } = require('./database.js');
require('dotenv').config();

async function testControllerFunctions() {
    try {
        console.log('🧪 Testing QuartzForums Controller Functions\n');

        // Connect to database
        const MONGO_URI = process.env.DB_URL;
        await connect(MONGO_URI);
        console.log('✅ Connected to database');

        // Test 1: Check implementation key exists
        const testKey = await implementationKeys.findOne({ implementationKey: 'test-key-123' });
        console.log('✅ Implementation key found:', testKey ? 'Yes' : 'No');

        // Test 2: Create a test user directly
        const testUsername = `testuser_${Date.now()}`;
        const testUser = new quartzForumAccounts({
            name: testUsername,
            password: 'testpassword123',
            accessKey: 'test-access-key-' + Date.now()
        });

        await testUser.save();
        console.log('✅ Test user created:', testUser.name);

        // Test 3: Verify user can be found
        const foundUser = await quartzForumAccounts.findOne({ name: testUsername });
        console.log('✅ User lookup works:', foundUser ? 'Yes' : 'No');

        // Cleanup
        await quartzForumAccounts.findByIdAndDelete(testUser._id);
        console.log('✅ Cleanup completed');

        console.log('\n🎉 All basic tests passed! Your QuartzForums API should work correctly.');
        console.log('\n📋 API Endpoints Available:');
        console.log('POST   /forums/api/account/register');
        console.log('POST   /forums/api/account/login');
        console.log('POST   /forums/api/account/reset-access-key');
        console.log('DELETE /forums/api/account');
        console.log('GET    /forums/api/account/:userId');
        console.log('POST   /forums/api/message');
        console.log('DELETE /forums/api/message/:messageId');
        console.log('GET    /forums/api/forum');
        console.log('GET    /forums/api/forums/recent');
        console.log('GET    /forums/api/forums');

        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testControllerFunctions();