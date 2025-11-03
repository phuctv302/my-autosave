const AutoSaver = require('../services/auto.saver');

console.log('========================================');
console.log('Testing AutoSaver with REDIS STORAGE');
console.log('========================================\n');

// Create AutoSaver instance with Redis storage
const autoSaver = new AutoSaver({
	table_name: 'test_table_redis',
	batch_size: 3, // Trigger callback after 3 items
	save_after: 5, // Or after 5 seconds if batch size not met
	callback: function (data) {
		console.log('\n🎯 CALLBACK TRIGGERED!');
		console.log('📦 Data received:', JSON.stringify(data, null, 2));
		console.log(`📊 Total items: ${data.length}\n`);
	},
	storage_type: 'redis',
	redis_options: {
		url: process.env.REDIS_URL || 'localhost:6379',
		auth: {
			username: process.env.REDIS_USERNAME,
			password: process.env.REDIS_PASSWORD,
		}
	},
	mode: 'development'
});

console.log('✅ AutoSaver initialized with REDIS storage\n');
console.log('⚠️  Make sure Redis server is running on localhost:6379\n');

// Test function
async function runTest() {
	try {
		// Wait for Redis connection
		await new Promise(resolve => setTimeout(resolve, 1000));

		console.log('📝 Test 1: Adding 3 items (should trigger by batch_size)');
		console.log('---------------------------------------------------');

		// Add 3 items - should trigger callback immediately
		await autoSaver.addData({ id: 1, name: 'Item 1', timestamp: Date.now() });
		console.log('   ✓ Added item 1');

		await autoSaver.addData({ id: 2, name: 'Item 2', timestamp: Date.now() });
		console.log('   ✓ Added item 2');

		await autoSaver.addData({ id: 3, name: 'Item 3', timestamp: Date.now() });
		console.log('   ✓ Added item 3');

		// Wait a bit to see the callback
		await new Promise(resolve => setTimeout(resolve, 1000));

		console.log('\n📝 Test 2: Adding 2 items (should trigger after 5 seconds)');
		console.log('---------------------------------------------------');

		// Add 2 items - should trigger callback after 5 seconds
		await autoSaver.addData({ id: 4, name: 'Item 4', timestamp: Date.now() });
		console.log('   ✓ Added item 4');

		await autoSaver.addData({ id: 5, name: 'Item 5', timestamp: Date.now() });
		console.log('   ✓ Added item 5');

		console.log('   ⏳ Waiting for 5 seconds timeout...\n');

		// Wait for the timeout trigger
		await new Promise(resolve => setTimeout(resolve, 6000));

		console.log('✅ All tests completed!\n');
		console.log('Exiting in 2 seconds...');

		await new Promise(resolve => setTimeout(resolve, 2000));
		process.exit(0);

	} catch (error) {
		console.error('❌ Error during test:', error);
		process.exit(1);
	}
}

// Run the test
runTest();
