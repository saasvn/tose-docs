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

## Scopes and automatic deploys

A workspace API key may carry scopes. A key without scopes, and every session, keeps full access to its workspace. Connecting Git to a project, and creating a project with a `git` block, are `projects:write` operations that can also queue a first deployment. The API starts that deployment only when the caller also has `deployments:execute`. Each automatic first deploy writes a `deployment.execute` audit event with the deployment ID.

For a key with `projects:write` but not `deployments:execute`:

| Action | Result |
|---|---|
| Connect Git to a project | Succeeds. No first deploy is queued and the connection is created with `auto_deploy` off. |
| Create a project with a `git` block | Succeeds and returns `deploy_skipped` instead of `deployment_id` and `build_logs_url`. |
| Turn `auto_deploy` on, or move the branch of an auto-deploying connection | Fails with `403 insufficient_scope` and `required_scope: deployments:execute`. |

Add `deployments:execute` to the key, or use a session, when Git pushes should deploy automatically.

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
