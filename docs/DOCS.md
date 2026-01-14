# Complete Documentation

This is the complete documentation for Gather Town Clone project, combining deployment, testing, and monitoring guides.

---

## Table of Contents

1. [Deployment Guide](#deployment-guide)
2. [Testing Guide](#testing-guide)
3. [Monitoring & Analytics](#monitoring--analytics)
4. [Camera Multi-Tab Fix](#camera-multi-tab-fix)
5. [Features Implementation](#features-implementation)

---

# Deployment Guide

This guide covers deploying the Gather Town application using Docker and various hosting platforms.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- MongoDB (or MongoDB Atlas account)
- Environment variables configured

## Local Development with Docker

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Gather
   ```

2. **Create environment files**
   ```bash
   # Copy example env files
   cp backend/env.example.txt backend/.env
   # Edit .env with your configuration
   ```

3. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:5001
   - MongoDB: localhost:27017

### Stop services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

## Production Deployment

### Option 1: Docker Compose (Single Server)

1. **Prepare production environment**
   ```bash
   export NODE_ENV=production
   export MONGODB_URI=mongodb://user:pass@host:27017/gather-town
   export JWT_SECRET=your-strong-secret-key
   export JWT_REFRESH_SECRET=your-refresh-secret-key
   export CLIENT_URL=https://yourdomain.com
   ```

2. **Update docker-compose.yml**
   - Update environment variables
   - Configure proper volumes for persistence
   - Set up SSL/TLS certificates

3. **Deploy**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

### Option 2: Separate Services

#### Frontend (Vercel/Netlify)
```bash
npm run build
npm i -g vercel
vercel --prod
```

#### Backend (Railway/Render/AWS)
```bash
cd backend
docker build -t gather-backend .
docker run -p 5001:5001 gather-backend
```

#### Database (MongoDB Atlas)
1. Create MongoDB Atlas cluster
2. Get connection string
3. Update `MONGODB_URI` in backend environment

## Environment Variables

### Frontend (.env)
```env
VITE_SERVER_URL=http://localhost:5001
```

### Backend (.env)
```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb://localhost:27017/gather-town
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_RECAPTCHA_SECRET_KEY=your-recaptcha-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Docker Commands

```bash
# Build images
docker build -t gather-frontend .
docker build -t gather-backend ./backend

# Run containers
docker run -p 80:80 gather-frontend
docker run -p 5001:5001 gather-backend

# View logs
docker logs gather-frontend
docker logs gather-backend
```

## Health Checks

```bash
# Frontend
curl http://localhost/health

# Backend
curl http://localhost:5001/health
```

---

# Testing Guide

This document describes the testing setup and how to run tests for the Gather Town project.

## Testing Framework

- **Frontend**: Vitest + React Testing Library
- **Backend**: Vitest + Node.js environment

## Running Tests

### Frontend Tests
```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm test -- --coverage  # With coverage
```

### Backend Tests
```bash
cd backend
npm test              # Run once
npm run test:watch    # Watch mode
npm test -- --coverage  # With coverage
```

## Test Structure

### Frontend Tests
- Location: `src/**/__tests__/*.test.ts` or `src/**/__tests__/*.test.tsx`
- Setup: `src/test/setup.ts`
- Config: `vitest.config.ts`

### Backend Tests
- Location: `backend/**/__tests__/*.test.ts`
- Setup: `backend/test/setup.ts`
- Config: `backend/vitest.config.ts`

## Test Coverage

Current test coverage includes:

### Unit Tests
- ✅ Password validation (`passwordValidator.test.ts`)
- ✅ Input sanitization (`inputValidator.test.ts`)
- ✅ Account lockout (`accountLockout.test.ts`)

### Integration Tests
- ⏳ API routes (coming soon)
- ⏳ Database operations (coming soon)

### E2E Tests
- ⏳ User flows (coming soon)

## Writing Tests

### Example Unit Test
```typescript
import { describe, it, expect } from "vitest";
import { validatePassword } from "../passwordValidator";

describe("passwordValidator", () => {
  it("should reject empty password", () => {
    const result = validatePassword("");
    expect(result.isValid).toBe(false);
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Tests should clean up after themselves
3. **Naming**: Use descriptive test names
4. **Coverage**: Aim for >80% code coverage
5. **Speed**: Keep tests fast (< 1 second per test)

---

# Monitoring & Analytics

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

## Analytics

### Event Types

1. **page_view**: Page navigation events
2. **user_action**: User interactions
3. **error**: Error occurrences
4. **performance**: Performance metrics
5. **custom**: Custom events

### Frontend Analytics

```typescript
import { analytics } from "../utils/analytics";

// Track page view
analytics.trackPageView("/app/chat");

// Track user action
analytics.trackUserAction("button_click", {
  buttonName: "send_message",
});

// Track error
analytics.trackError(error, {
  component: "ChatComponent",
});
```

### Analytics API

#### Track Event
```bash
POST /api/analytics/track
{
  "eventType": "user_action",
  "eventName": "button_click",
  "properties": {},
  "sessionId": "session-123"
}
```

#### Get Events (Admin)
```bash
GET /api/analytics/events?eventType=user_action&limit=100
```

#### Get Summary (Admin)
```bash
GET /api/analytics/summary?startDate=2026-01-01&endDate=2026-01-31
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

---

# Camera Multi-Tab Fix

## Vấn đề đã giải quyết

Trước đây, khi mở nhiều tab/browser cùng join voice channel:
- Chỉ tab đầu tiên hiển thị được camera
- Các tab sau bị "loading" vô tận
- Không có thông báo lỗi rõ ràng cho người dùng

## Giải pháp

Đã implement **CameraManager** - hệ thống quản lý camera access giữa các tabs:

### 1. Camera Lock Mechanism
- Chỉ cho phép **một tab** sử dụng camera tại một thời điểm
- Sử dụng `localStorage` để share lock state giữa các tabs
- Lock tự động expire sau 10 giây nếu tab bị crash

### 2. BroadcastChannel Sync
- Các tabs communicate với nhau real-time
- Tab release camera → broadcast → tabs khác biết ngay lập tức

### 3. Auto Retry & Queue
- Tab không lấy được camera sẽ tự động retry mỗi 2 giây
- Khi tab đầu tiên close → tab thứ hai tự động lấy camera

### 4. Fallback UI
- Hiển thị **avatar** thay vì loading spinner
- Thông báo rõ ràng: "Camera đang được sử dụng bởi tab khác"

## Files đã thay đổi

- `src/utils/cameraManager.ts` (NEW)
- `src/contexts/WebRTCContext.tsx`
- `src/components/chat/VoiceChannelView.tsx`
- `src/components/chat/VoiceChannelView.css`

## Testing

1. Mở 2 tabs Chrome cùng lúc
2. Tab 1: Join voice channel → Camera hiển thị ✅
3. Tab 2: Join voice channel → Avatar fallback, message "Camera đang được sử dụng" ⏳
4. Close Tab 1 → Tab 2 tự động lấy camera ✅

---

# Features Implementation

## ✅ Core Features

### 1. Camera & Microphone Control
- Toggle camera on/off
- Toggle microphone on/off
- WebRTC integration
- Multi-tab camera management

**Code**: `src/components/ControlBar.tsx`, `src/contexts/WebRTCContext.tsx`

### 2. Reactions System
- 24 reactions phong phú
- Hiển thị trên character (3 giây)
- Real-time broadcast
- Smooth animations

**Code**: `src/components/ReactionPanel.tsx`, `src/components/game/ReactionDisplay.ts`

### 3. Nearby Chat
- Chat với users trong bán kính 200 pixels
- Real-time messaging
- Avatar với màu sắc unique

**Code**: `src/components/NearbyChatPanel.tsx`

### 4. Leave Room
- Confirmation dialog
- Proper cleanup
- Navigate về Spaces page

**Code**: `src/components/ControlBar.tsx`

---

**Last Updated**: January 2026  
**Version**: 1.0.0
