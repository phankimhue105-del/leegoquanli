import { User, UserRole } from '../types';

/**
 * =========================================================================
 * LEEGO CENTER MANAGEMENT – AUTHENTICATION SERVICE
 * =========================================================================
 * Connects the frontend to the Google Apps Script Web App API.
 * Google Sheet: leegologin (Columns: User ID, Username, Password Hash, Full Name, Role, Status)
 */

const SESSION_STORAGE_KEY = 'leego_auth_user_v1';
const REMEMBER_ME_KEY = 'leego_remember_me_v1';

// Default Google Apps Script Web App API endpoint provided for LeeGo Center
export const DEFAULT_AUTH_API_URL =
  'https://script.google.com/macros/s/AKfycbxiMpstNCNvwfjEML2oNtmKN1jfGmwKasbP8h_szfR9Gq1mDrTll6-lNhNOE8tr8vOc/exec';

/**
 * Retrieve the active Authentication API URL.
 * Prefers the VITE_AUTH_API_URL environment variable if set, falling back to the configured endpoint.
 */
export const getAuthApiUrl = (): string => {
  return (import.meta.env.VITE_AUTH_API_URL as string) || DEFAULT_AUTH_API_URL;
};

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  errorCode?: 'MISSING_API_URL' | 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'SERVER_ERROR' | 'NETWORK_ERROR';
}

/**
 * Normalize role returned from Google Apps Script to internal LeeGo UserRole
 */
export function normalizeUserRole(roleInput?: string): UserRole {
  const r = (roleInput || '').trim().toLowerCase();
  if (r === 'admin' || r === 'administrator') return 'admin';
  if (r === 'academic_manager' || r === 'manager' || r === 'academic') return 'academic_manager';
  if (r === 'teacher' || r === 'teaching_assistant' || r === 'assistant' || r === 'ta') return 'teacher';
  return 'teacher';
}

/**
 * Translate backend message to friendly Vietnamese
 */
function formatErrorMessage(rawMessage?: string): string {
  if (!rawMessage) return 'Tên đăng nhập hoặc mật khẩu không chính xác.';
  const lower = rawMessage.toLowerCase();

  if (lower.includes('invalid') || lower.includes('password') || lower.includes('username')) {
    return 'Tên đăng nhập hoặc mật khẩu không chính xác.';
  }
  if (lower.includes('inactive') || lower.includes('locked') || lower.includes('blocked')) {
    return 'Tài khoản đã bị khóa hoặc ngừng kích hoạt. Vui lòng liên hệ Quản trị viên.';
  }
  if (lower.includes('sheet') || lower.includes('not found')) {
    return 'Không tìm thấy trang tính tài khoản (leegologin) trên Google Sheet.';
  }
  return rawMessage;
}

/**
 * Authenticate against Google Apps Script Web App
 */
export async function loginWithCredentials(
  usernameInput: string,
  passwordInput: string,
  rememberMe: boolean = true
): Promise<AuthResponse> {
  const username = usernameInput.trim();
  const password = passwordInput; // Preserve exact uppercase, lowercase, and symbols

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

  if (!apiUrl) {
    return {
      success: false,
      error: 'Hệ thống chưa cấu hình biến môi trường VITE_AUTH_API_URL. Vui lòng kiểm tra lại cấu hình.',
      errorCode: 'MISSING_API_URL',
    };
  }

  // 2. Dispatch request to Google Apps Script
  try {
    const payload = {
      action: 'login',
      username,
      password,
    };

    /**
     * Note on Google Apps Script Web App CORS:
     * Sending 'text/plain;charset=utf-8' prevents browsers from issuing an OPTIONS
     * preflight request which Apps Script does not natively handle, while Google Apps
     * Script successfully parses e.postData.contents as JSON.
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
        error: `Không thể kết nối máy chủ xác thực (HTTP ${response.status}). Vui lòng thử lại.`,
        errorCode: 'SERVER_ERROR',
      };
    }

    const data = await response.json();

    const isSuccess = data.success === true || data.success === 'true' || data.status === 'success';

    if (isSuccess && data.user) {
      const statusNormalized = String(data.user.status || 'active').trim().toLowerCase();

      // Check account status
      if (statusNormalized !== 'active' || data.user.locked === true) {
        return {
          success: false,
          error: 'Tài khoản đã bị khóa. Vui lòng liên hệ Quản lý để được hỗ trợ.',
          errorCode: 'ACCOUNT_LOCKED',
        };
      }

      const role = normalizeUserRole(data.user.role);

      // Construct verified User profile
      const userProfile: User = {
        id: String(data.user.userId || data.user.id || `USR-${Date.now()}`),
        name: String(data.user.fullName || data.user.name || username),
        username: String(data.user.username || username),
        email: data.user.email || `${username.replace(/\s+/g, '.').toLowerCase()}@leego.edu.vn`,
        role,
        status: 'active',
        teacherId: data.user.teacherId || (role === 'teacher' ? String(data.user.userId) : undefined),
        permissions: Array.isArray(data.user.permissions) ? data.user.permissions : [],
        assignedClasses: Array.isArray(data.user.assignedClasses) ? data.user.assignedClasses : [],
        avatar: data.user.avatar || undefined,
        createdAt: data.user.createdAt || new Date().toISOString().slice(0, 10),
        lastLogin: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN'),
      };

      // Save session securely (NEVER store password or password hash)
      saveUserSession(userProfile, rememberMe);

      return {
        success: true,
        user: userProfile,
        token: data.token,
      };
    }

    return {
      success: false,
      error: formatErrorMessage(data.message),
      errorCode: 'INVALID_CREDENTIALS',
    };
  } catch (err: any) {
    console.error('Authentication request error:', err);
    return {
      success: false,
      error: 'Không thể kết nối máy chủ xác thực Google Apps Script. Vui lòng kiểm tra lại kết nối mạng.',
      errorCode: 'NETWORK_ERROR',
    };
  }
}

/**
 * Save authenticated user session (stores only public profile, never credentials)
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
 * Retrieve active user session from localStorage or sessionStorage
 */
export function getStoredUserSession(): User | null {
  try {
    const fromLocal = localStorage.getItem(SESSION_STORAGE_KEY);
    if (fromLocal) {
      return JSON.parse(fromLocal);
    }

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
 * Clear stored user session
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
 * Check if a session is currently stored
 */
export function isUserSessionActive(): boolean {
  return getStoredUserSession() !== null;
}
