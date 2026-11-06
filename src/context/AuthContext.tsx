import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { initialUsers } from '../data/initialData';

interface AuthContextType {
  currentUser: User;
  switchUser: (userId: string) => void;
  switchRoleQuick: (role: UserRole) => void;
  hasPermission: (permission: string) => boolean;
  canAccessClass: (classId: string, assignedClassIds?: string[]) => boolean;
  canAccessTeacher: (teacherId: string) => boolean;
  logout: () => void;
  loginAs: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'leego_auth_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    // Default to Admin
    return initialUsers[0];
  });

  useEffect(() => {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
  }, [currentUser]);

  const switchUser = (userId: string) => {
    const user = initialUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const switchRoleQuick = (role: UserRole) => {
    const targetUser = initialUsers.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
    }
  };

  const loginAs = (user: User) => {
    setCurrentUser(user);
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
        'view_profile'
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
        switchUser,
        switchRoleQuick,
        hasPermission,
        canAccessClass,
        canAccessTeacher,
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
