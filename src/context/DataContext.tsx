import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Student,
  ClassItem,
  Teacher,
  TeachingAssistant,
  AcademicProgram,
  TimetableSession,
  AttendanceRecord,
  AssessmentRecord,
  LessonPlanReport,
  User,
  Parent,
  CenterSettings,
  ActivityLog,
  StudentAttendanceEntry,
  StudentScoreEntry,
  MonthlyTeachingSchedule,
  TeachingSession
} from '../types';
import {
  loadInitialStorage,
  saveStorage,
  resetStorage,
  AppDataStore,
  getClassWeeklySchedule,
  formatScheduleDaysLabel,
  formatScheduleTimeSummary,
  getWeekdayLabel
} from '../services/dataService';
import {
  CloudSyncStatus,
  fetchCenterDataFromCloud,
  fetchCenterVersionFromCloud,
  initializeCenterDataOnCloud,
  saveCenterKeysToCloud,
  loadPendingSyncKeys,
  savePendingSyncKeys,
  detectUnsyncedLocalRecords,
  mergeLocalRecordsIntoCloud
} from '../services/cloudSyncService';
import {
  initialStudents,
  initialClasses,
  initialTeachers,
  initialTeachingAssistants,
  initialAcademicPrograms,
  initialTimetableSessions,
  initialAttendanceRecords,
  initialAssessments,
  initialLessonPlans,
  initialUsers,
  initialSettings,
  initialActivityLogs,
  initialParents,
  initialTeachingSchedules
} from '../data/initialData';
import { useAuth } from './AuthContext';

export interface ScheduleConflictResult {
  hasConflict: boolean;
  teacherConflict?: string;
  roomConflict?: string;
  classConflict?: string;
  details: string[];
}

interface DataContextType {
  data: AppDataStore;
  // Cloud Sync State & Controls
  syncStatus: CloudSyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  cloudVersion: number;
  pendingSyncCount: number;
  unsyncedLocalCount: number;
  syncNow: () => Promise<boolean>;
  retryPendingSync: () => Promise<boolean>;
  mergeUnsyncedLocalData: () => Promise<boolean>;
  forcePushLocalToCloud: () => Promise<boolean>;

  // Students
  addStudent: (student: Omit<Student, 'id'>) => Student;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  transferStudentClass: (studentId: string, fromClassId: string, toClassId: string) => void;
  importStudents: (students: Partial<Student>[]) => number;

  // Parents
  addParent: (parent: Omit<Parent, 'id'>) => Parent;
  updateParent: (id: string, updates: Partial<Parent>) => void;

  // Classes
  addClass: (cls: Omit<ClassItem, 'id'>) => ClassItem;
  updateClass: (id: string, updates: Partial<ClassItem>) => void;
  deleteClass: (id: string) => void;
  assignStudentsToClass: (classId: string, studentIds: string[]) => void;

  // Teachers & TAs
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Teacher;
  updateTeacher: (id: string, updates: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  addAssistant: (assistant: Omit<TeachingAssistant, 'id'>) => TeachingAssistant;
  updateAssistant: (id: string, updates: Partial<TeachingAssistant>) => void;
  deleteAssistant: (id: string) => void;

  // Academic Programs
  addProgram: (prog: Omit<AcademicProgram, 'id'>) => AcademicProgram;
  updateProgram: (id: string, updates: Partial<AcademicProgram>) => void;
  deleteProgram: (id: string) => void;

  // Timetable & Conflict checking
  addTimetableSession: (session: Omit<TimetableSession, 'id'>) => { success: boolean; session?: TimetableSession; conflict?: ScheduleConflictResult };
  updateTimetableSession: (id: string, updates: Partial<TimetableSession>) => { success: boolean; conflict?: ScheduleConflictResult };
  deleteTimetableSession: (id: string) => void;
  checkScheduleConflict: (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    teacherId: string,
    classroom: string,
    classId: string,
    excludeSessionId?: string
  ) => ScheduleConflictResult;

  // Attendance
  saveAttendance: (
    classId: string,
    date: string,
    records: StudentAttendanceEntry[],
    sessionTime: string
  ) => AttendanceRecord;

  // Assessments
  saveAssessment: (assessment: Omit<AssessmentRecord, 'id'> & { id?: string }) => AssessmentRecord;
  updateAssessmentScore: (assessmentId: string, studentScores: StudentScoreEntry[]) => void;

  // Lesson Plans
  submitLessonPlan: (plan: Omit<LessonPlanReport, 'id' | 'submittedAt'>) => LessonPlanReport;
  reviewLessonPlan: (id: string, status: 'approved' | 'reviewed', feedback: string) => void;

  // Users
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => User;
  updateUser: (id: string, updates: Partial<User>) => void;
  toggleUserStatus: (id: string) => void;

  // Teaching Schedule
  getScheduleByClassAndMonth: (classId: string, month: number, year: number) => MonthlyTeachingSchedule | undefined;
  getSchedulesByClass: (classId: string) => MonthlyTeachingSchedule[];
  generateScheduleFromTimetable: (classId: string, month: number, year: number) => MonthlyTeachingSchedule;
  saveTeachingSchedule: (schedule: MonthlyTeachingSchedule) => { success: boolean; schedule?: MonthlyTeachingSchedule; error?: string };
  deleteTeachingSchedule: (id: string) => { success: boolean; error?: string };
  copyScheduleContent: (sourceScheduleId: string, targetMonth: number, targetYear: number) => MonthlyTeachingSchedule | null;

  // Settings & System
  updateSettings: (settings: Partial<CenterSettings>) => void;
  resetAllData: () => void;
  addActivityLog: (action: string, details: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_BASELINE_STORE: AppDataStore = {
  students: initialStudents,
  classes: initialClasses,
  teachers: initialTeachers,
  teachingAssistants: initialTeachingAssistants,
  programs: initialAcademicPrograms,
  timetable: initialTimetableSessions,
  attendance: initialAttendanceRecords,
  assessments: initialAssessments,
  lessonPlans: initialLessonPlans,
  users: initialUsers,
  parents: initialParents,
  settings: initialSettings,
  activityLogs: initialActivityLogs,
  teachingSchedules: initialTeachingSchedules
};

function getNextSequentialId(existingIds: string[], prefix: string, padLength: number): string {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}(\\d+)$`, 'i');
  let maxNum = 0;
  for (const id of existingIds) {
    const match = pattern.exec(String(id || '').trim());
    if (match) {
      const n = Number(match[1]);
      if (!Number.isNaN(n)) {
        maxNum = Math.max(maxNum, n);
      }
    }
  }
  return `${prefix}${String(Math.max(maxNum + 1, existingIds.length + 1)).padStart(padLength, '0')}`;
}

function normalizeCloudStore(
  rawCloud: Partial<AppDataStore> & Record<string, unknown>
): AppDataStore {
  return {
    ...(rawCloud as Record<string, unknown>),
    students: rawCloud.students !== undefined ? rawCloud.students : initialStudents,
    classes: rawCloud.classes !== undefined ? rawCloud.classes : initialClasses,
    teachers: rawCloud.teachers !== undefined ? rawCloud.teachers : initialTeachers,
    teachingAssistants:
      rawCloud.teachingAssistants !== undefined
        ? rawCloud.teachingAssistants
        : initialTeachingAssistants,
    programs: rawCloud.programs !== undefined ? rawCloud.programs : initialAcademicPrograms,
    timetable: rawCloud.timetable !== undefined ? rawCloud.timetable : initialTimetableSessions,
    attendance: rawCloud.attendance !== undefined ? rawCloud.attendance : initialAttendanceRecords,
    assessments: rawCloud.assessments !== undefined ? rawCloud.assessments : initialAssessments,
    lessonPlans: rawCloud.lessonPlans !== undefined ? rawCloud.lessonPlans : initialLessonPlans,
    users: rawCloud.users !== undefined ? rawCloud.users : initialUsers,
    parents: rawCloud.parents !== undefined ? rawCloud.parents : initialParents,
    settings: rawCloud.settings !== undefined ? rawCloud.settings : initialSettings,
    activityLogs: rawCloud.activityLogs !== undefined ? rawCloud.activityLogs : initialActivityLogs,
    teachingSchedules:
      rawCloud.teachingSchedules !== undefined
        ? rawCloud.teachingSchedules
        : initialTeachingSchedules
  } as AppDataStore;
}

// Helper for time overlap: "17:30" - "19:00" vs "18:00" - "19:30"
function isTimeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const sA = toMin(startA);
  const eA = toMin(endA);
  const sB = toMin(startB);
  const eB = toMin(endB);
  return Math.max(sA, sB) < Math.min(eA, eB);
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppDataStore>(() => loadInitialStorage());
  const { currentUser, isAuthenticated, hasPermission } = useAuth();

  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [cloudVersion, setCloudVersion] = useState<number>(0);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => loadPendingSyncKeys().length);
  const [unsyncedLocalCount, setUnsyncedLocalCount] = useState<number>(0);

  const dataRef = useRef<AppDataStore>(data);
  const initialLocalSnapshotRef = useRef<AppDataStore>(data);
  const keyVersionsRef = useRef<Record<string, number>>({});
  const cloudVersionRef = useRef<number>(0);
  const pendingDirtyKeysRef = useRef<Set<string>>(new Set(loadPendingSyncKeys()));
  const forcePendingRef = useRef<boolean>(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFlushingRef = useRef<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);
  const lastVersionCheckAtRef = useRef<number>(0);
  const hasCheckedLocalMigrationRef = useRef<boolean>(false);
  const authRef = useRef({ isAuthenticated, currentUser });

  useEffect(() => {
    authRef.current = { isAuthenticated, currentUser };
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    dataRef.current = data;
    saveStorage(data);
  }, [data]);

  const formatSyncTimestamp = () => {
    return new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const updatePendingKeysState = useCallback(() => {
    const keys = Array.from(pendingDirtyKeysRef.current);
    savePendingSyncKeys(keys);
    setPendingSyncCount(keys.length);
  }, []);

  const flushPendingSave = useCallback(
    async (explicitForce: boolean = false): Promise<boolean> => {
      const auth = authRef.current;
      if (!auth.isAuthenticated || !auth.currentUser.id) {
        return false;
      }

      if (isFlushingRef.current) {
        return false;
      }

      const keysToSend = Array.from(pendingDirtyKeysRef.current);
      if (keysToSend.length === 0) {
        return true;
      }

      const useForce = explicitForce || forcePendingRef.current;
      const storeSnapshot = dataRef.current as unknown as Record<string, unknown>;
      const payloadKeys: Record<string, unknown> = {};
      for (const k of keysToSend) {
        if (storeSnapshot[k] !== undefined) {
          payloadKeys[k] = storeSnapshot[k];
        }
      }

      if (Object.keys(payloadKeys).length === 0) {
        pendingDirtyKeysRef.current.clear();
        forcePendingRef.current = false;
        updatePendingKeysState();
        return true;
      }

      isFlushingRef.current = true;
      setSyncStatus('saving');
      setSyncError(null);

      try {
        const actor = auth.currentUser.name || auth.currentUser.username || auth.currentUser.id;
        const result = await saveCenterKeysToCloud(
          payloadKeys,
          keyVersionsRef.current,
          actor,
          useForce
        );

        if (result.success) {
          keysToSend.forEach(k => pendingDirtyKeysRef.current.delete(k));
          if (pendingDirtyKeysRef.current.size === 0) {
            forcePendingRef.current = false;
          }
          updatePendingKeysState();

          keyVersionsRef.current = result.keyVersions || keyVersionsRef.current;
          cloudVersionRef.current = result.version;
          setCloudVersion(result.version);
          setLastSyncedAt(formatSyncTimestamp());

          if (pendingDirtyKeysRef.current.size > 0) {
            // More changes arrived while saving; flush remaining batch
            isFlushingRef.current = false;
            return flushPendingSave(false);
          }

          setSyncStatus('synced');
          setSyncError(null);
          return true;
        }

        if (result.conflict && result.data) {
          // Update non-conflicting keys from server without discarding pending local edits
          const serverStore = normalizeCloudStore(result.data);
          const mergedNonConflict = { ...dataRef.current } as unknown as Record<string, unknown>;
          const serverRecord = serverStore as unknown as Record<string, unknown>;

          for (const key of Object.keys(serverRecord)) {
            if (!pendingDirtyKeysRef.current.has(key)) {
              mergedNonConflict[key] = serverRecord[key];
              if (result.keyVersions && result.keyVersions[key] !== undefined) {
                keyVersionsRef.current[key] = result.keyVersions[key];
              }
            }
          }

          const nextMerged = mergedNonConflict as unknown as AppDataStore;
          dataRef.current = nextMerged;
          setData(nextMerged);
          saveStorage(nextMerged);

          cloudVersionRef.current = result.version;
          setCloudVersion(result.version);
          setSyncStatus('error');
          setSyncError(
            result.error ||
              'Xung đột phiên bản dữ liệu với người dùng khác. Hãy đồng bộ bản mới hoặc đẩy lại thay đổi.'
          );
          return false;
        }

        setSyncStatus('error');
        setSyncError(result.error || 'Không thể lưu dữ liệu lên Google Sheets.');
        return false;
      } finally {
        isFlushingRef.current = false;
      }
    },
    [updatePendingKeysState]
  );

  const scheduleCloudFlush = useCallback(
    (delayMs: number = 80) => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        void flushPendingSave(false);
      }, delayMs);
    },
    [flushPendingSave]
  );

  const commitDataChange = useCallback(
    (
      changedKeys: string[],
      updater: (prev: AppDataStore) => AppDataStore,
      options?: { force?: boolean }
    ) => {
      const next = updater(dataRef.current);
      dataRef.current = next;
      setData(next);
      saveStorage(next);

      changedKeys.forEach(k => pendingDirtyKeysRef.current.add(k));
      if (options?.force) {
        forcePendingRef.current = true;
      }
      updatePendingKeysState();
      scheduleCloudFlush(80);
    },
    [scheduleCloudFlush, updatePendingKeysState]
  );

  const syncNow = useCallback(async (): Promise<boolean> => {
    const auth = authRef.current;
    if (!auth.isAuthenticated || !auth.currentUser.id) {
      return false;
    }

    if (isSyncingRef.current) {
      return false;
    }

    isSyncingRef.current = true;
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      const res = await fetchCenterDataFromCloud();

      if (!res.success) {
        setSyncStatus('error');
        setSyncError(res.error || 'Không thể tải dữ liệu dùng chung từ Google Sheets.');
        return false;
      }

      // Case 1: Google Sheet leegodata not initialized yet
      if (!res.initialized) {
        if (auth.currentUser.role === 'admin') {
          const actor = auth.currentUser.name || auth.currentUser.username || auth.currentUser.id;
          const initRes = await initializeCenterDataOnCloud(
            dataRef.current as unknown as AppDataStore & Record<string, unknown>,
            actor
          );

          if (!initRes.success) {
            setSyncStatus('error');
            setSyncError(initRes.error || 'Không thể khởi tạo dữ liệu dùng chung lên Google Sheets.');
            return false;
          }

          if (initRes.alreadyInitialized && initRes.data) {
            const cloudStore = normalizeCloudStore(initRes.data);
            const unsyncedCount = detectUnsyncedLocalRecords(
              initialLocalSnapshotRef.current as unknown as Record<string, unknown>,
              cloudStore as unknown as Record<string, unknown>,
              INITIAL_BASELINE_STORE as unknown as Record<string, unknown>
            );
            setUnsyncedLocalCount(unsyncedCount);
            dataRef.current = cloudStore;
            setData(cloudStore);
            saveStorage(cloudStore);
            keyVersionsRef.current = initRes.keyVersions || {};
            cloudVersionRef.current = initRes.version;
            setCloudVersion(initRes.version);
            setLastSyncedAt(formatSyncTimestamp());
            setSyncStatus('synced');
            setSyncError(null);
            return true;
          }

          pendingDirtyKeysRef.current.clear();
          updatePendingKeysState();
          keyVersionsRef.current = initRes.keyVersions || {};
          cloudVersionRef.current = initRes.version;
          setCloudVersion(initRes.version);
          setLastSyncedAt(formatSyncTimestamp());
          setSyncStatus('synced');
          setSyncError(null);
          return true;
        } else {
          setSyncStatus('error');
          setSyncError(
            'Dữ liệu dùng chung trên Google Sheets chưa được Admin khởi tạo. Vui lòng đăng nhập bằng tài khoản Admin để đồng bộ lần đầu.'
          );
          return false;
        }
      }

      // Case 2: Shared data already exists on Google Sheets
      if (res.data) {
        const cloudStore = normalizeCloudStore(res.data);

        if (!hasCheckedLocalMigrationRef.current) {
          hasCheckedLocalMigrationRef.current = true;
          const unsyncedCount = detectUnsyncedLocalRecords(
            initialLocalSnapshotRef.current as unknown as Record<string, unknown>,
            cloudStore as unknown as Record<string, unknown>,
            INITIAL_BASELINE_STORE as unknown as Record<string, unknown>
          );
          setUnsyncedLocalCount(unsyncedCount);
        }

        if (pendingDirtyKeysRef.current.size === 0) {
          dataRef.current = cloudStore;
          setData(cloudStore);
          saveStorage(cloudStore);
          keyVersionsRef.current = res.keyVersions || {};
          cloudVersionRef.current = res.version;
          setCloudVersion(res.version);
          setLastSyncedAt(formatSyncTimestamp());
          setSyncStatus('synced');
          setSyncError(null);
          return true;
        } else {
          // Preserve pending local edits on dirty keys while updating clean keys
          const merged = { ...dataRef.current } as unknown as Record<string, unknown>;
          const cloudRecord = cloudStore as unknown as Record<string, unknown>;
          const nextKeyVersions = { ...keyVersionsRef.current };

          for (const key of Object.keys(cloudRecord)) {
            if (!pendingDirtyKeysRef.current.has(key)) {
              merged[key] = cloudRecord[key];
              if (res.keyVersions && res.keyVersions[key] !== undefined) {
                nextKeyVersions[key] = res.keyVersions[key];
              }
            }
          }

          const mergedStore = merged as unknown as AppDataStore;
          dataRef.current = mergedStore;
          setData(mergedStore);
          saveStorage(mergedStore);
          keyVersionsRef.current = nextKeyVersions;
          cloudVersionRef.current = res.version;
          setCloudVersion(res.version);

          // Try flushing pending local changes right away
          isSyncingRef.current = false;
          return flushPendingSave(false);
        }
      }

      setSyncStatus('synced');
      return true;
    } finally {
      isSyncingRef.current = false;
    }
  }, [flushPendingSave, updatePendingKeysState]);

  const retryPendingSync = useCallback(async (): Promise<boolean> => {
    if (pendingDirtyKeysRef.current.size === 0) {
      return syncNow();
    }
    return flushPendingSave(false);
  }, [flushPendingSave, syncNow]);

  const mergeUnsyncedLocalData = useCallback(async (): Promise<boolean> => {
    const auth = authRef.current;
    if (!auth.isAuthenticated || !auth.currentUser.id) return false;

    setSyncStatus('syncing');
    setSyncError(null);

    const cloudRes = await fetchCenterDataFromCloud();
    if (!cloudRes.success || !cloudRes.data) {
      setSyncStatus('error');
      setSyncError(cloudRes.error || 'Không thể tải dữ liệu Cloud để gộp bản ghi cục bộ.');
      return false;
    }

    const cloudStore = normalizeCloudStore(cloudRes.data);
    const { mergedKeys, mergedCount } = mergeLocalRecordsIntoCloud(
      initialLocalSnapshotRef.current as unknown as Record<string, unknown>,
      cloudStore as unknown as Record<string, unknown>,
      INITIAL_BASELINE_STORE as unknown as Record<string, unknown>
    );

    if (mergedCount === 0) {
      setUnsyncedLocalCount(0);
      dataRef.current = cloudStore;
      setData(cloudStore);
      saveStorage(cloudStore);
      keyVersionsRef.current = cloudRes.keyVersions || {};
      cloudVersionRef.current = cloudRes.version;
      setCloudVersion(cloudRes.version);
      setLastSyncedAt(formatSyncTimestamp());
      setSyncStatus('synced');
      return true;
    }

    const actor = auth.currentUser.name || auth.currentUser.username || auth.currentUser.id;
    const saveRes = await saveCenterKeysToCloud(
      mergedKeys,
      cloudRes.keyVersions || {},
      actor,
      false
    );

    if (!saveRes.success) {
      setSyncStatus('error');
      setSyncError(saveRes.error || 'Không thể gộp dữ liệu cục bộ lên Google Sheets.');
      return false;
    }

    const updatedStore = {
      ...(cloudStore as unknown as Record<string, unknown>),
      ...mergedKeys
    } as unknown as AppDataStore;

    dataRef.current = updatedStore;
    setData(updatedStore);
    saveStorage(updatedStore);
    keyVersionsRef.current = saveRes.keyVersions || cloudRes.keyVersions;
    cloudVersionRef.current = saveRes.version;
    setCloudVersion(saveRes.version);
    setUnsyncedLocalCount(0);
    setLastSyncedAt(formatSyncTimestamp());
    setSyncStatus('synced');
    setSyncError(null);
    return true;
  }, []);

  const forcePushLocalToCloud = useCallback(async (): Promise<boolean> => {
    const auth = authRef.current;
    if (!auth.isAuthenticated || auth.currentUser.role !== 'admin') {
      return false;
    }

    const allKeys = Object.keys(dataRef.current as unknown as Record<string, unknown>);
    allKeys.forEach(k => pendingDirtyKeysRef.current.add(k));
    forcePendingRef.current = true;
    updatePendingKeysState();
    const ok = await flushPendingSave(true);
    if (ok) {
      setUnsyncedLocalCount(0);
    }
    return ok;
  }, [flushPendingSave, updatePendingKeysState]);

  // Trigger full cloud load immediately after authentication / account change
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) {
      cloudVersionRef.current = 0;
      keyVersionsRef.current = {};
      setCloudVersion(0);
      setSyncStatus('idle');
      setSyncError(null);
      return;
    }

    void syncNow();
  }, [isAuthenticated, currentUser.id, syncNow]);

  // Lightweight background version check on window focus and at a quota-safe 45s interval
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;

    const checkVersionAndSyncIfNewer = async () => {
      if (document.visibilityState !== 'visible') return;
      if (isSyncingRef.current || isFlushingRef.current) return;
      if (pendingDirtyKeysRef.current.size > 0) return;

      const now = Date.now();
      if (now - lastVersionCheckAtRef.current < 10000) return;
      lastVersionCheckAtRef.current = now;

      const verRes = await fetchCenterVersionFromCloud();
      if (verRes.success && verRes.initialized && verRes.version > cloudVersionRef.current) {
        await syncNow();
      }
    };

    const onFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkVersionAndSyncIfNewer();
      }
    };

    const intervalId = setInterval(() => {
      void checkVersionAndSyncIfNewer();
    }, 45000);

    window.addEventListener('focus', onFocusOrVisibility);
    document.addEventListener('visibilitychange', onFocusOrVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocusOrVisibility);
      document.removeEventListener('visibilitychange', onFocusOrVisibility);
    };
  }, [isAuthenticated, currentUser.id, syncNow]);

  const addActivityLog = (action: string, details: string) => {
    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      details
    };
    commitDataChange(['activityLogs'], prev => ({
      ...prev,
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 50)
    }));
  };

  // 1. Students
  const addStudent = (studentData: Omit<Student, 'id'>): Student => {
    const newId = getNextSequentialId(
      dataRef.current.students.map(s => s.id),
      'LG-STU-',
      3
    );
    const newStudent: Student = {
      ...studentData,
      id: newId
    };
    commitDataChange(['students', 'classes'], prev => {
      // Auto-assign student to class if selected
      const updatedClasses = prev.classes.map(cls => {
        if (newStudent.classIds.includes(cls.id) && !cls.studentIds.includes(newId)) {
          return { ...cls, studentIds: [...cls.studentIds, newId] };
        }
        return cls;
      });

      return {
        ...prev,
        students: [newStudent, ...prev.students],
        classes: updatedClasses
      };
    });
    addActivityLog('Thêm học sinh', `Đã thêm học sinh ${newStudent.fullName} (${newId})`);
    return newStudent;
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    const changedKeys = updates.classIds ? ['students', 'classes'] : ['students'];
    commitDataChange(changedKeys, prev => {
      const updatedStudents = prev.students.map(s => (s.id === id ? { ...s, ...updates } : s));
      // Update class bindings if classIds changed
      let updatedClasses = prev.classes;
      if (updates.classIds) {
        updatedClasses = prev.classes.map(cls => {
          const shouldHave = updates.classIds!.includes(cls.id);
          const has = cls.studentIds.includes(id);
          if (shouldHave && !has) {
            return { ...cls, studentIds: [...cls.studentIds, id] };
          }
          if (!shouldHave && has) {
            return { ...cls, studentIds: cls.studentIds.filter(sid => sid !== id) };
          }
          return cls;
        });
      }
      return {
        ...prev,
        students: updatedStudents,
        classes: updatedClasses
      };
    });
    addActivityLog('Cập nhật học sinh', `Đã chỉnh sửa thông tin học sinh mã ${id}`);
  };

  const deleteStudent = (id: string) => {
    const student = dataRef.current.students.find(s => s.id === id);
    commitDataChange(['students', 'classes'], prev => ({
      ...prev,
      students: prev.students.filter(s => s.id !== id),
      classes: prev.classes.map(c => ({
        ...c,
        studentIds: c.studentIds.filter(sid => sid !== id)
      }))
    }));
    addActivityLog('Xóa học sinh', `Đã xóa học sinh ${student?.fullName || id}`);
  };

  const transferStudentClass = (studentId: string, fromClassId: string, toClassId: string) => {
    const student = dataRef.current.students.find(s => s.id === studentId);
    const fromClass = dataRef.current.classes.find(c => c.id === fromClassId);
    const toClass = dataRef.current.classes.find(c => c.id === toClassId);

    commitDataChange(['students', 'classes'], prev => {
      // 1. Update student's classIds
      const updatedStudents = prev.students.map(s => {
        if (s.id === studentId) {
          const newClassIds = s.classIds.filter(cid => cid !== fromClassId);
          if (!newClassIds.includes(toClassId)) {
            newClassIds.push(toClassId);
          }
          return { ...s, classIds: newClassIds };
        }
        return s;
      });

      // 2. Update classes studentIds
      const updatedClasses = prev.classes.map(cls => {
        if (cls.id === fromClassId) {
          return { ...cls, studentIds: cls.studentIds.filter(id => id !== studentId) };
        }
        if (cls.id === toClassId && !cls.studentIds.includes(studentId)) {
          return { ...cls, studentIds: [...cls.studentIds, studentId] };
        }
        return cls;
      });

      return {
        ...prev,
        students: updatedStudents,
        classes: updatedClasses
      };
    });

    addActivityLog(
      'Chuyển lớp học sinh',
      `Đã chuyển học sinh ${student?.fullName || studentId} từ lớp ${fromClass?.name || fromClassId} sang ${toClass?.name || toClassId}`
    );
  };

  const importStudents = (importedList: Partial<Student>[]): number => {
    let count = 0;
    const newStudents: Student[] = [];
    const existingIds = dataRef.current.students.map(s => s.id);

    importedList.forEach((item, index) => {
      const studentId =
        item.id || getNextSequentialId([...existingIds, ...newStudents.map(s => s.id)], 'LG-STU-', 3);
      const newStudent: Student = {
        id: studentId,
        fullName: item.fullName || `Học sinh mới ${index + 1}`,
        vietnameseName: item.vietnameseName || '',
        dob: item.dob || '2016-01-01',
        gender: item.gender || 'male',
        school: item.school || 'Tiểu học',
        grade: item.grade || 'Lớp 3',
        parentName: item.parentName || 'Phụ huynh',
        parentPhone: item.parentPhone || '0900000000',
        parentEmail: item.parentEmail || '',
        address: item.address || 'Hà Nội',
        enrollmentDate: item.enrollmentDate || new Date().toISOString().slice(0, 10),
        currentLevel: item.currentLevel || 'A1 Movers',
        classIds: item.classIds || [],
        status: item.status || 'studying',
        notes: item.notes || 'Nhập từ file Excel'
      };
      newStudents.push(newStudent);
      count++;
    });

    commitDataChange(['students'], prev => ({
      ...prev,
      students: [...newStudents, ...prev.students]
    }));

    addActivityLog('Import học sinh', `Đã nhập thành công ${count} học sinh từ file Excel`);
    return count;
  };

  // 2. Parents
  const addParent = (parentData: Omit<Parent, 'id'>): Parent => {
    const newId = getNextSequentialId(
      dataRef.current.parents.map(p => p.id),
      'PAR-',
      3
    );
    const newParent: Parent = { ...parentData, id: newId };
    commitDataChange(['parents'], prev => ({
      ...prev,
      parents: [newParent, ...prev.parents]
    }));
    return newParent;
  };

  const updateParent = (id: string, updates: Partial<Parent>) => {
    commitDataChange(['parents'], prev => ({
      ...prev,
      parents: prev.parents.map(p => (p.id === id ? { ...p, ...updates } : p))
    }));
  };

  // Helper to keep TimetableSession entries in sync with a class's weeklySchedule
  const syncTimetableForClass = (
    prevTimetable: TimetableSession[],
    classItem: ClassItem,
    teachers: Teacher[],
    assistants: TeachingAssistant[],
    previousClass?: ClassItem
  ): TimetableSession[] => {
    const slots = getClassWeeklySchedule(classItem);
    if (slots.length === 0) return prevTimetable;

    const otherSessions = prevTimetable.filter(s => s.classId !== classItem.id);
    const existingByDay = new Map<number, TimetableSession>();
    prevTimetable
      .filter(s => s.classId === classItem.id)
      .forEach(s => {
        if (!existingByDay.has(s.dayOfWeek)) {
          existingByDay.set(s.dayOfWeek, s);
        }
      });

    const teacherChanged = Boolean(previousClass && previousClass.teacherId !== classItem.teacherId);
    const assistantChanged = Boolean(
      previousClass && (previousClass.assistantTeacherId || '') !== (classItem.assistantTeacherId || '')
    );

    const syncedSessions: TimetableSession[] = slots.map(slot => {
      const existing = existingByDay.get(slot.dayOfWeek);
      const hasSlotTeacher = slot.teacherId !== undefined;
      const effectiveTeacherId = hasSlotTeacher
        ? slot.teacherId || ''
        : existing && !teacherChanged && existing.teacherId
        ? existing.teacherId
        : classItem.teacherId;
      const effectiveTeacher = teachers.find(t => t.id === effectiveTeacherId);

      const hasSlotAssistant = slot.assistantTeacherId !== undefined;
      const effectiveAssistantId = hasSlotAssistant
        ? slot.assistantTeacherId || undefined
        : existing && !assistantChanged
        ? existing.assistantId
        : classItem.assistantTeacherId || undefined;
      const effectiveAssistant = effectiveAssistantId
        ? assistants.find(ta => ta.id === effectiveAssistantId)
        : undefined;

      if (existing) {
        return {
          ...existing,
          className: classItem.name,
          classroom: classItem.classroom,
          dayOfWeek: slot.dayOfWeek,
          dayName: getWeekdayLabel(slot.dayOfWeek),
          startTime: slot.startTime,
          endTime: slot.endTime,
          teacherId: effectiveTeacherId,
          teacherName:
            effectiveTeacher?.fullName ||
            (!hasSlotTeacher && !teacherChanged ? existing.teacherName : '') ||
            '',
          assistantId: effectiveAssistantId,
          assistantName: effectiveAssistant?.fullName || undefined
        };
      }

      return {
        id: `SES-${classItem.id}-D${slot.dayOfWeek}`,
        classId: classItem.id,
        className: classItem.name,
        teacherId: effectiveTeacherId,
        teacherName: effectiveTeacher?.fullName || '',
        assistantId: effectiveAssistantId,
        assistantName: effectiveAssistant?.fullName || undefined,
        classroom: classItem.classroom,
        dayOfWeek: slot.dayOfWeek,
        dayName: getWeekdayLabel(slot.dayOfWeek),
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'scheduled'
      };
    });

    return [...otherSessions, ...syncedSessions];
  };

  // 3. Classes
  const addClass = (clsData: Omit<ClassItem, 'id'>): ClassItem => {
    const newId = `CLS-${Date.now().toString().slice(-4)}`;
    const slots = getClassWeeklySchedule(clsData);
    const primaryTeacherId = slots.find(s => s.teacherId)?.teacherId || clsData.teacherId || '';
    const primaryAssistantId =
      slots.find(s => s.assistantTeacherId)?.assistantTeacherId || clsData.assistantTeacherId || undefined;
    const newClass: ClassItem = {
      ...clsData,
      id: newId,
      teacherId: primaryTeacherId,
      assistantTeacherId: primaryAssistantId,
      ...(slots.length > 0
        ? {
            weeklySchedule: slots,
            scheduleDays: formatScheduleDaysLabel(slots),
            scheduleTime: formatScheduleTimeSummary(slots)
          }
        : {})
    };

    const activeTeacherIds = new Set(
      [newClass.teacherId, ...slots.map(s => s.teacherId || '')].filter(Boolean)
    );

    commitDataChange(['classes', 'teachers', 'timetable'], prev => {
      // also update teacher's assignedClassIds for all teachers assigned to any weekday session
      const updatedTeachers = prev.teachers.map(t => {
        if (activeTeacherIds.has(t.id) && !t.assignedClassIds.includes(newId)) {
          return {
            ...t,
            assignedClassIds: [...t.assignedClassIds, newId],
            workloadHours: t.workloadHours + 3
          };
        }
        return t;
      });

      const updatedTimetable = syncTimetableForClass(
        prev.timetable,
        newClass,
        updatedTeachers,
        prev.teachingAssistants
      );

      return {
        ...prev,
        classes: [newClass, ...prev.classes],
        teachers: updatedTeachers,
        timetable: updatedTimetable
      };
    });

    addActivityLog('Tạo lớp học mới', `Đã mở lớp ${newClass.name} (${newClass.code})`);
    return newClass;
  };

  const updateClass = (id: string, updates: Partial<ClassItem>) => {
    commitDataChange(['classes', 'teachers', 'timetable'], prev => {
      const existingClass = prev.classes.find(c => c.id === id);
      if (!existingClass) return prev;

      const merged: ClassItem = { ...existingClass, ...updates };
      if (
        updates.weeklySchedule !== undefined ||
        updates.scheduleDays !== undefined ||
        updates.scheduleTime !== undefined
      ) {
        const slots = getClassWeeklySchedule(merged);
        if (slots.length > 0) {
          merged.weeklySchedule = slots;
          merged.scheduleDays = formatScheduleDaysLabel(slots);
          merged.scheduleTime = formatScheduleTimeSummary(slots);
          if (updates.weeklySchedule !== undefined) {
            merged.teacherId = slots.find(s => s.teacherId)?.teacherId || merged.teacherId;
            const slotTa = slots.find(s => s.assistantTeacherId)?.assistantTeacherId;
            merged.assistantTeacherId = slotTa || undefined;
          }
        }
      }

      const updatedClasses = prev.classes.map(c => (c.id === id ? merged : c));

      const oldSlots = getClassWeeklySchedule(existingClass);
      const newSlots = getClassWeeklySchedule(merged);
      const previousTeacherIds = new Set(
        [existingClass.teacherId, ...oldSlots.map(s => s.teacherId || '')].filter(Boolean)
      );
      const activeTeacherIds = new Set(
        [merged.teacherId, ...newSlots.map(s => s.teacherId || '')].filter(Boolean)
      );

      const updatedTeachers = prev.teachers.map(t => {
        const wasAssigned = previousTeacherIds.has(t.id);
        const isAssigned = activeTeacherIds.has(t.id);
        if (isAssigned && !t.assignedClassIds.includes(id)) {
          return {
            ...t,
            assignedClassIds: [...t.assignedClassIds, id]
          };
        }
        if (wasAssigned && !isAssigned && t.assignedClassIds.includes(id)) {
          return {
            ...t,
            assignedClassIds: t.assignedClassIds.filter(cid => cid !== id)
          };
        }
        return t;
      });

      const shouldSyncTimetable =
        updates.weeklySchedule !== undefined ||
        updates.scheduleDays !== undefined ||
        updates.scheduleTime !== undefined ||
        updates.teacherId !== undefined ||
        updates.assistantTeacherId !== undefined ||
        updates.classroom !== undefined ||
        updates.name !== undefined;

      const updatedTimetable = shouldSyncTimetable
        ? syncTimetableForClass(
            prev.timetable,
            merged,
            updatedTeachers,
            prev.teachingAssistants,
            existingClass
          )
        : prev.timetable;

      return {
        ...prev,
        classes: updatedClasses,
        teachers: updatedTeachers,
        timetable: updatedTimetable
      };
    });
    addActivityLog('Cập nhật lớp học', `Đã cập nhật thông tin lớp học mã ${id}`);
  };

  const deleteClass = (id: string) => {
    const cls = dataRef.current.classes.find(c => c.id === id);
    commitDataChange(['classes', 'timetable', 'teachers', 'students'], prev => ({
      ...prev,
      classes: prev.classes.filter(c => c.id !== id),
      timetable: prev.timetable.filter(s => s.classId !== id),
      teachers: prev.teachers.map(t => ({
        ...t,
        assignedClassIds: t.assignedClassIds.filter(cid => cid !== id)
      })),
      students: prev.students.map(s => ({
        ...s,
        classIds: s.classIds.filter(cid => cid !== id)
      }))
    }));
    addActivityLog('Xóa lớp học', `Đã xóa lớp học ${cls?.name || id}`);
  };

  const assignStudentsToClass = (classId: string, studentIds: string[]) => {
    commitDataChange(['classes', 'students'], prev => {
      const updatedClasses = prev.classes.map(c => {
        if (c.id === classId) {
          return { ...c, studentIds };
        }
        return c;
      });

      const updatedStudents = prev.students.map(s => {
        const inThisClass = studentIds.includes(s.id);
        const hasId = s.classIds.includes(classId);
        if (inThisClass && !hasId) {
          return { ...s, classIds: [...s.classIds, classId] };
        }
        if (!inThisClass && hasId) {
          return { ...s, classIds: s.classIds.filter(cid => cid !== classId) };
        }
        return s;
      });

      return {
        ...prev,
        classes: updatedClasses,
        students: updatedStudents
      };
    });
    addActivityLog('Cập nhật danh sách lớp', `Đã cập nhật danh sách ${studentIds.length} học sinh cho lớp mã ${classId}`);
  };

  // 4. Teachers & Assistants
  const addTeacher = (teacherData: Omit<Teacher, 'id'>): Teacher => {
    const newId = getNextSequentialId(
      dataRef.current.teachers.map(t => t.id),
      'TCH-',
      3
    );
    const newTeacher: Teacher = { ...teacherData, id: newId };
    commitDataChange(['teachers'], prev => ({
      ...prev,
      teachers: [...prev.teachers, newTeacher]
    }));
    addActivityLog('Thêm giáo viên', `Đã thêm giáo viên ${newTeacher.fullName} (${newId})`);
    return newTeacher;
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    commitDataChange(['teachers'], prev => ({
      ...prev,
      teachers: prev.teachers.map(t => (t.id === id ? { ...t, ...updates } : t))
    }));
    addActivityLog('Cập nhật giáo viên', `Đã cập nhật hồ sơ giáo viên ${id}`);
  };

  const deleteTeacher = (id: string) => {
    const t = dataRef.current.teachers.find(tch => tch.id === id);
    commitDataChange(['teachers', 'classes'], prev => ({
      ...prev,
      teachers: prev.teachers.filter(teacher => teacher.id !== id),
      classes: prev.classes.map(cls => (cls.teacherId === id ? { ...cls, teacherId: '' } : cls))
    }));
    addActivityLog('Xóa giáo viên', `Đã xóa giáo viên ${t?.fullName || id}`);
  };

  const addAssistant = (taData: Omit<TeachingAssistant, 'id'>): TeachingAssistant => {
    const newId = getNextSequentialId(
      dataRef.current.teachingAssistants.map(a => a.id),
      'TA-',
      3
    );
    const newAssistant: TeachingAssistant = { ...taData, id: newId };
    commitDataChange(['teachingAssistants'], prev => ({
      ...prev,
      teachingAssistants: [...prev.teachingAssistants, newAssistant]
    }));
    addActivityLog('Thêm trợ giảng', `Đã thêm trợ giảng ${newAssistant.fullName}`);
    return newAssistant;
  };

  const updateAssistant = (id: string, updates: Partial<TeachingAssistant>) => {
    commitDataChange(['teachingAssistants'], prev => ({
      ...prev,
      teachingAssistants: prev.teachingAssistants.map(a => (a.id === id ? { ...a, ...updates } : a))
    }));
  };

  const deleteAssistant = (id: string) => {
    commitDataChange(['teachingAssistants'], prev => ({
      ...prev,
      teachingAssistants: prev.teachingAssistants.filter(a => a.id !== id)
    }));
  };

  // 5. Academic Programs
  const addProgram = (progData: Omit<AcademicProgram, 'id'>): AcademicProgram => {
    const newId = `PROG-${Date.now().toString().slice(-4)}`;
    const newProgram: AcademicProgram = { ...progData, id: newId };
    commitDataChange(['programs'], prev => ({
      ...prev,
      programs: [...prev.programs, newProgram]
    }));
    addActivityLog('Thêm chương trình học', `Đã thêm chương trình ${newProgram.name}`);
    return newProgram;
  };

  const updateProgram = (id: string, updates: Partial<AcademicProgram>) => {
    commitDataChange(['programs'], prev => ({
      ...prev,
      programs: prev.programs.map(p => (p.id === id ? { ...p, ...updates } : p))
    }));
  };

  const deleteProgram = (id: string) => {
    commitDataChange(['programs'], prev => ({
      ...prev,
      programs: prev.programs.filter(p => p.id !== id)
    }));
  };

  // 6. Timetable & Conflict Detection
  const checkScheduleConflict = (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    teacherId: string,
    classroom: string,
    classId: string,
    excludeSessionId?: string
  ): ScheduleConflictResult => {
    const conflicts: string[] = [];
    let teacherConflict: string | undefined;
    let roomConflict: string | undefined;
    let classConflict: string | undefined;

    const existingSessions = data.timetable.filter(s =>
      s.dayOfWeek === dayOfWeek && (!excludeSessionId || s.id !== excludeSessionId)
    );

    for (const s of existingSessions) {
      if (isTimeOverlapping(startTime, endTime, s.startTime, s.endTime)) {
        // 1. Teacher conflict
        if (teacherId && s.teacherId === teacherId) {
          teacherConflict = `Trùng lịch Giáo viên: ${s.teacherName} đã có ca dạy lớp "${s.className}" (${s.startTime} - ${s.endTime})`;
          conflicts.push(teacherConflict);
        }
        // 2. Classroom conflict
        if (classroom && s.classroom === classroom) {
          roomConflict = `Trùng Phòng học: ${s.classroom} đang được lớp "${s.className}" sử dụng (${s.startTime} - ${s.endTime})`;
          conflicts.push(roomConflict);
        }
        // 3. Class conflict
        if (classId && s.classId === classId) {
          classConflict = `Trùng lịch Lớp: Lớp "${s.className}" đã có lịch học trùng ca (${s.startTime} - ${s.endTime})`;
          conflicts.push(classConflict);
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      teacherConflict,
      roomConflict,
      classConflict,
      details: conflicts
    };
  };

  const addTimetableSession = (
    sessionData: Omit<TimetableSession, 'id'>
  ): { success: boolean; session?: TimetableSession; conflict?: ScheduleConflictResult } => {
    const conflict = checkScheduleConflict(
      sessionData.dayOfWeek,
      sessionData.startTime,
      sessionData.endTime,
      sessionData.teacherId,
      sessionData.classroom,
      sessionData.classId
    );

    if (conflict.hasConflict) {
      return { success: false, conflict };
    }

    const newId = `SES-${Date.now().toString().slice(-4)}`;
    const newSession: TimetableSession = { ...sessionData, id: newId };

    commitDataChange(['timetable'], prev => ({
      ...prev,
      timetable: [...prev.timetable, newSession]
    }));

    addActivityLog('Thêm ca học TKB', `Đã thêm ca học cho lớp ${newSession.className} vào ${newSession.dayName} (${newSession.startTime} - ${newSession.endTime})`);
    return { success: true, session: newSession };
  };

  const updateTimetableSession = (
    id: string,
    updates: Partial<TimetableSession>
  ): { success: boolean; conflict?: ScheduleConflictResult } => {
    const current = dataRef.current.timetable.find(s => s.id === id);
    if (!current) return { success: false };

    const targetDay = updates.dayOfWeek ?? current.dayOfWeek;
    const targetStart = updates.startTime ?? current.startTime;
    const targetEnd = updates.endTime ?? current.endTime;
    const targetTeacher = updates.teacherId ?? current.teacherId;
    const targetRoom = updates.classroom ?? current.classroom;
    const targetClass = updates.classId ?? current.classId;

    const conflict = checkScheduleConflict(
      targetDay,
      targetStart,
      targetEnd,
      targetTeacher,
      targetRoom,
      targetClass,
      id
    );

    if (conflict.hasConflict) {
      return { success: false, conflict };
    }

    commitDataChange(['timetable'], prev => ({
      ...prev,
      timetable: prev.timetable.map(s => (s.id === id ? { ...s, ...updates } : s))
    }));

    addActivityLog('Cập nhật ca học TKB', `Đã cập nhật ca học ${id}`);
    return { success: true };
  };

  const deleteTimetableSession = (id: string) => {
    commitDataChange(['timetable'], prev => ({
      ...prev,
      timetable: prev.timetable.filter(s => s.id !== id)
    }));
    addActivityLog('Xóa ca học TKB', `Đã hủy ca học mã ${id}`);
  };

  // 7. Attendance
  const saveAttendance = (
    classId: string,
    date: string,
    records: StudentAttendanceEntry[],
    sessionTime: string
  ): AttendanceRecord => {
    const cls = dataRef.current.classes.find(c => c.id === classId);
    const teacher = dataRef.current.teachers.find(t => t.id === cls?.teacherId);

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const excusedCount = records.filter(r => r.status === 'excused').length;

    const existingIndex = dataRef.current.attendance.findIndex(
      a => a.classId === classId && a.date === date
    );

    const recordId =
      existingIndex >= 0
        ? dataRef.current.attendance[existingIndex].id
        : `ATT-${date.replace(/-/g, '')}-${classId.slice(-3)}`;

    const newRecord: AttendanceRecord = {
      id: recordId,
      classId,
      className: cls?.name || classId,
      date,
      sessionTime,
      teacherId: teacher?.id || 'TCH-001',
      teacherName: teacher?.fullName || 'Giáo viên',
      records,
      totalStudents: records.length,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      takenAt: new Date().toLocaleString('vi-VN'),
      takenBy: currentUser.name
    };

    commitDataChange(['attendance'], prev => {
      const idx = prev.attendance.findIndex(a => a.classId === classId && a.date === date);
      let updatedAttendance = [...prev.attendance];
      if (idx >= 0) {
        updatedAttendance[idx] = newRecord;
      } else {
        updatedAttendance = [newRecord, ...updatedAttendance];
      }
      return {
        ...prev,
        attendance: updatedAttendance
      };
    });

    addActivityLog('Điểm danh', `Đã lưu điểm danh lớp ${cls?.name} ngày ${date} (${presentCount}/${records.length} có mặt)`);
    return newRecord;
  };

  // 8. Assessments
  const saveAssessment = (assessmentData: Omit<AssessmentRecord, 'id'> & { id?: string }): AssessmentRecord => {
    const newId = assessmentData.id || `ASM-${Date.now().toString().slice(-6)}`;
    const newRecord: AssessmentRecord = {
      ...assessmentData,
      id: newId
    };

    commitDataChange(['assessments'], prev => {
      const idx = prev.assessments.findIndex(a => a.id === newId);
      if (idx >= 0) {
        const copy = [...prev.assessments];
        copy[idx] = newRecord;
        return { ...prev, assessments: copy };
      }
      return {
        ...prev,
        assessments: [newRecord, ...prev.assessments]
      };
    });

    addActivityLog('Lưu bảng điểm', `Đã lưu kết quả đánh giá "${newRecord.title}" cho lớp ${newRecord.className}`);
    return newRecord;
  };

  const updateAssessmentScore = (assessmentId: string, studentScores: StudentScoreEntry[]) => {
    commitDataChange(['assessments'], prev => ({
      ...prev,
      assessments: prev.assessments.map(a =>
        a.id === assessmentId ? { ...a, scores: studentScores } : a
      )
    }));
  };

  // 9. Lesson Plans
  const submitLessonPlan = (planData: Omit<LessonPlanReport, 'id' | 'submittedAt'>): LessonPlanReport => {
    const newId = `LPR-${Date.now().toString().slice(-4)}`;
    const newPlan: LessonPlanReport = {
      ...planData,
      id: newId,
      submittedAt: new Date().toLocaleString('vi-VN')
    };

    commitDataChange(['lessonPlans'], prev => ({
      ...prev,
      lessonPlans: [newPlan, ...prev.lessonPlans]
    }));

    addActivityLog('Nộp báo cáo buổi dạy', `Giáo viên ${newPlan.teacherName} nộp báo cáo bài số ${newPlan.lessonNumber} cho lớp ${newPlan.className}`);
    return newPlan;
  };

  const reviewLessonPlan = (id: string, status: 'approved' | 'reviewed', feedback: string) => {
    commitDataChange(['lessonPlans'], prev => ({
      ...prev,
      lessonPlans: prev.lessonPlans.map(lp =>
        lp.id === id ? { ...lp, status, managerFeedback: feedback } : lp
      )
    }));
    addActivityLog('Duyệt giáo án / báo cáo', `Quản lý học thuật đã duyệt báo cáo mã ${id}`);
  };

  // 10. Users
  const addUser = (userData: Omit<User, 'id' | 'createdAt'>): User => {
    const newId = getNextSequentialId(
      dataRef.current.users.map(u => u.id),
      'USR-',
      3
    );
    const newUser: User = {
      ...userData,
      id: newId,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    commitDataChange(['users'], prev => ({
      ...prev,
      users: [...prev.users, newUser]
    }));
    addActivityLog('Tạo tài khoản', `Đã tạo tài khoản cho ${newUser.name} (${newUser.email})`);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    commitDataChange(['users'], prev => ({
      ...prev,
      users: prev.users.map(u => (u.id === id ? { ...u, ...updates } : u))
    }));
    addActivityLog('Cập nhật tài khoản', `Đã cập nhật tài khoản ${id}`);
  };

  const toggleUserStatus = (id: string) => {
    commitDataChange(['users'], prev => ({
      ...prev,
      users: prev.users.map(u =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
      )
    }));
  };

  // 11. Teaching Schedule Management
  const getScheduleByClassAndMonth = (classId: string, month: number, year: number): MonthlyTeachingSchedule | undefined => {
    return data.teachingSchedules.find(
      s => s.classId === classId && s.month === Number(month) && s.year === Number(year)
    );
  };

  const getSchedulesByClass = (classId: string): MonthlyTeachingSchedule[] => {
    return data.teachingSchedules
      .filter(s => s.classId === classId)
      .sort((a, b) => b.year - a.year || b.month - a.month);
  };

  const generateScheduleFromTimetable = (classId: string, month: number, year: number): MonthlyTeachingSchedule => {
    const cls = data.classes.find(c => c.id === classId);
    const teacher = data.teachers.find(t => t.id === cls?.teacherId);
    const assistant = data.teachingAssistants.find(ta => ta.id === cls?.assistantTeacherId);
    const program = data.programs.find(p => p.id === cls?.courseId);

    const classTimetables = data.timetable.filter(t => t.classId === classId);
    const activeDaysMap: Record<number, { time: string; classroom: string; teacherName: string; teacherId: string; taName?: string; taId?: string }> = {};

    if (classTimetables.length > 0) {
      classTimetables.forEach(t => {
        activeDaysMap[t.dayOfWeek] = {
          time: `${t.startTime} – ${t.endTime}`,
          classroom: t.classroom || cls?.classroom || 'Phòng học',
          teacherName: t.teacherName || teacher?.vietnameseName || teacher?.fullName || 'Giáo viên',
          teacherId: t.teacherId || cls?.teacherId || '',
          taName: t.assistantName || assistant?.fullName,
          taId: t.assistantId || assistant?.id,
        };
      });
    } else if (cls) {
      const weeklySlots = getClassWeeklySchedule(cls);
      const defaultRoom = cls.classroom || '1A';
      const defaultTchName = teacher?.vietnameseName || teacher?.fullName || 'Giáo viên';
      const defaultTchId = teacher?.id || '';
      const defaultTaName = assistant?.fullName;
      const defaultTaId = assistant?.id;

      weeklySlots.forEach(slot => {
        const slotTeacher = slot.teacherId
          ? data.teachers.find(t => t.id === slot.teacherId)
          : undefined;
        const slotTa = slot.assistantTeacherId
          ? data.teachingAssistants.find(ta => ta.id === slot.assistantTeacherId)
          : undefined;

        activeDaysMap[slot.dayOfWeek] = {
          time: `${slot.startTime} – ${slot.endTime}`,
          classroom: defaultRoom,
          teacherName:
            slotTeacher?.vietnameseName || slotTeacher?.fullName || defaultTchName,
          teacherId: slot.teacherId || defaultTchId,
          taName:
            slot.assistantTeacherId !== undefined
              ? slotTa?.fullName
              : defaultTaName,
          taId:
            slot.assistantTeacherId !== undefined
              ? slot.assistantTeacherId || undefined
              : defaultTaId,
        };
      });
    }

    const totalDays = new Date(year, month, 0).getDate();
    const sessions: TeachingSession[] = [];
    const weekdayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getOrdinal = (num: number) => {
      if (num >= 11 && num <= 13) return `${num}th`;
      switch (num % 10) {
        case 1: return `${num}st`;
        case 2: return `${num}nd`;
        case 3: return `${num}rd`;
        default: return `${num}th`;
      }
    };

    let sessionCounter = 1;
    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, month - 1, day);
      const jsDay = dateObj.getDay();
      const ttDay = jsDay === 0 ? 7 : jsDay;

      if (activeDaysMap[ttDay]) {
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${year}-${pad(month)}-${pad(day)}`;

        if (cls?.startDate && cls?.endDate) {
          if (dateStr < cls.startDate && cls.startDate.startsWith(String(year))) {
            continue;
          }
          if (dateStr > cls.endDate && cls.endDate.startsWith(String(year))) {
            continue;
          }
        }

        const dayConfig = activeDaysMap[ttDay];
        const dateOrdinal = `${weekdayAbbr[jsDay]} ${getOrdinal(day)}`;
        const programOutline = program?.lessonSequence?.[sessionCounter - 1];

        sessions.push({
          sessionId: `SES-SCH-${year}${pad(month)}${pad(day)}-${classId}`,
          date: dateStr,
          weekday: weekdayAbbr[jsDay],
          dateOrdinal,
          teacherId: dayConfig.teacherId,
          teacherName: dayConfig.teacherName,
          teachingAssistantId: dayConfig.taId,
          teachingAssistantName: dayConfig.taName,
          time: dayConfig.time,
          classroom: dayConfig.classroom,
          courseBook: cls?.curriculum || program?.textbook || 'GET READY FOR STARTERS',
          lesson: programOutline ? `Unit ${sessionCounter}: ${programOutline.title}` : `Unit ${sessionCounter}`,
          contents: programOutline ? `- Grammar: ${programOutline.grammarFocus}\n- Vocabulary: ${programOutline.vocabFocus}\n- Homework: ${programOutline.homework}` : '',
          notes: '',
          notesHighlight: false,
        });

        sessionCounter++;
      }
    }

    const defaultTeacherLabel = teacher?.vietnameseName || teacher?.fullName || 'Giáo viên';
    const defaultTALabel = assistant?.fullName || '';

    const newSchedule: MonthlyTeachingSchedule = {
      id: `SCH-${classId}-${year}-${String(month).padStart(2, '0')}`,
      classId,
      className: cls?.name || 'Class',
      month: Number(month),
      year: Number(year),
      teacherId: cls?.teacherId || '',
      teacherName: defaultTeacherLabel,
      teachingAssistantId: cls?.assistantTeacherId,
      teachingAssistantName: defaultTALabel,
      defaultTime: cls
        ? formatScheduleTimeSummary(getClassWeeklySchedule(cls)) || cls.scheduleTime || '7:30 – 9:00pm, Monday/Thursday'
        : '7:30 – 9:00pm, Monday/Thursday',
      defaultClassroom: cls?.classroom || '1A',
      courseBook: cls?.curriculum || program?.textbook || 'GET READY FOR STARTERS',
      generatedFromTimetable: true,
      sessions,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: currentUser.name,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    return newSchedule;
  };

  const saveTeachingSchedule = (
    schedule: MonthlyTeachingSchedule
  ): { success: boolean; schedule?: MonthlyTeachingSchedule; error?: string } => {
    if (currentUser.role === 'teacher') {
      return {
        success: false,
        error: 'Tài khoản Giáo viên không có quyền tạo hoặc chỉnh sửa Lịch giảng dạy (Yêu cầu quyền teaching_schedule.edit).',
      };
    }
    if (!hasPermission('teaching_schedule.edit') && !hasPermission('teaching_schedule.create')) {
      return {
        success: false,
        error: 'Bạn không có quyền thực hiện thao tác lưu Lịch giảng dạy.',
      };
    }

    const updatedSchedule: MonthlyTeachingSchedule = {
      ...schedule,
      updatedBy: currentUser.name,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    commitDataChange(['teachingSchedules'], prev => {
      const existingIdx = prev.teachingSchedules.findIndex(
        s => s.id === updatedSchedule.id || (s.classId === updatedSchedule.classId && s.month === updatedSchedule.month && s.year === updatedSchedule.year)
      );

      let nextSchedules: MonthlyTeachingSchedule[];
      if (existingIdx >= 0) {
        nextSchedules = [...prev.teachingSchedules];
        nextSchedules[existingIdx] = updatedSchedule;
      } else {
        nextSchedules = [...prev.teachingSchedules, updatedSchedule];
      }

      return {
        ...prev,
        teachingSchedules: nextSchedules,
      };
    });

    addActivityLog('Lưu Lịch giảng dạy', `Đã lưu lịch giảng dạy tháng ${schedule.month}/${schedule.year} của lớp ${schedule.className}`);
    return { success: true, schedule: updatedSchedule };
  };

  const deleteTeachingSchedule = (id: string): { success: boolean; error?: string } => {
    if (currentUser.role !== 'admin' && !hasPermission('teaching_schedule.delete')) {
      return {
        success: false,
        error: 'Chỉ Quản trị viên (Admin) hoặc tài khoản được cấp quyền xóa mới có thể xóa Lịch giảng dạy.',
      };
    }

    const target = dataRef.current.teachingSchedules.find(s => s.id === id);
    if (!target) {
      return { success: false, error: 'Không tìm thấy lịch giảng dạy cần xóa.' };
    }

    commitDataChange(['teachingSchedules'], prev => ({
      ...prev,
      teachingSchedules: prev.teachingSchedules.filter(s => s.id !== id),
    }));

    addActivityLog('Xóa Lịch giảng dạy', `Đã xóa lịch giảng dạy tháng ${target.month}/${target.year} của lớp ${target.className}`);
    return { success: true };
  };

  const copyScheduleContent = (
    sourceScheduleId: string,
    targetMonth: number,
    targetYear: number
  ): MonthlyTeachingSchedule | null => {
    const source = data.teachingSchedules.find(s => s.id === sourceScheduleId);
    if (!source) return null;

    const target = generateScheduleFromTimetable(source.classId, targetMonth, targetYear);
    const mergedSessions = target.sessions.map((targetSession, index) => {
      const srcSession = source.sessions[index];
      if (srcSession) {
        return {
          ...targetSession,
          lesson: srcSession.lesson,
          contents: srcSession.contents,
          notes: srcSession.notes,
          notesHighlight: srcSession.notesHighlight,
        };
      }
      return targetSession;
    });

    return {
      ...target,
      sessions: mergedSessions,
      courseBook: source.courseBook,
    };
  };

  // 12. Settings & Reset
  const updateSettings = (updates: Partial<CenterSettings>) => {
    commitDataChange(['settings'], prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
    addActivityLog('Cài đặt hệ thống', 'Đã cập nhật thông tin cấu hình trung tâm');
  };

  const resetAllData = () => {
    if (currentUser.role !== 'admin') return;
    const refreshed = resetStorage();
    const allKeys = Object.keys(refreshed as unknown as Record<string, unknown>);
    commitDataChange(allKeys, () => refreshed, { force: true });
    addActivityLog('Khôi phục dữ liệu', 'Đã khôi phục toàn bộ hệ thống về bộ dữ liệu mẫu ban đầu');
  };

  return (
    <DataContext.Provider
      value={{
        data,
        syncStatus,
        syncError,
        lastSyncedAt,
        cloudVersion,
        pendingSyncCount,
        unsyncedLocalCount,
        syncNow,
        retryPendingSync,
        mergeUnsyncedLocalData,
        forcePushLocalToCloud,
        addStudent,
        updateStudent,
        deleteStudent,
        transferStudentClass,
        importStudents,
        addParent,
        updateParent,
        addClass,
        updateClass,
        deleteClass,
        assignStudentsToClass,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addAssistant,
        updateAssistant,
        deleteAssistant,
        addProgram,
        updateProgram,
        deleteProgram,
        addTimetableSession,
        updateTimetableSession,
        deleteTimetableSession,
        checkScheduleConflict,
        saveAttendance,
        saveAssessment,
        updateAssessmentScore,
        submitLessonPlan,
        reviewLessonPlan,
        addUser,
        updateUser,
        toggleUserStatus,
        getScheduleByClassAndMonth,
        getSchedulesByClass,
        generateScheduleFromTimetable,
        saveTeachingSchedule,
        deleteTeachingSchedule,
        copyScheduleContent,
        updateSettings,
        resetAllData,
        addActivityLog
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
