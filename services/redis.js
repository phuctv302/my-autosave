const redis = require('redis');
require('dotenv').config({ path: './.env' });

const ArrayUtils = require('../utils/array.utils');
const Scheduler = require('./scheduler');

class Redis {
	//

	constructor(redis_url, redis_options = {}) {
		if (!redis_url) {
			redis_url = process.env.REDIS_URL || 'localhost:6379';
		}

		this.client = redis.createClient({
			url: `redis://${redis_url}`,
			...redis_options,
		});
		this.client.on('error', (err) => console.log(`[!] Redis error: ${err}`));
		this.client
			.connect()
			.then(() => console.log('[*] Redis connect successfully!'));
	}

	static getInstance() {
		if (!this.instance) {
			this.instance = new Redis();
		}

		return this.instance;
	}

	//

	async writeBehind(table_name, obj, batch_size, save_after, callback) {
		// 1. hash key
		const h_key = `${table_name}:${obj.id}`;

		// 2. write to redis hash key (for creating & updating)
		await this.updateHash(h_key, obj);

		// 3. Read all data from hash and write into Redis Stream
		const redisVals = await this.client.hGetAll(h_key);
		await this.client.xAdd(table_name, '*', redisVals);
		console.log(` [+] New entry is added into stream`);

		// 4. Read all data from stream

		const len = await client.xLen(table_name);
		if (len == 0) {
			console.log(` [x] No data in stream ${table_name}`);

			Scheduler.scheduleJob(table_name, `*/${save_after} * * * * *`, callback);
		} else {
			const streams = await this.client.xRead(
				{
					key: table_name,
					id: '0-0',
				},
				{
					COUNT: 200,
				}
			);

			const messages = streams
				? streams[0].messages.map((mes) => mes.message)
				: null;

			if (messages && messages.length >= batch_size) {
				// const data = ArrayUtils.filterUniqueByKey(messages);
				const data = messages;
				callback(data);
				this.client.del(table_name).then((res) => {
					console.log(` [x] Delete stream with code ${res}`);
					Scheduler.cancelJob(table_name);
				});
			} else {
				Scheduler.scheduleJob(
					table_name,
					`*/${save_after} * * * * *`,
					callback
				);
			}
		}

		// return null;
	}

	// async readThrough(table_name, id, callback) {
	// 	const key = `${table_name}:${id}`;
	// 	const obj = await this.client.hGet(key);
	// 	if (!obj) {
	// 		callback(data);
	// 	} else {
	// 		return obj;
	// 	}
	// }

	async getDataFromStream(table_name) {
		const streams = await this.client.xRead(
			{
				table_name,
				id: '0-0',
			},
			{
				COUNT: 200,
			}
		);

		let messages = streams
			? streams[0].messages.map((mes) => mes.message)
			: null;

		return messages;
	}

	async updateHash(key, obj) {
		// delete old key
		await this.client.del(key);

		// update new key value
		await this.setHash(key, obj);
	}

	async setHash(key, obj) {
		Object.keys(obj).forEach(async (k) => {
			await this.client.hSet(key, k, String(obj[k]));
		});
	}
}

module.exports = Redis;
