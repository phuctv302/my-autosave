const AutoSaver = require('../services/auto.saver');

console.log('========================================');
console.log('Testing AutoSaver with LOCAL STORAGE');
console.log('========================================\n');

// Create AutoSaver instance with local storage
const autoSaver = new AutoSaver({
	table_name: 'test_table',
	batch_size: 3, // Trigger callback after 3 items
	save_after: 5, // Or after 5 seconds if batch size not met
	callback: function (data) {
		console.log('\n🎯 CALLBACK TRIGGERED!');
		console.log('📦 Data received:', JSON.stringify(data, null, 2));
		console.log(`📊 Total items: ${data.length}\n`);
	},
	storage_type: 'local',
	mode: 'development'
});

console.log('✅ AutoSaver initialized with LOCAL storage\n');

// Test function
async function runTest() {
	try {
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

	} catch (error) {
		console.error('❌ Error during test:', error);
	}
}

// Run the test
runTest();
