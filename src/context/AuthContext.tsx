import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { initialUsers } from '../data/initialData';
import {
  getStoredUserSession,
  saveUserSession,
  clearUserSession
} from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  switchUser: (userId: string) => void;
  switchRoleQuick: (role: UserRole) => void;
  hasPermission: (permission: string) => boolean;
  canAccessClass: (classId: string, assignedClassIds?: string[]) => boolean;
  canAccessTeacher: (teacherId: string) => boolean;
  logout: () => void;
  loginAs: (user: User, rememberMe?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize user from stored session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return getStoredUserSession();
  });

  const isAuthenticated = currentUser !== null;

  const switchUser = (userId: string) => {
    const user = initialUsers.find(u => u.id === userId);
    if (user) {
      saveUserSession(user, true);
      setCurrentUser(user);
    }
  };

  const switchRoleQuick = (role: UserRole) => {
    const targetUser = initialUsers.find(u => u.role === role);
    if (targetUser) {
      saveUserSession(targetUser, true);
      setCurrentUser(targetUser);
    }
  };

  const loginAs = (user: User, rememberMe: boolean = true) => {
    saveUserSession(user, rememberMe);
    setCurrentUser(user);
  };

  const logout = () => {
    clearUserSession();
    setCurrentUser(null);
  };

  /**
   * RBAC Permission Matrix & Backend Assigned Permissions
   */
  const hasPermission = (permission: string): boolean => {
    if (!currentUser) {
      return false;
    }

    // Explicit custom permissions from backend take precedence
    if (currentUser.permissions && currentUser.permissions.length > 0) {
      if (currentUser.permissions.includes(permission) || currentUser.permissions.includes('*')) {
        return true;
      }
    }

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
        'lesson_report.view',
        'lesson_report.create',
        'lesson_report.edit',
        'lesson_report.submit',
        'lesson_report.lock',
        'lesson_report.unlock',
        'lesson_report.export',
        'lesson_report.view_incomplete',
        'lesson_report.manage_makeup',
        // Course Duration Permissions
        'course_duration.view',
        'course_duration.create',
        'course_duration.edit',
        'course_duration.delete',
        'course_duration.manage_holidays',
        'course_duration.manage_makeup',
        'course_duration.recalculate',
        'course_duration.view_history',
        'course_duration.export',
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
        'lesson_report.view',
        'lesson_report.create',
        'lesson_report.edit',
        'lesson_report.submit',
        // Teacher course duration view permission
        'course_duration.view',
        'course_duration.export',
      ];
      return teacherAllowed.includes(permission);
    }

    return false;
  };

  const canAccessClass = (classId: string, assignedClassIds?: string[]): boolean => {
    if (!currentUser) return false;

    if (currentUser.role === 'admin' || currentUser.role === 'academic_manager') {
      return true;
    }

    if (currentUser.role === 'teacher') {
      // Check user-level assignedClasses first if provided from backend
      if (currentUser.assignedClasses && currentUser.assignedClasses.includes(classId)) {
        return true;
      }
      if (!assignedClassIds) return false;
      return assignedClassIds.includes(classId);
    }
    return false;
  };

  const canAccessTeacher = (teacherId: string): boolean => {
    if (!currentUser) return false;

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
