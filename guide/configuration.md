# Configuration

Learn how to configure TOSE to fit your needs.

## Configuration Options

TOSE can be configured using a configuration object:

```typescript
import { configure } from 'tose'

configure({
  apiKey: 'your-api-key',
  environment: 'production',
  timeout: 5000,
  retries: 3,
  debug: false
})
```

## Available Options

### `apiKey`

- **Type:** `string`
- **Required:** Yes
- **Description:** Your API key for authentication

### `environment`

- **Type:** `'development' | 'staging' | 'production'`
- **Default:** `'development'`
- **Description:** The environment to run in

### `timeout`

- **Type:** `number`
- **Default:** `3000`
- **Description:** Request timeout in milliseconds

### `retries`

- **Type:** `number`
- **Default:** `1`
- **Description:** Number of retry attempts for failed requests

### `debug`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable debug logging

## Environment Variables

You can also use environment variables for configuration:

```bash
TOSE_API_KEY=your-api-key
TOSE_ENVIRONMENT=production
TOSE_TIMEOUT=5000
```

## Configuration File

Create a `tose.config.js` file in your project root:

```javascript
export default {
  apiKey: process.env.TOSE_API_KEY,
  environment: 'production',
  timeout: 5000,
  retries: 3
}
```

Then load it in your application:

```typescript
import config from './tose.config.js'
import { configure } from 'tose'

configure(config)
```
