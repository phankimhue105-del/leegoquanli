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
  StudentScoreEntry
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
  const { currentUser } = useAuth();

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

  // 11. Settings & Reset
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
