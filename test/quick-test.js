const AutoSaver = require('../services/auto.saver');

console.log('🚀 Quick Test - Local Storage\n');

// Simple test with local storage
const autoSaver = new AutoSaver({
	table_name: 'quick_test',
	batch_size: 2,
	save_after: 3,
	callback: (data) => {
		console.log('\n✅ Saved:', data);
	},
	storage_type: 'local'
});

async function test() {
	console.log('Adding data...\n');

	await autoSaver.addData({ name: 'Test 1' });
	await autoSaver.addData({ name: 'Test 2' });

	console.log('\n⏳ Waiting...');
	await new Promise(resolve => setTimeout(resolve, 2000));

	console.log('\n✅ Done!');
}

test();
