# Ví dụ Dockerfile

Hướng dẫn này cung cấp các ví dụ Dockerfile cho các framework và ngôn ngữ web phổ biến. Các ví dụ này được tối ưu hóa cho môi trường production với multi-stage builds để giữ kích thước image nhỏ gọn.

## Base image phải public

Mọi image trong `FROM` và `COPY --from` của Dockerfile đều được pull ẩn danh, nên mỗi image phải pull được công khai. Base image private sẽ làm build thất bại. Docker Hub giới hạn số lần pull ẩn danh, nên đôi khi build có thể lỗi do chạm giới hạn; hãy thử lại sau.

## Node.js Frameworks

### Express.js

Express là một framework ứng dụng web Node.js tối giản và linh hoạt.

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy file package
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci --only=production

# Copy file ứng dụng
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy dependencies và ứng dụng từ builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Expose port
EXPOSE 3000

# Khởi động ứng dụng
CMD ["node", "index.js"]
```

**Port mặc định:** 3000

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

NestJS là một framework Node.js progressive để xây dựng các ứng dụng server-side hiệu quả và có khả năng mở rộng.

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy file package
COPY package*.json ./

# Cài đặt tất cả dependencies (bao gồm dev dependencies cho build)
RUN npm ci

# Copy source code
COPY . .

# Build ứng dụng
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy file package
COPY package*.json ./

# Chỉ cài đặt production dependencies
RUN npm ci --only=production

# Copy ứng dụng đã build từ builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Khởi động ứng dụng
CMD ["node", "dist/main"]
```

**Port mặc định:** 3000

---

### Next.js

Next.js là một React framework cho production với hybrid static & server rendering.

**Dockerfile:**

```dockerfile
# Dependencies stage
FROM node:18-alpine AS deps

WORKDIR /app

# Copy file package
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy file ứng dụng
COPY . .

# Build ứng dụng
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV production

# Thêm user cho bảo mật
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy file cần thiết
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

**Port mặc định:** 3000

**Lưu ý:** Yêu cầu `output: 'standalone'` trong `next.config.js`

---

## Python Frameworks

### Flask

Flask là một WSGI web application framework nhẹ được viết bằng Python.

**Dockerfile:**

```dockerfile
# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Cài đặt dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies từ builder
COPY --from=builder /root/.local /root/.local

# Copy ứng dụng
COPY . .

# Đảm bảo scripts trong .local có thể sử dụng được
ENV PATH=/root/.local/bin:$PATH

# Expose port
EXPOSE 5000

# Chạy với gunicorn cho production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app:app"]
```

**Port mặc định:** 5000

**Ví dụ requirements.txt:**
```
Flask==3.0.0
gunicorn==21.2.0
```

---

### Django

Django là một Python web framework cấp cao khuyến khích phát triển nhanh.

**Dockerfile:**

```dockerfile
# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Cài đặt dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies từ builder
COPY --from=builder /root/.local /root/.local

# Copy ứng dụng
COPY . .

# Đảm bảo scripts trong .local có thể sử dụng được
ENV PATH=/root/.local/bin:$PATH

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Chạy với gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "myproject.wsgi:application"]
```

**Port mặc định:** 8000

**Ví dụ requirements.txt:**
```
Django==5.0.0
gunicorn==21.2.0
psycopg2-binary==2.9.9
```

---

### FastAPI

FastAPI là một web framework hiện đại, nhanh để xây dựng API với Python.

**Dockerfile:**

```dockerfile
# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Cài đặt dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies từ builder
COPY --from=builder /root/.local /root/.local

# Copy ứng dụng
COPY . .

# Đảm bảo scripts trong .local có thể sử dụng được
ENV PATH=/root/.local/bin:$PATH

# Expose port
EXPOSE 8000

# Chạy với uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**Port mặc định:** 8000

**Ví dụ requirements.txt:**
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.0
```

---

## Go Frameworks

### Gin

Gin là một HTTP web framework hiệu năng cao được viết bằng Go.

**Dockerfile:**

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy file go mod
COPY go.mod go.sum ./

# Tải dependencies
RUN go mod download

# Copy source code
COPY . .

# Build ứng dụng
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary từ builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Chạy ứng dụng
CMD ["./main"]
```

**Port mặc định:** 8080

---

### Fiber

Fiber là một web framework lấy cảm hứng từ Express được xây dựng trên Fasthttp.

**Dockerfile:**

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy file go mod
COPY go.mod go.sum ./

# Tải dependencies
RUN go mod download

# Copy source code
COPY . .

# Build ứng dụng
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary từ builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 3000

# Chạy ứng dụng
CMD ["./main"]
```

**Port mặc định:** 3000

---

### Echo

Echo là một Go web framework hiệu năng cao, tối giản.

**Dockerfile:**

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy file go mod
COPY go.mod go.sum ./

# Tải dependencies
RUN go mod download

# Copy source code
COPY . .

# Build ứng dụng
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary từ builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Chạy ứng dụng
CMD ["./main"]
```

**Port mặc định:** 8080

---

## Rust Frameworks

### Actix-web

Actix-web là một web framework mạnh mẽ, thực tế và cực kỳ nhanh cho Rust.

**Dockerfile:**

```dockerfile
# Build stage
FROM rust:1.75-alpine AS builder

# Cài đặt build dependencies
RUN apk add --no-cache musl-dev

WORKDIR /app

# Copy file manifest
COPY Cargo.toml Cargo.lock ./

# Tạo dummy source để cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy source code thực tế
COPY src ./src

# Build ứng dụng
RUN touch src/main.rs && cargo build --release

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary từ builder
COPY --from=builder /app/target/release/app .

# Expose port
EXPOSE 8080

# Chạy ứng dụng
CMD ["./app"]
```

**Port mặc định:** 8080

---

### Rocket

Rocket là một web framework cho Rust tập trung vào dễ sử dụng và an toàn kiểu.

**Dockerfile:**

```dockerfile
# Build stage
FROM rust:1.75-alpine AS builder

# Cài đặt build dependencies
RUN apk add --no-cache musl-dev

WORKDIR /app

# Copy file manifest
COPY Cargo.toml Cargo.lock ./

# Tạo dummy source để cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy source code thực tế
COPY src ./src

# Build ứng dụng
RUN touch src/main.rs && cargo build --release

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary từ builder
COPY --from=builder /app/target/release/app .

# Expose port
EXPOSE 8000

# Chạy ứng dụng
CMD ["./app"]
```

**Port mặc định:** 8000

---

## PHP Frameworks

### Laravel

Laravel là một web application framework với cú pháp biểu cảm, thanh lịch.

**Dockerfile:**

```dockerfile
# Build stage
FROM composer:2 AS builder

WORKDIR /app

# Copy file composer
COPY composer.json composer.lock ./

# Cài đặt dependencies
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Copy ứng dụng
COPY . .

# Tạo autoloader
RUN composer dump-autoload --optimize --no-dev

# Production stage
FROM php:8.2-fpm-alpine

WORKDIR /var/www/html

# Cài đặt PHP extensions
RUN apk add --no-cache \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo pdo_mysql

# Copy ứng dụng từ builder
COPY --from=builder /app .

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Cài đặt nginx
RUN apk add --no-cache nginx

# Copy cấu hình nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Khởi động services
CMD php-fpm -D && nginx -g 'daemon off;'
```

**Port mặc định:** 80

**Ví dụ nginx.conf:**
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

Rails là một server-side web application framework được viết bằng Ruby.

**Dockerfile:**

```dockerfile
# Build stage
FROM ruby:3.2-alpine AS builder

WORKDIR /app

# Cài đặt build dependencies
RUN apk add --no-cache \
    build-base \
    postgresql-dev \
    nodejs \
    yarn

# Copy Gemfile
COPY Gemfile Gemfile.lock ./

# Cài đặt gems
RUN bundle install --without development test

# Copy ứng dụng
COPY . .

# Precompile assets
RUN bundle exec rails assets:precompile

# Production stage
FROM ruby:3.2-alpine

WORKDIR /app

# Cài đặt runtime dependencies
RUN apk add --no-cache \
    postgresql-client \
    nodejs \
    tzdata

# Copy gems từ builder
COPY --from=builder /usr/local/bundle /usr/local/bundle

# Copy ứng dụng từ builder
COPY --from=builder /app .

# Expose port
EXPOSE 3000

# Khởi động ứng dụng
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

**Port mặc định:** 3000

---

## Java Frameworks

### Spring Boot

Spring Boot là một framework để xây dựng các ứng dụng Spring production-ready.

**Dockerfile:**

```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy pom.xml
COPY pom.xml .

# Tải dependencies
RUN mvn dependency:go-offline

# Copy source code
COPY src ./src

# Build ứng dụng
RUN mvn clean package -DskipTests

# Production stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy jar từ builder
COPY --from=builder /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Chạy ứng dụng
CMD ["java", "-jar", "app.jar"]
```

**Port mặc định:** 8080

**Thay thế với Gradle:**

```dockerfile
# Build stage
FROM gradle:8.5-jdk17 AS builder

WORKDIR /app

# Copy file gradle
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Tải dependencies
RUN gradle dependencies --no-daemon

# Copy source code
COPY src ./src

# Build ứng dụng
RUN gradle bootJar --no-daemon

# Production stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy jar từ builder
COPY --from=builder /app/build/libs/*.jar app.jar

# Expose port
EXPOSE 8080

# Chạy ứng dụng
CMD ["java", "-jar", "app.jar"]
```

---

## .NET Framework

### ASP.NET Core

ASP.NET Core là một framework đa nền tảng, hiệu năng cao để xây dựng các ứng dụng hiện đại.

**Dockerfile:**

```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder

WORKDIR /app

# Copy file project
COPY *.csproj ./

# Restore dependencies
RUN dotnet restore

# Copy source code
COPY . ./

# Build và publish
RUN dotnet publish -c Release -o out

# Production stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0

WORKDIR /app

# Copy ứng dụng đã publish
COPY --from=builder /app/out .

# Expose port
EXPOSE 80

# Chạy ứng dụng
CMD ["dotnet", "YourApp.dll"]
```

**Port mặc định:** 80 (có thể cấu hình qua biến môi trường)

---

## Static Sites

### Static HTML/CSS/JS

Cho các website tĩnh không có build process.

**Dockerfile:**

```dockerfile
FROM nginx:alpine

# Copy file tĩnh
COPY . /usr/share/nginx/html

# Copy cấu hình nginx tùy chỉnh (tùy chọn)
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Port mặc định:** 80

---

### React (Create React App / Vite)

Cho các ứng dụng React được build với Create React App hoặc Vite.

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy file package
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Copy source code
COPY . .

# Build ứng dụng
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy file đã build
COPY --from=builder /app/build /usr/share/nginx/html
# Cho Vite: COPY --from=builder /app/dist /usr/share/nginx/html

# Copy cấu hình nginx tùy chỉnh
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Port mặc định:** 80

**nginx.conf cho SPA:**
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

Cho các ứng dụng Vue.js.

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy file package
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Copy source code
COPY . .

# Build ứng dụng
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy file đã build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy cấu hình nginx tùy chỉnh
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Port mặc định:** 80

---

### Angular

Cho các ứng dụng Angular.

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy file package
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Copy source code
COPY . .

# Build ứng dụng
RUN npm run build -- --configuration production

# Production stage
FROM nginx:alpine

# Copy file đã build
COPY --from=builder /app/dist/your-app-name /usr/share/nginx/html

# Copy cấu hình nginx tùy chỉnh
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Port mặc định:** 80

---

## Best Practices

### 1. Sử dụng Multi-Stage Builds

Multi-stage builds giúp giảm kích thước image cuối cùng bằng cách tách biệt build dependencies khỏi runtime dependencies.

### 2. Sử dụng .dockerignore

Luôn tạo file `.dockerignore` để loại trừ các file không cần thiết:

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

### 3. Tối ưu hóa Layer

- Copy file dependencies trước (package.json, requirements.txt, etc.)
- Cài đặt dependencies
- Copy mã nguồn ứng dụng sau cùng

Điều này đảm bảo rằng các layer dependencies được cache và chỉ rebuild khi dependencies thay đổi.

### 4. Bảo mật

- Sử dụng base images chính thức từ nguồn đáng tin cậy
- Chạy ứng dụng với non-root user khi có thể
- Giữ base images được cập nhật
- Quét images để tìm lỗ hổng bảo mật

### 5. Biến môi trường

Sử dụng biến môi trường cho cấu hình:

```dockerfile
ENV NODE_ENV=production
ENV PORT=3000
```

### 6. Health Checks

Thêm health checks vào Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### 7. Kích thước Image

- Sử dụng Alpine Linux base images khi có thể
- Xóa build dependencies trong production stage
- Sử dụng flag `--no-cache` khi cài đặt packages
- Dọn dẹp các file tạm thời

## Bảng tham chiếu Port phổ biến

| Framework/Ngôn ngữ | Port mặc định |
|-------------------|---------------|
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

## Bước tiếp theo

Sau khi tạo Dockerfile:

1. Build image: `docker build -t myapp .`
2. Chạy container: `docker run -p 3000:3000 myapp`
3. Kiểm tra ứng dụng
4. Push lên container registry
5. Triển khai với TOSE CLI: `tose up`

Để triển khai với TOSE CLI, xem [Bắt đầu](/vi/guide/getting-started).
