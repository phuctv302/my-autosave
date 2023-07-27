const schedule = require('node-schedule');
const async = require('async');

const Redis = require('./redis');
const Scheduler = require('./scheduler');

const recur_rule = process.env.FETCH_CRON || '*/10 * * * * *';

const argvs = process.argv.slice(2);
const key = argvs[0];

Scheduler.scheduleJob(key, recur_rule, function (data) {
	console.log(JSON.stringify(data));
});
