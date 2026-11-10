import React, { createContext, useContext, useState, useEffect } from 'react';
import { Teacher, User, UserRole } from '../types';
import { initialUsers } from '../data/initialData';

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
  phone?: string;
  avatar?: string;
  lastLogin?: string;
  createdAt?: string;
}

interface AuthContextType {
  currentUser: User;
  switchUser: (userId: string, usersList?: User[]) => void;
  switchRoleQuick: (role: UserRole) => void;
  hasPermission: (permission: string) => boolean;
  canAccessClass: (classId: string, assignedClassIds?: string[]) => boolean;
  canAccessTeacher: (teacherId: string) => boolean;
  resolveTeacherProfile: (teachers: Teacher[]) => Teacher | null;
  logout: () => void;
  loginAs: (user: User | AppsScriptAuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'leego_auth_user_v1';

function normalizeUserRole(role: string | undefined): UserRole {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (normalized === 'admin') return 'admin';
  if (normalized === 'academic_manager') return 'academic_manager';
  return 'teacher';
}

function sanitizeAuthUser(rawUser: User | AppsScriptAuthUser): User {
  const role = normalizeUserRole(rawUser.role);
  const teacherId = role === 'teacher' ? String(rawUser.teacherId || '').trim() || undefined : undefined;
  const status = String(rawUser.status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';

  return {
    id: String(rawUser.id || (rawUser as AppsScriptAuthUser).userId || '').trim() || initialUsers[0].id,
    username: rawUser.username ? String(rawUser.username).trim() : undefined,
    name: String(rawUser.name || (rawUser as AppsScriptAuthUser).fullName || rawUser.username || '').trim() || 'User',
    ...(rawUser.email ? { email: String(rawUser.email).trim() } : {}),
    role,
    ...(rawUser.avatar ? { avatar: rawUser.avatar } : {}),
    ...(rawUser.phone ? { phone: rawUser.phone } : {}),
    ...(teacherId ? { teacherId } : {}),
    status,
    ...(rawUser.lastLogin ? { lastLogin: rawUser.lastLogin } : {}),
    createdAt: rawUser.createdAt || new Date().toISOString().slice(0, 10)
  };
}

export function findTeacherForUser(user: User, teachers: Teacher[]): Teacher | null {
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
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        return sanitizeAuthUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
    // Default to Admin
    return initialUsers[0];
  });

  useEffect(() => {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(sanitizeAuthUser(currentUser)));
  }, [currentUser]);

  const switchUser = (userId: string, usersList?: User[]) => {
    const sourceUsers = usersList && usersList.length > 0 ? usersList : initialUsers;
    const user = sourceUsers.find(u => u.id === userId) || initialUsers.find(u => u.id === userId);
    if (user && user.status === 'active') {
      setCurrentUser(sanitizeAuthUser(user));
    }
  };

  const switchRoleQuick = (role: UserRole) => {
    const targetUser = initialUsers.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(sanitizeAuthUser(targetUser));
    }
  };

  const loginAs = (user: User | AppsScriptAuthUser) => {
    setCurrentUser(sanitizeAuthUser(user));
  };

  const logout = () => {
    // Revert to demo admin for preview usability
    setCurrentUser(initialUsers[0]);
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

    return false;
  };

  const canAccessClass = (classId: string, assignedClassIds?: string[]): boolean => {
    if (currentUser.role === 'admin' || currentUser.role === 'academic_manager') {
      return true;
    }
    if (currentUser.role === 'teacher') {
      if (!assignedClassIds) return false;
      return assignedClassIds.includes(classId);
    }
    return false;
  };

  const canAccessTeacher = (teacherId: string): boolean => {
    if (currentUser.role === 'admin' || currentUser.role === 'academic_manager') {
      return true;
    }
    if (currentUser.role === 'teacher') {
      return Boolean(currentUser.teacherId) && currentUser.teacherId === teacherId;
    }
    return false;
  };

  const resolveTeacherProfile = (teachers: Teacher[]): Teacher | null => {
    return findTeacherForUser(currentUser, teachers);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
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
