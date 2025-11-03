# True AutoSaver

A JavaScript library that implements write-behind cache mechanism for automatic data persistence with configurable batch size and time-based triggers.

## Features

- **Write-Behind Caching**: Automatically batch and persist data in the background
- **Dual Storage Backends**: Support both Redis (production) and in-memory (development)
- **Flexible Triggers**: Save data based on batch size OR time interval
- **Easy Configuration**: Simple object-based API
- **Zero Dependencies for Local Mode**: No Redis needed for development
- **TypeScript Ready**: Clean API with predictable behavior

## Installation

```bash
npm install true-autosaver
```

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Local Storage Mode](#local-storage-mode)
  - [Redis Storage Mode](#redis-storage-mode)
- [API Reference](#api-reference)
- [Real-World Example](#real-world-example)
- [Storage Options](#storage-options)
- [Testing](#testing)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Architecture](#architecture)

## Requirements

- **Node.js**: >= 12.0.0
- **Redis** (optional): Only required when using `storage_type: 'redis'`

## Quick Start

```javascript
const AutoSaver = require('true-autosaver');

// Create an AutoSaver instance
const autoSaver = new AutoSaver({
	table_name: 'users',
	batch_size: 10,
	save_after: 30,
	callback: (data) => {
		// Your save logic here (e.g., save to database)
		console.log('Saving batch:', data);
	},
	storage_type: 'local' // Use 'redis' for production
});

// Add data - callback triggers when batch_size reached OR save_after seconds elapsed
await autoSaver.addData({ id: 1, name: 'John' });
await autoSaver.addData({ id: 2, name: 'Jane' });
```

## Usage

### Local Storage Mode

Perfect for development - no Redis server required:

```javascript
const AutoSaver = require('true-autosaver');

const autoSaver = new AutoSaver({
	table_name: 'my_table',
	batch_size: 3,
	save_after: 5,
	callback: (data) => {
		console.log('Saving data:', data);
	},
	storage_type: 'local'
});

await autoSaver.addData({ id: 1, value: 'test' });
```

### Redis Storage Mode

For production with data persistence:

```javascript
const AutoSaver = require('true-autosaver');

const autoSaver = new AutoSaver({
	table_name: 'my_table',
	batch_size: 100,
	save_after: 60,
	callback: async (data) => {
		// Save to database
		await database.insertBatch(data);
	},
	storage_type: 'redis',
	redis_options: {
		url: process.env.REDIS_URL || 'localhost:6379',
		auth: {
			username: process.env.REDIS_USERNAME,
			password: process.env.REDIS_PASSWORD
		}
	},
	mode: 'production'
});

await autoSaver.addData({ id: 1, name: 'John Doe' });
```

## API Reference

### Constructor Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `table_name` | string | - | Unique identifier for the data stream |
| `batch_size` | number | `3` | Number of items before triggering callback |
| `save_after` | number | `10` | Seconds to wait before triggering callback |
| `callback` | function | - | Function called with accumulated data |
| `storage_type` | string | `'redis'` | Storage backend: `'local'` or `'redis'` |
| `redis_options` | object | - | Redis configuration (only for `storage_type: 'redis'`) |
| `mode` | string | `'development'` | Log mode: `'development'` or `'production'` |

### Methods

#### `addData(data)`

Add data to the autosave queue.

```javascript
await autoSaver.addData({ id: 1, name: 'John' });
```

**Parameters:**
- `data` (object|any): Data to be saved

**Returns:** Promise<void>

**Trigger Behavior:**
- Callback triggers when `batch_size` is reached
- OR when `save_after` seconds elapse (whichever comes first)

## Real-World Example

```javascript
const AutoSaver = require('true-autosaver');
const db = require('./database');

// Auto-save user activity logs
const activitySaver = new AutoSaver({
	table_name: 'user_activities',
	batch_size: 50,        // Save every 50 activities
	save_after: 30,        // Or every 30 seconds
	callback: async (activities) => {
		try {
			await db.activities.insertMany(activities);
			console.log(`✅ Saved ${activities.length} activities`);
		} catch (error) {
			console.error('Failed to save activities:', error);
		}
	},
	storage_type: process.env.NODE_ENV === 'production' ? 'redis' : 'local',
	redis_options: {
		url: process.env.REDIS_URL
	},
	mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
});

// In your API endpoint
app.post('/api/track', async (req, res) => {
	await activitySaver.addData({
		user_id: req.user.id,
		action: req.body.action,
		timestamp: new Date()
	});
	res.json({ success: true });
});
```

## Storage Options

| Feature | Local Storage | Redis Storage |
|---------|--------------|---------------|
| **Use Case** | Development & Testing | Production |
| **Setup** | Zero configuration | Redis server required |
| **Persistence** | In-memory only | Persistent storage |
| **Process Restart** | Data lost | Data retained |
| **Performance** | Fastest | Fast (network overhead) |
| **Distributed** | No | Yes |

## Testing

Run the included test scripts:

```bash
# Quick test (3 seconds)
npm run test:quick

# Full test with local storage (13 seconds)
npm run test:local

# Full test with Redis (requires Redis server)
redis-server &
npm run test:redis
```

**Test Coverage:**
- ✅ Batch size trigger
- ✅ Time-based trigger
- ✅ Data persistence
- ✅ Callback execution

## How It Works

```
User adds data → Data queued in storage → Trigger condition met → Callback fired
                                                    ↓
                                    batch_size reached OR save_after elapsed
```

**Example Timeline:**
```
t=0s:  addData(item1) → Queue: [item1]
t=1s:  addData(item2) → Queue: [item1, item2]
t=2s:  addData(item3) → Queue: [item1, item2, item3] → batch_size=3 reached!
       → callback([item1, item2, item3]) → Queue cleared

t=3s:  addData(item4) → Queue: [item4]
t=4s:  addData(item5) → Queue: [item4, item5]
t=8s:  (5 seconds elapsed) → save_after=5 reached!
       → callback([item4, item5]) → Queue cleared
```

## Troubleshooting

### Callback not triggering

**Problem:** Callback never gets called

**Solutions:**
1. Verify `batch_size` and `save_after` are set correctly
2. Ensure you're adding enough data to reach `batch_size`
3. Wait long enough for `save_after` timeout
4. Check callback function for errors

### Redis connection errors

**Problem:** `Error connecting Redis`

**Solutions:**
1. Verify Redis server is running: `redis-cli ping` should return `PONG`
2. Check Redis URL format: `localhost:6379` or `redis://host:port`
3. Verify authentication credentials if using auth
4. For development, use `storage_type: 'local'` instead

### Data not persisting

**Problem:** Data lost after restart

**Solution:** Use `storage_type: 'redis'` for persistence. Local storage is in-memory only.

### Memory issues

**Problem:** High memory usage with local storage

**Solution:**
- Reduce `save_after` timeout to save more frequently
- Reduce `batch_size` to trigger earlier
- Use Redis storage for production

## Best Practices

1. **Use Local Storage for Development**
   ```javascript
   storage_type: process.env.NODE_ENV === 'production' ? 'redis' : 'local'
   ```

2. **Handle Callback Errors**
   ```javascript
   callback: async (data) => {
       try {
           await database.save(data);
       } catch (error) {
           console.error('Save failed:', error);
           // Implement retry logic or dead letter queue
       }
   }
   ```

3. **Tune Parameters Based on Load**
   - High traffic: Increase `batch_size`, decrease `save_after`
   - Low traffic: Decrease `batch_size`, increase `save_after`

4. **Use Different Tables for Different Data Types**
   ```javascript
   const userSaver = new AutoSaver({ table_name: 'users', ... });
   const logSaver = new AutoSaver({ table_name: 'logs', ... });
   ```

## Architecture

This library implements a **write-behind cache** pattern:

1. Data is written to fast storage (RAM or Redis)
2. Application continues without waiting for database
3. Background process batches and persists data
4. Reduces database load and improves performance

For production systems with multiple processes, consider using AMQP (RabbitMQ) or similar message queue for distributed data persistence.

## License

ISC

## Author

Tran Phuc

## Contributing

Issues and pull requests are welcome!
