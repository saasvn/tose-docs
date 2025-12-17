# Authentication

Learn how to authenticate with the TOSE API.

## API Key Authentication

The primary method of authentication is using an API key:

```typescript
import { initialize } from 'tose'

const app = initialize({
  apiKey: 'your-api-key-here'
})
```

## Obtaining an API Key

1. Sign up for an account at [https://tose.example.com](https://tose.example.com)
2. Navigate to Settings > API Keys
3. Click "Generate New Key"
4. Copy and securely store your key

::: warning
Never commit your API key to version control. Use environment variables instead.
:::

## Environment Variables

Store your API key securely:

```bash
# .env
TOSE_API_KEY=your-api-key-here
```

Then use it in your application:

```typescript
import { initialize } from 'tose'

const app = initialize({
  apiKey: process.env.TOSE_API_KEY
})
```

## OAuth2 Flow

For user-based authentication, use OAuth2:

```typescript
import { oauth2 } from 'tose'

// Redirect user to authorization URL
const authUrl = oauth2.getAuthorizationUrl({
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback',
  scope: ['read', 'write']
})

// Handle callback
const tokens = await oauth2.handleCallback(code)
```

## Token Refresh

Automatically refresh expired tokens:

```typescript
configure({
  auth: {
    autoRefresh: true,
    onTokenRefresh: (newToken) => {
      // Save new token
    }
  }
})
```

## Security Best Practices

1. Use HTTPS in production
2. Rotate API keys regularly
3. Implement rate limiting
4. Monitor for suspicious activity
5. Never expose keys in client-side code

## Error Handling

Handle authentication errors:

```typescript
try {
  const app = initialize({ apiKey: 'invalid-key' })
} catch (error) {
  if (error.code === 'INVALID_API_KEY') {
    console.error('Invalid API key provided')
  } else if (error.code === 'EXPIRED_TOKEN') {
    console.error('Token has expired')
  }
}
```
