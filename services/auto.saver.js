const Redis = require('./redis');
const LocalStorage = require('./local.storage');
const Scheduler = require('./scheduler');

class AutoSaver {
	//

	constructor(config = {}) {
		// Destructure config object with default values
		const {
			table_name,
			batch_size = 3,
			save_after = 10,
			callback,
			storage_type = 'redis',
			redis_options,
			mode = 'development'
		} = config;

		this.table_name = table_name;
		this.callback = callback;
		this.redis_options = redis_options;
		this.storage_type = storage_type;
		this.mode = mode;
		this.batch_size = batch_size;
		this.save_after = save_after;
	}

	//

	async addData(obj) {
		let data;
		if (typeof obj === 'object') {
			data = { ...obj };
		} else {
			data = obj;
		}

		// Choose storage backend based on storage_type
		const storage = this.storage_type === 'local'
			? LocalStorage.getInstance()
			: Redis.getInstance(this.redis_options);

		await storage.writeBehind(
			this.table_name,
			data,
			this.batch_size,
			this.save_after,
			this.callback,
			this.mode
		);
	}

	//

	static getData() {
		//
	}

	//

	static async clearData(table, id) {
		const client = Redis.getInstance(this.redis_options).client;

		if (table && id) {
			const key = `${table}:${id}`;
			await client.del(key);
		} else {
			await client.flushAll();
		}
	}

	//

	// static listenDataOnTable(table_name, callback) {
	// 	Scheduler.scheduleJob(this.table_name, '*/10 * * * * *', this.callback);
	// }

	//

	setCallback(callback) {
		this.callback = callback;
	}

	setTableName(table_name) {
		this.table_name = table_name;
	}

	setMode(mode) {
		this.mode = mode;
	}
}

module.exports = AutoSaver;
