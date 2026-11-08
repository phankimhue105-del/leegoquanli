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
  // Staff Attendance & Payroll V2 Types
  StaffMember,
  WorkingShift,
  StaffAttendanceRecord,
  StaffAttendanceStatus,
  StaffPayRate,
  StaffPayrollAdjustment,
  StaffPayrollBatch,
  AttendancePeriodLock,
  PayrollAuditLog
} from '../types';
import { loadInitialStorage, saveStorage, resetStorage, AppDataStore } from '../services/dataService';
import { buildPayrollBatch, calculateMonthlyWorkRecord } from '../services/payrollService';
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

  // Student Attendance
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

  // ==========================================
  // STAFF ATTENDANCE & PAYROLL V2 METHODS
  // ==========================================
  // Staff Management
  addStaffMember: (staff: Omit<StaffMember, 'id'>) => StaffMember;
  updateStaffMember: (id: string, updates: Partial<StaffMember>) => void;
  deleteStaffMember: (id: string) => void;
  addStaffShift: (shift: Omit<WorkingShift, 'id'>) => WorkingShift;
  updateStaffShift: (id: string, updates: Partial<WorkingShift>) => void;

  // Staff Attendance
  saveStaffAttendanceRecord: (record: Omit<StaffAttendanceRecord, 'id' | 'recordedBy' | 'recordedAt'> & { id?: string }) => { success: boolean; error?: string };
  saveBulkStaffAttendance: (date: string, shiftId: string, records: { staffId: string; status: StaffAttendanceStatus; workingSessions: number; workingHours: number; notes?: string }[]) => { success: boolean; count?: number; error?: string };
  deleteStaffAttendanceRecord: (id: string) => { success: boolean; error?: string };
  lockAttendancePeriod: (month: number, year: number) => { success: boolean; error?: string };
  unlockAttendancePeriod: (month: number, year: number, reason: string) => { success: boolean; error?: string };
  isAttendancePeriodLocked: (month: number, year: number) => boolean;

  // Staff Pay Rates & Adjustments
  updateStaffPayRate: (staffId: string, rate: number, effectiveDate: string, notes?: string) => void;
  addStaffAdjustment: (adjustment: Omit<StaffPayrollAdjustment, 'id' | 'createdBy' | 'createdAt'>) => StaffPayrollAdjustment;
  deleteStaffAdjustment: (id: string) => { success: boolean; error?: string };

  // Monthly Payroll Batches
  createPayrollBatch: (month: number, year: number) => { success: boolean; batch?: StaffPayrollBatch; error?: string };
  recalculatePayrollBatch: (batchId: string) => { success: boolean; batch?: StaffPayrollBatch; error?: string };
  reviewPayrollBatch: (batchId: string, notes?: string) => { success: boolean; error?: string };
  approvePayrollBatch: (batchId: string, notes?: string) => { success: boolean; error?: string };
  payPayrollBatch: (batchId: string, paymentMethod: 'bank_transfer' | 'cash' | 'other', reference: string, notes?: string) => { success: boolean; error?: string };
  reopenPayrollBatch: (batchId: string, targetStatus: 'draft' | 'reviewed', reason: string) => { success: boolean; error?: string };
  addPayrollAuditLog: (action: PayrollAuditLog['action'], period: string, details: string, reason?: string, previousState?: string, newState?: string, batchId?: string) => void;
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
    const newStudent: Student = { ...studentData, id: newId };
    setData(prev => ({
      ...prev,
      students: [newStudent, ...prev.students]
    }));
    addActivityLog('Thêm học sinh', `Đã thêm học sinh: ${newStudent.fullName} (${newStudent.id})`);
    return newStudent;
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setData(prev => ({
      ...prev,
      students: prev.students.map(s => (s.id === id ? { ...s, ...updates } : s))
    }));
    addActivityLog('Cập nhật học sinh', `Đã cập nhật thông tin học sinh mã ${id}`);
  };

  const deleteStudent = (id: string) => {
    setData(prev => ({
      ...prev,
      students: prev.students.filter(s => s.id !== id),
      classes: prev.classes.map(c => ({
        ...c,
        studentIds: c.studentIds.filter(sid => sid !== id)
      }))
    }));
    addActivityLog('Xóa học sinh', `Đã xóa học sinh có mã ${id}`);
  };

  const transferStudentClass = (studentId: string, fromClassId: string, toClassId: string) => {
    setData(prev => ({
      ...prev,
      classes: prev.classes.map(cls => {
        if (cls.id === fromClassId) {
          return { ...cls, studentIds: cls.studentIds.filter(id => id !== studentId) };
        }
        if (cls.id === toClassId && !cls.studentIds.includes(studentId)) {
          return { ...cls, studentIds: [...cls.studentIds, studentId] };
        }
        return cls;
      }),
      students: prev.students.map(stu => {
        if (stu.id === studentId) {
          const updatedClasses = stu.classIds.filter(id => id !== fromClassId);
          if (!updatedClasses.includes(toClassId)) {
            updatedClasses.push(toClassId);
          }
          return { ...stu, classIds: updatedClasses };
        }
        return stu;
      })
    }));
    addActivityLog('Chuyển lớp học sinh', `Học sinh ${studentId} chuyển từ lớp ${fromClassId} sang ${toClassId}`);
  };

  const importStudents = (importedList: Partial<Student>[]): number => {
    let count = 0;
    const newStudents: Student[] = importedList.map((stu, idx) => {
      count++;
      return {
        id: stu.id || `LG-STU-${String(data.students.length + idx + 1).padStart(3, '0')}`,
        fullName: stu.fullName || 'Học sinh mới',
        vietnameseName: stu.vietnameseName || '',
        dob: stu.dob || '2016-01-01',
        gender: stu.gender || 'male',
        school: stu.school || 'Tiểu học',
        grade: stu.grade || 'Lớp 3',
        parentName: stu.parentName || 'Phụ huynh',
        parentPhone: stu.parentPhone || '0900000000',
        parentEmail: stu.parentEmail || '',
        address: stu.address || 'Hà Nội',
        enrollmentDate: stu.enrollmentDate || new Date().toISOString().slice(0, 10),
        currentLevel: stu.currentLevel || 'A1 Movers',
        classIds: stu.classIds || [],
        status: stu.status || 'studying',
        notes: stu.notes || 'Nhập từ file Excel'
      };
    });

    setData(prev => ({
      ...prev,
      students: [...newStudents, ...prev.students]
    }));
    addActivityLog('Import học sinh', `Đã nhập khẩu thành công ${count} học sinh từ file Excel`);
    return count;
  };

  // 2. Parents
  const addParent = (parentData: Omit<Parent, 'id'>): Parent => {
    const newId = `LG-PAR-${String(data.parents.length + 1).padStart(3, '0')}`;
    const newParent: Parent = { ...parentData, id: newId };
    setData(prev => ({
      ...prev,
      parents: [newParent, ...prev.parents]
    }));
    addActivityLog('Thêm phụ huynh', `Đã thêm hồ sơ phụ huynh: ${newParent.parentName}`);
    return newParent;
  };

  const updateParent = (id: string, updates: Partial<Parent>) => {
    setData(prev => ({
      ...prev,
      parents: prev.parents.map(p => (p.id === id ? { ...p, ...updates } : p))
    }));
    addActivityLog('Cập nhật phụ huynh', `Cập nhật thông tin phụ huynh mã ${id}`);
  };

  // 3. Classes
  const addClass = (classData: Omit<ClassItem, 'id'>): ClassItem => {
    const newId = `CLS-${Date.now().toString().slice(-4)}`;
    const newClass: ClassItem = { ...classData, id: newId };
    setData(prev => ({
      ...prev,
      classes: [newClass, ...prev.classes]
    }));
    addActivityLog('Thêm lớp học', `Tạo mới lớp học ${newClass.name} (${newClass.id})`);
    return newClass;
  };

  const updateClass = (id: string, updates: Partial<ClassItem>) => {
    setData(prev => ({
      ...prev,
      classes: prev.classes.map(c => (c.id === id ? { ...c, ...updates } : c))
    }));
    addActivityLog('Cập nhật lớp học', `Cập nhật lớp học ${id}`);
  };

  const deleteClass = (id: string) => {
    setData(prev => ({
      ...prev,
      classes: prev.classes.filter(c => c.id !== id),
      timetable: prev.timetable.filter(s => s.classId !== id)
    }));
    addActivityLog('Xóa lớp học', `Đã xóa lớp học mã ${id}`);
  };

  const assignStudentsToClass = (classId: string, studentIds: string[]) => {
    setData(prev => ({
      ...prev,
      classes: prev.classes.map(c => (c.id === classId ? { ...c, studentIds } : c)),
      students: prev.students.map(s => {
        if (studentIds.includes(s.id)) {
          if (!s.classIds.includes(classId)) {
            return { ...s, classIds: [...s.classIds, classId] };
          }
        } else {
          return { ...s, classIds: s.classIds.filter(cid => cid !== classId) };
        }
        return s;
      })
    }));
    addActivityLog('Xếp lớp học sinh', `Đã phân bổ danh sách học sinh vào lớp ${classId}`);
  };

  // 4. Teachers & Assistants
  const addTeacher = (tData: Omit<Teacher, 'id'>): Teacher => {
    const newId = `TCH-${String(data.teachers.length + 1).padStart(3, '0')}`;
    const newTeacher: Teacher = { ...tData, id: newId };
    setData(prev => ({
      ...prev,
      teachers: [newTeacher, ...prev.teachers]
    }));
    addActivityLog('Thêm giáo viên', `Đã thêm hồ sơ giáo viên: ${newTeacher.fullName}`);
    return newTeacher;
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    setData(prev => ({
      ...prev,
      teachers: prev.teachers.map(t => (t.id === id ? { ...t, ...updates } : t))
    }));
    addActivityLog('Cập nhật giáo viên', `Đã cập nhật giáo viên ${id}`);
  };

  const deleteTeacher = (id: string) => {
    setData(prev => ({
      ...prev,
      teachers: prev.teachers.filter(t => t.id !== id)
    }));
    addActivityLog('Xóa giáo viên', `Đã xóa giáo viên ${id}`);
  };

  const addAssistant = (aData: Omit<TeachingAssistant, 'id'>): TeachingAssistant => {
    const newId = `TA-${String(data.teachingAssistants.length + 1).padStart(3, '0')}`;
    const newAssistant: TeachingAssistant = { ...aData, id: newId };
    setData(prev => ({
      ...prev,
      teachingAssistants: [newAssistant, ...prev.teachingAssistants]
    }));
    addActivityLog('Thêm trợ giảng', `Đã thêm hồ sơ trợ giảng: ${newAssistant.fullName}`);
    return newAssistant;
  };

  const updateAssistant = (id: string, updates: Partial<TeachingAssistant>) => {
    setData(prev => ({
      ...prev,
      teachingAssistants: prev.teachingAssistants.map(a => (a.id === id ? { ...a, ...updates } : a))
    }));
    addActivityLog('Cập nhật trợ giảng', `Cập nhật hồ sơ trợ giảng ${id}`);
  };

  const deleteAssistant = (id: string) => {
    setData(prev => ({
      ...prev,
      teachingAssistants: prev.teachingAssistants.filter(a => a.id !== id)
    }));
    addActivityLog('Xóa trợ giảng', `Đã xóa trợ giảng ${id}`);
  };

  // 5. Academic Programs
  const addProgram = (progData: Omit<AcademicProgram, 'id'>): AcademicProgram => {
    const newId = `PROG-${Date.now().toString().slice(-4)}`;
    const newProgram: AcademicProgram = { ...progData, id: newId };
    setData(prev => ({
      ...prev,
      programs: [newProgram, ...prev.programs]
    }));
    addActivityLog('Thêm chương trình', `Thêm chương trình đào tạo ${newProgram.name}`);
    return newProgram;
  };

  const updateProgram = (id: string, updates: Partial<AcademicProgram>) => {
    setData(prev => ({
      ...prev,
      programs: prev.programs.map(p => (p.id === id ? { ...p, ...updates } : p))
    }));
    addActivityLog('Cập nhật chương trình', `Cập nhật giáo trình ${id}`);
  };

  const deleteProgram = (id: string) => {
    setData(prev => ({
      ...prev,
      programs: prev.programs.filter(p => p.id !== id)
    }));
    addActivityLog('Xóa chương trình', `Xóa chương trình học ${id}`);
  };

  // 6. Timetable & Conflict checking
  const checkScheduleConflict = (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    teacherId: string,
    classroom: string,
    classId: string,
    excludeSessionId?: string
  ): ScheduleConflictResult => {
    const details: string[] = [];
    let hasConflict = false;
    let teacherConflict: string | undefined;
    let roomConflict: string | undefined;
    let classConflict: string | undefined;

    const relevant = data.timetable.filter(
      s => s.dayOfWeek === dayOfWeek && s.id !== excludeSessionId
    );

    for (const session of relevant) {
      if (isTimeOverlapping(startTime, endTime, session.startTime, session.endTime)) {
        if (session.teacherId === teacherId) {
          hasConflict = true;
          teacherConflict = `Trùng giờ dạy của Giáo viên ${session.teacherName} với lớp ${session.className} (${session.startTime} - ${session.endTime})`;
          details.push(teacherConflict);
        }
        if (session.classroom === classroom) {
          hasConflict = true;
          roomConflict = `Phòng học ${classroom} đã được xếp cho lớp ${session.className} (${session.startTime} - ${session.endTime})`;
          details.push(roomConflict);
        }
        if (session.classId === classId) {
          hasConflict = true;
          classConflict = `Lớp ${session.className} đã có lịch học trùng khung giờ này`;
          details.push(classConflict);
        }
      }
    }

    return { hasConflict, teacherConflict, roomConflict, classConflict, details };
  };

  const addTimetableSession = (sData: Omit<TimetableSession, 'id'>) => {
    const conflict = checkScheduleConflict(
      sData.dayOfWeek,
      sData.startTime,
      sData.endTime,
      sData.teacherId,
      sData.classroom,
      sData.classId
    );

    if (conflict.hasConflict) {
      return { success: false, conflict };
    }

    const newId = `TT-${Date.now().toString().slice(-5)}`;
    const newSession: TimetableSession = { ...sData, id: newId };
    setData(prev => ({
      ...prev,
      timetable: [...prev.timetable, newSession]
    }));
    addActivityLog('Xếp thời khóa biểu', `Xếp lịch học lớp ${sData.className} vào ${sData.dayName}`);
    return { success: true, session: newSession };
  };

  const updateTimetableSession = (id: string, updates: Partial<TimetableSession>) => {
    const existing = data.timetable.find(t => t.id === id);
    if (!existing) return { success: false };

    const merged = { ...existing, ...updates };
    const conflict = checkScheduleConflict(
      merged.dayOfWeek,
      merged.startTime,
      merged.endTime,
      merged.teacherId,
      merged.classroom,
      merged.classId,
      id
    );

    if (conflict.hasConflict) {
      return { success: false, conflict };
    }

    setData(prev => ({
      ...prev,
      timetable: prev.timetable.map(t => (t.id === id ? merged : t))
    }));
    addActivityLog('Sửa thời khóa biểu', `Cập nhật lịch học ${merged.className}`);
    return { success: true };
  };

  const deleteTimetableSession = (id: string) => {
    setData(prev => ({
      ...prev,
      timetable: prev.timetable.filter(t => t.id !== id)
    }));
    addActivityLog('Xóa buổi học TKB', `Hủy lịch buổi học mã ${id}`);
  };

  // 7. Student Attendance
  const saveAttendance = (
    classId: string,
    date: string,
    records: StudentAttendanceEntry[],
    sessionTime: string
  ): AttendanceRecord => {
    const cls = data.classes.find(c => c.id === classId);
    const tch = data.teachers.find(t => t.id === cls?.teacherId);

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const excusedCount = records.filter(r => r.status === 'excused').length;

    const existingIndex = data.attendance.findIndex(
      a => a.classId === classId && a.date === date
    );

    const record: AttendanceRecord = {
      id: existingIndex >= 0 ? data.attendance[existingIndex].id : `ATT-${Date.now()}`,
      classId,
      className: cls?.name || classId,
      date,
      sessionTime: sessionTime || cls?.scheduleTime || '',
      teacherId: cls?.teacherId || '',
      teacherName: tch?.fullName || 'Giáo viên',
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
      if (existingIndex >= 0) {
        const nextAtt = [...prev.attendance];
        nextAtt[existingIndex] = record;
        return { ...prev, attendance: nextAtt };
      }
      return { ...prev, attendance: [record, ...prev.attendance] };
    });

    addActivityLog('Điểm danh học viên', `Điểm danh lớp ${cls?.name || classId} ngày ${date} (Có mặt: ${presentCount}/${records.length})`);
    return record;
  };

  // 8. Assessments
  const saveAssessment = (assessment: Omit<AssessmentRecord, 'id'> & { id?: string }): AssessmentRecord => {
    const id = assessment.id || `ASM-${Date.now().toString().slice(-4)}`;
    const fullRecord: AssessmentRecord = { ...assessment, id };

    setData(prev => {
      const idx = prev.assessments.findIndex(a => a.id === id);
      if (idx >= 0) {
        const next = [...prev.assessments];
        next[idx] = fullRecord;
        return { ...prev, assessments: next };
      }
      return { ...prev, assessments: [fullRecord, ...prev.assessments] };
    });

    addActivityLog('Nhập điểm kiểm tra', `Ghi nhận bài kiểm tra ${fullRecord.title} cho lớp ${fullRecord.className}`);
    return fullRecord;
  };

  const updateAssessmentScore = (assessmentId: string, studentScores: StudentScoreEntry[]) => {
    setData(prev => ({
      ...prev,
      assessments: prev.assessments.map(a =>
        a.id === assessmentId ? { ...a, scores: studentScores } : a
      )
    }));
    addActivityLog('Cập nhật điểm', `Cập nhật điểm thi bài kiểm tra ${assessmentId}`);
  };

  // 9. Lesson Plans
  const submitLessonPlan = (plan: Omit<LessonPlanReport, 'id' | 'submittedAt'>): LessonPlanReport => {
    const newId = `LP-${Date.now().toString().slice(-5)}`;
    const report: LessonPlanReport = {
      ...plan,
      id: newId,
      submittedAt: new Date().toLocaleString('vi-VN')
    };

    setData(prev => ({
      ...prev,
      lessonPlans: [report, ...prev.lessonPlans]
    }));
    addActivityLog('Nộp báo cáo giáo án', `GV ${report.teacherName} nộp báo cáo bài số ${report.lessonNumber} lớp ${report.className}`);
    return report;
  };

  const reviewLessonPlan = (id: string, status: 'approved' | 'reviewed', feedback: string) => {
    setData(prev => ({
      ...prev,
      lessonPlans: prev.lessonPlans.map(lp =>
        lp.id === id ? { ...lp, status, managerFeedback: feedback } : lp
      )
    }));
    addActivityLog('Duyệt giáo án', `Duyệt báo cáo bài giảng ${id} với trạng thái: ${status}`);
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
    addActivityLog('Tạo tài khoản', `Thêm tài khoản ${newUser.name} (${newUser.email}) - Quyền: ${newUser.role}`);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u => (u.id === id ? { ...u, ...updates } : u))
    }));
    addActivityLog('Cập nhật tài khoản', `Cập nhật thông tin tài khoản ${id}`);
  };

  const toggleUserStatus = (id: string) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u => {
        if (u.id === id) {
          const nextStatus = u.status === 'active' ? 'inactive' : 'active';
          return { ...u, status: nextStatus };
        }
        return u;
      })
    }));
  };

  // 11. Teaching Schedule
  const getScheduleByClassAndMonth = (classId: string, month: number, year: number): MonthlyTeachingSchedule | undefined => {
    return data.teachingSchedules.find(
      s => s.classId === classId && s.month === month && s.year === year
    );
  };

  const getSchedulesByClass = (classId: string): MonthlyTeachingSchedule[] => {
    return data.teachingSchedules.filter(s => s.classId === classId);
  };

  const generateScheduleFromTimetable = (
    classId: string,
    month: number,
    year: number
  ): MonthlyTeachingSchedule => {
    const cls = data.classes.find(c => c.id === classId);
    const teacher = data.teachers.find(t => t.id === cls?.teacherId);
    const assistant = data.teachingAssistants.find(a => a.id === cls?.assistantTeacherId);
    const classTimetables = data.timetable.filter(t => t.classId === classId);

    const scheduleDaysMap: Record<number, TimetableSession> = {};
    classTimetables.forEach(t => {
      scheduleDaysMap[t.dayOfWeek] = t;
    });

    const sessions: TeachingSession[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getOrdinal = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      const jsDay = d.getDay();
      const appDay = jsDay === 0 ? 7 : jsDay;

      if (scheduleDaysMap[appDay]) {
        const tt = scheduleDaysMap[appDay];
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const weekdayName = weekdayShort[jsDay];
        const dateOrdinal = `${weekdayName} ${getOrdinal(day)}`;

        sessions.push({
          sessionId: `SES-${classId}-${dateStr}`,
          date: dateStr,
          weekday: weekdayName,
          dateOrdinal,
          teacherId: tt.teacherId || cls?.teacherId || '',
          teacherName: tt.teacherName || teacher?.fullName || '',
          teachingAssistantId: tt.assistantId || cls?.assistantTeacherId || '',
          teachingAssistantName: tt.assistantName || assistant?.fullName || '',
          time: `${tt.startTime} - ${tt.endTime}`,
          classroom: tt.classroom || cls?.classroom || '1A',
          courseBook: cls?.curriculum || 'Cambridge Course Book',
          lesson: `Lesson ${sessions.length + 1}`,
          contents: '',
          notes: ''
        });
      }
    }

    const defaultTime = classTimetables[0]
      ? `${classTimetables[0].startTime} - ${classTimetables[0].endTime}`
      : cls?.scheduleTime || '19:30 - 21:00';
    const defaultClassroom = classTimetables[0]?.classroom || cls?.classroom || '1A';

    return {
      id: `SCH-${classId}-${year}-${String(month).padStart(2, '0')}`,
      classId,
      className: cls?.name || classId,
      month,
      year,
      teacherId: cls?.teacherId || '',
      teacherName: teacher?.fullName || '',
      teachingAssistantId: cls?.assistantTeacherId,
      teachingAssistantName: assistant?.fullName,
      defaultTime,
      defaultClassroom,
      courseBook: cls?.curriculum || 'Kid\'s Box Starter',
      generatedFromTimetable: true,
      sessions,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedBy: currentUser.name,
      updatedAt: new Date().toISOString()
    };
  };

  const saveTeachingSchedule = (schedule: MonthlyTeachingSchedule) => {
    setData(prev => {
      const idx = prev.teachingSchedules.findIndex(s => s.id === schedule.id);
      if (idx >= 0) {
        const next = [...prev.teachingSchedules];
        next[idx] = schedule;
        return { ...prev, teachingSchedules: next };
      }
      return { ...prev, teachingSchedules: [schedule, ...prev.teachingSchedules] };
    });
    addActivityLog('Lưu lịch giảng dạy', `Đã lưu lịch dạy lớp ${schedule.className} tháng ${schedule.month}/${schedule.year}`);
    return { success: true, schedule };
  };

  const deleteTeachingSchedule = (id: string) => {
    setData(prev => ({
      ...prev,
      teachingSchedules: prev.teachingSchedules.filter(s => s.id !== id)
    }));
    addActivityLog('Xóa lịch giảng dạy', `Đã xóa lịch dạy ${id}`);
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
  // STAFF ATTENDANCE & PAYROLL V2 IMPLEMENTATION
  // ==========================================

  const addPayrollAuditLog = (
    action: PayrollAuditLog['action'],
    period: string,
    details: string,
    reason?: string,
    previousState?: string,
    newState?: string,
    batchId?: string
  ) => {
    const newLog: PayrollAuditLog = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      period,
      batchId,
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      previousState,
      newState,
      reason,
      details
    };

    setData(prev => ({
      ...prev,
      payrollAuditLogs: [newLog, ...prev.payrollAuditLogs]
    }));
  };

  // Staff CRUD
  const addStaffMember = (staffData: Omit<StaffMember, 'id'>): StaffMember => {
    const prefix = staffData.position === 'teacher' ? 'TCH' : staffData.position === 'teaching_assistant' ? 'TA' : 'STF';
    const newId = `${prefix}-${Date.now().toString().slice(-4)}`;
    const newStaff: StaffMember = { ...staffData, id: newId };

    // Also auto-add base pay rate
    const newRate: StaffPayRate = {
      id: `RATE-${newId}`,
      staffId: newId,
      staffName: newStaff.fullName,
      position: newStaff.position,
      payType: newStaff.payType,
      rate: newStaff.baseRate,
      effectiveDate: newStaff.startDate || new Date().toISOString().slice(0, 10),
      notes: 'Mức lương ban đầu khi tiếp nhận',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      staffList: [...prev.staffList, newStaff],
      staffPayRates: [...prev.staffPayRates, newRate]
    }));

    addActivityLog('Thêm nhân sự', `Thêm nhân sự: ${newStaff.fullName} - Vị trí: ${newStaff.position}`);
    return newStaff;
  };

  const updateStaffMember = (id: string, updates: Partial<StaffMember>) => {
    setData(prev => ({
      ...prev,
      staffList: prev.staffList.map(s => (s.id === id ? { ...s, ...updates } : s))
    }));
    addActivityLog('Cập nhật nhân sự', `Cập nhật hồ sơ nhân sự mã ${id}`);
  };

  const deleteStaffMember = (id: string) => {
    setData(prev => ({
      ...prev,
      staffList: prev.staffList.filter(s => s.id !== id)
    }));
    addActivityLog('Xóa nhân sự', `Xóa nhân sự mã ${id}`);
  };

  const addStaffShift = (shiftData: Omit<WorkingShift, 'id'>): WorkingShift => {
    const newId = `SHIFT-${Date.now().toString().slice(-4)}`;
    const newShift: WorkingShift = { ...shiftData, id: newId };
    setData(prev => ({
      ...prev,
      staffShifts: [...prev.staffShifts, newShift]
    }));
    return newShift;
  };

  const updateStaffShift = (id: string, updates: Partial<WorkingShift>) => {
    setData(prev => ({
      ...prev,
      staffShifts: prev.staffShifts.map(s => (s.id === id ? { ...s, ...updates } : s))
    }));
  };

  // Staff Attendance & Period Lock
  const isAttendancePeriodLocked = (month: number, year: number): boolean => {
    const lock = data.periodLocks.find(l => l.month === month && l.year === year);
    return lock?.isLocked ?? false;
  };

  const lockAttendancePeriod = (month: number, year: number) => {
    const periodStr = `${String(month).padStart(2, '0')}/${year}`;
    const now = new Date().toLocaleString('vi-VN');

    setData(prev => {
      const existingIdx = prev.periodLocks.findIndex(l => l.month === month && l.year === year);
      const updatedLocks = [...prev.periodLocks];
      if (existingIdx >= 0) {
        updatedLocks[existingIdx] = {
          ...updatedLocks[existingIdx],
          isLocked: true,
          lockedAt: now,
          lockedBy: currentUser.name
        };
      } else {
        updatedLocks.push({
          id: `LOCK-${year}-${String(month).padStart(2, '0')}`,
          month,
          year,
          isLocked: true,
          lockedAt: now,
          lockedBy: currentUser.name
        });
      }

      // Mark records for this period as locked
      const updatedAtt = prev.staffAttendance.map(att => {
        const [rYear, rMonth] = att.date.split('-').map(Number);
        if (rYear === year && rMonth === month) {
          return { ...att, isLocked: true };
        }
        return att;
      });

      return {
        ...prev,
        periodLocks: updatedLocks,
        staffAttendance: updatedAtt
      };
    });

    addPayrollAuditLog(
      'attendance_lock',
      periodStr,
      `Admin ${currentUser.name} đã khóa bảng chấm công tháng ${periodStr}`,
      undefined,
      'unlocked',
      'locked'
    );

    return { success: true };
  };

  const unlockAttendancePeriod = (month: number, year: number, reason: string) => {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Bắt buộc phải nhập lý do mở khóa điểm danh!' };
    }

    const periodStr = `${String(month).padStart(2, '0')}/${year}`;
    const now = new Date().toLocaleString('vi-VN');

    setData(prev => {
      const existingIdx = prev.periodLocks.findIndex(l => l.month === month && l.year === year);
      const updatedLocks = [...prev.periodLocks];
      if (existingIdx >= 0) {
        updatedLocks[existingIdx] = {
          ...updatedLocks[existingIdx],
          isLocked: false,
          reopenedAt: now,
          reopenedBy: currentUser.name,
          reopenReason: reason
        };
      }

      // Unlock attendance records
      const updatedAtt = prev.staffAttendance.map(att => {
        const [rYear, rMonth] = att.date.split('-').map(Number);
        if (rYear === year && rMonth === month) {
          return { ...att, isLocked: false };
        }
        return att;
      });

      return {
        ...prev,
        periodLocks: updatedLocks,
        staffAttendance: updatedAtt
      };
    });

    addPayrollAuditLog(
      'attendance_unlock',
      periodStr,
      `Admin ${currentUser.name} mở khóa chấm công tháng ${periodStr}. Lý do: ${reason}`,
      reason,
      'locked',
      'unlocked'
    );

    return { success: true };
  };

  const saveStaffAttendanceRecord = (
    record: Omit<StaffAttendanceRecord, 'id' | 'recordedBy' | 'recordedAt'> & { id?: string }
  ) => {
    const [year, month] = record.date.split('-').map(Number);
    if (isAttendancePeriodLocked(month, year)) {
      return { success: false, error: `Kỳ công tháng ${month}/${year} đã bị khóa. Vui lòng mở khóa trước khi chỉnh sửa!` };
    }

    const now = new Date().toLocaleString('vi-VN');
    const id = record.id || `ATT-STF-${record.staffId}-${record.date.replace(/-/g, '')}-${record.shiftId}`;

    const completeRecord: StaffAttendanceRecord = {
      ...record,
      id,
      isLocked: false,
      recordedBy: currentUser.name,
      recordedAt: now
    };

    setData(prev => {
      const idx = prev.staffAttendance.findIndex(
        r => r.id === id || (r.staffId === record.staffId && r.date === record.date && r.shiftId === record.shiftId)
      );
      if (idx >= 0) {
        const next = [...prev.staffAttendance];
        next[idx] = { ...completeRecord, updatedAt: now, updatedBy: currentUser.name };
        return { ...prev, staffAttendance: next };
      }
      return { ...prev, staffAttendance: [completeRecord, ...prev.staffAttendance] };
    });

    return { success: true };
  };

  const saveBulkStaffAttendance = (
    date: string,
    shiftId: string,
    records: { staffId: string; status: StaffAttendanceStatus; workingSessions: number; workingHours: number; notes?: string }[]
  ) => {
    const [year, month] = date.split('-').map(Number);
    if (isAttendancePeriodLocked(month, year)) {
      return { success: false, error: `Kỳ công tháng ${month}/${year} đã bị khóa!` };
    }

    const shift = data.staffShifts.find(s => s.id === shiftId) || data.staffShifts[0];
    const now = new Date().toLocaleString('vi-VN');

    setData(prev => {
      const nextAtt = [...prev.staffAttendance];

      records.forEach(item => {
        const staff = prev.staffList.find(s => s.id === item.staffId);
        if (!staff) return;

        const id = `ATT-STF-${item.staffId}-${date.replace(/-/g, '')}-${shiftId}`;
        const newRecord: StaffAttendanceRecord = {
          id,
          date,
          staffId: item.staffId,
          staffName: staff.fullName,
          position: staff.position,
          shiftId,
          shiftName: shift.name,
          status: item.status,
          workingSessions: item.workingSessions,
          workingHours: item.workingHours,
          notes: item.notes || '',
          isLocked: false,
          recordedBy: currentUser.name,
          recordedAt: now
        };

        const existingIdx = nextAtt.findIndex(
          r => r.id === id || (r.staffId === item.staffId && r.date === date && r.shiftId === shiftId)
        );
        if (existingIdx >= 0) {
          nextAtt[existingIdx] = { ...newRecord, updatedAt: now, updatedBy: currentUser.name };
        } else {
          nextAtt.push(newRecord);
        }
      });

      return { ...prev, staffAttendance: nextAtt };
    });

    return { success: true, count: records.length };
  };

  const deleteStaffAttendanceRecord = (id: string) => {
    const record = data.staffAttendance.find(r => r.id === id);
    if (record) {
      const [year, month] = record.date.split('-').map(Number);
      if (isAttendancePeriodLocked(month, year)) {
        return { success: false, error: 'Không thể xóa điểm danh trong kỳ đã khóa!' };
      }
    }
    setData(prev => ({
      ...prev,
      staffAttendance: prev.staffAttendance.filter(r => r.id !== id)
    }));
    return { success: true };
  };

  // Staff Pay Rates & Adjustments
  const updateStaffPayRate = (staffId: string, rate: number, effectiveDate: string, notes?: string) => {
    const staff = data.staffList.find(s => s.id === staffId);
    if (!staff) return;

    const now = new Date().toISOString();

    setData(prev => {
      const existingRateIdx = prev.staffPayRates.findIndex(r => r.staffId === staffId);
      const updatedRates = [...prev.staffPayRates];
      const rateObj: StaffPayRate = {
        id: `RATE-${staffId}`,
        staffId,
        staffName: staff.fullName,
        position: staff.position,
        payType: staff.payType,
        rate,
        effectiveDate,
        notes: notes || 'Cập nhật định mức lương mới',
        createdAt: existingRateIdx >= 0 ? updatedRates[existingRateIdx].createdAt : now,
        updatedAt: now
      };

      if (existingRateIdx >= 0) {
        updatedRates[existingRateIdx] = rateObj;
      } else {
        updatedRates.push(rateObj);
      }

      // Also update baseRate in staff member
      const updatedStaff = prev.staffList.map(s => (s.id === staffId ? { ...s, baseRate: rate } : s));

      return {
        ...prev,
        staffPayRates: updatedRates,
        staffList: updatedStaff
      };
    });

    addPayrollAuditLog(
      'rate_updated',
      new Date().toISOString().slice(0, 7),
      `Cập nhật mức lương nhân sự ${staff.fullName} thành ${rate.toLocaleString()} VNĐ`
    );
  };

  const addStaffAdjustment = (
    adjustment: Omit<StaffPayrollAdjustment, 'id' | 'createdBy' | 'createdAt'>
  ): StaffPayrollAdjustment => {
    const newId = `ADJ-${Date.now().toString().slice(-6)}`;
    const now = new Date().toLocaleString('vi-VN');
    const newAdj: StaffPayrollAdjustment = {
      ...adjustment,
      id: newId,
      createdBy: currentUser.name,
      createdAt: now
    };

    setData(prev => ({
      ...prev,
      staffAdjustments: [newAdj, ...prev.staffAdjustments]
    }));

    addPayrollAuditLog(
      'adjustment_added',
      `${String(adjustment.month).padStart(2, '0')}/${adjustment.year}`,
      `Ghi nhận điều chỉnh lương: ${adjustment.adjustmentType} cho ${adjustment.staffName} số tiền ${adjustment.amount.toLocaleString()} VNĐ`
    );

    return newAdj;
  };

  const deleteStaffAdjustment = (id: string) => {
    const adj = data.staffAdjustments.find(a => a.id === id);
    if (adj) {
      const batch = data.payrollBatches.find(b => b.month === adj.month && b.year === adj.year);
      if (batch && (batch.status === 'approved' || batch.status === 'paid')) {
        return { success: false, error: 'Không thể xóa điều chỉnh của kỳ lương đã chốt hoặc đã thanh toán!' };
      }
    }

    setData(prev => ({
      ...prev,
      staffAdjustments: prev.staffAdjustments.filter(a => a.id !== id)
    }));

    return { success: true };
  };

  // Payroll Batches (Draft -> Reviewed -> Approved -> Paid)
  const createPayrollBatch = (month: number, year: number) => {
    const existing = data.payrollBatches.find(b => b.month === month && b.year === year);
    if (existing) {
      return { success: false, error: `Bảng lương tháng ${month}/${year} đã tồn tại với trạng thái: ${existing.status}!` };
    }

    const batch = buildPayrollBatch(
      month,
      year,
      data.staffList,
      data.staffAttendance,
      data.staffAdjustments,
      data.staffPayRates,
      currentUser.name
    );

    setData(prev => ({
      ...prev,
      payrollBatches: [batch, ...prev.payrollBatches]
    }));

    addPayrollAuditLog(
      'payroll_created',
      `${String(month).padStart(2, '0')}/${year}`,
      `Tạo bảng tính lương Nháp cho ${batch.staffCount} nhân sự. Tổng thực lĩnh: ${batch.totalPayable.toLocaleString()} VNĐ`,
      undefined,
      'none',
      'draft',
      batch.id
    );

    return { success: true, batch };
  };

  const recalculatePayrollBatch = (batchId: string) => {
    const existing = data.payrollBatches.find(b => b.id === batchId);
    if (!existing) return { success: false, error: 'Không tìm thấy bảng lương!' };
    if (existing.status === 'approved' || existing.status === 'paid') {
      return { success: false, error: 'Bảng lương đã chốt hoặc đã chi trả bị khóa, không được tự động tính lại!' };
    }

    const updated = buildPayrollBatch(
      existing.month,
      existing.year,
      data.staffList,
      data.staffAttendance,
      data.staffAdjustments,
      data.staffPayRates,
      currentUser.name
    );
    updated.status = existing.status; // keep current status (draft or reviewed)

    setData(prev => ({
      ...prev,
      payrollBatches: prev.payrollBatches.map(b => (b.id === batchId ? updated : b))
    }));

    addPayrollAuditLog(
      'payroll_recalculated',
      `${String(existing.month).padStart(2, '0')}/${existing.year}`,
      `Cập nhật và tính toán lại bảng lương tháng ${existing.month}/${existing.year}`,
      undefined,
      existing.status,
      existing.status,
      batchId
    );

    return { success: true, batch: updated };
  };

  const reviewPayrollBatch = (batchId: string, notes?: string) => {
    const existing = data.payrollBatches.find(b => b.id === batchId);
    if (!existing) return { success: false, error: 'Không tìm thấy bảng lương!' };
    if (existing.status !== 'draft') {
      return { success: false, error: 'Chỉ có thể chuyển trạng thái Đã kiểm tra từ Nháp!' };
    }

    const now = new Date().toLocaleString('vi-VN');

    setData(prev => ({
      ...prev,
      payrollBatches: prev.payrollBatches.map(b =>
        b.id === batchId
          ? {
              ...b,
              status: 'reviewed',
              reviewedAt: now,
              reviewedBy: currentUser.name,
              reviewNotes: notes || 'Đã kiểm tra đối soát đầy đủ'
            }
          : b
      )
    }));

    addPayrollAuditLog(
      'payroll_reviewed',
      `${String(existing.month).padStart(2, '0')}/${existing.year}`,
      `Admin ${currentUser.name} đã kiểm tra bảng lương tháng ${existing.month}/${existing.year}`,
      notes,
      'draft',
      'reviewed',
      batchId
    );

    return { success: true };
  };

  const approvePayrollBatch = (batchId: string, notes?: string) => {
    const existing = data.payrollBatches.find(b => b.id === batchId);
    if (!existing) return { success: false, error: 'Không tìm thấy bảng lương!' };
    if (existing.status === 'approved' || existing.status === 'paid') {
      return { success: false, error: 'Bảng lương này đã được chốt trước đó!' };
    }

    const now = new Date().toLocaleString('vi-VN');

    // Automatically lock attendance when approving payroll
    lockAttendancePeriod(existing.month, existing.year);

    setData(prev => ({
      ...prev,
      payrollBatches: prev.payrollBatches.map(b =>
        b.id === batchId
          ? {
              ...b,
              status: 'approved',
              approvedAt: now,
              approvedBy: currentUser.name,
              approvalNotes: notes || 'Ban Giám đốc phê duyệt chốt lương',
              isPayrollLocked: true,
              isAttendanceLocked: true
            }
          : b
      )
    }));

    addPayrollAuditLog(
      'payroll_approved',
      `${String(existing.month).padStart(2, '0')}/${existing.year}`,
      `Chốt lương tháng ${existing.month}/${existing.year}. Đóng băng số liệu tính toán.`,
      notes,
      existing.status,
      'approved',
      batchId
    );

    return { success: true };
  };

  const payPayrollBatch = (
    batchId: string,
    paymentMethod: 'bank_transfer' | 'cash' | 'other',
    reference: string,
    notes?: string
  ) => {
    const existing = data.payrollBatches.find(b => b.id === batchId);
    if (!existing) return { success: false, error: 'Không tìm thấy bảng lương!' };
    if (existing.status !== 'approved') {
      return { success: false, error: 'Chỉ có thể thanh toán cho bảng lương đã được duyệt (Approved)!' };
    }

    const now = new Date().toLocaleString('vi-VN');
    const today = new Date().toISOString().slice(0, 10);

    setData(prev => ({
      ...prev,
      payrollBatches: prev.payrollBatches.map(b => {
        if (b.id === batchId) {
          const updatedItems = b.items.map(item => ({
            ...item,
            paymentStatus: 'paid' as const,
            paidDate: today,
            paymentMethod,
            paymentReference: reference
          }));

          return {
            ...b,
            status: 'paid',
            paidAt: now,
            paidBy: currentUser.name,
            paymentMethod,
            paymentReference: reference,
            paymentNotes: notes || '',
            items: updatedItems
          };
        }
        return b;
      })
    }));

    addPayrollAuditLog(
      'payroll_paid',
      `${String(existing.month).padStart(2, '0')}/${existing.year}`,
      `Hoàn tất thanh toán bảng lương tháng ${existing.month}/${existing.year}. Phương thức: ${paymentMethod}, Mã GD: ${reference}`,
      notes,
      'approved',
      'paid',
      batchId
    );

    return { success: true };
  };

  const reopenPayrollBatch = (
    batchId: string,
    targetStatus: 'draft' | 'reviewed',
    reason: string
  ) => {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Bắt buộc phải nhập lý do mở lại bảng lương!' };
    }

    const existing = data.payrollBatches.find(b => b.id === batchId);
    if (!existing) return { success: false, error: 'Không tìm thấy bảng lương!' };

    setData(prev => ({
      ...prev,
      payrollBatches: prev.payrollBatches.map(b =>
        b.id === batchId
          ? {
              ...b,
              status: targetStatus,
              isPayrollLocked: false
            }
          : b
      )
    }));

    addPayrollAuditLog(
      'payroll_reopened',
      `${String(existing.month).padStart(2, '0')}/${existing.year}`,
      `Mở lại bảng lương tháng ${existing.month}/${existing.year} về trạng thái ${targetStatus}. Lý do: ${reason}`,
      reason,
      existing.status,
      targetStatus,
      batchId
    );

    return { success: true };
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
        updateSettings,
        resetAllData,
        addActivityLog,

        // Staff Attendance & Payroll V2
        addStaffMember,
        updateStaffMember,
        deleteStaffMember,
        addStaffShift,
        updateStaffShift,
        saveStaffAttendanceRecord,
        saveBulkStaffAttendance,
        deleteStaffAttendanceRecord,
        lockAttendancePeriod,
        unlockAttendancePeriod,
        isAttendancePeriodLocked,
        updateStaffPayRate,
        addStaffAdjustment,
        deleteStaffAdjustment,
        createPayrollBatch,
        recalculatePayrollBatch,
        reviewPayrollBatch,
        approvePayrollBatch,
        payPayrollBatch,
        reopenPayrollBatch,
        addPayrollAuditLog
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
