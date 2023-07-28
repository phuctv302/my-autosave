const schedule = require('node-schedule');
const redis = require('redis');

const ArrayUtils = require('../utils/array.utils');

class Scheduler {
	constructor(redis_client) {
		this.redis_client = redis_client;
	}

	//

	scheduleJob(key, recur_rule, cb) {
		schedule.cancelJob(key);

		schedule.scheduleJob(key, recur_rule, async () => {
			console.log('***');

			const len = await this.redis_client.xLen(key);
			if (len == 0) {
				console.log(` [x] No data in stream ${key}`);
				schedule.cancelJob(key);
			}

			const res = await this.redis_client.xRead(
				{ key, id: '0-0' },
				{ COUNT: 200 }
			);

			const messages = res ? res[0].messages.map((mes) => mes.message) : null;

			if (!messages) {
				schedule.cancelJob(key);
			}

			// const data = ArrayUtils.filterUniqueByKey(messages);
			const data = messages;

			cb(data);

			this.redis_client.del(key).then((res) => {
				console.log(' [x] Delete stream successfully, ', res);
				if (schedule.cancelJob(key)) {
					console.log(` [x] Job cancelled!`);
				} else {
					console.log(' [x] Error cancelling job!');
				}
			});
		});
	}

	//

	cancelJob(key) {
		return schedule.cancelJob(key);
	}
}

module.exports = Scheduler;
