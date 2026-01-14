# Camera Multi-Tab Fix - Hướng dẫn và Kiểm tra

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
- Tab acquire camera → broadcast → tabs khác đợi

### 3. Auto Retry & Queue
- Tab không lấy được camera sẽ tự động retry mỗi 2 giây
- Khi tab đầu tiên close → tab thứ hai tự động lấy camera

### 4. Fallback UI
- Hiển thị **avatar** thay vì loading spinner
- Thông báo rõ ràng: "Camera đang được sử dụng bởi tab khác"
- User biết được tình trạng, không bị confusion

## Files đã thay đổi

### 1. `src/utils/cameraManager.ts` (NEW)
Quản lý camera lock/release giữa các tabs:
- `acquireCameraLock()`: Thử lấy quyền sử dụng camera
- `releaseCameraLock()`: Giải phóng camera cho tabs khác
- `canAcquireCamera()`: Check xem có thể lấy camera không
- `getCameraOwner()`: Xem tab nào đang giữ camera

### 2. `src/contexts/WebRTCContext.tsx`
Tích hợp CameraManager vào media handling:
- Check lock trước khi request camera
- Release lock khi stop media
- Auto retry nếu camera bị locked
- Track camera owner state

### 3. `src/components/chat/VoiceChannelView.tsx`
UI updates:
- Hiển thị avatar khi không có camera
- Thông báo "Camera đang được sử dụng"
- Không còn loading vô tận

### 4. `src/components/chat/VoiceChannelView.css`
Style cho fallback UI:
- Avatar với background color
- Camera blocked message
- Icon và text styling

## Cách hoạt động

### Scenario 1: Mở 2 tabs cùng lúc

**Tab 1** (Edge):
1. Join voice channel
2. Request camera → Success ✅
3. Acquire lock → Success ✅
4. Camera hiển thị bình thường

**Tab 2** (Chrome):
1. Join voice channel
2. Request camera → Check lock → Tab 1 đang giữ ⏳
3. Hiển thị: "Camera đang được sử dụng bởi tab khác"
4. Auto retry mỗi 2 giây
5. Khi Tab 1 close → Tab 2 lấy được camera ✅

### Scenario 2: Tab đầu tiên crash

**Tab 1**:
1. Đang dùng camera
2. Crash/Close đột ngột → Lock expire sau 10 giây

**Tab 2**:
1. Retry → Detect lock expired → Success ✅
2. Lấy được camera

### Scenario 3: User switch tab

**Tab 1** (active):
1. Đang dùng camera
2. User switch sang Tab 2

**Behavior**:
- Tab 1 vẫn giữ camera (vì có thể user quay lại)
- Tab 2 hiển thị fallback UI
- Nếu Tab 1 inactive > 10s → lock expire → Tab 2 có thể lấy

## Hướng dẫn kiểm tra

### Test Case 1: Mở 2 tabs Chrome

1. **Mở Tab 1 (Chrome)**
   ```
   - Vào http://localhost:5173
   - Login với account "user1"
   - Join voice channel
   - ✅ Expect: Camera hiển thị
   ```

2. **Mở Tab 2 (Chrome)**
   ```
   - Vào http://localhost:5173 (tab mới)
   - Login với account "user2"
   - Join voice channel
   - ✅ Expect: 
     - Hiển thị avatar (không phải loading)
     - Message: "Camera đang được sử dụng bởi tab khác"
     - Tự động retry mỗi 2s (xem console log)
   ```

3. **Close Tab 1**
   ```
   - Close Tab 1 (Chrome)
   - ✅ Expect:
     - Tab 2 tự động lấy được camera trong vòng 2-3 giây
     - Camera hiển thị ở Tab 2
   ```

### Test Case 2: Chrome vs Edge

1. **Mở Chrome**
   ```
   - Vào http://localhost:5173
   - Login và join voice channel
   - ✅ Camera hiển thị
   ```

2. **Mở Edge**
   ```
   - Vào http://localhost:5173
   - Login và join voice channel
   - ✅ Expect:
     - Avatar fallback
     - Message: "Camera đang được sử dụng bởi tab khác"
   ```

3. **Close Chrome**
   ```
   - Close Chrome
   - ✅ Expect: Edge lấy được camera sau 2-3 giây
   ```

### Test Case 3: Refresh Tab

1. **Tab 1 đang dùng camera**
   ```
   - Refresh Tab 1
   - ✅ Expect:
     - Tab 1 lấy lại camera thành công
     - Không bị conflict với lock cũ
   ```

### Test Case 4: Multiple Users (3 tabs)

1. **Mở 3 tabs: Tab A, B, C**
2. **Tất cả join voice channel**
   ```
   - Tab A: Camera hiển thị ✅
   - Tab B: Avatar fallback, đang đợi ⏳
   - Tab C: Avatar fallback, đang đợi ⏳
   ```

3. **Close Tab A**
   ```
   - Tab B hoặc C (tab nào retry trước) sẽ lấy được camera
   - Tab còn lại vẫn đợi
   ```

## Console Logs quan trọng

### Khi lấy được camera:
```
🎬 startMedia called (isRetry: false, retryCount: 0)
🔒 Acquired camera lock for tab tab-1234567890-abc123
📸 Requesting user media...
✅ Local stream acquired: stream-id-here
```

### Khi camera bị locked:
```
🎬 startMedia called (isRetry: false, retryCount: 0)
🔒 Camera is locked by another tab: {tabId: "...", userId: "..."}
📡 Received message: camera_acquired from tab tab-...
🔄 Retrying camera acquisition...
```

### Khi camera được release:
```
🔓 Released camera lock for tab tab-1234567890-abc123
📡 Received message: camera_released from tab tab-...
🔄 Retrying camera acquisition...
✅ Local stream acquired: stream-id-here
```

## Troubleshooting

### Vấn đề: Tab 2 không bao giờ lấy được camera

**Check:**
1. Xem console log có "🔄 Retrying camera acquisition..." không?
2. Xem localStorage có key `camera_lock` không? (F12 → Application → Local Storage)
3. Tab 1 có đóng đúng cách không? (không bị force kill)

**Fix:**
- Xóa localStorage key `camera_lock` manually
- Refresh tất cả tabs

### Vấn đề: Cả 2 tabs đều không có camera

**Check:**
1. Browser có permission camera không?
2. Camera có đang được sử dụng bởi app khác (Zoom, Teams) không?

**Fix:**
- Check chrome://settings/content/camera
- Tắt các app đang dùng camera

### Vấn đề: Lock không expire sau 10 giây

**Check:**
- Console log có "🕐 Camera lock expired, removing..." không?

**Debug:**
```javascript
// Trong console, check lock:
JSON.parse(localStorage.getItem('camera_lock'))

// Output:
{
  tabId: "tab-...",
  timestamp: 1234567890000,
  userId: "user-..."
}

// Check age:
Date.now() - JSON.parse(localStorage.getItem('camera_lock')).timestamp
// Should be < 10000 (10 seconds)
```

## Best Practices cho User

1. **Chỉ mở một tab** khi cần dùng camera
2. **Đóng tab** đúng cách (Ctrl+W) thay vì kill browser
3. **Nếu bị stuck**, refresh tất cả tabs và vào lại từ đầu

## Future Improvements

### Có thể thêm:
1. **Button "Request Camera"**: User có thể manually request camera từ tab khác
2. **Notification**: Toast notification khi camera available
3. **Priority System**: User quan trọng hơn có thể "steal" camera
4. **Share Camera**: Cho phép multiple tabs cùng xem (read-only)
5. **Audio Only**: Fallback sang audio-only mode nếu không có camera

## Technical Notes

### Tại sao dùng BroadcastChannel?
- Real-time communication giữa tabs
- Không cần server
- Native browser API, performance tốt

### Tại sao dùng localStorage cho lock?
- Persist across tabs
- Simple API
- Có thể check manually khi debug

### Tại sao lock timeout = 10 giây?
- Đủ thời gian để detect tab crash
- Không quá lâu để user phải đợi
- Balance between reliability và UX

---

**Last updated**: January 9, 2026
**Version**: 1.0.0
**Author**: AI Assistant
