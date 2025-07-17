# Cron Job Configuration for Usage Reset

## Overview
This document describes how to set up automatic usage reset for subscription billing cycles.

## Setup Instructions

### 1. Cloudflare Cron Triggers
Add to your `wrangler.jsonc`:

```jsonc
{
  "triggers": {
    "crons": [
      "0 0 * * *"  // Daily at midnight UTC
    ]
  }
}
```

### 2. Environment Variables
Set these in your Cloudflare Workers environment:

```bash
# Security token for cron endpoint
wrangler secret put CRON_TOKEN
```

### 3. Cron Handler
Add to your main worker:

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Reset usage for all users daily
    const response = await fetch(`${env.API_BASE_URL}/api/admin/reset-usage`, {
      method: 'POST',
      headers: {
        'x-cron-token': env.CRON_TOKEN
      }
    });
    
    const result = await response.json();
    console.log('Daily usage reset:', result);
  }
};
```

### 4. Alternative: External Cron Service
If using an external service like GitHub Actions or a server:

```bash
# Daily cron job
curl -X POST https://your-api.workers.dev/api/admin/reset-usage \
  -H "x-cron-token: YOUR_CRON_TOKEN"
```

## How It Works

1. **Daily Check**: Runs every day at midnight UTC
2. **Billing Cycle Detection**: Checks each user's billing cycle end date
3. **Usage Reset**: Resets usage for users whose billing cycle has ended
4. **Automatic**: No manual intervention required

## Monitoring

The endpoint returns:
- Number of users reset
- Timestamp of operation
- Any errors encountered

## Security

- Protected by `x-cron-token` header
- Only accessible via POST request
- Logs all operations for audit trail