A JavaScript library ensures that your data is constantly backed up in the background before you access and use it.

# Project Description

- Use write-behind cache mechanism for automatic data persistence.
- Enable users to consistently store data in cache, which is retrieved after every `n` additions or after a specified time interval (example `k` seconds). Params `n` and `k` can be tuned.

# Usage

**Declare autosave object**
```javascript
const autoSaver = new AutoSaver(
	// tableName (string): The name of the table (It can be unique by object and client)
	`table_name`,
	
	// intervalInSeconds (number): Time interval in seconds between auto-saving.
	5,
	
	// batch_size (number): Maximum number of data added
	3,
	
	// saveCallback (function): A callback function that handles when releasing data.
	function (data) {
		if (!data) {
			return;
		}
		// Your body of callback function
	},
	
	// options (object): Additional options for configuration.
	{
		// url (string): The URL of the Redis server.
		url: process.env.REDIS_URL || 'localhost:6379',
		
		// auth (object): Authentication credentials for the Redis server.
		auth: {
			// username (string): The username for authentication.
			username: process.env.REDIS_USERNAME,
			
			// password (string): The password for authentication.
			password: process.env.REDIS_PASSWORD,
		},
	},
	
	// mode (string): default is 'development' to log status on console, set 'production' when deploying
	'development'
);
```

**Add data**
```javascript
await designAutoSaver.addData({/*your data*/});
```

The callback function provided earlier will be invoked upon satisfying either of the two conditions: the specified intervalInSeconds duration elapses, or the defined batch_size limit is reached.

# Design a simple Autosave functionality
If you intend to integrate my library for implementing an Autosave feature, it's crucial to store data in a separate process. This ensures that the autosave functionality and database persistence are decoupled, allowing data storage to occur seamlessly in the background.

For optimal results, I strongly advise adopting the approach of employing AMQP (Advanced Message Queuing Protocol) to facilitate this operation. By leveraging AMQP, you can efficiently transmit data for database persistence, maintaining a clear separation between the autosave process and data storage, all while ensuring smooth background operation.
