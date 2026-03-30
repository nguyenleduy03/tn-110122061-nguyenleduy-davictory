# Google Drive Authorization Flow - Analysis

## 📊 Current Implementation

### Backend Endpoints

#### 1. Admin Endpoints (`/api/admin/drive`)
```java
GET  /api/admin/drive/status          // ✅ Check authorization status
GET  /api/admin/drive/authorize-url   // ✅ Get OAuth URL
POST /api/admin/drive/revoke          // ✅ Revoke access
```

#### 2. OAuth Callback (`/api/drive`)
```java
GET /api/drive/authorize              // ✅ Redirect to Google OAuth
GET /api/drive/oauth2callback         // ⚠️ Handle callback (returns JSON)
```

### Frontend Flow

1. **Admin Dashboard** → Google Drive Settings
2. Click "Authorize" button
3. GET `/api/admin/drive/authorize-url` → Get OAuth URL
4. Redirect to Google OAuth consent screen
5. User grants permission
6. Google redirects to `/api/drive/oauth2callback?code=...`
7. ⚠️ **Problem:** Backend returns JSON, not HTML redirect

## ⚠️ Issues Found

### Issue 1: Callback Returns JSON Instead of Redirect
**Current:**
```java
@GetMapping("/oauth2callback")
public Map<String, String> oauth2Callback(@RequestParam("code") String code) {
    driveService.storeCredential(code);
    return Map.of("message", "Authorization successful!");
}
```

**Problem:** User sees JSON in browser, not redirected back to app

**Solution:** Should redirect to frontend success page
```java
@GetMapping("/oauth2callback")
public RedirectView oauth2Callback(@RequestParam("code") String code) {
    try {
        driveService.storeCredential(code);
        return new RedirectView("http://localhost:5173/admin/drive-settings?success=true");
    } catch (Exception e) {
        return new RedirectView("http://localhost:5173/admin/drive-settings?error=" + e.getMessage());
    }
}
```

### Issue 2: Credential Storage Uses "user" Key
**Current:**
```java
Credential credential = getFlow().loadCredential("user");
```

**Problem:** All users share same credential

**Better:** Use system-wide credential or specific admin ID
```java
private static final String CREDENTIAL_KEY = "system";
Credential credential = getFlow().loadCredential(CREDENTIAL_KEY);
```

### Issue 3: No Error Handling in Frontend
**Current:** Frontend doesn't handle OAuth errors or success callbacks

**Solution:** Add URL parameter handling
```jsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    setStatus({ authorized: true, message: 'Ủy quyền thành công!' });
  }
  if (params.get('error')) {
    setStatus({ authorized: false, message: 'Lỗi: ' + params.get('error') });
  }
}, []);
```

## ✅ Complete Flow (Fixed)

```
1. Admin clicks "Authorize"
   ↓
2. Frontend: GET /api/admin/drive/authorize-url
   ↓
3. Frontend: window.location.href = authUrl
   ↓
4. Google OAuth consent screen
   ↓
5. User grants permission
   ↓
6. Google: Redirect to /api/drive/oauth2callback?code=xxx
   ↓
7. Backend: Store credential
   ↓
8. Backend: Redirect to /admin/drive-settings?success=true
   ↓
9. Frontend: Show success message
   ↓
10. Frontend: Refresh status
```

## 🔧 Required Fixes

### 1. Fix Callback Endpoint
**File:** `GoogleDriveAuthController.java`
```java
@GetMapping("/oauth2callback")
public RedirectView oauth2Callback(
    @RequestParam("code") String code,
    @RequestParam(value = "error", required = false) String error
) throws Exception {
    if (error != null) {
        return new RedirectView("http://localhost:5173/admin/drive-settings?error=" + error);
    }
    
    try {
        driveService.storeCredential(code);
        return new RedirectView("http://localhost:5173/admin/drive-settings?success=true");
    } catch (Exception e) {
        log.error("OAuth callback error", e);
        return new RedirectView("http://localhost:5173/admin/drive-settings?error=auth_failed");
    }
}
```

### 2. Update Frontend to Handle Callback
**File:** `GoogleDriveSettings.jsx`
```jsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('success') === 'true') {
    setStatus({ authorized: true, message: 'Ủy quyền thành công!' });
    // Clear URL params
    window.history.replaceState({}, '', '/admin/drive-settings');
    // Refresh status
    setTimeout(() => checkStatus(), 1000);
  }
  
  if (params.get('error')) {
    alert('Lỗi ủy quyền: ' + params.get('error'));
    window.history.replaceState({}, '', '/admin/drive-settings');
  }
}, []);
```

### 3. Use Environment Variable for Redirect URL
**File:** `application.properties`
```properties
google.drive.redirect-uri=http://localhost:8080/api/drive/oauth2callback
google.drive.frontend-url=http://localhost:5173
```

**File:** `GoogleDriveAuthController.java`
```java
@Value("${google.drive.frontend-url}")
private String frontendUrl;

return new RedirectView(frontendUrl + "/admin/drive-settings?success=true");
```

## 📝 Testing Checklist

- [ ] Admin can access Drive Settings page
- [ ] Click "Authorize" redirects to Google OAuth
- [ ] After granting permission, redirects back to app
- [ ] Success message shows
- [ ] Status updates to "Authorized"
- [ ] Can upload files after authorization
- [ ] Can revoke access
- [ ] Error handling works (deny permission)

## 🔐 Security Notes

1. **HTTPS Required:** OAuth callback must use HTTPS in production
2. **CORS:** Ensure backend allows frontend origin
3. **State Parameter:** Add CSRF protection with state parameter
4. **Credential Storage:** Secure token storage (encrypted)

## 📊 Current Status

- ✅ Backend OAuth flow implemented
- ✅ Frontend UI implemented
- ⚠️ Callback redirect needs fix
- ⚠️ Frontend callback handling needs implementation
- ✅ Admin role check working
- ✅ Status check working
- ✅ Revoke working

## 🎯 Priority Fixes

1. **HIGH:** Fix callback redirect (returns JSON → should redirect)
2. **MEDIUM:** Add frontend callback handling
3. **LOW:** Add state parameter for CSRF protection
4. **LOW:** Use environment variables for URLs
