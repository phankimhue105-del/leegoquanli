import React, { createContext, useContext, useState, useEffect } from 'react';
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
  TeachingSession,
  LessonReport,
  StudentLessonReportEntry,
  IncompleteReportRecord,
  MakeupClassSession,
  DurationMode,
  CourseStatus,
  HolidayType,
  ExtensionPolicy,
  CourseDurationRecord,
  CourseHoliday,
  CourseMakeupSession,
  CourseDurationHistoryEntry,
  CourseCalculationResult
} from '../types';
import { loadInitialStorage, saveStorage, resetStorage, AppDataStore } from '../services/dataService';
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

  // Lesson Reports & Make-up Classes
  getLessonReportsForDate: (dateStr: string) => LessonReport[];
  saveLessonReport: (report: LessonReport) => { success: boolean; report?: LessonReport; error?: string };
  submitLessonReport: (reportId: string) => { success: boolean; error?: string };
  toggleReportLock: (reportId: string, lock: boolean) => { success: boolean; error?: string };
  addMakeupClass: (session: Omit<MakeupClassSession, 'id' | 'createdAt' | 'createdBy'>) => { success: boolean; session?: MakeupClassSession; error?: string };
  deleteMakeupClass: (id: string) => { success: boolean; error?: string };
  resolveIncompleteReport: (reportId: string) => void;

  // Course Duration Manager
  calculateCourseCompletionDate: (input: {
    startDate: string;
    durationMode: DurationMode;
    durationValue: number;
    classId?: string;
    extensionPolicy: ExtensionPolicy;
    customHolidays?: CourseHoliday[];
    customMakeups?: CourseMakeupSession[];
  }) => CourseCalculationResult;
  addCourseDuration: (course: Omit<CourseDurationRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'remainingSessions'>) => { success: boolean; course?: CourseDurationRecord; error?: string };
  updateCourseDuration: (id: string, updates: Partial<CourseDurationRecord>, reason?: string) => { success: boolean; error?: string };
  deleteCourseDuration: (id: string) => { success: boolean; error?: string };
  recalculateCourseDates: (id: string, customReason?: string) => { success: boolean; updatedDate?: string; error?: string };
  recalculateAllCourses: () => { success: boolean; updatedCount: number };
  addCourseHoliday: (holiday: Omit<CourseHoliday, 'id' | 'createdAt' | 'createdBy'>) => { success: boolean; holiday?: CourseHoliday; error?: string };
  updateCourseHoliday: (id: string, updates: Partial<CourseHoliday>) => { success: boolean; error?: string };
  deleteCourseHoliday: (id: string) => { success: boolean; error?: string };
  addCourseMakeup: (makeup: Omit<CourseMakeupSession, 'id' | 'createdAt' | 'createdBy'>) => { success: boolean; makeup?: CourseMakeupSession; error?: string };
  updateCourseMakeup: (id: string, updates: Partial<CourseMakeupSession>) => { success: boolean; error?: string };
  deleteCourseMakeup: (id: string) => { success: boolean; error?: string };
  getCourseHistory: (courseDurationId: string) => CourseDurationHistoryEntry[];


  // Settings & System
  updateSettings: (settings: Partial<CenterSettings>) => void;
  resetAllData: () => void;
  addActivityLog: (action: string, details: string) => void;
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
  const { currentUser, hasPermission } = useAuth();

  useEffect(() => {
    saveStorage(data);
  }, [data]);

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
    return newParent;
  };

  const updateParent = (id: string, updates: Partial<Parent>) => {
    setData(prev => ({
      ...prev,
      parents: prev.parents.map(p => (p.id === id ? { ...p, ...updates } : p))
    }));
  };

  // 3. Classes
  const addClass = (clsData: Omit<ClassItem, 'id'>): ClassItem => {
    const newId = `CLS-${Date.now().toString().slice(-4)}`;
    const newClass: ClassItem = { ...clsData, id: newId };
    setData(prev => {
      // also update teacher's assignedClassIds
      const updatedTeachers = prev.teachers.map(t => {
        if (t.id === newClass.teacherId && !t.assignedClassIds.includes(newId)) {
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
    return newClass;
  };

  const updateClass = (id: string, updates: Partial<ClassItem>) => {
    setData(prev => {
      const updatedClasses = prev.classes.map(c => (c.id === id ? { ...c, ...updates } : c));
      return {
        ...prev,
        classes: updatedClasses
      };
    });
    addActivityLog('Cập nhật lớp học', `Đã cập nhật thông tin lớp học mã ${id}`);
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
    return newTeacher;
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    setData(prev => ({
      ...prev,
      teachers: prev.teachers.map(t => (t.id === id ? { ...t, ...updates } : t))
    }));
    addActivityLog('Cập nhật giáo viên', `Đã cập nhật hồ sơ giáo viên ${id}`);
  };

  const deleteTeacher = (id: string) => {
    const t = data.teachers.find(tch => tch.id === id);
    setData(prev => ({
      ...prev,
      teachers: prev.teachers.filter(teacher => teacher.id !== id),
      classes: prev.classes.map(cls => (cls.teacherId === id ? { ...cls, teacherId: '' } : cls))
    }));
    addActivityLog('Xóa giáo viên', `Đã xóa giáo viên ${t?.fullName || id}`);
  };

  const addAssistant = (taData: Omit<TeachingAssistant, 'id'>): TeachingAssistant => {
    const newId = `TA-${String(data.teachingAssistants.length + 1).padStart(3, '0')}`;
    const newAssistant: TeachingAssistant = { ...taData, id: newId };
    setData(prev => ({
      ...prev,
      teachingAssistants: [...prev.teachingAssistants, newAssistant]
    }));
    addActivityLog('Thêm trợ giảng', `Đã thêm trợ giảng ${newAssistant.fullName}`);
    return newAssistant;
  };

  const updateAssistant = (id: string, updates: Partial<TeachingAssistant>) => {
    setData(prev => ({
      ...prev,
      teachingAssistants: prev.teachingAssistants.map(a => (a.id === id ? { ...a, ...updates } : a))
    }));
  };

  const deleteAssistant = (id: string) => {
    setData(prev => ({
      ...prev,
      teachingAssistants: prev.teachingAssistants.filter(a => a.id !== id)
    }));
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
    return newProgram;
  };

  const updateProgram = (id: string, updates: Partial<AcademicProgram>) => {
    setData(prev => ({
      ...prev,
      programs: prev.programs.map(p => (p.id === id ? { ...p, ...updates } : p))
    }));
  };

  const deleteProgram = (id: string) => {
    setData(prev => ({
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

    setData(prev => ({
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
    return { success: true };
  };

  const deleteTimetableSession = (id: string) => {
    setData(prev => ({
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
    return newRecord;
  };

  const updateAssessmentScore = (assessmentId: string, studentScores: StudentScoreEntry[]) => {
    setData(prev => ({
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

    setData(prev => ({
      ...prev,
      lessonPlans: [newPlan, ...prev.lessonPlans]
    }));

    addActivityLog('Nộp báo cáo buổi dạy', `Giáo viên ${newPlan.teacherName} nộp báo cáo bài số ${newPlan.lessonNumber} cho lớp ${newPlan.className}`);
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
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u => (u.id === id ? { ...u, ...updates } : u))
    }));
    addActivityLog('Cập nhật tài khoản', `Đã cập nhật tài khoản ${id}`);
  };

  const toggleUserStatus = (id: string) => {
    setData(prev => ({
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

  // 12. Lesson Reports & Make-up Classes Management
  const getLessonReportsForDate = (dateStr: string): LessonReport[] => {
    const targetDate = new Date(dateStr);
    const jsDay = targetDate.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    const ttDay = jsDay === 0 ? 7 : jsDay;

    // A. Classes scheduled on this weekday from timetable
    const regularTimetables = data.timetable.filter(t => t.dayOfWeek === ttDay);
    
    // B. Classes scheduled on this weekday based on scheduleDays if no timetable session
    const regularClasses = data.classes.filter(c => {
      // Check start & end date
      if (c.startDate && dateStr < c.startDate) return false;
      if (c.endDate && dateStr > c.endDate) return false;
      if (c.status !== 'ongoing' && c.status !== 'upcoming') return false;

      // Has timetable entry
      if (regularTimetables.some(t => t.classId === c.id)) return true;

      // Or parse scheduleDays
      const lower = (c.scheduleDays || '').toLowerCase();
      if (ttDay === 1 && (lower.includes('thứ 2') || lower.includes('t2') || lower.includes('monday') || lower.includes('mon'))) return true;
      if (ttDay === 2 && (lower.includes('thứ 3') || lower.includes('t3') || lower.includes('tuesday') || lower.includes('tue'))) return true;
      if (ttDay === 3 && (lower.includes('thứ 4') || lower.includes('t4') || lower.includes('wednesday') || lower.includes('wed'))) return true;
      if (ttDay === 4 && (lower.includes('thứ 5') || lower.includes('t5') || lower.includes('thursday') || lower.includes('thu'))) return true;
      if (ttDay === 5 && (lower.includes('thứ 6') || lower.includes('t6') || lower.includes('friday') || lower.includes('fri'))) return true;
      if (ttDay === 6 && (lower.includes('thứ 7') || lower.includes('t7') || lower.includes('saturday') || lower.includes('sat'))) return true;
      if (ttDay === 7 && (lower.includes('chủ nhật') || lower.includes('cn') || lower.includes('sunday') || lower.includes('sun'))) return true;
      return false;
    });

    // C. Make-up classes scheduled on this specific date
    const dateMakeups = (data.makeupSessions || []).filter(m => m.date === dateStr);

    const reports: LessonReport[] = [];

    // Helper to generate blank student report entries for a class
    const generateStudentEntries = (classItem: ClassItem): StudentLessonReportEntry[] => {
      const classStudents = data.students.filter(s => classItem.studentIds.includes(s.id));
      return classStudents.map(stu => ({
        studentId: stu.id,
        studentName: stu.vietnameseName ? `${stu.fullName} (${stu.vietnameseName})` : stu.fullName,
        homeworkStatus: 'Đạt',
        previousLessonStatus: 'Đạt',
        comments: '',
        assignedHomework: '',
        notes: '',
        completed: false
      }));
    };

    // Process Regular Classes
    regularClasses.forEach(cls => {
      const existing = (data.lessonReports || []).find(r => r.classId === cls.id && r.teachingDate === dateStr && r.sessionType !== 'makeup');
      if (existing) {
        reports.push(existing);
      } else {
        const tt = regularTimetables.find(t => t.classId === cls.id);
        const teacher = data.teachers.find(t => t.id === (tt?.teacherId || cls.teacherId));
        const assistant = data.teachingAssistants.find(ta => ta.id === (tt?.assistantId || cls.assistantTeacherId));
        const students = generateStudentEntries(cls);

        const newReport: LessonReport = {
          id: `LR-${cls.id}-${dateStr}`,
          classId: cls.id,
          className: cls.name,
          teachingDate: dateStr,
          timetableSessionId: tt?.id,
          sessionType: 'regular',
          teacherId: teacher?.id || cls.teacherId || '',
          teacherName: teacher?.vietnameseName || teacher?.fullName || 'Giáo viên',
          teachingAssistantId: assistant?.id || cls.assistantTeacherId,
          teachingAssistantName: assistant?.fullName,
          scheduledTime: tt ? `${tt.startTime} – ${tt.endTime}` : (cls.scheduleTime || '17:30 – 19:00'),
          classroom: tt?.classroom || cls.classroom || 'Phòng 101',
          lessonProgress: 'Unit 1 – Lesson 1',
          status: 'not_started',
          locked: false,
          completionPercentage: 0,
          totalStudents: students.length,
          completedStudents: 0,
          studentReports: students,
          createdBy: 'Hệ thống tự động',
          createdAt: `${dateStr} 08:00`,
          updatedBy: 'Hệ thống tự động',
          updatedAt: `${dateStr} 08:00`
        };
        reports.push(newReport);
      }
    });

    // Process Make-up Classes
    dateMakeups.forEach(mk => {
      const existing = (data.lessonReports || []).find(r => r.id === `LR-MAKEUP-${mk.id}` || (r.classId === mk.classId && r.teachingDate === dateStr && r.sessionType === 'makeup'));
      if (existing) {
        reports.push(existing);
      } else {
        const cls = data.classes.find(c => c.id === mk.classId);
        const students = cls ? generateStudentEntries(cls) : [];

        const newMakeupReport: LessonReport = {
          id: `LR-MAKEUP-${mk.id}`,
          classId: mk.classId,
          className: `${mk.className} (HỌC BÙ)`,
          teachingDate: dateStr,
          sessionType: 'makeup',
          teacherId: mk.teacherId,
          teacherName: mk.teacherName,
          teachingAssistantId: mk.assistantId,
          teachingAssistantName: mk.assistantName,
          scheduledTime: mk.time,
          classroom: mk.classroom,
          lessonProgress: mk.lessonProgress || 'Buổi học bù',
          status: 'not_started',
          locked: false,
          completionPercentage: 0,
          totalStudents: students.length,
          completedStudents: 0,
          studentReports: students,
          createdBy: mk.createdBy,
          createdAt: `${dateStr} 08:00`,
          updatedBy: mk.createdBy,
          updatedAt: `${dateStr} 08:00`
        };
        reports.push(newMakeupReport);
      }
    });

    return reports;
  };

  const saveLessonReport = (
    report: LessonReport
  ): { success: boolean; report?: LessonReport; error?: string } => {
    // 1. Permission & Locking Enforcement
    const existing = (data.lessonReports || []).find(r => r.id === report.id);
    if (existing?.locked && currentUser.role === 'teacher') {
      return {
        success: false,
        error: 'BÁO CÁO ĐÃ KHÓA: Báo cáo này đã được Quản lý học thuật khóa sổ. Giáo viên không thể chỉnh sửa.'
      };
    }

    if (currentUser.role === 'teacher') {
      if (report.teacherId && currentUser.teacherId && report.teacherId !== currentUser.teacherId) {
        return {
          success: false,
          error: 'Bạn chỉ có quyền nhập báo cáo cho lớp học do mình phụ trách.'
        };
      }
    }

    // 2. Calculate completion stats accurately
    const completedStudents = report.studentReports.filter(s => {
      const hasHw = Boolean(s.homeworkStatus && s.homeworkStatus.trim());
      const hasPrev = Boolean(s.previousLessonStatus && s.previousLessonStatus.trim());
      const hasComm = Boolean(s.comments && s.comments.trim());
      return hasHw && hasPrev && hasComm;
    }).length;

    const totalStudents = report.studentReports.length;
    const completionPercentage = totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;
    
    // Status resolution
    let status: LessonReport['status'] = report.status;
    if (status !== 'submitted') {
      if (completedStudents === totalStudents && totalStudents > 0) {
        status = 'completed';
      } else if (completedStudents > 0) {
        status = 'in_progress';
      } else {
        status = 'not_started';
      }
    }

    const updatedReport: LessonReport = {
      ...report,
      completedStudents,
      totalStudents,
      completionPercentage,
      status,
      updatedBy: currentUser.name,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };

    // Update in storage
    setData(prev => {
      const idx = (prev.lessonReports || []).findIndex(r => r.id === updatedReport.id);
      let nextReports: LessonReport[];
      if (idx >= 0) {
        nextReports = [...prev.lessonReports];
        nextReports[idx] = updatedReport;
      } else {
        nextReports = [...(prev.lessonReports || []), updatedReport];
      }

      // Check if this report was marked incomplete and is now completed -> resolve incomplete record
      let nextIncompletes = prev.incompleteReports || [];
      if (updatedReport.status === 'completed' || updatedReport.completionPercentage === 100) {
        nextIncompletes = nextIncompletes.map(inc => {
          if (inc.reportId === updatedReport.id && inc.status === 'pending') {
            return {
              ...inc,
              status: 'resolved' as const,
              resolvedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
              resolvedBy: currentUser.name,
              completionPercentage: 100,
              incompleteStudentCount: 0
            };
          }
          return inc;
        });
      }

      return {
        ...prev,
        lessonReports: nextReports,
        incompleteReports: nextIncompletes
      };
    });

    addActivityLog('Lưu Báo cáo tình hình học tập', `Đã lưu báo cáo lớp ${report.className} ngày ${report.teachingDate} (${completedStudents}/${totalStudents} học sinh hoàn thành)`);
    return { success: true, report: updatedReport };
  };

  const submitLessonReport = (reportId: string): { success: boolean; error?: string } => {
    const report = (data.lessonReports || []).find(r => r.id === reportId);
    if (!report) return { success: false, error: 'Không tìm thấy báo cáo.' };

    if (report.locked && currentUser.role === 'teacher') {
      return { success: false, error: 'Báo cáo đã khóa, không thể nộp lại.' };
    }

    const updated: LessonReport = {
      ...report,
      status: 'submitted',
      updatedBy: currentUser.name,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };

    return saveLessonReport(updated);
  };

  const toggleReportLock = (reportId: string, lock: boolean): { success: boolean; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Chỉ Quản lý học thuật hoặc Admin mới có quyền khóa/mở khóa báo cáo.' };
    }

    let targetReport = (data.lessonReports || []).find(r => r.id === reportId);
    if (!targetReport) {
      // Find from date generation
      return { success: false, error: 'Báo cáo chưa được khởi tạo. Vui lòng mở báo cáo và lưu lại trước khi khóa.' };
    }

    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const updatedReport: LessonReport = {
      ...targetReport,
      locked: lock,
      lockedAt: lock ? nowStr : undefined,
      lockedBy: lock ? currentUser.name : undefined,
      updatedBy: currentUser.name,
      updatedAt: nowStr
    };

    setData(prev => {
      // 1. Update report lock status
      const repIdx = prev.lessonReports.findIndex(r => r.id === reportId);
      let nextReports = [...prev.lessonReports];
      if (repIdx >= 0) {
        nextReports[repIdx] = updatedReport;
      } else {
        nextReports.push(updatedReport);
      }

      // 2. CRITICAL FEATURE: AUTOMATIC INCOMPLETE REPORT TRACKING
      let nextIncompletes = [...(prev.incompleteReports || [])];

      if (lock) {
        // If report is incomplete when locked, automatically generate permanent incomplete tracking record
        const isIncomplete = updatedReport.completedStudents < updatedReport.totalStudents || updatedReport.status !== 'completed';
        if (isIncomplete) {
          const missingCount = updatedReport.totalStudents - updatedReport.completedStudents;
          const missingStudents = updatedReport.studentReports
            .filter(s => !s.completed)
            .map(s => s.studentName)
            .slice(0, 3)
            .join(', ');
          
          const missingDesc = `${missingCount} học sinh chưa hoàn thành (${missingStudents}${missingCount > 3 ? '...' : ''})`;

          // Avoid duplicate pending record for same report
          const existingPendingIdx = nextIncompletes.findIndex(i => i.reportId === updatedReport.id && i.status === 'pending');
          const incRecord: IncompleteReportRecord = {
            id: `INC-${Date.now()}`,
            teacherId: updatedReport.teacherId,
            teacherName: updatedReport.teacherName,
            classId: updatedReport.classId,
            className: updatedReport.className,
            teachingDate: updatedReport.teachingDate,
            scheduledTime: updatedReport.scheduledTime,
            reportId: updatedReport.id,
            completionPercentage: updatedReport.completionPercentage,
            incompleteStudentCount: missingCount,
            missingFields: missingDesc,
            lockedAt: nowStr,
            lockedBy: currentUser.name,
            status: 'pending'
          };

          if (existingPendingIdx >= 0) {
            nextIncompletes[existingPendingIdx] = incRecord;
          } else {
            nextIncompletes.unshift(incRecord);
          }
        }
      }

      return {
        ...prev,
        lessonReports: nextReports,
        incompleteReports: nextIncompletes
      };
    });

    const actionText = lock ? 'Khóa sổ' : 'Mở khóa';
    addActivityLog(`${actionText} Báo cáo học tập`, `Đã ${actionText.toLowerCase()} báo cáo lớp ${targetReport.className} ngày ${targetReport.teachingDate}`);
    return { success: true };
  };

  const addMakeupClass = (
    session: Omit<MakeupClassSession, 'id' | 'createdAt' | 'createdBy'>
  ): { success: boolean; session?: MakeupClassSession; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Chỉ Quản lý học thuật hoặc Admin mới có quyền thêm lớp học bù.' };
    }

    const newMakeup: MakeupClassSession = {
      ...session,
      id: `MK-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdBy: currentUser.name
    };

    setData(prev => ({
      ...prev,
      makeupSessions: [newMakeup, ...(prev.makeupSessions || [])]
    }));

    addActivityLog('Bổ sung lớp học bù', `Đã thêm lớp học bù cho ${session.className} ngày ${session.date} (${session.time})`);
    return { success: true, session: newMakeup };
  };

  const deleteMakeupClass = (id: string): { success: boolean; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Chỉ Quản lý học thuật hoặc Admin mới có quyền xóa lớp học bù.' };
    }

    const target = (data.makeupSessions || []).find(m => m.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy lớp học bù.' };

    setData(prev => ({
      ...prev,
      makeupSessions: (prev.makeupSessions || []).filter(m => m.id !== id),
      lessonReports: (prev.lessonReports || []).filter(r => r.id !== `LR-MAKEUP-${id}`)
    }));

    addActivityLog('Xóa lớp học bù', `Đã xóa lớp học bù của ${target.className} ngày ${target.date}`);
    return { success: true };
  };

  const resolveIncompleteReport = (reportId: string): void => {
    setData(prev => ({
      ...prev,
      incompleteReports: (prev.incompleteReports || []).map(inc => {
        if (inc.reportId === reportId && inc.status === 'pending') {
          return {
            ...inc,
            status: 'resolved',
            resolvedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            resolvedBy: currentUser.name
          };
        }
        return inc;
      })
    }));
  };

  // 13. Settings & Reset
  const updateSettings = (updates: Partial<CenterSettings>) => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
    addActivityLog('Cài đặt hệ thống', 'Đã cập nhật thông tin cấu hình trung tâm');
  };

  const resetAllData = () => {
    const refreshed = resetStorage();
    setData(refreshed);
    addActivityLog('Khôi phục dữ liệu', 'Đã khôi phục toàn bộ hệ thống về bộ dữ liệu mẫu ban đầu');
  };

  // ==========================================
  // 14. COURSE DURATION MANAGER ENGINE & ACTIONS
  // ==========================================

  const calculateCourseCompletionDate = (input: {
    startDate: string;
    durationMode: DurationMode;
    durationValue: number;
    classId?: string;
    extensionPolicy: ExtensionPolicy;
    customHolidays?: CourseHoliday[];
    customMakeups?: CourseMakeupSession[];
  }): CourseCalculationResult => {
    const {
      startDate,
      durationMode,
      durationValue,
      classId,
      extensionPolicy,
      customHolidays,
      customMakeups,
    } = input;

    const holidays = customHolidays || data.courseHolidays || [];
    const makeups = customMakeups || data.courseMakeups || [];
    const activeHolidays = holidays.filter(h => h.affectsScheduledLessons !== false);

    const formatDate = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const addMonthsClamped = (dateStr: string, months: number): string => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const targetMonthIndex = (m - 1) + months;
      const targetYear = y + Math.floor(targetMonthIndex / 12);
      const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
      const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const clampedDay = Math.min(d, daysInTargetMonth);
      const mm = String(normalizedMonth + 1).padStart(2, '0');
      const dd = String(clampedDay).padStart(2, '0');
      return `${targetYear}-${mm}-${dd}`;
    };

    // MODE 1: CALENDAR MONTHS
    if (durationMode === 'months') {
      const baseCompletionDate = addMonthsClamped(startDate, durationValue);
      let finalDate = baseCompletionDate;
      let holidaysEncountered = 0;
      let compensatedCount = 0;
      const breakdownDates: CourseCalculationResult['breakdownDates'] = [];

      if (extensionPolicy === 'scheduled_holidays' || extensionPolicy === 'all_non_study_days') {
        const classTimetables = data.timetable.filter(t => t.classId === classId);
        const scheduledDays = classTimetables.length > 0 
          ? Array.from(new Set(classTimetables.map(t => t.dayOfWeek)))
          : [1, 3]; // Default Mon, Wed

        for (const h of activeHolidays) {
          if (h.endDate >= startDate && h.startDate <= baseCompletionDate) {
            let [hy, hm, hd] = (h.startDate < startDate ? startDate : h.startDate).split('-').map(Number);
            const hEnd = h.endDate > baseCompletionDate ? baseCompletionDate : h.endDate;
            const curH = new Date(hy, hm - 1, hd);
            while (formatDate(curH) <= hEnd) {
              const curIso = formatDate(curH);
              const jsDay = curH.getDay();
              const ttDay = jsDay === 0 ? 7 : jsDay;
              if (scheduledDays.includes(ttDay)) {
                holidaysEncountered++;
                const hasCompensated = makeups.some(m => m.classId === classId && m.originalMissedDate === curIso && m.countsTowardCourseProgress);
                if (hasCompensated) {
                  compensatedCount++;
                  breakdownDates.push({ date: curIso, type: 'compensated_holiday', note: `Nghỉ ${h.holidayName} (đã bù)` });
                } else {
                  breakdownDates.push({ date: curIso, type: 'holiday_skipped', note: `Nghỉ ${h.holidayName}` });
                }
              }
              curH.setDate(curH.getDate() + 1);
            }
          }
        }

        const netMissed = holidaysEncountered - compensatedCount;
        if (netMissed > 0) {
          let [by, bm, bd] = baseCompletionDate.split('-').map(Number);
          const extDate = new Date(by, bm - 1, bd + 1);
          let extraSessionsAdded = 0;
          while (extraSessionsAdded < netMissed && extraSessionsAdded < 100) {
            const curIso = formatDate(extDate);
            const jsDay = extDate.getDay();
            const ttDay = jsDay === 0 ? 7 : jsDay;
            const isHol = activeHolidays.some(h => curIso >= h.startDate && curIso <= h.endDate);
            if (scheduledDays.includes(ttDay) && !isHol) {
              extraSessionsAdded++;
              breakdownDates.push({ date: curIso, type: 'regular', note: 'Buổi học gia hạn thêm' });
              if (extraSessionsAdded >= netMissed) {
                finalDate = curIso;
                break;
              }
            }
            extDate.setDate(extDate.getDate() + 1);
          }
        }
      }

      const [sy, sm, sd] = startDate.split('-');
      const [fy, fm, fd] = finalDate.split('-');
      const explanation = extensionPolicy === 'none'
        ? `Thời lượng ${durationValue} tháng lịch: Bắt đầu từ ${sd}/${sm}/${sy} đến ${fd}/${fm}/${fy}. Không tự động kéo dài ngày kết thúc.`
        : `Thời lượng ${durationValue} tháng lịch: Dự kiến ban đầu ${baseCompletionDate}. Gặp ${holidaysEncountered} buổi nghỉ lễ (${compensatedCount} buổi đã bù); ngày kết thúc gia hạn đến ${fd}/${fm}/${fy}.`;

      return {
        expectedCompletionDate: finalDate,
        totalDaysSpan: Math.max(1, Math.round((new Date(finalDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24))),
        scheduledSessionsCount: durationValue * 8,
        holidaysEncounteredCount: holidaysEncountered,
        makeupsCount: compensatedCount,
        explanation,
        breakdownDates
      };
    }

    // MODE 2: CALENDAR DAYS
    if (durationMode === 'calendar_days') {
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const calcDate = new Date(sy, sm - 1, sd);
      calcDate.setDate(calcDate.getDate() + Math.max(1, durationValue) - 1);
      const finalDate = formatDate(calcDate);
      const [fy, fm, fd] = finalDate.split('-');
      const explanation = `Thời lượng ${durationValue} ngày lịch (bắt đầu ngày 1 là ${sd}/${sm}/${sy}): Kết thúc vào ngày ${fd}/${fm}/${fy}.`;

      return {
        expectedCompletionDate: finalDate,
        totalDaysSpan: durationValue,
        scheduledSessionsCount: Math.round(durationValue * (2 / 7)),
        holidaysEncounteredCount: 0,
        makeupsCount: 0,
        explanation,
        breakdownDates: [{ date: finalDate, type: 'regular', note: 'Ngày kết thúc khóa học' }]
      };
    }

    // MODE 3: ACTUAL LEARNING DAYS & MODE 4: LEARNING SESSIONS
    const classTimetables = data.timetable.filter(t => t.classId === classId);
    let scheduledDays: number[] = [];
    if (classTimetables.length > 0) {
      scheduledDays = Array.from(new Set(classTimetables.map(t => t.dayOfWeek)));
    } else {
      const targetClass = data.classes.find(c => c.id === classId);
      if (targetClass && targetClass.scheduleDays) {
        if (/Thứ 2|Monday/i.test(targetClass.scheduleDays)) scheduledDays.push(1);
        if (/Thứ 3|Tuesday/i.test(targetClass.scheduleDays)) scheduledDays.push(2);
        if (/Thứ 4|Wednesday/i.test(targetClass.scheduleDays)) scheduledDays.push(3);
        if (/Thứ 5|Thursday/i.test(targetClass.scheduleDays)) scheduledDays.push(4);
        if (/Thứ 6|Friday/i.test(targetClass.scheduleDays)) scheduledDays.push(5);
        if (/Thứ 7|Saturday/i.test(targetClass.scheduleDays)) scheduledDays.push(6);
        if (/Chủ Nhật|Sunday/i.test(targetClass.scheduleDays)) scheduledDays.push(7);
      }
      if (scheduledDays.length === 0) {
        scheduledDays = [1, 4]; // Default Mon, Thu
      }
    }

    const scheduledSet = new Set(scheduledDays);
    const dayNamesMap: Record<number, string> = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 7: 'Chủ Nhật' };
    const scheduleSummary = scheduledDays.map(d => dayNamesMap[d]).join(', ');

    const compensatedMissedDates = new Set<string>();
    makeups.forEach(mk => {
      if (mk.classId === classId && mk.originalMissedDate && mk.countsTowardCourseProgress) {
        compensatedMissedDates.add(mk.originalMissedDate);
      }
    });

    const standaloneMakeups = new Map<string, CourseMakeupSession>();
    makeups.forEach(mk => {
      if (mk.classId === classId && !mk.originalMissedDate && mk.countsTowardCourseProgress) {
        standaloneMakeups.set(mk.makeupDate, mk);
      }
    });

    let [sy, sm, sd] = startDate.split('-').map(Number);
    const curDate = new Date(sy, sm - 1, sd);
    let sessionCount = 0;
    let holidaysEncountered = 0;
    let makeupsUsed = 0;
    let finalDate = startDate;
    const breakdownDates: CourseCalculationResult['breakdownDates'] = [];
    const maxDays = 1800;
    let iterations = 0;

    while (sessionCount < durationValue && iterations < maxDays) {
      iterations++;
      const curIso = formatDate(curDate);
      const jsDay = curDate.getDay();
      const ttDay = jsDay === 0 ? 7 : jsDay;

      const matchingHoliday = activeHolidays.find(h => curIso >= h.startDate && curIso <= h.endDate);

      if (scheduledSet.has(ttDay)) {
        if (matchingHoliday) {
          holidaysEncountered++;
          if (compensatedMissedDates.has(curIso)) {
            sessionCount++;
            makeupsUsed++;
            breakdownDates.push({ date: curIso, type: 'compensated_holiday', note: `Nghỉ ${matchingHoliday.holidayName} (đã bù)` });
          } else {
            if (extensionPolicy === 'none') {
              sessionCount++;
              breakdownDates.push({ date: curIso, type: 'regular', note: `Trùng ${matchingHoliday.holidayName} (vẫn tính buổi)` });
            } else {
              breakdownDates.push({ date: curIso, type: 'holiday_skipped', note: `Nghỉ ${matchingHoliday.holidayName} (kéo dài ngày hoàn thành)` });
            }
          }
        } else {
          sessionCount++;
          breakdownDates.push({ date: curIso, type: 'regular', note: `Buổi ${sessionCount}/${durationValue}` });
        }
      } else if (standaloneMakeups.has(curIso)) {
        sessionCount++;
        makeupsUsed++;
        const mk = standaloneMakeups.get(curIso);
        breakdownDates.push({ date: curIso, type: 'makeup', note: `Buổi học bù bổ sung (${mk?.reason || ''})` });
      }

      if (sessionCount >= durationValue) {
        finalDate = curIso;
        break;
      }

      curDate.setDate(curDate.getDate() + 1);
    }

    const [fy, fm, fd] = finalDate.split('-');
    const [startYear, startMonth, startDay] = startDate.split('-');
    const explanation = `Khóa học yêu cầu ${durationValue} ${durationMode === 'learning_sessions' ? 'buổi học' : 'ngày học thực tế'} (${scheduleSummary}). Bắt đầu: ${startDay}/${startMonth}/${startYear}. Gặp ${holidaysEncountered} buổi trùng nghỉ lễ; ${makeupsUsed} buổi học bù. Ngày hoàn thành dự kiến: ${fd}/${fm}/${fy}.`;

    return {
      expectedCompletionDate: finalDate,
      totalDaysSpan: iterations,
      scheduledSessionsCount: sessionCount,
      holidaysEncounteredCount: holidaysEncountered,
      makeupsCount: makeupsUsed,
      explanation,
      breakdownDates
    };
  };

  const addCourseDuration = (
    courseData: Omit<CourseDurationRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'remainingSessions'>
  ): { success: boolean; course?: CourseDurationRecord; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Chỉ Quản lý học thuật hoặc Admin mới có quyền tạo khóa học mới.' };
    }

    const remainingSessions = Math.max(0, courseData.requiredSessions - courseData.completedSessions);
    const newCourse: CourseDurationRecord = {
      ...courseData,
      id: `CD-${Date.now()}`,
      remainingSessions,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };

    setData(prev => ({
      ...prev,
      courseDurations: [newCourse, ...(prev.courseDurations || [])]
    }));

    addActivityLog('Thêm khóa học', `Đã tạo khóa học ${newCourse.courseName} (${newCourse.className || ''}) - Ngày kết thúc dự kiến: ${newCourse.currentExpectedCompletionDate}`);
    return { success: true, course: newCourse };
  };

  const updateCourseDuration = (
    id: string,
    updates: Partial<CourseDurationRecord>,
    reason?: string
  ): { success: boolean; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Giáo viên không có quyền chỉnh sửa thiết lập thời gian khóa học.' };
    }

    const target = (data.courseDurations || []).find(c => c.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy khóa học cần cập nhật.' };

    const newHistoryEntries: CourseDurationHistoryEntry[] = [];
    if (updates.currentExpectedCompletionDate && updates.currentExpectedCompletionDate !== target.currentExpectedCompletionDate) {
      newHistoryEntries.push({
        id: `HIST-${Date.now()}`,
        courseDurationId: id,
        originalStartDate: target.courseStartDate,
        previousExpectedCompletionDate: target.currentExpectedCompletionDate,
        newExpectedCompletionDate: updates.currentExpectedCompletionDate,
        reason: reason || updates.notes || 'Cập nhật lại lịch hoàn thành khóa học',
        changedBy: currentUser.name,
        changedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      });
    }

    setData(prev => {
      const updatedDurations = (prev.courseDurations || []).map(c => {
        if (c.id === id) {
          const req = updates.requiredSessions !== undefined ? updates.requiredSessions : c.requiredSessions;
          const comp = updates.completedSessions !== undefined ? updates.completedSessions : c.completedSessions;
          const remainingSessions = Math.max(0, req - comp);
          const progressPercentage = req > 0 ? Math.min(100, Math.round((comp / req) * 100)) : 0;
          return {
            ...c,
            ...updates,
            remainingSessions,
            progressPercentage,
            updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
          };
        }
        return c;
      });

      return {
        ...prev,
        courseDurations: updatedDurations,
        courseDurationHistory: [...newHistoryEntries, ...(prev.courseDurationHistory || [])]
      };
    });

    addActivityLog('Cập nhật khóa học', `Đã cập nhật thông tin khóa học ${target.courseName}`);
    return { success: true };
  };

  const deleteCourseDuration = (id: string): { success: boolean; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Giáo viên không có quyền xóa khóa học.' };
    }

    const target = (data.courseDurations || []).find(c => c.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy khóa học.' };

    setData(prev => ({
      ...prev,
      courseDurations: (prev.courseDurations || []).filter(c => c.id !== id),
      courseDurationHistory: (prev.courseDurationHistory || []).filter(h => h.courseDurationId !== id)
    }));

    addActivityLog('Xóa khóa học', `Đã xóa khóa học ${target.courseName}`);
    return { success: true };
  };

  const recalculateCourseDates = (
    id: string,
    customReason?: string
  ): { success: boolean; updatedDate?: string; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Giáo viên không có quyền tính toán lại lịch khóa học.' };
    }

    const target = (data.courseDurations || []).find(c => c.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy khóa học.' };

    const calcResult = calculateCourseCompletionDate({
      startDate: target.courseStartDate,
      durationMode: target.durationMode,
      durationValue: target.durationValue,
      classId: target.classId,
      extensionPolicy: target.extensionPolicy
    });

    const isDateChanged = calcResult.expectedCompletionDate !== target.currentExpectedCompletionDate;
    const historyEntry: CourseDurationHistoryEntry[] = isDateChanged ? [{
      id: `HIST-${Date.now()}`,
      courseDurationId: id,
      originalStartDate: target.courseStartDate,
      previousExpectedCompletionDate: target.currentExpectedCompletionDate,
      newExpectedCompletionDate: calcResult.expectedCompletionDate,
      reason: customReason || `Tự động tính toán lại dựa trên thời khóa biểu và các kỳ nghỉ lễ (${calcResult.holidaysEncounteredCount} ngày nghỉ)`,
      changedBy: currentUser.name,
      changedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    }] : [];

    setData(prev => ({
      ...prev,
      courseDurations: (prev.courseDurations || []).map(c => {
        if (c.id === id) {
          return {
            ...c,
            currentExpectedCompletionDate: calcResult.expectedCompletionDate,
            calculationExplanation: calcResult.explanation,
            updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
          };
        }
        return c;
      }),
      courseDurationHistory: [...historyEntry, ...(prev.courseDurationHistory || [])]
    }));

    addActivityLog('Tính lại ngày hoàn thành', `Đã tính toán lại lịch cho ${target.courseName}: Ngày kết thúc mới ${calcResult.expectedCompletionDate}`);
    return { success: true, updatedDate: calcResult.expectedCompletionDate };
  };

  const recalculateAllCourses = (): { success: boolean; updatedCount: number } => {
    if (currentUser.role === 'teacher') {
      return { success: false, updatedCount: 0 };
    }

    let updatedCount = 0;
    (data.courseDurations || []).forEach(c => {
      recalculateCourseDates(c.id, 'Tự động đồng bộ hàng loạt theo thời khóa biểu');
      updatedCount++;
    });

    addActivityLog('Tính lại toàn bộ khóa học', `Đã đồng bộ và tính toán lại lịch hoàn thành cho ${updatedCount} khóa học`);
    return { success: true, updatedCount };
  };

  const addCourseHoliday = (
    holidayData: Omit<CourseHoliday, 'id' | 'createdAt' | 'createdBy'>
  ): { success: boolean; holiday?: CourseHoliday; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Chỉ Quản lý học thuật hoặc Admin mới có quyền thêm ngày nghỉ.' };
    }

    const newHoliday: CourseHoliday = {
      ...holidayData,
      id: `HOL-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdBy: currentUser.name
    };

    setData(prev => ({
      ...prev,
      courseHolidays: [newHoliday, ...(prev.courseHolidays || [])]
    }));

    addActivityLog('Thêm ngày nghỉ lễ', `Đã thêm ngày nghỉ: ${newHoliday.holidayName} (${newHoliday.startDate} đến ${newHoliday.endDate})`);
    return { success: true, holiday: newHoliday };
  };

  const updateCourseHoliday = (
    id: string,
    updates: Partial<CourseHoliday>
  ): { success: boolean; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Giáo viên không có quyền sửa ngày nghỉ.' };
    }

    setData(prev => ({
      ...prev,
      courseHolidays: (prev.courseHolidays || []).map(h => h.id === id ? { ...h, ...updates } : h)
    }));

    addActivityLog('Cập nhật ngày nghỉ', `Đã cập nhật thông tin ngày nghỉ mã ${id}`);
    return { success: true };
  };

  const deleteCourseHoliday = (id: string): { success: boolean; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Giáo viên không có quyền xóa ngày nghỉ.' };
    }

    const target = (data.courseHolidays || []).find(h => h.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy ngày nghỉ.' };

    setData(prev => ({
      ...prev,
      courseHolidays: (prev.courseHolidays || []).filter(h => h.id !== id)
    }));

    addActivityLog('Xóa ngày nghỉ', `Đã xóa ngày nghỉ ${target.holidayName}`);
    return { success: true };
  };

  const addCourseMakeup = (
    makeupData: Omit<CourseMakeupSession, 'id' | 'createdAt' | 'createdBy'>
  ): { success: boolean; makeup?: CourseMakeupSession; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Chỉ Quản lý học thuật hoặc Admin mới có quyền thêm buổi học bù.' };
    }

    const newMakeup: CourseMakeupSession = {
      ...makeupData,
      id: `MK-CD-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdBy: currentUser.name
    };

    setData(prev => ({
      ...prev,
      courseMakeups: [newMakeup, ...(prev.courseMakeups || [])]
    }));

    addActivityLog('Thêm buổi học bù', `Đã thêm buổi học bù cho lớp ${newMakeup.className || newMakeup.classId} ngày ${newMakeup.makeupDate}`);
    return { success: true, makeup: newMakeup };
  };

  const updateCourseMakeup = (
    id: string,
    updates: Partial<CourseMakeupSession>
  ): { success: boolean; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Giáo viên không có quyền sửa buổi học bù.' };
    }

    setData(prev => ({
      ...prev,
      courseMakeups: (prev.courseMakeups || []).map(m => m.id === id ? { ...m, ...updates } : m)
    }));

    addActivityLog('Cập nhật học bù', `Đã cập nhật buổi học bù mã ${id}`);
    return { success: true };
  };

  const deleteCourseMakeup = (id: string): { success: boolean; error?: string } => {
    if (currentUser.role === 'teacher') {
      return { success: false, error: 'Giáo viên không có quyền xóa buổi học bù.' };
    }

    const target = (data.courseMakeups || []).find(m => m.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy buổi học bù.' };

    setData(prev => ({
      ...prev,
      courseMakeups: (prev.courseMakeups || []).filter(m => m.id !== id)
    }));

    addActivityLog('Xóa buổi học bù', `Đã xóa buổi học bù ngày ${target.makeupDate}`);
    return { success: true };
  };

  const getCourseHistory = (courseDurationId: string): CourseDurationHistoryEntry[] => {
    return (data.courseDurationHistory || []).filter(h => h.courseDurationId === courseDurationId);
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
        getLessonReportsForDate,
        saveLessonReport,
        submitLessonReport,
        toggleReportLock,
        addMakeupClass,
        deleteMakeupClass,
        resolveIncompleteReport,
        updateSettings,
        resetAllData,
        addActivityLog,
        // Course Duration Manager Exports
        calculateCourseCompletionDate,
        addCourseDuration,
        updateCourseDuration,
        deleteCourseDuration,
        recalculateCourseDates,
        recalculateAllCourses,
        addCourseHoliday,
        updateCourseHoliday,
        deleteCourseHoliday,
        addCourseMakeup,
        updateCourseMakeup,
        deleteCourseMakeup,
        getCourseHistory
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
