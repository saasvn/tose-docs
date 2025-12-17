# Advanced Usage

Explore advanced features and patterns for using TOSE.

## Custom Middleware

You can create custom middleware to extend functionality:

```typescript
import { use } from 'tose'

// Define custom middleware
const loggingMiddleware = (context, next) => {
  console.log('Request:', context.request)
  const result = next()
  console.log('Response:', result)
  return result
}

// Use the middleware
use(loggingMiddleware)
```

## Error Handling

Implement robust error handling:

```typescript
import { initialize, onError } from 'tose'

// Global error handler
onError((error) => {
  console.error('TOSE Error:', error)
  // Send to error tracking service
})

// Try-catch for specific operations
try {
  const result = await someOperation()
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // Handle timeout
  }
}
```

## Performance Optimization

### Caching

Enable caching to improve performance:

```typescript
configure({
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 100
  }
})
```

### Batching

Batch multiple requests together:

```typescript
import { batch } from 'tose'

const results = await batch([
  { method: 'get', path: '/users/1' },
  { method: 'get', path: '/users/2' },
  { method: 'get', path: '/users/3' }
])
```

## Plugins

Extend TOSE with plugins:

```typescript
import { plugin } from 'tose'

const myPlugin = {
  name: 'my-plugin',
  setup(api) {
    api.on('init', () => {
      console.log('Plugin initialized')
    })
  }
}

plugin(myPlugin)
```

## Testing

Best practices for testing with TOSE:

```typescript
import { createMock } from 'tose/testing'

describe('My App', () => {
  it('should work', async () => {
    const mock = createMock()
    mock.onGet('/users').reply(200, { users: [] })

    const result = await fetchUsers()
    expect(result).toEqual({ users: [] })
  })
})
```
