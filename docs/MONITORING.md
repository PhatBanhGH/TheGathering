# Monitoring & Analytics Guide

This guide covers monitoring, logging, and analytics for the Gather Town application.

## Logging System

### Backend Logging

The backend uses a centralized logging system (`backend/utils/logger.ts`) with different log levels:

- **ERROR**: Critical errors that need attention
- **WARN**: Warnings that might indicate issues
- **INFO**: General information about application flow
- **DEBUG**: Detailed debugging information

### Log Levels

Set log level via environment variable:
```bash
LOG_LEVEL=debug  # Options: error, warn, info, debug
```

### Request Logging

All API requests are automatically logged with:
- HTTP method and path
- Status code
- Response time
- User ID (if authenticated)

### Database Logging

Database operations are logged with:
- Operation type
- Collection name
- Duration
- Errors (if any)

### Socket.IO Logging

Socket events are logged with:
- Event name
- User ID
- Room ID
- Errors (if any)

## Analytics

### Event Types

1. **page_view**: Page navigation events
2. **user_action**: User interactions (clicks, form submissions, etc.)
3. **error**: Error occurrences
4. **performance**: Performance metrics
5. **custom**: Custom events

### Frontend Analytics

The frontend analytics utility (`src/utils/analytics.ts`) automatically tracks:
- Page views
- User actions
- Errors (via ErrorBoundary)
- Performance metrics

### Usage Examples

```typescript
import { analytics } from "../utils/analytics";

// Track page view
analytics.trackPageView("/app/chat");

// Track user action
analytics.trackUserAction("button_click", {
  buttonName: "send_message",
  channelId: "general",
});

// Track error
analytics.trackError(error, {
  component: "ChatComponent",
  userId: currentUser.userId,
});

// Track performance
analytics.trackPerformance("page_load_time", 1234, {
  page: "/app",
});
```

### Analytics API

#### Track Event
```bash
POST /api/analytics/track
Content-Type: application/json
Authorization: Bearer <token> (optional)

{
  "eventType": "user_action",
  "eventName": "button_click",
  "properties": {
    "buttonName": "send_message"
  },
  "sessionId": "session-123"
}
```

#### Get Events (Admin)
```bash
GET /api/analytics/events?eventType=user_action&limit=100
Authorization: Bearer <admin-token>
```

#### Get Summary (Admin)
```bash
GET /api/analytics/summary?startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer <admin-token>
```

## Health Checks

### Backend Health
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-XX...",
  "uptime": 123.45,
  "database": "connected"
}
```

### Frontend Health
```bash
GET /health
```

Response: `healthy`

## Error Tracking

### Automatic Error Tracking

Errors are automatically tracked:
- **Frontend**: Via ErrorBoundary component
- **Backend**: Via error handler middleware

### Manual Error Tracking

```typescript
// Frontend
analytics.trackError(error, {
  context: "additional context",
});

// Backend
logger.error("Error message", error, {
  context: "additional context",
});
```

## Performance Monitoring

### Frontend Performance

Track performance metrics:
```typescript
// Page load time
const startTime = performance.now();
// ... page loads
const loadTime = performance.now() - startTime;
analytics.trackPerformance("page_load_time", loadTime);

// API call duration
const apiStart = performance.now();
await fetch("/api/endpoint");
const apiDuration = performance.now() - apiStart;
analytics.trackPerformance("api_call_duration", apiDuration, {
  endpoint: "/api/endpoint",
});
```

### Backend Performance

Request duration is automatically logged in request logger middleware.

## Log Aggregation

### Recommended Services

1. **Sentry**: Error tracking and monitoring
2. **Logtail**: Log aggregation and search
3. **Datadog**: Full-stack monitoring
4. **New Relic**: Application performance monitoring

### Integration Example (Sentry)

```typescript
// backend/utils/logger.ts
import * as Sentry from "@sentry/node";

class Logger {
  // ... existing code ...
  
  private sendToExternalService(entry: LogEntry): void {
    if (entry.level === LogLevel.ERROR && entry.error) {
      Sentry.captureException(entry.error, {
        extra: entry.context,
        tags: {
          level: entry.level,
        },
      });
    }
  }
}
```

## Database Analytics

Analytics data is stored in MongoDB with:
- TTL index (auto-delete after 90 days)
- Indexes for fast queries
- Aggregation pipelines for summaries

### Query Examples

```javascript
// Get events by type
db.analytics.find({ eventType: "user_action" })

// Get events by user
db.analytics.find({ userId: "user-123" })

// Get events in date range
db.analytics.find({
  timestamp: {
    $gte: ISODate("2026-01-01"),
    $lte: ISODate("2026-01-31")
  }
})
```

## Monitoring Best Practices

1. **Log Levels**: Use appropriate log levels
2. **Context**: Include relevant context in logs
3. **Performance**: Don't log in hot paths
4. **Privacy**: Don't log sensitive data
5. **Retention**: Set appropriate retention policies
6. **Alerts**: Set up alerts for critical errors
7. **Dashboards**: Create dashboards for key metrics

## Troubleshooting

### Logs not appearing
- Check `LOG_LEVEL` environment variable
- Verify logger is imported correctly
- Check console output

### Analytics not tracking
- Check network tab for failed requests
- Verify `VITE_SERVER_URL` is correct
- Check backend logs for errors

### Performance issues
- Review log volume
- Check database query performance
- Monitor memory usage

## Next Steps

1. Integrate external logging service (Sentry, Logtail)
2. Set up alerting for critical errors
3. Create monitoring dashboards
4. Implement log rotation
5. Add performance budgets
