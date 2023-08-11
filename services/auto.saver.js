const Redis = require('./redis');
const Scheduler = require('./scheduler');

class AutoSaver {
	//

	constructor(table_name, batch_size, save_after, callback, redis_options, mode='development') {
		if (table_name) {
			this.table_name = table_name;
		}

		if (callback) {
			this.callback = callback;
		}

		if (redis_options) {
			this.redis_options = redis_options;
		}

		this.mode = mode;
		this.batch_size = batch_size || 3;
		this.save_after = save_after || 10;
	}

	//

	async addData(obj) {
		let data;
		if (typeof obj === 'object') {
			data = { ...obj };
		} else {
			data = obj;
		}

		await Redis.getInstance(this.redis_options).writeBehind(
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
