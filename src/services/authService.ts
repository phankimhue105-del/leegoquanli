import { User, UserRole } from '../types';

export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxiMpstNCNvwfjEML2oNtmKN1jfGmwKasbP8h_szfR9Gq1mDrTll6-lNhNOE8tr8vOc/exec';

export interface GasUserResponse {
  userId?: string;
  username?: string;
  fullName?: string;
  role?: string;
  status?: string;
  teacherId?: string;
  email?: string;
}

export interface GasAuthResult {
  success: boolean;
  message?: string;
  user?: GasUserResponse;
  users?: GasUserResponse[];
  error?: string;
}

/**
 * Maps a raw user object returned by Google Apps Script / leegologin to the application's User model
 */
export function mapGasUserToAppUser(gasUser: GasUserResponse): User {
  const rawRole = String(gasUser.role || '').toLowerCase().trim();
  const role: UserRole =
    rawRole === 'admin' || rawRole.includes('admin') || rawRole.includes('quản trị') || rawRole.includes('quantri')
      ? 'admin'
      : rawRole === 'academic_manager' || rawRole.includes('academic') || rawRole.includes('học thuật') || rawRole.includes('hocthuat') || rawRole.includes('manager')
      ? 'academic_manager'
      : 'teacher';

  const username = gasUser.username || gasUser.userId || 'user';
  const email =
    gasUser.email ||
    (username.toLowerCase().replace(/\s+/g, '.') + '@leego.edu.vn');

  return {
    id: gasUser.userId || `USR-${username}`,
    name: gasUser.fullName || username,
    username: username,
    email: email,
    role: role,
    teacherId: gasUser.teacherId ? String(gasUser.teacherId).trim() : undefined,
    status: (gasUser.status === 'inactive' ? 'inactive' : 'active'),
    createdAt: '2025-01-01',
    lastLogin: 'Hôm nay lúc ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };
}

/**
 * Authenticates credentials against Google Apps Script backend (leegologin)
 * with robust 20-second timeout and automatic 1-time retry for transient concurrency spikes
 */
export async function authenticateWithGoogleAppsScript(
  usernameOrEmail: string,
  pass: string,
  retryCount: number = 0
): Promise<{ success: boolean; user?: User; error?: string }> {
  const trimmedInput = (usernameOrEmail || '').trim();
  const trimmedPass = (pass || '').trim();

  if (!trimmedInput || !trimmedPass) {
    return {
      success: false,
      error: 'Vui lòng nhập đầy đủ Tên đăng nhập / Email và Mật khẩu.'
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for cold start

  try {
    const payload = {
      action: 'login',
      username: trimmedInput,
      password: trimmedPass
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (retryCount < 1 && response.status >= 500) {
        await new Promise(res => setTimeout(res, 800));
        return authenticateWithGoogleAppsScript(usernameOrEmail, pass, retryCount + 1);
      }
      return {
        success: false,
        error: `Máy chủ xác thực phản hồi mã lỗi (${response.status}). Vui lòng thử lại.`
      };
    }

    const data: GasAuthResult = await response.json();

    if (data.success && data.user) {
      const appUser = mapGasUserToAppUser(data.user);
      if (appUser.status === 'inactive') {
        return {
          success: false,
          error: 'Tài khoản này đã bị khóa trong hệ thống leegologin. Vui lòng liên hệ Quản trị viên.'
        };
      }
      return {
        success: true,
        user: appUser
      };
    }

    // Check if error is transient concurrency limit
    const rawError = String(data.error || data.message || '');
    if (
      retryCount < 1 &&
      (rawError.includes('đồng thời') ||
        rawError.includes('simultaneous') ||
        rawError.includes('Server exception') ||
        rawError.includes('bận xử lý'))
    ) {
      await new Promise(res => setTimeout(res, 800));
      return authenticateWithGoogleAppsScript(usernameOrEmail, pass, retryCount + 1);
    }

    const message = data.message || data.error || 'Tên đăng nhập hoặc mật khẩu không chính xác.';
    let vietnameseError = message;
    if (message.includes('enter username')) {
      vietnameseError = 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.';
    } else if (message.includes('locked') || message.includes('inactive') || message.includes('khóa')) {
      vietnameseError = 'Tài khoản đã bị tạm khóa.';
    } else if (message.includes('chưa có tài khoản') || message.includes('không tồn tại')) {
      vietnameseError = 'Tài khoản không tồn tại trong hệ thống. Vui lòng kiểm tra lại Tên đăng nhập.';
    } else if (message.includes('Mật khẩu không chính xác')) {
      vietnameseError = 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.';
    }

    return {
      success: false,
      error: vietnameseError
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (retryCount < 1 && err.name !== 'AbortError') {
      await new Promise(res => setTimeout(res, 800));
      return authenticateWithGoogleAppsScript(usernameOrEmail, pass, retryCount + 1);
    }
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'Không thể kết nối hệ thống xác thực. Yêu cầu quá thời gian chờ (20s). Vui lòng thử lại.'
      };
    }
    return {
      success: false,
      error: 'Không thể kết nối hệ thống xác thực Google Apps Script. Vui lòng kiểm tra đường truyền mạng.'
    };
  }
}

/**
 * Fetches user accounts from Google Apps Script leegologin
 */
export async function fetchUsersFromGoogleAppsScript(): Promise<User[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getUsers' }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const data: GasAuthResult = await response.json();
    if (data.success && Array.isArray(data.users)) {
      return data.users.map(mapGasUserToAppUser);
    }
    return [];
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Could not fetch users from Google Apps Script:', err);
    return [];
  }
}
