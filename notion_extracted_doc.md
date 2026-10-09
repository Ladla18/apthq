# Brand Config Api doc


# Brand Config API

Base: /v2/aggregate

Auth: Authorization: <access_token> on all routes

Success envelope: { "success": true, "message": string, "data": ... }

config is a non-empty JSON object. Keys are free-form (key, colors, typography, …). PATCH replaces the stored object — omitted keys are deleted.

---


## 1. GET /v2/aggregate/config

Current-broker theme (server BROKER).

Query

Response data: config object, or {} if missing. With config_type, only those keys.

```Bash
curl -X GET '<http://localhost:3000/v2/aggregate/config>' \
  -H 'Authorization: <access_token>'

curl -X GET '<http://localhost:3000/v2/aggregate/config?config_type=colors,typography>' \
  -H 'Authorization: <access_token>'
```

```JSON
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


## 2. PATCH /v2/aggregate/config

Replace current-broker config. Body is the config (do not wrap in data / configs).

Body schema: { [key: string]: any } — at least one key.

```Bash
curl -X PATCH '<http://localhost:3000/v2/aggregate/config>' \
  -H 'Authorization: <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "key": "smc",
    "typography": { "fontSans": "\"Inter\", ui-sans-serif, system-ui, sans-serif" },
    "colors": { "primary": "#000000", "danger": "#FF5630" }
  }'
```

```JSON
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

{} → 400.

---


## 3. GET /v2/aggregate/all_configs

All brokers’ brand_config rows.

Query

Response data: { brokerName: string, config: object }[]

```Bash
curl -X GET '<http://localhost:3000/v2/aggregate/all_configs>' \
  -H 'Authorization: <access_token>'

curl -X GET '<http://localhost:3000/v2/aggregate/all_configs?brokers=smc,apt&config_type=colors>' \
  -H 'Authorization: <access_token>'
```

```JSON
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
      "config": { "key": "smc", "colors": { "primary": "#3F4599" }, "typography": { "fontSans": "Inter" } }
    }
  ]
}
```

---


## 4. PATCH /v2/aggregate/all_configs

Replace listed brokers only. Unlisted brokers are unchanged. Missing row is inserted.

Body schema

```Plain Text
{
  configs: Array<{
    brokerName: string,   // non-empty, unique in the array
    config: { [key: string]: any }  // non-empty object, full replace for that broker
  }>  // min 1
}
```

```Bash
curl -X PATCH '<http://localhost:3000/v2/aggregate/all_configs>' \
  -H 'Authorization: <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "configs": [
      {
        "brokerName": "smc",
        "config": {
          "key": "smc",
          "colors": { "primary": "#000000" }
        }
      },
      {
        "brokerName": "apt",
        "config": {
          "key": "apt",
          "typography": { "fontSans": "Inter" }
        }
      }
    ]
  }'
```

```JSON
{
  "success": true,
  "message": "Configs updated successfully",
  "data": [
    { "brokerName": "smc", "config": { "key": "smc", "colors": { "primary": "#000000" } } },
    { "brokerName": "apt", "config": { "key": "apt", "typography": { "fontSans": "Inter" } } }
  ]
}
```

Empty configs, duplicate brokerName, or empty config → 400.

---


## Errors


# Partner Tickets API

Base: `https://api.chat.apt.trading/api/partner/tickets`

Auth: No bearer token.

Request body requirements (all partner routes):

- `user` must be `"partner"`
- `brokers` must be a non-empty array of broker ids
- Only tickets whose `broker` is in `brokers` are accessible
- Accessing a ticket outside `brokers` returns `403`

---


## 1. POST /api/partner/tickets?page=1&limit=20

List partner-visible tickets.

Query params match dashboard list filters:

- `status`
- `type`
- `unread_for`
- date range params
- `page`
- `limit`

Response shape is the same as `GET /api/tickets`.

```Bash
curl --location 'https://api.chat.apt.trading/api/partner/tickets?page=1&limit=20' \
  --header 'Content-Type: application/json' \
  --data '{
    "user": "partner",
    "brokers": ["tradebulls", "other_broker"]
  }'
```

---


## 2. POST /api/partner/tickets/:ticketId

Get partner-visible ticket detail.

Response shape:

```JSON
{
  "ticket": { "...": "..." },
  "messages": [{ "...": "..." }]
}
```

```Bash
curl --location 'https://api.chat.apt.trading/api/partner/tickets/TICKET_ID' \
  --header 'Content-Type: application/json' \
  --data '{
    "user": "partner",
    "brokers": ["tradebulls", "other_broker"]
  }'
```

---


## 3. POST /api/partner/tickets/:ticketId/messages

Partner reply on an allowed ticket.

Behavior:

- Message is saved as support-side reply
- End user sees it in the same thread
- Media/file validation rules are the same as support replies

### JSON body (text-only)

```Bash
curl --location 'https://api.chat.apt.trading/api/partner/tickets/TICKET_ID/messages' \
  --header 'Content-Type: application/json' \
  --data '{
    "user": "partner",
    "brokers": ["tradebulls", "other_broker"],
    "content": "We are looking into this."
  }'
```

### Multipart form-data (with files)

```Bash
curl --location 'https://api.chat.apt.trading/api/partner/tickets/TICKET_ID/messages' \
  --form 'user=partner' \
  --form 'brokers=["tradebulls","other_broker"]' \
  --form 'content=Screenshot attached' \
  --form 'files=@/path/shot.png'
```

