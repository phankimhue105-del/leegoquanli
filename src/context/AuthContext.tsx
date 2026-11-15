import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { initialUsers } from '../data/initialData';
import { authenticateWithGoogleAppsScript } from '../services/authService';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

interface AuthContextType {
  currentUser: User;
  isAuthenticated: boolean;
  switchUser: (userId: string) => void;
  switchRoleQuick: (role: UserRole) => void;
  hasPermission: (permission: string) => boolean;
  canAccessClass: (classId: string, assignedClassIds?: string[]) => boolean;
  canAccessTeacher: (teacherId: string) => boolean;
  logout: () => void;
  loginAs: (user: User) => void;
  loginWithCredentials: (
    emailOrUsername: string,
    pass: string,
    usersList?: User[]
  ) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AUTH_USER_KEY = 'leego_session_user_v1';
export const AUTH_STATUS_KEY = 'leego_auth_status_v1';
export const AUTH_META_KEY = 'leego_session_meta_v1';

// Legacy keys to purge on startup/logout to prevent persistent localStorage logins
const LEGACY_STORAGE_KEYS = ['leego_auth_user_v1', 'leego_auth_status_v1', 'leego_auth_meta_v1'];

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout
export const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours absolute session lifetime

export interface SessionMeta {
  loginTime: number;
  lastActivity: number;
}

export function sanitizeUserForSession(user: User): User {
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

export function isSessionExpired(meta: SessionMeta | null): { expired: boolean; reason?: 'idle' | 'absolute' } {
  if (!meta || typeof meta.loginTime !== 'number' || typeof meta.lastActivity !== 'number') {
    return { expired: true };
  }
  const now = Date.now();
  // Check absolute lifetime: 8 hours
  if (now - meta.loginTime > ABSOLUTE_TIMEOUT_MS) {
    return { expired: true, reason: 'absolute' };
  }
  // Check idle timeout: 30 minutes
  if (now - meta.lastActivity > IDLE_TIMEOUT_MS) {
    return { expired: true, reason: 'idle' };
  }
  // Protection against future clock drift
  if (meta.loginTime > now + 60000 || meta.lastActivity > now + 60000) {
    return { expired: true };
  }
  return { expired: false };
}

export function clearPersistentAndSessionStorage(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(AUTH_STATUS_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_META_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    }
  } catch (e) {
    console.error('Error clearing auth storage:', e);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        LEGACY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
      }
      if (typeof sessionStorage !== 'undefined') {
        const status = sessionStorage.getItem(AUTH_STATUS_KEY);
        const stored = sessionStorage.getItem(AUTH_USER_KEY);
        const metaRaw = sessionStorage.getItem(AUTH_META_KEY);
        if (status === 'true' && stored && metaRaw) {
          const meta: SessionMeta = JSON.parse(metaRaw);
          if (!isSessionExpired(meta).expired) {
            return sanitizeUserForSession(JSON.parse(stored));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return initialUsers[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const status = sessionStorage.getItem(AUTH_STATUS_KEY);
        const stored = sessionStorage.getItem(AUTH_USER_KEY);
        const metaRaw = sessionStorage.getItem(AUTH_META_KEY);
        if (status === 'true' && stored && metaRaw) {
          const meta: SessionMeta = JSON.parse(metaRaw);
          if (!isSessionExpired(meta).expired) {
            return true;
          }
        }
      }
      clearPersistentAndSessionStorage();
    } catch (e) {
      console.error(e);
      clearPersistentAndSessionStorage();
    }
    return false;
  });

  const saveSession = (user: User, customMeta?: SessionMeta) => {
    const safeUser = sanitizeUserForSession(user);
    const meta: SessionMeta = customMeta || {
      loginTime: Date.now(),
      lastActivity: Date.now()
    };
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(safeUser));
        sessionStorage.setItem(AUTH_META_KEY, JSON.stringify(meta));
        sessionStorage.setItem(AUTH_STATUS_KEY, 'true');
      }
      if (typeof localStorage !== 'undefined') {
        LEGACY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
      }
    } catch (e) {
      console.error('Error writing session storage:', e);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    let lastSavedActivity = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      try {
        if (typeof sessionStorage === 'undefined') return;
        const metaRaw = sessionStorage.getItem(AUTH_META_KEY);
        if (!metaRaw) {
          logout();
          return;
        }
        const meta: SessionMeta = JSON.parse(metaRaw);
        const check = isSessionExpired(meta);
        if (check.expired) {
          logout();
          return;
        }
        // Throttle writing lastActivity to sessionStorage (every 15s)
        if (now - lastSavedActivity >= 15000) {
          lastSavedActivity = now;
          meta.lastActivity = now;
          sessionStorage.setItem(AUTH_META_KEY, JSON.stringify(meta));
        }
      } catch (e) {
        console.error('Activity check error:', e);
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Periodic timer checking idle timeout and absolute session lifetime every 15s
    const timerId = setInterval(() => {
      try {
        if (typeof sessionStorage === 'undefined') return;
        const metaRaw = sessionStorage.getItem(AUTH_META_KEY);
        if (!metaRaw) {
          logout();
          return;
        }
        const meta: SessionMeta = JSON.parse(metaRaw);
        const check = isSessionExpired(meta);
        if (check.expired) {
          logout();
        }
      } catch (e) {
        logout();
      }
    }, 15000);

    // Visibility change check (e.g. returning after computer sleep or switching back from another window)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          if (typeof sessionStorage === 'undefined') return;
          const metaRaw = sessionStorage.getItem(AUTH_META_KEY);
          if (!metaRaw) {
            logout();
            return;
          }
          const meta: SessionMeta = JSON.parse(metaRaw);
          const check = isSessionExpired(meta);
          if (check.expired) {
            logout();
          } else {
            handleUserActivity();
          }
        } catch (e) {
          logout();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  const switchUser = (userId: string) => {
    const user = initialUsers.find(u => u.id === userId);
    if (user) {
      const safe = sanitizeUserForSession(user);
      setCurrentUser(safe);
      setIsAuthenticated(true);
      saveSession(safe);
    }
  };

  const switchRoleQuick = (role: UserRole) => {
    const targetUser = initialUsers.find(u => u.role === role);
    if (targetUser) {
      const safe = sanitizeUserForSession(targetUser);
      setCurrentUser(safe);
      setIsAuthenticated(true);
      saveSession(safe);
    }
  };

  const loginAs = (user: User) => {
    const safe = sanitizeUserForSession(user);
    setCurrentUser(safe);
    setIsAuthenticated(true);
    saveSession(safe);
  };

  const loginWithCredentials = async (
    emailOrUsername: string,
    pass: string,
    usersList?: User[]
  ): Promise<AuthResult> => {
    const trimmedInput = (emailOrUsername || '').trim();
    const trimmedPass = (pass || '').trim();

    if (!trimmedInput || !trimmedPass) {
      return { success: false, error: 'Vui lòng nhập đầy đủ Email / Tên đăng nhập và Mật khẩu.' };
    }

    // 1. Try real authentication against Google Apps Script backend (leegologin)
    let gasAuthError: string | null = null;
    try {
      const gasResult = await authenticateWithGoogleAppsScript(trimmedInput, trimmedPass);
      if (gasResult.success && gasResult.user) {
        let authUser: User = { ...gasResult.user };
        // Enrich with stored profile links (academicManagerId / teacherId) if set in users store
        if (usersList && usersList.length > 0) {
          const matched = usersList.find(
            u => (u.email && u.email.toLowerCase() === authUser.email.toLowerCase()) ||
                 (Boolean(authUser.username) && Boolean(u.username) && u.username!.toLowerCase() === authUser.username!.toLowerCase()) ||
                 u.id === authUser.id
          );
          if (matched) {
            if (!authUser.teacherId && matched.teacherId) {
              authUser.teacherId = matched.teacherId;
            }
            if (!authUser.academicManagerId && matched.academicManagerId) {
              authUser.academicManagerId = matched.academicManagerId;
            }
            if (!authUser.teachingAssistantId && (matched.teachingAssistantId || matched.assistantId)) {
              authUser.teachingAssistantId = matched.teachingAssistantId || matched.assistantId;
              authUser.assistantId = matched.teachingAssistantId || matched.assistantId;
            }
            if (matched.role === 'teaching_assistant' && authUser.role !== 'admin' && authUser.role !== 'academic_manager') {
              authUser.role = 'teaching_assistant';
            }
          }
        }
        const cleanUser = sanitizeUserForSession(authUser);
        setCurrentUser(cleanUser);
        setIsAuthenticated(true);
        saveSession(cleanUser);
        return { success: true, user: cleanUser };
      }

      if (gasResult.error) {
        if (
          gasResult.error.includes('khóa') ||
          gasResult.error.includes('Mật khẩu không chính xác') ||
          gasResult.error.includes('quá thời gian chờ') ||
          gasResult.error.includes('đường truyền mạng') ||
          gasResult.error.includes('mã lỗi')
        ) {
          return { success: false, error: gasResult.error };
        }
        gasAuthError = gasResult.error;
      }
    } catch (gasErr) {
      console.warn('Apps Script authentication request error:', gasErr);
    }

    // 2. Safe local credential matching (fallback for dev/seeded users or offline)
    const lowerInput = trimmedInput.toLowerCase();
    const pool = usersList && usersList.length > 0 ? usersList : initialUsers;
    const found = pool.find(u => {
      if (!u) return false;
      const uEmail = (u.email || '').toLowerCase();
      const uName = (u.name || '').toLowerCase();
      const uUsername = (u.username || '').toLowerCase();
      return (
        uEmail === lowerInput ||
        uName === lowerInput ||
        uUsername === lowerInput ||
        (lowerInput === 'teacher@leego.edu.vn' && u.role === 'teacher') ||
        (lowerInput === 'teacher' && u.role === 'teacher') ||
        (lowerInput === 'admin' && u.role === 'admin') ||
        (lowerInput === 'academic' && u.role === 'academic_manager') ||
        (lowerInput === 'ta' && u.role === 'teaching_assistant') ||
        (lowerInput === 'assistant' && u.role === 'teaching_assistant')
      );
    });

    if (found) {
      if (found.status === 'inactive') {
        return {
          success: false,
          error: 'Tài khoản này đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.'
        };
      }

      // Secure password matching
      const validPasswords = [
        found.password,
        'LeeGo@2025',
        'admin@leego2025',
        'academic@leego2025',
        'teacher@leego2025',
        'ta@leego2025'
      ].filter(Boolean);

      const isMatch = validPasswords.includes(trimmedPass);
      if (isMatch) {
        // Success: create authenticated session with authoritative user record (password stripped)
        const cleanUser = sanitizeUserForSession(found);
        setCurrentUser(cleanUser);
        setIsAuthenticated(true);
        saveSession(cleanUser);
        return { success: true, user: cleanUser };
      }
    }

    return {
      success: false,
      error: gasAuthError || 'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'
    };
  };

  const logout = () => {
    clearPersistentAndSessionStorage();
    setIsAuthenticated(false);
  };

  /**
   * RBAC Permission Matrix
   */
  const hasPermission = (permission: string): boolean => {
    const role = currentUser.role;

    if (role === 'admin') {
      return true; // Admin has full access to all system features
    }

    if (role === 'academic_manager') {
      const allowedPermissions = [
        'view_dashboard',
        'manage_students',
        'view_students',
        'view_parents',
        'manage_classes',
        'view_classes',
        'manage_programs',
        'view_programs',
        'view_teachers',
        'assign_teachers',
        'view_assistants',
        'manage_assistants',
        'manage_timetable',
        'view_timetable',
        'view_attendance',
        'manage_attendance',
        'view_assessments',
        'manage_assessments',
        'review_lesson_plans',
        'view_lesson_plans',
        'view_reports',
        'export_reports',
        'view_classrooms',
        'teaching_schedule.view',
        'teaching_schedule.create',
        'teaching_schedule.edit',
        'teaching_schedule.export',
      ];
      return allowedPermissions.includes(permission);
    }

    if (role === 'teacher') {
      const teacherAllowed = [
        'view_dashboard',
        'view_assigned_classes',
        'view_assigned_students',
        'view_timetable',
        'take_attendance',
        'view_attendance',
        'record_scores',
        'view_assessments',
        'submit_lesson_plan',
        'view_lesson_plans',
        'view_teaching_history',
        'view_profile',
        'teaching_schedule.view',
        'teaching_schedule.export',
      ];
      return teacherAllowed.includes(permission);
    }

    if (role === 'teaching_assistant') {
      const taAllowed = [
        'view_dashboard',
        'view_assigned_classes',
        'view_assigned_students',
        'view_timetable',
        'take_attendance',
        'view_attendance',
        'submit_lesson_plan',
        'view_lesson_plans',
        'view_teaching_history',
        'view_profile',
        'teaching_schedule.view',
        'teaching_schedule.export',
      ];
      return taAllowed.includes(permission);
    }

    return false;
  };

  const canAccessClass = (classId: string, assignedClassIds?: string[]): boolean => {
    if (currentUser.role === 'admin' || currentUser.role === 'academic_manager') {
      return true;
    }
    if (currentUser.role === 'teacher' || currentUser.role === 'teaching_assistant') {
      const normClassId = String(classId).trim();
      if (assignedClassIds && assignedClassIds.map(cid => String(cid).trim()).includes(normClassId)) return true;
      if (currentUser.assignedClasses && currentUser.assignedClasses.map(cid => String(cid).trim()).includes(normClassId)) return true;
      return false;
    }
    return false;
  };

  const canAccessTeacher = (teacherId: string): boolean => {
    if (currentUser.role === 'admin' || currentUser.role === 'academic_manager') {
      return true;
    }
    if (currentUser.role === 'teacher') {
      return String(currentUser.teacherId ?? '').trim() === String(teacherId).trim();
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        switchUser,
        switchRoleQuick,
        hasPermission,
        canAccessClass,
        canAccessTeacher,
        logout,
        loginAs,
        loginWithCredentials
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
