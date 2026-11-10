import React, { createContext, useContext, useState } from 'react';
import { Teacher, User, UserRole } from '../types';
import { initialUsers } from '../data/initialData';
import {
  clearUserSession,
  getStoredUserSession,
  normalizeUserRole as normalizeAuthRole,
  saveUserSession
} from '../services/authService';

export interface AppsScriptAuthUser {
  userId?: string;
  id?: string;
  username?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role: string;
  status?: string;
  teacherId?: string;
  permissions?: string[];
  assignedClasses?: string[];
  phone?: string;
  avatar?: string;
  lastLogin?: string;
  createdAt?: string;
}

interface AuthContextType {
  currentUser: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  switchUser: (userId: string, usersList?: User[]) => void;
  switchRoleQuick: (role: UserRole) => void;
  hasPermission: (permission: string) => boolean;
  canAccessClass: (classId: string, assignedClassIds?: string[]) => boolean;
  canAccessTeacher: (teacherId: string) => boolean;
  resolveTeacherProfile: (teachers: Teacher[]) => Teacher | null;
  logout: () => void;
  loginAs: (user: User | AppsScriptAuthUser, rememberMe?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REMEMBER_ME_KEY = 'leego_remember_me_v1';

// Inactive placeholder used only to satisfy non-null User typing while unauthenticated;
// App.tsx gates on !isAuthenticated and renders LoginPage whenever userState is null.
const UNAUTHENTICATED_PLACEHOLDER: User = {
  id: '',
  name: '',
  email: '',
  role: 'teacher',
  status: 'inactive',
  createdAt: ''
};

function sanitizeAuthUser(rawUser: User | AppsScriptAuthUser): User {
  const role = normalizeAuthRole(rawUser.role);
  const teacherId = role === 'teacher' ? String(rawUser.teacherId || '').trim() || undefined : undefined;
  const status = String(rawUser.status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
  const id = String(rawUser.id || (rawUser as AppsScriptAuthUser).userId || '').trim();

  return {
    id: id || `USR-${Date.now()}`,
    username: rawUser.username ? String(rawUser.username).trim() : undefined,
    name: String(rawUser.name || (rawUser as AppsScriptAuthUser).fullName || rawUser.username || '').trim() || 'User',
    email: rawUser.email ? String(rawUser.email).trim() : '',
    role,
    ...(rawUser.avatar ? { avatar: rawUser.avatar } : {}),
    ...(rawUser.phone ? { phone: rawUser.phone } : {}),
    ...(teacherId ? { teacherId } : {}),
    ...(Array.isArray(rawUser.permissions) ? { permissions: rawUser.permissions } : {}),
    ...(Array.isArray(rawUser.assignedClasses) ? { assignedClasses: rawUser.assignedClasses } : {}),
    status,
    ...(rawUser.lastLogin ? { lastLogin: rawUser.lastLogin } : {}),
    createdAt: rawUser.createdAt || new Date().toISOString().slice(0, 10)
  };
}

export function findTeacherForUser(user: User | null, teachers: Teacher[]): Teacher | null {
  if (!user || user.role !== 'teacher') return null;

  const linkedTeacherId = String(user.teacherId || '').trim();
  if (linkedTeacherId) {
    return teachers.find(t => t.id === linkedTeacherId) || null;
  }

  // Legacy fallback only when email is explicitly present
  const userEmail = String(user.email || '').trim().toLowerCase();
  if (userEmail) {
    return teachers.find(t => t.email && t.email.trim().toLowerCase() === userEmail) || null;
  }

  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userState, setUserState] = useState<User | null>(() => {
    const stored = getStoredUserSession();
    if (!stored || !stored.id) return null;
    const sanitized = sanitizeAuthUser(stored);
    return sanitized.status === 'active' && sanitized.id ? sanitized : null;
  });

  const isLoading = false;
  const isAuthenticated = Boolean(userState && userState.id && userState.status === 'active');
  const currentUser: User = userState || UNAUTHENTICATED_PLACEHOLDER;

  const getRememberPreference = (): boolean => {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const switchUser = (userId: string, usersList?: User[]) => {
    const sourceUsers = usersList && usersList.length > 0 ? usersList : initialUsers;
    const user = sourceUsers.find(u => u.id === userId) || initialUsers.find(u => u.id === userId);
    if (user && user.status === 'active') {
      const sanitized = sanitizeAuthUser(user);
      saveUserSession(sanitized, getRememberPreference());
      setUserState(sanitized);
    }
  };

  const switchRoleQuick = (role: UserRole) => {
    const targetUser = initialUsers.find(u => u.role === role);
    if (targetUser && targetUser.status === 'active') {
      const sanitized = sanitizeAuthUser(targetUser);
      saveUserSession(sanitized, getRememberPreference());
      setUserState(sanitized);
    }
  };

  const loginAs = (user: User | AppsScriptAuthUser, rememberMe: boolean = true) => {
    const sanitized = sanitizeAuthUser(user);
    if (!sanitized.id || sanitized.status !== 'active') {
      return;
    }
    saveUserSession(sanitized, rememberMe);
    setUserState(sanitized);
  };

  const logout = () => {
    clearUserSession();
    setUserState(null);
  };

  /**
   * RBAC Permission Matrix
   */
  const hasPermission = (permission: string): boolean => {
    if (!userState || userState.status !== 'active') {
      return false;
    }

    const role = userState.role;

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

    return false;
  };

  const canAccessClass = (classId: string, assignedClassIds?: string[]): boolean => {
    if (!userState || userState.status !== 'active') {
      return false;
    }
    if (userState.role === 'admin' || userState.role === 'academic_manager') {
      return true;
    }
    if (userState.role === 'teacher') {
      if (!assignedClassIds) return false;
      return assignedClassIds.includes(classId);
    }
    return false;
  };

  const canAccessTeacher = (teacherId: string): boolean => {
    if (!userState || userState.status !== 'active') {
      return false;
    }
    if (userState.role === 'admin' || userState.role === 'academic_manager') {
      return true;
    }
    if (userState.role === 'teacher') {
      return Boolean(userState.teacherId) && userState.teacherId === teacherId;
    }
    return false;
  };

  const resolveTeacherProfile = (teachers: Teacher[]): Teacher | null => {
    return findTeacherForUser(userState, teachers);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        switchUser,
        switchRoleQuick,
        hasPermission,
        canAccessClass,
        canAccessTeacher,
        resolveTeacherProfile,
        logout,
        loginAs
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
