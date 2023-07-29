const redis = require('redis');
require('dotenv').config({ path: './.env' });

const ArrayUtils = require('../utils/array.utils');
const Scheduler = require('./scheduler');

class Redis {
	//

	constructor(redis_url, redis_auth = {}) {
		if (!redis_url) {
			redis_url = 'localhost:6379';
		}

		this.client = redis.createClient({
			url: `redis://${redis_url}`,
			...redis_auth,
		});

		this.client.on('error', (err) => console.log(`[!] Error connecting Redis: ${err}`));
		this.client.connect().then(() => console.log('[*] Redis connect successfully!'));
	}

	static getInstance(redis_options = {}) {
		if (!this.instance) {
			this.instance = new Redis(redis_options.url, redis_options.auth);
		}

		return this.instance;
	}

	//

	async writeBehind(table_name, obj, batch_size, save_after, callback) {
		const scheduler = new Scheduler(this.client);

		// 1. hash key
		const h_key = `${table_name}:hash`;

		// 2. write to redis hash key (for creating & updating)
		await this.updateHash(h_key, obj);

		// 3. Read all data from hash and write into Redis Stream
		const redisVals = await this.client.hGetAll(h_key);

		const stream_key = table_name + ':stream';
		await this.client.xAdd(stream_key, '*', redisVals);
		console.log(` [+] New entry is added into stream`);

		// 4. Read all data from stream

		const len = await this.client.xLen(stream_key);
		if (len == 0) {
			console.log(` [x] No data in stream ${stream_key}`);

			scheduler.scheduleJob(stream_key, `*/${save_after} * * * * *`, callback, () => this.client.del(h_key));
		} else {
			const streams = await this.client.xRead(
				{
					key: stream_key,
					id: '0-0',
				},
				{
					COUNT: 200,
				}
			);

			const messages = streams ? streams[0].messages.map((mes) => mes.message) : null;

			if (messages && messages.length >= batch_size) {
				// const data = ArrayUtils.filterUniqueByKey(messages);
				const data = messages;
				callback(data);

				// clean up
				this.client.del(stream_key).then((res) => {
					console.log(` [x] Delete stream with code ${res}`);
					scheduler.cancelJob(stream_key);

					this.client.del(h_key).then((res) => {
						console.log(`[x] Delete hash key with code ${res}`);
					});
				});
			} else {
				scheduler.scheduleJob(stream_key, `*/${save_after} * * * * *`, callback, () => this.client.del(h_key));
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

		let messages = streams ? streams[0].messages.map((mes) => mes.message) : null;

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
			if (typeof obj[k] === 'object') {
				obj[k] = JSON.stringify(obj[k]);
			}

			await this.client.hSet(key, k, String(obj[k]));
		});
	}
}

module.exports = Redis;
