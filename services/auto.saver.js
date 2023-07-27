const Redis = require('./redis');
const Scheduler = require('./scheduler');

class AutoSaver {
	//

	constructor(table_name, batch_size, save_after, callback) {
		if (table_name) {
			this.table_name = table_name;
		}

		if (callback) {
			this.callback = callback;
		}

		this.batch_size = batch_size || 3;
		this.save_after = save_after || 10;
	}

	//

	async addData(obj) {
		await Redis.getInstance().writeBehind(
			this.table_name,
			obj,
			this.batch_size,
			this.save_after,
			this.callback
		);
	}

	//

	static getData() {
		//
	}

	//

	static async clearData(table, id) {
		const client = Redis.getInstance().client;

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
}

module.exports = AutoSaver;
