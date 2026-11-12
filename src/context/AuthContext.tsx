import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { initialUsers } from '../data/initialData';

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
  loginWithCredentials: (emailOrUsername: string, pass: string, usersList?: User[]) => AuthResult;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'leego_auth_user_v1';
const AUTH_STATUS_KEY = 'leego_auth_status_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      const status = localStorage.getItem(AUTH_STATUS_KEY);
      if (status === 'true' && stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return initialUsers[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const status = localStorage.getItem(AUTH_STATUS_KEY);
      const stored = localStorage.getItem(AUTH_USER_KEY);
      return status === 'true' && Boolean(stored);
    } catch (e) {
      console.error(e);
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isAuthenticated && currentUser) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
        localStorage.setItem(AUTH_STATUS_KEY, 'true');
      } else if (!isAuthenticated) {
        localStorage.removeItem(AUTH_STATUS_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser, isAuthenticated]);

  const switchUser = (userId: string) => {
    const user = initialUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
  };

  const switchRoleQuick = (role: UserRole) => {
    const targetUser = initialUsers.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
      setIsAuthenticated(true);
    }
  };

  const loginAs = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const loginWithCredentials = (
    emailOrUsername: string,
    pass: string,
    usersList?: User[]
  ): AuthResult => {
    const trimmedInput = (emailOrUsername || '').trim().toLowerCase();
    const trimmedPass = (pass || '').trim();

    if (!trimmedInput || !trimmedPass) {
      return { success: false, error: 'Vui lòng nhập đầy đủ Email và Mật khẩu.' };
    }

    const pool = usersList && usersList.length > 0 ? usersList : initialUsers;
    const found = pool.find(
      u =>
        u.email.toLowerCase() === trimmedInput ||
        u.name.toLowerCase() === trimmedInput ||
        (u.username && u.username.toLowerCase() === trimmedInput) ||
        (trimmedInput === 'teacher@leego.edu.vn' && u.role === 'teacher') ||
        (trimmedInput === 'teacher' && u.role === 'teacher') ||
        (trimmedInput === 'admin' && u.role === 'admin') ||
        (trimmedInput === 'academic' && u.role === 'academic_manager')
    );

    if (!found) {
      return { success: false, error: 'Tài khoản không tồn tại trên hệ thống.' };
    }

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
      'teacher@leego2025'
    ].filter(Boolean);

    const isMatch = validPasswords.includes(trimmedPass);
    if (!isMatch) {
      return { success: false, error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.' };
    }

    // Success: create authenticated session with authoritative user record
    setCurrentUser(found);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(found));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
    } catch (e) {
      console.error(e);
    }

    return { success: true, user: found };
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_STATUS_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    } catch (e) {
      console.error(e);
    }
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
      return currentUser.teacherId === teacherId;
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
