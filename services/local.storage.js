const Scheduler = require('./scheduler');

class LocalStorage {
	//

	constructor() {
		// In-memory storage using Maps
		this.hashes = new Map(); // Store hash keys
		this.streams = new Map(); // Store stream keys (each stream is array of messages)
		this.messageIdCounter = 0; // Counter for generating message IDs

		console.log('[*] LocalStorage initialized successfully!');
	}

	static getInstance() {
		if (!this.instance) {
			this.instance = new LocalStorage();
		}

		return this.instance;
	}

	//

	async writeBehind(table_name, obj, batch_size, save_after, callback, mode) {
		const scheduler = new Scheduler(this);

		// 1. hash key
		const h_key = `${table_name}:hash`;

		// 2. write to hash key (for creating & updating)
		await this.updateHash(h_key, obj);

		// 3. Read all data from hash and write into Stream
		const hashVals = await this.hGetAll(h_key);

		const stream_key = table_name + ':stream';
		await this.xAdd(stream_key, '*', hashVals);

		if (mode === 'development') {
			console.log(` [+] New entry is added into stream`);
		}

		// 4. Read all data from stream

		const len = await this.xLen(stream_key);
		if (len == 0) {
			if (mode === 'development') {
				console.log(` [x] No data in stream ${stream_key}`);
			}

			scheduler.scheduleJob(
				stream_key,
				`*/${save_after} * * * * *`,
				callback,
				() => this.del(h_key),
				mode
			);
		} else {
			const streams = await this.xRead(
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
				const data = messages;
				if (data) {
					callback(data);
				}

				// clean up
				this.del(stream_key).then((res) => {
					if (mode === 'development') {
						console.log(` [x] Delete stream with code ${res}`);
					}

					scheduler.cancelJob(stream_key);

					this.del(h_key).then((res) => {
						if (mode === 'development') {
							console.log(`[x] Delete hash key with code ${res}`);
						}
					});
				});
			} else {
				scheduler.scheduleJob(
					stream_key,
					`*/${save_after} * * * * *`,
					callback,
					() => this.del(h_key),
					mode
				);
			}
		}
	}

	// Simulate Redis xAdd - add entry to stream
	async xAdd(key, id, data) {
		if (!this.streams.has(key)) {
			this.streams.set(key, []);
		}

		const stream = this.streams.get(key);
		const messageId = id === '*' ? `${Date.now()}-${this.messageIdCounter++}` : id;

		stream.push({
			id: messageId,
			message: data,
		});

		return messageId;
	}

	// Simulate Redis xLen - get stream length
	async xLen(key) {
		if (!this.streams.has(key)) {
			return 0;
		}
		return this.streams.get(key).length;
	}

	// Simulate Redis xRead - read from stream
	async xRead(keyConfig, options) {
		const { key, id } = keyConfig;
		const { COUNT } = options;

		if (!this.streams.has(key)) {
			return null;
		}

		const stream = this.streams.get(key);
		if (stream.length === 0) {
			return null;
		}

		// For simplicity, return all messages (id '0-0' means from beginning)
		const messages = stream.slice(0, COUNT || stream.length);

		return [
			{
				name: key,
				messages: messages,
			},
		];
	}

	// Simulate Redis del - delete key
	async del(key) {
		let deleted = 0;

		if (this.hashes.has(key)) {
			this.hashes.delete(key);
			deleted = 1;
		}

		if (this.streams.has(key)) {
			this.streams.delete(key);
			deleted = 1;
		}

		return deleted;
	}

	// Simulate Redis hGetAll - get all hash fields
	async hGetAll(key) {
		if (!this.hashes.has(key)) {
			return {};
		}
		return { ...this.hashes.get(key) };
	}

	// Simulate Redis hSet - set hash field
	async hSet(key, field, value) {
		if (!this.hashes.has(key)) {
			this.hashes.set(key, {});
		}

		const hash = this.hashes.get(key);
		hash[field] = value;
		return 1;
	}

	async getDataFromStream(table_name) {
		const streams = await this.xRead(
			{
				key: table_name,
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
		await this.del(key);

		// update new key value
		await this.setHash(key, obj);
	}

	async setHash(key, obj) {
		Object.keys(obj).forEach(async (k) => {
			if (typeof obj[k] === 'object') {
				obj[k] = JSON.stringify(obj[k]);
			}

			await this.hSet(key, k, String(obj[k]));
		});
	}

	// For backward compatibility with Scheduler
	get client() {
		return this;
	}
}

module.exports = LocalStorage;
