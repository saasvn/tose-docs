# CI suggestions API

Endpoints to list the optimisation suggestions TOSE derives for a CI pipeline, and to accept or dismiss one. Suggestions come from [CI impact selection](/guide/ci-impact-selection) and only exist when that feature is enabled on the server. Full request and response schemas (`CIImpactSuggestion`, `CIImpactSuggestionDecision`) are in the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml).

All paths are under `/api/workspaces/{slug}/ci`.

| Method and path | Who | Purpose |
|-----------------|-----|---------|
| `GET /pipelines/{pipeline_id}/suggestions` | Any member, or an API key with `ci:read` | List suggestions |
| `POST /suggestions/{suggestion_id}/accept` | Workspace owner or admin, signed in | Record acceptance |
| `POST /suggestions/{suggestion_id}/dismiss` | Workspace owner or admin, signed in | Record dismissal |

## List suggestions

```http
GET /api/workspaces/{slug}/ci/pipelines/{pipeline_id}/suggestions?status=open
```

Returns the pipeline's suggestions, newest first, at most 100. `status` is optional and is `open`, `accepted` or `dismissed`.

```bash
curl "https://api.tose.sh/api/workspaces/$WS/ci/pipelines/$PIPELINE/suggestions?status=open" \
  -H "X-API-Key: $TOSE_API_KEY"
```

**Response:** `200` with `{"suggestions": [...]}`. Each suggestion has:

| Field | Description |
|-------|-------------|
| `id`, `pipeline_id`, `workspace_id` | Identifiers |
| `kind` | `add_impact_section`, `add_target_paths`, `fix_graph_miss`, `harden_flaky_job`, `map_job` or `split_job` |
| `job` | The job it is about, when there is one |
| `title`, `detail` | What to change and why |
| `proposal` | The change to make by hand, such as a `.tose/ci.yml` snippet |
| `evidence` | JSON with the counts and runs the suggestion is based on |
| `status` | `open`, `accepted` or `dismissed` |
| `decided_by`, `decided_at`, `note` | Who decided (`user:<id>`), when, and the optional note |

An open suggestion has its evidence refreshed each hour. A decided suggestion is never raised again.

## Accept or dismiss a suggestion

```http
POST /api/workspaces/{slug}/ci/suggestions/{suggestion_id}/accept
POST /api/workspaces/{slug}/ci/suggestions/{suggestion_id}/dismiss
```

The body is optional:

| Field | Type | Description |
|-------|------|-------------|
| `note` | string | Reason kept with the decision, at most 2000 characters. No other field is accepted |

```bash
curl -X POST "https://api.tose.sh/api/workspaces/$WS/ci/suggestions/$ID/accept" \
  -H "Cookie: $SESSION_COOKIE" -H "Content-Type: application/json" \
  -d '{"note": "Will add the target in #482"}'
```

**Response:** `200` with `{"suggestion": {...}}`.

A decision **records approval for a human to apply in the repository and changes nothing else.** TOSE has read-only access to your repository and never edits `.tose/ci.yml` or the pipeline. After accepting, make the proposed change yourself and open a pull request.

### Session only

Deciding is the exception to agents being first-class API users. These two routes need a **signed-in owner or admin** (dashboard or CLI session). API keys and connected apps are refused whatever their scopes, because a suggestion exists for a person's approval. The audit action is `ci.suggestion.decide`.

| Status | Meaning |
|--------|---------|
| `400` | The body has a field other than `note`, or the note is too long |
| `401` | Not signed in |
| `403` | Not an owner or admin, or the caller is an API key or connected app |
| `404` | No such suggestion in this workspace |
| `409` | The suggestion was already decided (`already_decided`) |

See [Errors](/api/errors) for the error format and [API Keys & Scopes](/api/api-keys) for how scopes work.
