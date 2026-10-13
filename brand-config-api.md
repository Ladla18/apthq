# Brand Config API

Base path: `/v2/aggregate`. Locally that is `http://localhost:3000`.

Auth: send the session token UUID in `Authorization`. A JWT access token is rejected with “Session token is missing”.

Success envelope:

```json
{ "success": true, "message": "string", "data": {} }
```

`config` is a non-empty JSON object. Keys are free-form (`key`, `colors`, `typography`, and so on). A PATCH replaces the stored object: any key you omit is deleted.

---

## 1. GET `/v2/aggregate/config`

Returns the current broker’s theme (server `BROKER`). `data` is the config object, or `{}` if none exists. With `config_type`, only those keys are returned.

| Query | Required | Description |
|---|---|---|
| `config_type` | No | Comma-separated keys to return, e.g. `colors,typography` |

```bash
curl -X GET 'http://localhost:3000/v2/aggregate/config' \
  -H 'Authorization: <session_token>'

curl -X GET 'http://localhost:3000/v2/aggregate/config?config_type=colors,typography' \
  -H 'Authorization: <session_token>'
```

```json
{
  "success": true,
  "message": "Config fetched successfully",
  "data": {
    "key": "smc",
    "typography": { "fontSans": "\"Inter\", ui-sans-serif, system-ui, sans-serif" },
    "colors": { "primary": "#3F4599" }
  }
}
```

---

## 2. PATCH `/v2/aggregate/config`

Replaces the current broker’s config. The body is the config itself. Do not wrap it in `data` or `configs`.

Body: `{ [key: string]: any }` with at least one key. `{}` returns `400`.

```bash
curl -X PATCH 'http://localhost:3000/v2/aggregate/config' \
  -H 'Authorization: <session_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "key": "smc",
    "typography": { "fontSans": "\"Inter\", ui-sans-serif, system-ui, sans-serif" },
    "colors": { "primary": "#000000", "danger": "#FF5630" }
  }'
```

```json
{
  "success": true,
  "message": "Config updated successfully",
  "data": {
    "key": "smc",
    "typography": { "fontSans": "\"Inter\", ui-sans-serif, system-ui, sans-serif" },
    "colors": { "primary": "#000000", "danger": "#FF5630" }
  }
}
```

---

## 3. GET `/v2/aggregate/all_configs`

Returns every broker’s `brand_config` row. `data` is `{ brokerName, config }[]`.

| Query | Required | Description |
|---|---|---|
| `brokers` | No | Comma-separated broker names, e.g. `smc,apt` |
| `config_type` | No | Comma-separated keys to keep inside each config |

```bash
curl -X GET 'http://localhost:3000/v2/aggregate/all_configs' \
  -H 'Authorization: <session_token>'

curl -X GET 'http://localhost:3000/v2/aggregate/all_configs?brokers=smc,apt&config_type=colors' \
  -H 'Authorization: <session_token>'
```

```json
{
  "success": true,
  "message": "Configs fetched successfully",
  "data": [
    {
      "brokerName": "apt",
      "config": { "key": "apt", "colors": { "primary": "#111111" } }
    },
    {
      "brokerName": "smc",
      "config": {
        "key": "smc",
        "colors": { "primary": "#3F4599" },
        "typography": { "fontSans": "Inter" }
      }
    }
  ]
}
```

---

## 4. PATCH `/v2/aggregate/all_configs`

Replaces only the brokers listed in the body. Brokers not listed are left unchanged. A missing row is inserted.

```json
{
  "configs": [
    {
      "brokerName": "string",
      "config": {}
    }
  ]
}
```

- `configs` must have at least one entry.
- `brokerName` must be non-empty and unique in the array.
- Each `config` must be a non-empty object and is a full replace for that broker.

Empty `configs`, a duplicate `brokerName`, or an empty `config` returns `400`.

```bash
curl -X PATCH 'http://localhost:3000/v2/aggregate/all_configs' \
  -H 'Authorization: <session_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "configs": [
      {
        "brokerName": "smc",
        "config": { "key": "smc", "colors": { "primary": "#000000" } }
      },
      {
        "brokerName": "apt",
        "config": { "key": "apt", "typography": { "fontSans": "Inter" } }
      }
    ]
  }'
```

```json
{
  "success": true,
  "message": "Configs updated successfully",
  "data": [
    { "brokerName": "smc", "config": { "key": "smc", "colors": { "primary": "#000000" } } },
    { "brokerName": "apt", "config": { "key": "apt", "typography": { "fontSans": "Inter" } } }
  ]
}
```
