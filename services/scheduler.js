const schedule = require('node-schedule');
const redis = require('redis');

client = redis.createClient();
client.on('error', (err) => console.log(' [!] Redis error: ', err));
client.connect();

const ArrayUtils = require('../utils/array.utils');

class Scheduler {
	//

	static scheduleJob(key, recur_rule, cb) {
		schedule.cancelJob(key);

		schedule.scheduleJob(key, recur_rule, async () => {
			console.log('***');

			const len = await client.xLen(key);
			if (len == 0) {
				console.log(` [x] No data in stream ${key}`);
				schedule.cancelJob(key);
			}

			const res = await client.xRead({ key, id: '0-0' }, { COUNT: 200 });

			const messages = res ? res[0].messages.map((mes) => mes.message) : null;

			if (!messages) {
				schedule.cancelJob(key);
			}

			// const data = ArrayUtils.filterUniqueByKey(messages);
			const data = messages;

			cb(data);

			client.del(key).then((res) => {
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

	static cancelJob(key) {
		return schedule.cancelJob(key);
	}
}

module.exports = Scheduler;
