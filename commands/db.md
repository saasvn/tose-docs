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
production-db             postgres        active
redis-cache               redis           active
backup-db                 postgres        stopped
```

### JSON Output

```bash
$ tose db list --json
```

```json
{
  "schema_version": "1",
  "status": "ok",
  "success": true,
  "data": [
    {
      "id": "db_abc123",
      "name": "production-db",
      "db_type": "postgres",
      "status": "active"
    },
    {
      "id": "db_def456",
      "name": "redis-cache",
      "db_type": "redis",
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
tose db create [--name <name>] [--type <type>] [--server <id>]
```

### Description

Creates a database in your workspace. In a terminal, a missing `--name` or `--type` is asked interactively. `--server` is never prompted for. Without a terminal, or with `--json`, a missing `--name` or `--type` fails with `INPUT_REQUIRED` and names the flag to pass.

The CLI sends `db_type` and `server_id` to the API, as it requires.

### Options

| Option | Description |
|--------|-------------|
| `--name <name>` | Database name |
| `--type <type>` | Database type, see below |
| `--server <id>` | Server to run the database on |

### Supported Database Types

| `--type` | Description |
|----------|-------------|
| `postgres` | PostgreSQL |
| `pgvector` | PostgreSQL with the pgvector extension |
| `mysql` | MySQL |
| `redis` | In-memory key-value store |
| `mongo` | MongoDB |

`postgresql` and `mongodb` are accepted as aliases for `postgres` and `mongo`. Any other value is rejected before a request is sent.

### Choosing the server

- With **one active server** in the workspace, the CLI picks it automatically.
- With **several active servers**, pass `--server <id>`. Without it the command fails with a validation error that lists the active servers (`details.servers`).
- With **no active server** the command fails; add a server at [tose.sh](https://tose.sh) first.

### Usage

```bash
$ tose db create

? Database name: my-app-db
? Database type:
  ❯ PostgreSQL
    PostgreSQL with pgvector
    MySQL
    Redis
    MongoDB

✓ Database "my-app-db" created
  Status: provisioning. Connection details appear in `tose db info my-app-db` once it is active.
```

Non-interactive, for scripts and agents:

```bash
tose db create --name my-app-db --type postgres --server srv_abc123 --json
```

A new database may not be active yet, so connection details are not part of the create output. Read them with [`tose db info`](#tose-db-info) once the status is `active`.

### JSON Output

The output is the database object returned by the API.

```json
{
  "schema_version": "1",
  "status": "ok",
  "success": true,
  "data": {
    "id": "db_abc123",
    "name": "my-app-db",
    "db_type": "postgres",
    "status": "provisioning"
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
Type:   postgres
Status: active
Port:   5432
User:   user
DB:     production-db

Connection URL:
  postgresql://user:pass@db.tose.sh:5432/production-db
```

### Who sees the credentials

The API returns the connection URL and password only to workspace owners and admins. For other members these fields are absent. `tose db info` then prints a note to ask an owner or admin, and with `--json` the object carries `credentials_visible: false` and a `credentials_note`.

### JSON Output

```json
{
  "schema_version": "1",
  "status": "ok",
  "success": true,
  "data": {
    "id": "db_abc123",
    "name": "production-db",
    "db_type": "postgres",
    "status": "active",
    "port": 5432,
    "db_user": "user",
    "db_name": "production-db",
    "connection_url": "postgresql://user:pass@db.tose.sh:5432/production-db"
  }
}
```

## Workflow: Connect Database to Project

After creating a database, set the connection URL as an environment variable:

```bash
# Create database
tose db create --name my-app-db --type postgres

# Copy the connection URL from `tose db info`, then set it as env var
tose env set DATABASE_URL=postgresql://user:pass@db.tose.sh:5432/my-app-db

# Redeploy to apply
tose redeploy
```

## Related Commands

- [`tose env set`](/commands/env#tose-env-set) - Set connection string as env var
- [`tose redeploy`](/commands/deploy#tose-redeploy) - Apply env changes
