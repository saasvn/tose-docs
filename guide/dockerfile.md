# Dockerfile Examples

This guide provides Dockerfile examples for popular web frameworks and languages. These examples are optimized for production use with multi-stage builds to keep image sizes small.

## Node.js Frameworks

### Express.js

Express is a minimal and flexible Node.js web application framework.

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy dependencies and application from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "index.js"]
```

**Default Port:** 3000

**.dockerignore:**
```
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
.dockerignore
```

---

### NestJS

NestJS is a progressive Node.js framework for building efficient and scalable server-side applications.

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main"]
```

**Default Port:** 3000

---

### Next.js

Next.js is a React framework for production with hybrid static & server rendering.

**Dockerfile:**

```dockerfile
# Dependencies stage
FROM node:18-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application files
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV production

# Add user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

**Default Port:** 3000

**Note:** Requires `output: 'standalone'` in `next.config.js`

---

## Python Frameworks

### Flask

Flask is a lightweight WSGI web application framework in Python.

**Dockerfile:**

```dockerfile
# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application
COPY . .

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Expose port
EXPOSE 5000

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app:app"]
```

**Default Port:** 5000

**requirements.txt example:**
```
Flask==3.0.0
gunicorn==21.2.0
```

---

### Django

Django is a high-level Python web framework that encourages rapid development.

**Dockerfile:**

```dockerfile
# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application
COPY . .

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Run with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "myproject.wsgi:application"]
```

**Default Port:** 8000

**requirements.txt example:**
```
Django==5.0.0
gunicorn==21.2.0
psycopg2-binary==2.9.9
```

---

### FastAPI

FastAPI is a modern, fast web framework for building APIs with Python.

**Dockerfile:**

```dockerfile
# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application
COPY . .

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Expose port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**Default Port:** 8000

**requirements.txt example:**
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.0
```

---

## Go Frameworks

### Gin

Gin is a high-performance HTTP web framework written in Go.

**Dockerfile:**

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run application
CMD ["./main"]
```

**Default Port:** 8080

---

### Fiber

Fiber is an Express-inspired web framework built on top of Fasthttp.

**Dockerfile:**

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 3000

# Run application
CMD ["./main"]
```

**Default Port:** 3000

---

### Echo

Echo is a high performance, minimalist Go web framework.

**Dockerfile:**

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run application
CMD ["./main"]
```

**Default Port:** 8080

---

## Rust Frameworks

### Actix-web

Actix-web is a powerful, pragmatic, and extremely fast web framework for Rust.

**Dockerfile:**

```dockerfile
# Build stage
FROM rust:1.75-alpine AS builder

# Install build dependencies
RUN apk add --no-cache musl-dev

WORKDIR /app

# Copy manifest files
COPY Cargo.toml Cargo.lock ./

# Create dummy source to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy actual source code
COPY src ./src

# Build application
RUN touch src/main.rs && cargo build --release

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/target/release/app .

# Expose port
EXPOSE 8080

# Run application
CMD ["./app"]
```

**Default Port:** 8080

---

### Rocket

Rocket is a web framework for Rust with focus on ease-of-use and type safety.

**Dockerfile:**

```dockerfile
# Build stage
FROM rust:1.75-alpine AS builder

# Install build dependencies
RUN apk add --no-cache musl-dev

WORKDIR /app

# Copy manifest files
COPY Cargo.toml Cargo.lock ./

# Create dummy source to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy actual source code
COPY src ./src

# Build application
RUN touch src/main.rs && cargo build --release

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/target/release/app .

# Expose port
EXPOSE 8000

# Run application
CMD ["./app"]
```

**Default Port:** 8000

---

## PHP Frameworks

### Laravel

Laravel is a web application framework with expressive, elegant syntax.

**Dockerfile:**

```dockerfile
# Build stage
FROM composer:2 AS builder

WORKDIR /app

# Copy composer files
COPY composer.json composer.lock ./

# Install dependencies
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Copy application
COPY . .

# Generate autoloader
RUN composer dump-autoload --optimize --no-dev

# Production stage
FROM php:8.2-fpm-alpine

WORKDIR /var/www/html

# Install PHP extensions
RUN apk add --no-cache \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo pdo_mysql

# Copy application from builder
COPY --from=builder /app .

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Install nginx
RUN apk add --no-cache nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start services
CMD php-fpm -D && nginx -g 'daemon off;'
```

**Default Port:** 80

**nginx.conf example:**
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;

    server {
        listen 80;
        root /var/www/html/public;
        index index.php;

        location / {
            try_files $uri $uri/ /index.php?$query_string;
        }

        location ~ \.php$ {
            fastcgi_pass 127.0.0.1:9000;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
        }
    }
}
```

---

## Ruby Frameworks

### Ruby on Rails

Rails is a server-side web application framework written in Ruby.

**Dockerfile:**

```dockerfile
# Build stage
FROM ruby:3.2-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    postgresql-dev \
    nodejs \
    yarn

# Copy Gemfile
COPY Gemfile Gemfile.lock ./

# Install gems
RUN bundle install --without development test

# Copy application
COPY . .

# Precompile assets
RUN bundle exec rails assets:precompile

# Production stage
FROM ruby:3.2-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    postgresql-client \
    nodejs \
    tzdata

# Copy gems from builder
COPY --from=builder /usr/local/bundle /usr/local/bundle

# Copy application from builder
COPY --from=builder /app .

# Expose port
EXPOSE 3000

# Start application
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

**Default Port:** 3000

---

## Java Frameworks

### Spring Boot

Spring Boot is a framework for building production-ready Spring applications.

**Dockerfile:**

```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy pom.xml
COPY pom.xml .

# Download dependencies
RUN mvn dependency:go-offline

# Copy source code
COPY src ./src

# Build application
RUN mvn clean package -DskipTests

# Production stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy jar from builder
COPY --from=builder /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Run application
CMD ["java", "-jar", "app.jar"]
```

**Default Port:** 8080

**Alternative with Gradle:**

```dockerfile
# Build stage
FROM gradle:8.5-jdk17 AS builder

WORKDIR /app

# Copy gradle files
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Download dependencies
RUN gradle dependencies --no-daemon

# Copy source code
COPY src ./src

# Build application
RUN gradle bootJar --no-daemon

# Production stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy jar from builder
COPY --from=builder /app/build/libs/*.jar app.jar

# Expose port
EXPOSE 8080

# Run application
CMD ["java", "-jar", "app.jar"]
```

---

## .NET Framework

### ASP.NET Core

ASP.NET Core is a cross-platform, high-performance framework for building modern applications.

**Dockerfile:**

```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder

WORKDIR /app

# Copy project files
COPY *.csproj ./

# Restore dependencies
RUN dotnet restore

# Copy source code
COPY . ./

# Build and publish
RUN dotnet publish -c Release -o out

# Production stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0

WORKDIR /app

# Copy published application
COPY --from=builder /app/out .

# Expose port
EXPOSE 80

# Run application
CMD ["dotnet", "YourApp.dll"]
```

**Default Port:** 80 (configurable via environment variables)

---

## Static Sites

### Static HTML/CSS/JS

For static websites with no build process.

**Dockerfile:**

```dockerfile
FROM nginx:alpine

# Copy static files
COPY . /usr/share/nginx/html

# Copy custom nginx configuration (optional)
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Default Port:** 80

---

### React (Create React App / Vite)

For React applications built with Create React App or Vite.

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html
# For Vite: COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Default Port:** 80

**nginx.conf for SPA:**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### Vue.js

For Vue.js applications.

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Default Port:** 80

---

### Angular

For Angular applications.

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build -- --configuration production

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist/your-app-name /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Default Port:** 80

---

## Best Practices

### 1. Use Multi-Stage Builds

Multi-stage builds help reduce final image size by separating build dependencies from runtime dependencies.

### 2. Use .dockerignore

Always create a `.dockerignore` file to exclude unnecessary files:

```
node_modules
npm-debug.log
.env
.env.*
.git
.gitignore
.DS_Store
*.md
.vscode
.idea
coverage
.pytest_cache
__pycache__
*.pyc
target/
build/
dist/
```

### 3. Layer Optimization

- Copy dependency files first (package.json, requirements.txt, etc.)
- Install dependencies
- Copy application code last

This ensures that dependency layers are cached and only rebuilt when dependencies change.

### 4. Security

- Use official base images from trusted sources
- Run applications as non-root users when possible
- Keep base images updated
- Scan images for vulnerabilities

### 5. Environment Variables

Use environment variables for configuration:

```dockerfile
ENV NODE_ENV=production
ENV PORT=3000
```

### 6. Health Checks

Add health checks to your Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### 7. Image Size

- Use Alpine Linux base images when possible
- Remove build dependencies in production stage
- Use `--no-cache` flags when installing packages
- Clean up temporary files

## Common Port Reference

| Framework/Language | Default Port |
|-------------------|--------------|
| Express.js | 3000 |
| NestJS | 3000 |
| Next.js | 3000 |
| Flask | 5000 |
| Django | 8000 |
| FastAPI | 8000 |
| Gin (Go) | 8080 |
| Fiber (Go) | 3000 |
| Echo (Go) | 8080 |
| Actix-web (Rust) | 8080 |
| Rocket (Rust) | 8000 |
| Laravel (PHP) | 80 |
| Rails (Ruby) | 3000 |
| Spring Boot (Java) | 8080 |
| ASP.NET Core | 80 |
| Static (nginx) | 80 |

## Next Steps

After creating your Dockerfile:

1. Build the image: `docker build -t myapp .`
2. Run the container: `docker run -p 3000:3000 myapp`
3. Test your application
4. Push to a container registry
5. Deploy with TOSE CLI: `tose up`

For deployment with TOSE CLI, see [Getting Started](/guide/getting-started).
