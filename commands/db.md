# tose db

Manage databases in your workspace.

::: tip Workspace-Level Command
Database commands operate at the workspace level, not the project level. You only need to be authenticated and have a workspace selected.
:::

## tose db list

List all databases in the workspace.

### Synopsis

```bash
tose db list
```

### Usage

```bash
$ tose db list

NAME                      TYPE            STATUS
production-db             postgresql      active
redis-cache               redis           active
backup-db                 postgresql      stopped
```

### JSON Output

```bash
$ tose db list --json
```

```json
{
  "success": true,
  "data": [
    {
      "id": "db_abc123",
      "name": "production-db",
      "type": "postgresql",
      "status": "active"
    },
    {
      "id": "db_def456",
      "name": "redis-cache",
      "type": "redis",
      "status": "active"
    }
  ]
}
```

---

## tose db create

Create a new database.

### Synopsis

```bash
tose db create
```

### Description

Interactively creates a new database in your workspace. You'll be prompted to choose a name and database type.

### Supported Database Types

| Type | Description |
|------|-------------|
| PostgreSQL | Relational database |
| MySQL | Relational database |
| Redis | In-memory key-value store |
| MongoDB | Document database |

### Usage

```bash
$ tose db create

? Database name: my-app-db
? Database type:
  ❯ PostgreSQL
    MySQL
    Redis
    MongoDB

✓ Creating database...
✓ Database "my-app-db" created
  Connection: postgresql://user:pass@db.tose.sh:5432/my-app-db
```

### JSON Output

```json
{
  "success": true,
  "data": {
    "id": "db_abc123",
    "name": "my-app-db",
    "type": "postgresql",
    "status": "active",
    "host": "db.tose.sh",
    "port": 5432,
    "username": "user",
    "password": "generated-pass",
    "database_name": "my-app-db",
    "connection_string": "postgresql://user:pass@db.tose.sh:5432/my-app-db"
  }
}
```

---

## tose db info

Show database connection details.

### Synopsis

```bash
tose db info <name-or-id>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<name-or-id>` | Database name or ID |

### Usage

```bash
$ tose db info production-db

Name:   production-db
Type:   postgresql
Status: active
Host:   db.tose.sh
Port:   5432
User:   user
DB:     production-db

Connection string:
  postgresql://user:pass@db.tose.sh:5432/production-db
```

### JSON Output

```json
{
  "success": true,
  "data": {
    "id": "db_abc123",
    "name": "production-db",
    "type": "postgresql",
    "status": "active",
    "host": "db.tose.sh",
    "port": 5432,
    "username": "user",
    "password": "generated-pass",
    "database_name": "production-db",
    "connection_string": "postgresql://user:pass@db.tose.sh:5432/production-db"
  }
}
```

## Workflow: Connect Database to Project

After creating a database, set the connection string as an environment variable:

```bash
# Create database
tose db create

# Copy the connection string, then set it as env var
tose env set DATABASE_URL=postgresql://user:pass@db.tose.sh:5432/my-app-db

# Redeploy to apply
tose redeploy
```

## Related Commands

- [`tose env set`](/commands/env#tose-env-set) - Set connection string as env var
- [`tose redeploy`](/commands/deploy#tose-redeploy) - Apply env changes
