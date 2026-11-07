import { User, UserRole } from '../types';

/**
 * Authentication Service for LeeGo Center Management
 * Prepares the application for backend authentication via Google Apps Script Web App API.
 */

const SESSION_STORAGE_KEY = 'leego_auth_user_v1';
const REMEMBER_ME_KEY = 'leego_remember_me_v1';

// Configurable Google Apps Script Web App API endpoint
export const getAuthApiUrl = (): string => {
  return (import.meta.env.VITE_AUTH_API_URL as string) || '';
};

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  errorCode?: 'MISSING_API_URL' | 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'SERVER_ERROR' | 'NETWORK_ERROR';
}

export interface GoogleAppsScriptAuthPayload {
  action: 'login' | 'verifySession' | 'logout';
  username?: string;
  password?: string;
  token?: string;
  timestamp: number;
}

/**
 * Perform login request to backend Google Apps Script Web App
 */
export async function loginWithCredentials(
  usernameInput: string,
  passwordInput: string,
  rememberMe: boolean = true
): Promise<AuthResponse> {
  const username = usernameInput.trim();
  const password = passwordInput;

  // 1. Frontend validation
  if (!username) {
    return {
      success: false,
      error: 'Vui lòng nhập tên đăng nhập.',
      errorCode: 'INVALID_CREDENTIALS',
    };
  }

  if (!password) {
    return {
      success: false,
      error: 'Vui lòng nhập mật khẩu.',
      errorCode: 'INVALID_CREDENTIALS',
    };
  }

  const apiUrl = getAuthApiUrl();

  // 2. Check if the backend API URL is configured
  if (!apiUrl) {
    return {
      success: false,
      error: 'Hệ thống chưa cấu hình biến môi trường VITE_AUTH_API_URL dẫn tới Google Apps Script Web App. Vui lòng cấu hình URL trong file .env hoặc bảng biến môi trường Vercel.',
      errorCode: 'MISSING_API_URL',
    };
  }

  // 3. Connect to Google Apps Script Web App
  try {
    const payload: GoogleAppsScriptAuthPayload = {
      action: 'login',
      username,
      password,
      timestamp: Date.now(),
    };

    /**
     * Note on Google Apps Script Web App CORS:
     * Using Content-Type 'text/plain;charset=utf-8' prevents browsers from sending
     * a preflight OPTIONS request, which Google Apps Script does not natively support.
     * The script parses e.postData.contents as JSON cleanly.
     */
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Không thể kết nối máy chủ xác thực (Mã lỗi HTTP: ${response.status}). Vui lòng thử lại.`,
        errorCode: 'SERVER_ERROR',
      };
    }

    const data = await response.json();

    if (data.status === 'success' && data.user) {
      const userProfile: User = {
        id: data.user.userId || data.user.id || `USR-${Date.now()}`,
        name: data.user.fullName || data.user.name || username,
        username: data.user.username || username,
        email: data.user.email || `${username}@leego.edu.vn`,
        role: (data.user.role as UserRole) || 'teacher',
        status: data.user.status || 'active',
        teacherId: data.user.teacherId,
        permissions: data.user.permissions || [],
        assignedClasses: data.user.assignedClasses || [],
        avatar: data.user.avatar || undefined,
        createdAt: data.user.createdAt || new Date().toISOString().slice(0, 10),
        lastLogin: 'Vừa xong',
      };

      if (userProfile.status === 'inactive' || data.user.locked) {
        return {
          success: false,
          error: 'Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên để được mở khóa.',
          errorCode: 'ACCOUNT_LOCKED',
        };
      }

      // Save session securely
      saveUserSession(userProfile, rememberMe);

      return {
        success: true,
        user: userProfile,
        token: data.token,
      };
    }

    return {
      success: false,
      error: data.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      errorCode: 'INVALID_CREDENTIALS',
    };
  } catch (err: any) {
    console.error('Authentication request error:', err);
    return {
      success: false,
      error: 'Không thể kết nối máy chủ Google Apps Script. Vui lòng kiểm tra lại kết nối mạng hoặc quyền truy cập Web App (Anyone).',
      errorCode: 'NETWORK_ERROR',
    };
  }
}

/**
 * Save user session based on Remember Me preference
 */
export function saveUserSession(user: User, rememberMe: boolean): void {
  try {
    const serialized = JSON.stringify(user);
    if (rememberMe) {
      localStorage.setItem(SESSION_STORAGE_KEY, serialized);
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
      localStorage.removeItem(REMEMBER_ME_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save session to storage', err);
  }
}

/**
 * Retrieve the active user from localStorage or sessionStorage
 */
export function getStoredUserSession(): User | null {
  try {
    // Check localStorage first
    const fromLocal = localStorage.getItem(SESSION_STORAGE_KEY);
    if (fromLocal) {
      return JSON.parse(fromLocal);
    }

    // Check sessionStorage
    const fromSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (fromSession) {
      return JSON.parse(fromSession);
    }
  } catch (err) {
    console.error('Failed to parse user session', err);
  }
  return null;
}

/**
 * Clear stored authentication session
 */
export function clearUserSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear storage session', err);
  }
}

/**
 * Verify whether an active session is currently stored
 */
export function isUserSessionActive(): boolean {
  return getStoredUserSession() !== null;
}
