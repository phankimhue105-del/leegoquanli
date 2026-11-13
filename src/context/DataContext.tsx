import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Student,
  ClassItem,
  Teacher,
  TeachingAssistant,
  AcademicManager,
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
  TeachingSession,
  LessonReport,
  MakeupClassSession,
  IncompleteReportRecord,
  LessonReportLockAuditEntry,
  StudentLessonReportEntry
} from '../types';
import {
  loadInitialStorage,
  saveStorage,
  resetStorage,
  AppDataStore,
  getClassWeeklySchedule,
  getVietnamNowFormatted,
  computeReportDeadlineISO,
  isReportExpired,
  isStudentReportEntryComplete,
  fetchCenterDataFromGoogleAppsScript,
  saveCenterDataToGoogleAppsScript,
  mergeCenterData,
  RecordConflict,
  resolveConflict as resolveConflictUtil
} from '../services/dataService';
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
  addAcademicManager?: (manager: Omit<AcademicManager, 'id'>) => AcademicManager;
  updateAcademicManager?: (id: string, updates: Partial<AcademicManager>) => void;
  deleteAcademicManager?: (id: string) => void;

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
  restoreFromBackup?: (backupStore: AppDataStore) => { success: boolean; message?: string };
  addActivityLog: (action: string, details: string) => void;
  refreshData: (force?: boolean) => Promise<void> | void;
  isSyncing?: boolean;
  lastSyncTime?: string | null;

  // Conflict Resolution (Milestone 2)
  conflicts?: RecordConflict[];
  resolveConflict?: (
    conflict: RecordConflict,
    resolution: 'keep_local' | 'keep_cloud' | 'custom',
    customRecord?: any
  ) => void;

  // Lesson Reports
  getLessonReportsForDate?: (date: string) => LessonReport[];
  saveLessonReport?: (report: LessonReport) => { success: boolean; report?: LessonReport; error?: string };
  submitLessonReport?: (reportIdOrReport: string | LessonReport) => { success: boolean; report?: LessonReport; error?: string };
  toggleReportLock?: (
    reportId: string,
    locked: boolean,
    reason?: string,
    reportSnapshot?: LessonReport
  ) => { success: boolean; error?: string };
  addMakeupClass?: (session: Omit<MakeupClassSession, 'id'>) => { success: boolean; error?: string };
  deleteMakeupClass?: (makeupId: string) => { success: boolean; error?: string };
  resolveIncompleteReport?: (incompleteId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<RecordConflict[]>([]);
  const { currentUser, hasPermission, isAuthenticated } = useAuth();

  const lastRefreshCallRef = React.useRef<number>(0);
  const isRefreshingRef = React.useRef<boolean>(false);
  const initialUploadDoneRef = React.useRef<boolean>(false);

  const refreshData = async (force: boolean = false) => {
    if (!isAuthenticated) return;

    const now = Date.now();
    // Throttle automatic refreshes to at most once every 20 seconds unless forced
    if (!force && now - lastRefreshCallRef.current < 20000) {
      return;
    }
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    lastRefreshCallRef.current = now;

    try {
      const latest = loadInitialStorage();
      setData(latest);
      setIsSyncing(true);
      const remoteResult = await fetchCenterDataFromGoogleAppsScript();
      if (remoteResult.success && remoteResult.data) {
        setData(prev => {
          const { merged, needsUpload, hasConflicts, conflicts: detectedConflicts } = mergeCenterData(prev, remoteResult.data!);
          saveStorage(merged);
          if (hasConflicts && detectedConflicts.length > 0) {
            setConflicts(detectedConflicts);
          }
          if (needsUpload && !initialUploadDoneRef.current) {
            initialUploadDoneRef.current = true;
            saveCenterDataToGoogleAppsScript(
              {
                lessonReports: merged.lessonReports,
                incompleteReports: merged.incompleteReports,
                makeupSessions: merged.makeupSessions,
                lessonReportLockAudits: merged.lessonReportLockAudits
              },
              ['lessonReports', 'incompleteReports', 'makeupSessions', 'lessonReportLockAudits']
            ).catch(e => console.warn('Background sync error on refresh:', e));
          }
          return merged;
        });
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      }
    } catch (e) {
      console.error('Failed to reload storage data:', e);
    } finally {
      setIsSyncing(false);
      isRefreshingRef.current = false;
    }
  };

  // Pull shared data from Google Apps Script (leegodata) only when user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setIsSyncing(false);
      return;
    }

    let isMounted = true;
    const initSharedSync = async () => {
      setIsSyncing(true);
      try {
        const remoteResult = await fetchCenterDataFromGoogleAppsScript();
        if (remoteResult.success && remoteResult.data && isMounted) {
          setData(prev => {
            const { merged, needsUpload, hasConflicts, conflicts: detectedConflicts } = mergeCenterData(prev, remoteResult.data!);
            saveStorage(merged);
            if (hasConflicts && detectedConflicts.length > 0) {
              setConflicts(detectedConflicts);
            }
            if (needsUpload && !initialUploadDoneRef.current) {
              initialUploadDoneRef.current = true;
              saveCenterDataToGoogleAppsScript(
                {
                  lessonReports: merged.lessonReports,
                  incompleteReports: merged.incompleteReports,
                  makeupSessions: merged.makeupSessions,
                  lessonReportLockAudits: merged.lessonReportLockAudits
                },
                ['lessonReports', 'incompleteReports', 'makeupSessions', 'lessonReportLockAudits']
              ).catch(e => console.warn('Initial migration upload error:', e));
            }
            return merged;
          });
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        }
      } catch (err) {
        console.warn('Initial shared data sync warning:', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };
    initSharedSync();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    saveStorage(data);
  }, [data]);

  const pendingKeysToSyncRef = React.useRef<Set<keyof AppDataStore>>(new Set());
  const syncTimeoutRef = React.useRef<any>(null);
  const latestDataRef = React.useRef<AppDataStore>(data);
  latestDataRef.current = data;

  const queueKeysForCloudSync = (keys: Array<keyof AppDataStore>) => {
    if (!isAuthenticated) return;
    keys.forEach(k => pendingKeysToSyncRef.current.add(k));

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      const keysToSave = Array.from(pendingKeysToSyncRef.current);
      if (keysToSave.length === 0) return;
      pendingKeysToSyncRef.current.clear();

      setIsSyncing(true);
      try {
        const payload: Partial<AppDataStore> = {};
        for (const k of keysToSave) {
          (payload as any)[k] = latestDataRef.current[k];
        }
        const res = await saveCenterDataToGoogleAppsScript(payload, keysToSave);
        if (res.success) {
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        } else {
          keysToSave.forEach(k => pendingKeysToSyncRef.current.add(k));
          console.warn('Background sync warning on save:', res.error);
        }
      } catch (err) {
        keysToSave.forEach(k => pendingKeysToSyncRef.current.add(k));
        console.warn('Background sync network error:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 2500);
  };

  // Periodic polling & window focus sync (Cross-device data freshness)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastSync = Date.now() - lastRefreshCallRef.current;
        if (timeSinceLastSync > 30000 && pendingKeysToSyncRef.current.size === 0) {
          refreshData();
        }
      }
    };

    const intervalId = setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        !isSyncing &&
        pendingKeysToSyncRef.current.size === 0
      ) {
        refreshData();
      }
    }, 60000);

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isAuthenticated, isSyncing]);

  // Synchronize data in real-time across tabs/windows when storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'leego_center_storage_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setData(parsed);
        } catch (err) {
          console.error('Failed to parse cross-tab storage change:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
    setData(prev => ({
      ...prev,
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 50)
    }));
  };

  // 1. Students
  const addStudent = (studentData: Omit<Student, 'id'>): Student => {
    const newId = `LG-STU-${String(data.students.length + 1).padStart(3, '0')}`;
    const newStudent: Student = {
      ...studentData,
      id: newId
    };
    setData(prev => {
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
    queueKeysForCloudSync(['students', 'classes']);
    return newStudent;
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setData(prev => {
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
    queueKeysForCloudSync(['students', 'classes']);
  };

  const deleteStudent = (id: string) => {
    const student = data.students.find(s => s.id === id);
    setData(prev => ({
      ...prev,
      students: prev.students.filter(s => s.id !== id),
      classes: prev.classes.map(c => ({
        ...c,
        studentIds: c.studentIds.filter(sid => sid !== id)
      }))
    }));
    addActivityLog('Xóa học sinh', `Đã xóa học sinh ${student?.fullName || id}`);
    queueKeysForCloudSync(['students', 'classes']);
  };

  const transferStudentClass = (studentId: string, fromClassId: string, toClassId: string) => {
    const student = data.students.find(s => s.id === studentId);
    const fromClass = data.classes.find(c => c.id === fromClassId);
    const toClass = data.classes.find(c => c.id === toClassId);

    setData(prev => {
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
    queueKeysForCloudSync(['students', 'classes']);
  };

  const importStudents = (importedList: Partial<Student>[]): number => {
    let count = 0;
    const newStudents: Student[] = [];

    importedList.forEach((item, index) => {
      const studentId = item.id || `LG-STU-${String(data.students.length + count + 1).padStart(3, '0')}`;
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

    setData(prev => ({
      ...prev,
      students: [...newStudents, ...prev.students]
    }));

    addActivityLog('Import học sinh', `Đã nhập thành công ${count} học sinh từ file Excel`);
    queueKeysForCloudSync(['students']);
    return count;
  };

  // 2. Parents
  const addParent = (parentData: Omit<Parent, 'id'>): Parent => {
    const newId = `PAR-${String(data.parents.length + 1).padStart(3, '0')}`;
    const newParent: Parent = { ...parentData, id: newId };
    setData(prev => ({
      ...prev,
      parents: [newParent, ...prev.parents]
    }));
    queueKeysForCloudSync(['parents']);
    return newParent;
  };

  const updateParent = (id: string, updates: Partial<Parent>) => {
    setData(prev => ({
      ...prev,
      parents: prev.parents.map(p => (p.id === id ? { ...p, ...updates } : p))
    }));
    queueKeysForCloudSync(['parents']);
  };

  // 3. Classes
  const addClass = (clsData: Omit<ClassItem, 'id'>): ClassItem => {
    const newId = `CLS-${Date.now().toString().slice(-4)}`;
    const newClass: ClassItem = { ...clsData, id: newId };
    const assignedTeacherIds = new Set<string>(
      [
        newClass.teacherId,
        ...(newClass.weeklySchedule?.map(slot => slot.teacherId) || [])
      ].filter(Boolean)
    );
    setData(prev => {
      // also update teacher's assignedClassIds
      const updatedTeachers = prev.teachers.map(t => {
        if (assignedTeacherIds.has(t.id) && !t.assignedClassIds.includes(newId)) {
          return {
            ...t,
            assignedClassIds: [...t.assignedClassIds, newId],
            workloadHours: t.workloadHours + 3
          };
        }
        return t;
      });

      return {
        ...prev,
        classes: [newClass, ...prev.classes],
        teachers: updatedTeachers
      };
    });

    addActivityLog('Tạo lớp học mới', `Đã mở lớp ${newClass.name} (${newClass.code})`);
    queueKeysForCloudSync(['classes', 'teachers']);
    return newClass;
  };

  const updateClass = (id: string, updates: Partial<ClassItem>) => {
    setData(prev => {
      const updatedClasses = prev.classes.map(c => (c.id === id ? { ...c, ...updates } : c));
      const nextAssignedTeacherIds = new Set<string>(
        [
          updates.teacherId,
          ...(updates.weeklySchedule?.map(slot => slot.teacherId) || [])
        ].filter((tid): tid is string => Boolean(tid))
      );
      const updatedTeachers =
        nextAssignedTeacherIds.size > 0
          ? prev.teachers.map(t =>
              nextAssignedTeacherIds.has(t.id) && !t.assignedClassIds.includes(id)
                ? { ...t, assignedClassIds: [...t.assignedClassIds, id] }
                : t
            )
          : prev.teachers;

      return {
        ...prev,
        classes: updatedClasses,
        teachers: updatedTeachers
      };
    });
    addActivityLog('Cập nhật lớp học', `Đã cập nhật thông tin lớp học mã ${id}`);
    queueKeysForCloudSync(['classes', 'teachers']);
  };

  const deleteClass = (id: string) => {
    const cls = data.classes.find(c => c.id === id);
    setData(prev => ({
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
    queueKeysForCloudSync(['classes', 'timetable', 'teachers', 'students']);
  };

  const assignStudentsToClass = (classId: string, studentIds: string[]) => {
    setData(prev => {
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
    queueKeysForCloudSync(['classes', 'students']);
  };

  // 4. Teachers & Assistants
  const addTeacher = (teacherData: Omit<Teacher, 'id'>): Teacher => {
    const newId = `TCH-${String(data.teachers.length + 1).padStart(3, '0')}`;
    const newTeacher: Teacher = { ...teacherData, id: newId };
    setData(prev => ({
      ...prev,
      teachers: [...prev.teachers, newTeacher]
    }));
    addActivityLog('Thêm giáo viên', `Đã thêm giáo viên ${newTeacher.fullName} (${newId})`);
    queueKeysForCloudSync(['teachers']);
    return newTeacher;
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    setData(prev => ({
      ...prev,
      teachers: prev.teachers.map(t => (t.id === id ? { ...t, ...updates } : t))
    }));
    addActivityLog('Cập nhật giáo viên', `Đã cập nhật hồ sơ giáo viên ${id}`);
    queueKeysForCloudSync(['teachers']);
  };

  const deleteTeacher = (id: string) => {
    const t = data.teachers.find(tch => tch.id === id);
    setData(prev => ({
      ...prev,
      teachers: prev.teachers.filter(teacher => teacher.id !== id),
      classes: prev.classes.map(cls => (cls.teacherId === id ? { ...cls, teacherId: '' } : cls))
    }));
    addActivityLog('Xóa giáo viên', `Đã xóa giáo viên ${t?.fullName || id}`);
    queueKeysForCloudSync(['teachers', 'classes']);
  };

  const addAssistant = (taData: Omit<TeachingAssistant, 'id'>): TeachingAssistant => {
    const newId = `TA-${String(data.teachingAssistants.length + 1).padStart(3, '0')}`;
    const newAssistant: TeachingAssistant = { ...taData, id: newId };
    setData(prev => ({
      ...prev,
      teachingAssistants: [...prev.teachingAssistants, newAssistant]
    }));
    addActivityLog('Thêm trợ giảng', `Đã thêm trợ giảng ${newAssistant.fullName}`);
    queueKeysForCloudSync(['teachingAssistants']);
    return newAssistant;
  };

  const updateAssistant = (id: string, updates: Partial<TeachingAssistant>) => {
    setData(prev => ({
      ...prev,
      teachingAssistants: prev.teachingAssistants.map(a => (a.id === id ? { ...a, ...updates } : a))
    }));
    queueKeysForCloudSync(['teachingAssistants']);
  };

  const deleteAssistant = (id: string) => {
    setData(prev => ({
      ...prev,
      teachingAssistants: prev.teachingAssistants.filter(a => a.id !== id)
    }));
    queueKeysForCloudSync(['teachingAssistants']);
  };

  const addAcademicManager = (managerData: Omit<AcademicManager, 'id'>): AcademicManager => {
    const existingCount = Array.isArray(data.academicManagers) ? data.academicManagers.length : 0;
    const newId = `AM-${String(existingCount + 1).padStart(3, '0')}`;
    const newManager: AcademicManager = { ...managerData, id: newId };
    setData(prev => ({
      ...prev,
      academicManagers: [...(prev.academicManagers || []), newManager]
    }));
    addActivityLog('Thêm hồ sơ QLHT', `Đã thêm hồ sơ Quản lý học thuật: ${newManager.fullName} (${newId})`);
    queueKeysForCloudSync(['academicManagers']);
    return newManager;
  };

  const updateAcademicManager = (id: string, updates: Partial<AcademicManager>) => {
    setData(prev => ({
      ...prev,
      academicManagers: (prev.academicManagers || []).map(m => (m.id === id ? { ...m, ...updates } : m))
    }));
    addActivityLog('Cập nhật hồ sơ QLHT', `Đã cập nhật hồ sơ Quản lý học thuật: ${id}`);
    queueKeysForCloudSync(['academicManagers']);
  };

  const deleteAcademicManager = (id: string) => {
    const m = (data.academicManagers || []).find(mgr => mgr.id === id);
    setData(prev => ({
      ...prev,
      academicManagers: (prev.academicManagers || []).filter(mgr => mgr.id !== id)
    }));
    addActivityLog('Xóa hồ sơ QLHT', `Đã xóa hồ sơ Quản lý học thuật: ${m?.fullName || id}`);
    queueKeysForCloudSync(['academicManagers']);
  };

  // 5. Academic Programs
  const addProgram = (progData: Omit<AcademicProgram, 'id'>): AcademicProgram => {
    const newId = `PROG-${Date.now().toString().slice(-4)}`;
    const newProgram: AcademicProgram = { ...progData, id: newId };
    setData(prev => ({
      ...prev,
      programs: [...prev.programs, newProgram]
    }));
    addActivityLog('Thêm chương trình học', `Đã thêm chương trình ${newProgram.name}`);
    queueKeysForCloudSync(['programs']);
    return newProgram;
  };

  const updateProgram = (id: string, updates: Partial<AcademicProgram>) => {
    setData(prev => ({
      ...prev,
      programs: prev.programs.map(p => (p.id === id ? { ...p, ...updates } : p))
    }));
    queueKeysForCloudSync(['programs']);
  };

  const deleteProgram = (id: string) => {
    setData(prev => ({
      ...prev,
      programs: prev.programs.filter(p => p.id !== id)
    }));
    queueKeysForCloudSync(['programs']);
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

    setData(prev => ({
      ...prev,
      timetable: [...prev.timetable, newSession]
    }));

    addActivityLog('Thêm ca học TKB', `Đã thêm ca học cho lớp ${newSession.className} vào ${newSession.dayName} (${newSession.startTime} - ${newSession.endTime})`);
    queueKeysForCloudSync(['timetable']);
    return { success: true, session: newSession };
  };

  const updateTimetableSession = (
    id: string,
    updates: Partial<TimetableSession>
  ): { success: boolean; conflict?: ScheduleConflictResult } => {
    const current = data.timetable.find(s => s.id === id);
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

    setData(prev => ({
      ...prev,
      timetable: prev.timetable.map(s => (s.id === id ? { ...s, ...updates } : s))
    }));

    addActivityLog('Cập nhật ca học TKB', `Đã cập nhật ca học ${id}`);
    queueKeysForCloudSync(['timetable']);
    return { success: true };
  };

  const deleteTimetableSession = (id: string) => {
    setData(prev => ({
      ...prev,
      timetable: prev.timetable.filter(s => s.id !== id)
    }));
    addActivityLog('Xóa ca học TKB', `Đã hủy ca học mã ${id}`);
    queueKeysForCloudSync(['timetable']);
  };

  // 7. Attendance
  const saveAttendance = (
    classId: string,
    date: string,
    records: StudentAttendanceEntry[],
    sessionTime: string
  ): AttendanceRecord => {
    const cls = data.classes.find(c => c.id === classId);
    const teacher = data.teachers.find(t => t.id === cls?.teacherId);

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const excusedCount = records.filter(r => r.status === 'excused').length;

    const existingIndex = data.attendance.findIndex(a => a.classId === classId && a.date === date);

    const recordId = existingIndex >= 0 ? data.attendance[existingIndex].id : `ATT-${date.replace(/-/g, '')}-${classId.slice(-3)}`;

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

    setData(prev => {
      let updatedAttendance = [...prev.attendance];
      if (existingIndex >= 0) {
        updatedAttendance[existingIndex] = newRecord;
      } else {
        updatedAttendance = [newRecord, ...updatedAttendance];
      }
      return {
        ...prev,
        attendance: updatedAttendance
      };
    });

    addActivityLog('Điểm danh', `Đã lưu điểm danh lớp ${cls?.name} ngày ${date} (${presentCount}/${records.length} có mặt)`);
    queueKeysForCloudSync(['attendance']);
    return newRecord;
  };

  // 8. Assessments
  const saveAssessment = (assessmentData: Omit<AssessmentRecord, 'id'> & { id?: string }): AssessmentRecord => {
    const newId = assessmentData.id || `ASM-${Date.now().toString().slice(-6)}`;
    const newRecord: AssessmentRecord = {
      ...assessmentData,
      id: newId
    };

    setData(prev => {
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
    queueKeysForCloudSync(['assessments']);
    return newRecord;
  };

  const updateAssessmentScore = (assessmentId: string, studentScores: StudentScoreEntry[]) => {
    setData(prev => ({
      ...prev,
      assessments: prev.assessments.map(a =>
        a.id === assessmentId ? { ...a, scores: studentScores } : a
      )
    }));
    queueKeysForCloudSync(['assessments']);
  };

  // 9. Lesson Plans
  const submitLessonPlan = (planData: Omit<LessonPlanReport, 'id' | 'submittedAt'>): LessonPlanReport => {
    const newId = `LPR-${Date.now().toString().slice(-4)}`;
    const newPlan: LessonPlanReport = {
      ...planData,
      id: newId,
      submittedAt: new Date().toLocaleString('vi-VN')
    };

    setData(prev => ({
      ...prev,
      lessonPlans: [newPlan, ...prev.lessonPlans]
    }));

    addActivityLog('Nộp báo cáo buổi dạy', `Giáo viên ${newPlan.teacherName} nộp báo cáo bài số ${newPlan.lessonNumber} cho lớp ${newPlan.className}`);
    queueKeysForCloudSync(['lessonPlans']);
    return newPlan;
  };

  const reviewLessonPlan = (id: string, status: 'approved' | 'reviewed', feedback: string) => {
    setData(prev => ({
      ...prev,
      lessonPlans: prev.lessonPlans.map(lp =>
        lp.id === id ? { ...lp, status, managerFeedback: feedback } : lp
      )
    }));
    addActivityLog('Duyệt giáo án / báo cáo', `Quản lý học thuật đã duyệt báo cáo mã ${id}`);
    queueKeysForCloudSync(['lessonPlans']);
  };

  // 10. Users
  const addUser = (userData: Omit<User, 'id' | 'createdAt'>): User => {
    const newId = `USR-${String(data.users.length + 1).padStart(3, '0')}`;
    const newUser: User = {
      ...userData,
      id: newId,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setData(prev => ({
      ...prev,
      users: [...prev.users, newUser]
    }));
    addActivityLog('Tạo tài khoản', `Đã tạo tài khoản cho ${newUser.name} (${newUser.email})`);
    queueKeysForCloudSync(['users']);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u => (u.id === id ? { ...u, ...updates } : u))
    }));
    addActivityLog('Cập nhật tài khoản', `Đã cập nhật tài khoản ${id}`);
    queueKeysForCloudSync(['users']);
  };

  const toggleUserStatus = (id: string) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
      )
    }));
    queueKeysForCloudSync(['users']);
  };

  // 11. Teaching Schedule Management
  const getScheduleByClassAndMonth = (classId: string, month: number, year: number): MonthlyTeachingSchedule | undefined => {
    return (data.teachingSchedules || []).find(
      s => s.classId === classId && s.month === Number(month) && s.year === Number(year)
    );
  };

  const getSchedulesByClass = (classId: string): MonthlyTeachingSchedule[] => {
    return (data.teachingSchedules || [])
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
    } else if (cls?.weeklySchedule && cls.weeklySchedule.length > 0) {
      cls.weeklySchedule.forEach(slot => {
        const slotTeacher = data.teachers.find(t => t.id === slot.teacherId) || teacher;
        const slotTa = slot.assistantTeacherId
          ? data.teachingAssistants.find(ta => ta.id === slot.assistantTeacherId)
          : undefined;
        activeDaysMap[slot.dayOfWeek] = {
          time: `${slot.startTime} – ${slot.endTime}`,
          classroom: cls.classroom || 'Phòng học',
          teacherName: slotTeacher?.vietnameseName || slotTeacher?.fullName || 'Giáo viên',
          teacherId: slot.teacherId || cls.teacherId || '',
          taName: slotTa?.fullName,
          taId: slotTa?.id,
        };
      });
    } else if (cls?.scheduleDays) {
      const lower = cls.scheduleDays.toLowerCase();
      const defaultTime = cls.scheduleTime || '7:30 – 9:00pm';
      const defaultRoom = cls.classroom || '1A';
      const defaultTchName = teacher?.vietnameseName || teacher?.fullName || 'Giáo viên';
      const defaultTchId = teacher?.id || '';
      const defaultTaName = assistant?.fullName;
      const defaultTaId = assistant?.id;

      if (lower.includes('thứ 2') || lower.includes('t2') || lower.includes('monday') || lower.includes('mon')) {
        activeDaysMap[1] = { time: defaultTime, classroom: defaultRoom, teacherName: defaultTchName, teacherId: defaultTchId, taName: defaultTaName, taId: defaultTaId };
      }
      if (lower.includes('thứ 3') || lower.includes('t3') || lower.includes('tuesday') || lower.includes('tue')) {
        activeDaysMap[2] = { time: defaultTime, classroom: defaultRoom, teacherName: defaultTchName, teacherId: defaultTchId, taName: defaultTaName, taId: defaultTaId };
      }
      if (lower.includes('thứ 4') || lower.includes('t4') || lower.includes('wednesday') || lower.includes('wed')) {
        activeDaysMap[3] = { time: defaultTime, classroom: defaultRoom, teacherName: defaultTchName, teacherId: defaultTchId, taName: defaultTaName, taId: defaultTaId };
      }
      if (lower.includes('thứ 5') || lower.includes('t5') || lower.includes('thursday') || lower.includes('thu')) {
        activeDaysMap[4] = { time: defaultTime, classroom: defaultRoom, teacherName: defaultTchName, teacherId: defaultTchId, taName: defaultTaName, taId: defaultTaId };
      }
      if (lower.includes('thứ 6') || lower.includes('t6') || lower.includes('friday') || lower.includes('fri')) {
        activeDaysMap[5] = { time: defaultTime, classroom: defaultRoom, teacherName: defaultTchName, teacherId: defaultTchId, taName: defaultTaName, taId: defaultTaId };
      }
      if (lower.includes('thứ 7') || lower.includes('t7') || lower.includes('saturday') || lower.includes('sat')) {
        activeDaysMap[6] = { time: defaultTime, classroom: defaultRoom, teacherName: defaultTchName, teacherId: defaultTchId, taName: defaultTaName, taId: defaultTaId };
      }
      if (lower.includes('chủ nhật') || lower.includes('cn') || lower.includes('sunday') || lower.includes('sun')) {
        activeDaysMap[7] = { time: defaultTime, classroom: defaultRoom, teacherName: defaultTchName, teacherId: defaultTchId, taName: defaultTaName, taId: defaultTaId };
      }
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
      defaultTime: cls?.scheduleTime || '7:30 – 9:00pm, Monday/Thursday',
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

    setData(prev => {
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
    queueKeysForCloudSync(['teachingSchedules']);
    return { success: true, schedule: updatedSchedule };
  };

  const deleteTeachingSchedule = (id: string): { success: boolean; error?: string } => {
    if (currentUser.role !== 'admin' && !hasPermission('teaching_schedule.delete')) {
      return {
        success: false,
        error: 'Chỉ Quản trị viên (Admin) hoặc tài khoản được cấp quyền xóa mới có thể xóa Lịch giảng dạy.',
      };
    }

    const target = data.teachingSchedules.find(s => s.id === id);
    if (!target) {
      return { success: false, error: 'Không tìm thấy lịch giảng dạy cần xóa.' };
    }

    setData(prev => ({
      ...prev,
      teachingSchedules: prev.teachingSchedules.filter(s => s.id !== id),
    }));

    addActivityLog('Xóa Lịch giảng dạy', `Đã xóa lịch giảng dạy tháng ${target.month}/${target.year} của lớp ${target.className}`);
    queueKeysForCloudSync(['teachingSchedules']);
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

  // 12. Daily Lesson Reports & KPI Audit
  const buildStudentEntriesForClass = (
    classId: string,
    existingEntries?: StudentLessonReportEntry[]
  ): StudentLessonReportEntry[] => {
    const cls = (data.classes || []).find(c => c.id === classId);
    const existingMap = new Map((existingEntries || []).map(e => [e.studentId, e]));
    const studentIds = cls?.studentIds || [];

    return studentIds.map(sid => {
      const stu = (data.students || []).find(s => s.id === sid);
      const displayName = stu?.vietnameseName?.trim() || stu?.fullName || sid;
      const prev = existingMap.get(sid);
      if (prev) {
        return {
          ...prev,
          studentName: displayName,
          completed: isStudentReportEntryComplete(prev)
        };
      }
      return {
        studentId: sid,
        studentName: displayName,
        homeworkStatus: 'Đạt yêu cầu',
        previousLessonStatus: 'Đạt yêu cầu',
        comments: '',
        assignedHomework: '',
        notes: '',
        completed: false
      };
    });
  };

  const computeReportMetrics = (
    report: LessonReport,
    entries: StudentLessonReportEntry[],
    forceSubmitted?: boolean
  ): LessonReport => {
    const totalStudents = entries.length;
    const completedStudents = entries.filter(isStudentReportEntryComplete).length;
    const completionPercentage =
      totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;

    let status: LessonReport['status'] = 'not_started';
    if (forceSubmitted && completedStudents === totalStudents && totalStudents > 0) {
      status = 'completed';
    } else if (
      (report.status === 'completed' || report.status === 'submitted') &&
      completedStudents === totalStudents &&
      totalStudents > 0
    ) {
      status = report.status;
    } else if (
      completedStudents > 0 ||
      entries.some(e => Boolean(e.comments?.trim() || e.notes?.trim()))
    ) {
      status = 'in_progress';
    }

    return {
      ...report,
      totalStudents,
      completedStudents,
      completionPercentage,
      status,
      deadlineAt: report.deadlineAt || computeReportDeadlineISO(report.teachingDate),
      studentReports: entries
    };
  };

  const getLessonReportsForDate = (date: string): LessonReport[] => {
    const storedReports = Array.isArray(data.lessonReports) ? data.lessonReports : [];
    const makeupSessions = Array.isArray(data.makeupSessions) ? data.makeupSessions : [];
    const classes = Array.isArray(data.classes) ? data.classes : [];
    const timetable = Array.isArray(data.timetable) ? data.timetable : [];
    const teachers = Array.isArray(data.teachers) ? data.teachers : [];
    const assistants = Array.isArray(data.teachingAssistants) ? data.teachingAssistants : [];

    const match = (date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const dateObj = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date();
    const jsDay = dateObj.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    const reportsByKey = new Map<string, LessonReport>();

    // 1. Timetable sessions for this weekday/date
    timetable
      .filter(s => s.status !== 'cancelled' && s.dayOfWeek === dayOfWeek && (!s.date || s.date === date))
      .forEach(s => {
        const cls = classes.find(c => c.id === s.classId);
        if (cls && cls.status === 'cancelled') return;
        const reportId = `LR-${s.classId}-${date}`;
        const existing = storedReports.find(
          r => r.id === reportId || (r.classId === s.classId && r.teachingDate === date && r.sessionType !== 'makeup')
        );
        const teacher = teachers.find(t => t.id === (s.teacherId || cls?.teacherId));
        const ta = assistants.find(a => a.id === (s.assistantId || cls?.assistantTeacherId));
        const base: LessonReport = existing
          ? { ...existing, id: reportId }
          : {
              id: reportId,
              classId: s.classId,
              className: cls?.name || s.className,
              teachingDate: date,
              scheduledTime: `${s.startTime} - ${s.endTime}`,
              classroom: s.classroom || cls?.classroom || 'Phòng học',
              teacherId: s.teacherId || cls?.teacherId || '',
              teacherName: teacher?.fullName || s.teacherName || 'Giáo viên',
              teachingAssistantName: ta?.fullName || s.assistantName || '',
              lessonProgress: cls?.curriculum || '',
              sessionType: 'regular',
              status: 'not_started',
              totalStudents: 0,
              completedStudents: 0,
              completionPercentage: 0,
              locked: false,
              deadlineAt: computeReportDeadlineISO(date),
              studentReports: []
            };
        const entries = buildStudentEntriesForClass(s.classId, base.studentReports);
        reportsByKey.set(reportId, computeReportMetrics(base, entries));
      });

    // 2. Classes scheduled via weeklySchedule or legacy scheduleDays (if not already in timetable)
    classes.forEach(cls => {
      if (cls.status === 'cancelled') return;
      const reportId = `LR-${cls.id}-${date}`;
      if (reportsByKey.has(reportId)) return;

      const weeklySlot = cls.weeklySchedule?.find(w => w.dayOfWeek === dayOfWeek);
      const parsedSlots = weeklySlot ? [] : getClassWeeklySchedule(cls);
      const legacySlot = parsedSlots.find(s => s.dayOfWeek === dayOfWeek);

      if (!weeklySlot && !legacySlot) return;

      const existing = storedReports.find(
        r => r.id === reportId || (r.classId === cls.id && r.teachingDate === date && r.sessionType !== 'makeup')
      );
      const effTeacherId = weeklySlot?.teacherId || cls.teacherId || '';
      const effTaId = weeklySlot?.assistantTeacherId || cls.assistantTeacherId || '';
      const teacher = teachers.find(t => t.id === effTeacherId);
      const ta = assistants.find(a => a.id === effTaId);
      const scheduledTime = weeklySlot
        ? `${weeklySlot.startTime} - ${weeklySlot.endTime}`
        : legacySlot?.timeRange || cls.scheduleTime || '';

      const base: LessonReport = existing
        ? { ...existing, id: reportId }
        : {
            id: reportId,
            classId: cls.id,
            className: cls.name,
            teachingDate: date,
            scheduledTime,
            classroom: cls.classroom || 'Phòng học',
            teacherId: effTeacherId,
            teacherName: teacher?.fullName || 'Chưa phân công GV',
            teachingAssistantName: ta?.fullName || '',
            lessonProgress: cls.curriculum || '',
            sessionType: 'regular',
            status: 'not_started',
            totalStudents: 0,
            completedStudents: 0,
            completionPercentage: 0,
            locked: false,
            deadlineAt: computeReportDeadlineISO(date),
            studentReports: []
          };
      const entries = buildStudentEntriesForClass(cls.id, base.studentReports);
      reportsByKey.set(reportId, computeReportMetrics(base, entries));
    });

    // 3. Make-up sessions for this date
    makeupSessions
      .filter(m => m.date === date)
      .forEach(m => {
        const reportId = `LR-MAKEUP-${m.id}`;
        const existing = storedReports.find(r => r.id === reportId);
        const base: LessonReport = existing
          ? { ...existing, id: reportId }
          : {
              id: reportId,
              classId: m.classId,
              className: m.className,
              teachingDate: date,
              scheduledTime: m.time,
              classroom: m.classroom,
              teacherId: m.teacherId,
              teacherName: m.teacherName,
              teachingAssistantName: m.assistantName || '',
              lessonProgress: m.lessonProgress,
              sessionType: 'makeup',
              status: 'not_started',
              totalStudents: 0,
              completedStudents: 0,
              completionPercentage: 0,
              locked: false,
              deadlineAt: computeReportDeadlineISO(date),
              studentReports: []
            };
        const entries = buildStudentEntriesForClass(m.classId, base.studentReports);
        reportsByKey.set(reportId, computeReportMetrics(base, entries));
      });

    return Array.from(reportsByKey.values());
  };

  const saveLessonReport = (report: LessonReport) => {
    // 1. Authoritative Lock & Expiration check from persistent state
    const prevReports = Array.isArray(data.lessonReports) ? data.lessonReports : [];
    const currentStored = prevReports.find(
      r => r.id === report.id || (r.classId === report.classId && r.teachingDate === report.teachingDate && r.sessionType === report.sessionType)
    );

    const isCurrentlyLocked = currentStored ? Boolean(currentStored.locked) : Boolean(report.locked);
    const isUnlockedAfterExp = currentStored ? Boolean(currentStored.unlockedAfterExpiration) : Boolean(report.unlockedAfterExpiration);
    const originalDeadline = currentStored?.deadlineAt || report.deadlineAt || computeReportDeadlineISO(report.teachingDate);
    const expired = isReportExpired({ teachingDate: report.teachingDate, deadlineAt: originalDeadline }) && !isUnlockedAfterExp;

    if (currentUser.role === 'teacher' && (isCurrentlyLocked || expired)) {
      return {
        success: false,
        error: isCurrentlyLocked
          ? 'Báo cáo đã được khóa. Bạn không thể chỉnh sửa báo cáo này.'
          : 'Báo cáo đã quá hạn chỉnh sửa (17:00 ngày hôm sau).'
      };
    }

    const nowFormatted = getVietnamNowFormatted();
    const cleanedEntries = (report.studentReports || []).map(entry => ({
      ...entry,
      completed: isStudentReportEntryComplete(entry)
    }));

    const canonicalId = report.id || `LR-${report.classId}-${report.teachingDate}`;
    const updatedReport = computeReportMetrics(
      {
        ...report,
        id: canonicalId,
        locked: isCurrentlyLocked,
        lockedAt: currentStored?.lockedAt || report.lockedAt,
        lockedBy: currentStored?.lockedBy || report.lockedBy,
        unlockedAfterExpiration: isUnlockedAfterExp,
        submittedAt: currentStored?.submittedAt || report.submittedAt,
        submittedBy: currentStored?.submittedBy || report.submittedBy,
        lastEditedById: currentUser.id,
        lastEditedByUsername: currentUser.email,
        lastEditedByName: currentUser.name,
        lastEditedAt: nowFormatted
      },
      cleanedEntries
    );

    setData(prev => {
      const pReports = Array.isArray(prev.lessonReports) ? prev.lessonReports : [];
      const exists = pReports.some(
        r => r.id === updatedReport.id || (r.classId === updatedReport.classId && r.teachingDate === updatedReport.teachingDate && r.sessionType === updatedReport.sessionType)
      );
      const nextReports = exists
        ? pReports.map(r =>
            r.id === updatedReport.id || (r.classId === updatedReport.classId && r.teachingDate === updatedReport.teachingDate && r.sessionType === updatedReport.sessionType)
              ? updatedReport
              : r
          )
        : [updatedReport, ...pReports];

      const nextData = {
        ...prev,
        lessonReports: nextReports
      };
      saveStorage(nextData);
      saveCenterDataToGoogleAppsScript(
        { lessonReports: nextReports },
        ['lessonReports']
      ).catch(e => console.warn('Background sync error on saveLessonReport:', e));
      return nextData;
    });

    addActivityLog('Lưu báo cáo học tập', `Đã lưu Lesson Report lớp ${updatedReport.className} ngày ${updatedReport.teachingDate}`);
    return { success: true, report: updatedReport };
  };

  const submitLessonReport = (reportIdOrReport: string | LessonReport) => {
    const targetId = typeof reportIdOrReport === 'string' ? reportIdOrReport : reportIdOrReport.id;
    const prevReports = Array.isArray(data.lessonReports) ? data.lessonReports : [];
    const currentStored = prevReports.find(
      r =>
        r.id === targetId ||
        (typeof reportIdOrReport !== 'string' &&
          r.classId === reportIdOrReport.classId &&
          r.teachingDate === reportIdOrReport.teachingDate &&
          r.sessionType === reportIdOrReport.sessionType)
    );
    const baseReport = typeof reportIdOrReport === 'string' ? currentStored : reportIdOrReport;

    if (!baseReport) {
      return { success: false, error: 'Không tìm thấy báo cáo để nộp.' };
    }

    const isCurrentlyLocked = currentStored ? Boolean(currentStored.locked) : Boolean(baseReport.locked);
    const isUnlockedAfterExp = currentStored ? Boolean(currentStored.unlockedAfterExpiration) : Boolean(baseReport.unlockedAfterExpiration);
    const originalDeadline = currentStored?.deadlineAt || baseReport.deadlineAt || computeReportDeadlineISO(baseReport.teachingDate);
    const expired = isReportExpired({ teachingDate: baseReport.teachingDate, deadlineAt: originalDeadline }) && !isUnlockedAfterExp;

    if (currentUser.role === 'teacher' && (isCurrentlyLocked || expired)) {
      return {
        success: false,
        error: isCurrentlyLocked
          ? 'Báo cáo đã được khóa. Bạn không thể chỉnh sửa báo cáo này.'
          : 'Báo cáo đã quá hạn nộp (17:00 ngày hôm sau).'
      };
    }

    const cleanedEntries = (baseReport.studentReports || []).map(entry => ({
      ...entry,
      completed: isStudentReportEntryComplete(entry)
    }));

    const incompleteCount = cleanedEntries.filter(e => !e.completed).length;
    if (cleanedEntries.length === 0 || incompleteCount > 0) {
      return {
        success: false,
        error: `Còn ${incompleteCount} học viên chưa nhập đủ trạng thái BTVN, bài cũ và nhận xét.`
      };
    }

    const nowFormatted = getVietnamNowFormatted();
    const canonicalId = baseReport.id || `LR-${baseReport.classId}-${baseReport.teachingDate}`;
    const submittedReport = computeReportMetrics(
      {
        ...baseReport,
        id: canonicalId,
        locked: isCurrentlyLocked,
        lockedAt: currentStored?.lockedAt || baseReport.lockedAt,
        lockedBy: currentStored?.lockedBy || baseReport.lockedBy,
        unlockedAfterExpiration: isUnlockedAfterExp,
        submittedAt: nowFormatted,
        submittedBy: currentUser.name,
        lastEditedById: currentUser.id,
        lastEditedByUsername: currentUser.email,
        lastEditedByName: currentUser.name,
        lastEditedAt: nowFormatted
      },
      cleanedEntries,
      true
    );

    setData(prev => {
      const pReports = Array.isArray(prev.lessonReports) ? prev.lessonReports : [];
      const exists = pReports.some(
        r => r.id === submittedReport.id || (r.classId === submittedReport.classId && r.teachingDate === submittedReport.teachingDate && r.sessionType === submittedReport.sessionType)
      );
      const nextReports = exists
        ? pReports.map(r =>
            r.id === submittedReport.id || (r.classId === submittedReport.classId && r.teachingDate === submittedReport.teachingDate && r.sessionType === submittedReport.sessionType)
              ? submittedReport
              : r
          )
        : [submittedReport, ...pReports];

      const prevIncomplete = Array.isArray(prev.incompleteReports) ? prev.incompleteReports : [];
      const nextIncomplete = prevIncomplete.map(inc =>
        inc.reportId === submittedReport.id ? { ...inc, status: 'resolved' as const } : inc
      );

      const nextData = {
        ...prev,
        lessonReports: nextReports,
        incompleteReports: nextIncomplete
      };
      saveStorage(nextData);
      saveCenterDataToGoogleAppsScript(
        { lessonReports: nextReports, incompleteReports: nextIncomplete },
        ['lessonReports', 'incompleteReports']
      ).catch(e => console.warn('Background sync error on submitLessonReport:', e));
      return nextData;
    });

    addActivityLog('Nộp Lesson Report', `Đã nộp báo cáo lớp ${submittedReport.className} ngày ${submittedReport.teachingDate}`);
    return { success: true, report: submittedReport };
  };

  const toggleReportLock = (
    reportId: string,
    locked: boolean,
    reason?: string,
    reportSnapshot?: LessonReport
  ) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'academic_manager') {
      return { success: false, error: 'Chỉ Admin hoặc Quản lý học thuật mới có quyền khóa/mở khóa báo cáo.' };
    }

    const prevReports = Array.isArray(data.lessonReports) ? data.lessonReports : [];
    const existing = prevReports.find(r => r.id === reportId) || reportSnapshot;
    if (!existing) {
      return { success: false, error: 'Không tìm thấy báo cáo.' };
    }

    const nowFormatted = getVietnamNowFormatted();
    const nowIso = new Date().toISOString();
    const originalDeadlineAt = existing.deadlineAt || computeReportDeadlineISO(existing.teachingDate);
    const wasExpired = isReportExpired({ teachingDate: existing.teachingDate, deadlineAt: originalDeadlineAt });

    const updatedReport: LessonReport = {
      ...existing,
      deadlineAt: originalDeadlineAt,
      locked,
      lockedAt: locked ? nowFormatted : existing.lockedAt,
      lockedBy: locked ? currentUser.name : existing.lockedBy,
      unlockedAfterExpiration: !locked && wasExpired ? true : locked ? false : existing.unlockedAfterExpiration
    };

    const auditEntry: LessonReportLockAuditEntry = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reportId: updatedReport.id,
      classId: updatedReport.classId,
      className: updatedReport.className,
      teachingDate: updatedReport.teachingDate,
      action: locked ? 'LOCK' : 'UNLOCK',
      actorUserId: currentUser.id,
      actorUsername: currentUser.email,
      actorName: currentUser.name,
      timestamp: nowFormatted,
      timestampIso: nowIso,
      reason: reason?.trim() || undefined,
      originalDeadlineAt
    };

    setData(prev => {
      const pReports = Array.isArray(prev.lessonReports) ? prev.lessonReports : [];
      const exists = pReports.some(
        r => r.id === updatedReport.id || (r.classId === updatedReport.classId && r.teachingDate === updatedReport.teachingDate && r.sessionType === updatedReport.sessionType)
      );
      const nextReports = exists
        ? pReports.map(r =>
            r.id === updatedReport.id || (r.classId === updatedReport.classId && r.teachingDate === updatedReport.teachingDate && r.sessionType === updatedReport.sessionType)
              ? updatedReport
              : r
          )
        : [updatedReport, ...pReports];

      const prevAudits = Array.isArray(prev.lessonReportLockAudits) ? prev.lessonReportLockAudits : [];
      const nextAudits = [auditEntry, ...prevAudits];

      let nextIncomplete = Array.isArray(prev.incompleteReports) ? [...prev.incompleteReports] : [];
      if (locked && updatedReport.completionPercentage < 100) {
        const missingCount = updatedReport.totalStudents - updatedReport.completedStudents;
        const missingNames = updatedReport.studentReports
          .filter(s => !isStudentReportEntryComplete(s))
          .map(s => s.studentName)
          .slice(0, 3)
          .join(', ');
        const incRecord: IncompleteReportRecord = {
          id: `INC-${Date.now()}`,
          reportId: updatedReport.id,
          classId: updatedReport.classId,
          className: updatedReport.className,
          teachingDate: updatedReport.teachingDate,
          teacherName: updatedReport.lastEditedByName || updatedReport.teacherName,
          completionPercentage: updatedReport.completionPercentage,
          incompleteStudentCount: missingCount,
          missingFields: missingNames ? `Thiếu nhận xét: ${missingNames}${missingCount > 3 ? '...' : ''}` : 'Chưa hoàn thành nhận xét',
          lockedAt: nowFormatted,
          lockedBy: currentUser.name,
          status: 'pending'
        };
        const alreadyLogged = nextIncomplete.some(
          i => i.reportId === updatedReport.id && i.status === 'pending'
        );
        if (!alreadyLogged) {
          nextIncomplete = [incRecord, ...nextIncomplete];
        }
      }

      const nextData = {
        ...prev,
        lessonReports: nextReports,
        lessonReportLockAudits: nextAudits,
        incompleteReports: nextIncomplete
      };
      saveStorage(nextData);
      saveCenterDataToGoogleAppsScript(
        {
          lessonReports: nextReports,
          lessonReportLockAudits: nextAudits,
          incompleteReports: nextIncomplete
        },
        ['lessonReports', 'lessonReportLockAudits', 'incompleteReports']
      ).catch(e => console.warn('Background sync error on toggleReportLock:', e));
      return nextData;
    });

    addActivityLog(
      locked ? 'Khóa Lesson Report' : 'Mở khóa Lesson Report',
      `${locked ? 'LOCK' : 'UNLOCK'} lớp ${updatedReport.className} (${updatedReport.teachingDate})`
    );
    return { success: true };
  };

  const addMakeupClass = (session: Omit<MakeupClassSession, 'id'>) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'academic_manager') {
      return { success: false, error: 'Không có quyền thêm lớp học bù.' };
    }
    const newSession: MakeupClassSession = {
      ...session,
      id: `MK-${Date.now().toString().slice(-6)}`
    };
    setData(prev => {
      const nextMakeup = [newSession, ...(prev.makeupSessions || [])];
      const nextData = {
        ...prev,
        makeupSessions: nextMakeup
      };
      saveStorage(nextData);
      saveCenterDataToGoogleAppsScript({ makeupSessions: nextMakeup }, ['makeupSessions']).catch(e =>
        console.warn('Background sync error on addMakeupClass:', e)
      );
      return nextData;
    });
    addActivityLog('Bổ sung lớp học bù', `Đã thêm lịch học bù lớp ${session.className} ngày ${session.date}`);
    return { success: true };
  };

  const deleteMakeupClass = (makeupId: string) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'academic_manager') {
      return { success: false, error: 'Không có quyền xóa lớp học bù.' };
    }
    setData(prev => {
      const nextMakeup = (prev.makeupSessions || []).filter(m => m.id !== makeupId);
      const nextData = {
        ...prev,
        makeupSessions: nextMakeup
      };
      saveStorage(nextData);
      saveCenterDataToGoogleAppsScript({ makeupSessions: nextMakeup }, ['makeupSessions']).catch(e =>
        console.warn('Background sync error on deleteMakeupClass:', e)
      );
      return nextData;
    });
    return { success: true };
  };

  const resolveIncompleteReport = (incompleteId: string) => {
    setData(prev => ({
      ...prev,
      incompleteReports: (prev.incompleteReports || []).map(inc =>
        inc.id === incompleteId ? { ...inc, status: 'resolved' } : inc
      )
    }));
    queueKeysForCloudSync(['incompleteReports']);
  };

  // 13. Settings & Reset
  const updateSettings = (updates: Partial<CenterSettings>) => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
    addActivityLog('Cài đặt hệ thống', 'Đã cập nhật thông tin cấu hình trung tâm');
    queueKeysForCloudSync(['settings']);
  };

  const resetAllData = () => {
    const refreshed = resetStorage();
    setData(refreshed);
    addActivityLog('Khôi phục dữ liệu', 'Đã khôi phục toàn bộ hệ thống về bộ dữ liệu mẫu ban đầu');
  };

  const restoreFromBackup = (backupStore: AppDataStore): { success: boolean; message?: string } => {
    try {
      setData(backupStore);
      saveStorage(backupStore);
      addActivityLog('Khôi phục sao lưu', 'Đã phục hồi dữ liệu từ file sao lưu JSON an toàn');
      return { success: true, message: 'Đã phục hồi dữ liệu thành công từ file sao lưu.' };
    } catch (err: any) {
      return { success: false, message: `Lỗi phục hồi: ${err.message || 'Không thể lưu dữ liệu'}` };
    }
  };

  const handleResolveConflict = (
    conflict: RecordConflict,
    resolution: 'keep_local' | 'keep_cloud' | 'custom',
    customRecord?: any
  ) => {
    setData(prev => {
      const updated = resolveConflictUtil(prev, conflict, resolution, customRecord);
      return updated;
    });
    setConflicts(prev =>
      prev.filter(c => !(c.category === conflict.category && c.recordId === conflict.recordId))
    );
    addActivityLog(
      'Giải quyết xung đột',
      `Đã giải quyết xung đột bản ghi ${conflict.recordTitle} (${resolution})`
    );
    if (conflict.category && (conflict.category in data)) {
      queueKeysForCloudSync([conflict.category as keyof AppDataStore]);
    }
  };

  return (
    <DataContext.Provider
      value={{
        data,
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
        addAcademicManager,
        updateAcademicManager,
        deleteAcademicManager,
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
        restoreFromBackup,
        addActivityLog,
        refreshData,
        isSyncing,
        lastSyncTime,
        conflicts,
        resolveConflict: handleResolveConflict,
        getLessonReportsForDate,
        saveLessonReport,
        submitLessonReport,
        toggleReportLock,
        addMakeupClass,
        deleteMakeupClass,
        resolveIncompleteReport
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
