const schedule = require('node-schedule');

class Scheduler {
	constructor(redis_client) {
		this.redis_client = redis_client;
	}

	//

	scheduleJob(key, recur_rule, cb, onSuccess, mode) {
		schedule.cancelJob(key);

		schedule.scheduleJob(key, recur_rule, async () => {

			const len = await this.redis_client.xLen(key);
			if (len == 0) {
				if (mode === 'development'){
					console.log(` [x] No data in stream ${key}`);
				}
				schedule.cancelJob(key);
			}

			const res = await this.redis_client.xRead({ key, id: '0-0' }, { COUNT: 200 });

			const messages = res ? res[0].messages.map((mes) => mes.message) : null;

			if (!messages) {
				schedule.cancelJob(key);
			}

			const data = messages;

			if (data){
				cb(data);
			}

			onSuccess();
			this.redis_client.del(key).then((res) => {
				if (mode === 'development'){
					console.log(' [x] Delete stream successfully, ', res);
				}

				if (schedule.cancelJob(key)) {
					if (mode === 'development'){
						console.log(` [x] Job cancelled!`);
					}

				} else {
					if (mode === 'development'){
						console.log(' [x] Error cancelling job!');
					}
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
