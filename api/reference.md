# API Reference

Complete API reference for TOSE.

## Core Functions

### `initialize()`

Initialize the TOSE application.

```typescript
function initialize(options: InitOptions): App
```

**Parameters:**

- `options` - Configuration options

**Returns:** Application instance

**Example:**

```typescript
const app = initialize({
  apiKey: 'your-api-key',
  environment: 'production'
})
```

### `configure()`

Update configuration after initialization.

```typescript
function configure(options: Partial<ConfigOptions>): void
```

**Parameters:**

- `options` - Partial configuration object

**Example:**

```typescript
configure({
  timeout: 5000,
  retries: 3
})
```

### `use()`

Register middleware.

```typescript
function use(middleware: Middleware): void
```

**Parameters:**

- `middleware` - Middleware function

**Example:**

```typescript
use((context, next) => {
  console.log('Before request')
  const result = next()
  console.log('After request')
  return result
})
```

## Type Definitions

### `InitOptions`

```typescript
interface InitOptions {
  apiKey: string
  environment?: 'development' | 'staging' | 'production'
  timeout?: number
  retries?: number
  debug?: boolean
}
```

### `ConfigOptions`

```typescript
interface ConfigOptions extends InitOptions {
  cache?: CacheOptions
  logging?: LoggingOptions
}
```

### `Middleware`

```typescript
type Middleware = (
  context: Context,
  next: () => any
) => any
```

## Utility Functions

### `createClient()`

Create a new client instance.

```typescript
function createClient(config: ClientConfig): Client
```

### `validateConfig()`

Validate configuration object.

```typescript
function validateConfig(config: unknown): config is ConfigOptions
```

## Constants

### `DEFAULT_TIMEOUT`

Default request timeout in milliseconds.

```typescript
const DEFAULT_TIMEOUT: number = 3000
```

### `VERSION`

Current version of TOSE.

```typescript
const VERSION: string
```
