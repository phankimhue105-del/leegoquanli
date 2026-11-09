import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageOrientation,
  VerticalAlign,
  ShadingType
} from 'docx';
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
  CenterSettings,
  ActivityLog,
  Parent,
  MonthlyTeachingSchedule,
  TeachingSession,
  StaffMember,
  WorkingShift,
  StaffAttendanceRecord,
  StaffPayRate,
  StaffPayrollAdjustment,
  StaffPayrollBatch,
  AttendancePeriodLock,
  PayrollAuditLog,
  CourseDurationRecord,
  CourseHoliday,
  CourseMakeupSession,
  CourseDurationHistory,
  LessonReport,
  MakeupClassSession,
  IncompleteReportRecord
} from '../types';
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
import {
  initialStaffList,
  initialStaffShifts,
  initialStaffPayRates,
  initialStaffAttendanceRecords,
  initialStaffAdjustments,
  initialPayrollBatches,
  initialPeriodLocks,
  initialPayrollAuditLogs
} from '../data/initialPayrollData';

// Re-export payroll Excel generators & aggregations from payrollService
export {
  exportStaffAttendanceToExcel,
  exportWorkRecordsToExcel,
  exportPayrollReportToExcel,
  exportPaymentReportToExcel,
  aggregateAllWorkRecords,
  formatVND,
  formatNumber
} from './payrollService';

const STORAGE_KEY = 'leego_center_storage_v1';

// Initial Course Duration Data
export const initialCourseDurations: CourseDurationRecord[] = [
  {
    id: 'CD-CLS-STA-01',
    courseName: "Khóa Học Kid's Box Starter - CLS-STA-01",
    classId: 'CLS-STA-01',
    className: 'Pre A1 Starters 01',
    courseBook: "Kid's Box Starter (2nd Edition)",
    teacherId: 'TCH-001',
    teacherName: 'John Smith',
    durationMode: 'months',
    durationValue: 6,
    courseStartDate: '2026-06-01',
    originalExpectedCompletionDate: '2026-12-01',
    currentExpectedCompletionDate: '2026-12-08',
    extensionPolicy: 'scheduled_holidays',
    requiredSessions: 72,
    completedSessions: 58,
    remainingSessions: 14,
    progressPercentage: 81,
    status: 'in_progress',
    notes: 'Lớp học tiến độ tốt, đã bù 2 buổi nghỉ lễ Quốc Khánh.',
    calculationExplanation: 'Bắt đầu 01/06/2026, thời lượng 6 tháng. Gia hạn 7 ngày do trùng kỳ nghỉ lễ Quốc Khánh 02/09.'
  },
  {
    id: 'CD-CLS-MOV-02',
    courseName: "Khóa Học Cambridge Movers - CLS-MOV-02",
    classId: 'CLS-MOV-02',
    className: 'A1 Movers 02',
    courseBook: 'Cambridge English Movers 4',
    teacherId: 'TCH-002',
    teacherName: 'Emma Watson',
    durationMode: 'learning_sessions',
    durationValue: 48,
    courseStartDate: '2026-08-15',
    originalExpectedCompletionDate: '2026-12-20',
    currentExpectedCompletionDate: '2026-12-28',
    extensionPolicy: 'scheduled_holidays',
    requiredSessions: 48,
    completedSessions: 36,
    remainingSessions: 12,
    progressPercentage: 75,
    status: 'near_completion',
    notes: 'Chuẩn bị cho kỳ thi Cambridge Mock Test cuối khóa.',
    calculationExplanation: 'Quy đổi 48 buổi học theo lịch Thứ 3, Thứ 5. Dự kiến hoàn thành 28/12/2026.'
  }
];

export const initialCourseHolidays: CourseHoliday[] = [
  {
    id: 'HOL-001',
    holidayName: 'Nghỉ Lễ Quốc Khánh 2/9',
    startDate: '2026-09-01',
    endDate: '2026-09-04',
    holidayType: 'national',
    reason: 'Nghỉ theo quy định của nhà nước',
    affectsScheduledLessons: true,
    notes: 'Toàn bộ các lớp nghỉ từ 01/09 đến hết 04/09'
  },
  {
    id: 'HOL-002',
    holidayName: 'Nghỉ Tết Dương Lịch 2027',
    startDate: '2027-01-01',
    endDate: '2027-01-03',
    holidayType: 'national',
    reason: 'Tết Dương Lịch 2027',
    affectsScheduledLessons: true,
    notes: 'Trung tâm nghỉ 3 ngày'
  }
];

export const initialCourseMakeups: CourseMakeupSession[] = [
  {
    id: 'MKP-001',
    classId: 'CLS-STA-01',
    className: 'Pre A1 Starters 01',
    originalMissedDate: '2026-09-02',
    makeupDate: '2026-09-12',
    time: '18:00 - 19:30',
    classroom: 'Phòng 101',
    teacherId: 'TCH-001',
    teacherName: 'John Smith',
    reason: 'Học bù buổi nghỉ lễ 2/9',
    countsTowardCourseProgress: true,
    status: 'completed'
  }
];

export const initialCourseDurationHistory: CourseDurationHistory[] = [
  {
    id: 'HIST-001',
    courseDurationId: 'CD-CLS-STA-01',
    previousExpectedCompletionDate: '2026-12-01',
    newExpectedCompletionDate: '2026-12-08',
    reason: 'Gia hạn theo lịch nghỉ lễ Quốc Khánh 2/9',
    changedBy: 'Admin',
    changedAt: '2026-09-05 10:30'
  }
];

export const initialLessonReports: LessonReport[] = [
  {
    id: 'LR-CLS-STA-01-2026-11-06',
    classId: 'CLS-STA-01',
    className: 'Pre A1 Starters 01',
    teachingDate: '2026-11-06',
    scheduledTime: '17:30 - 19:00',
    classroom: 'Phòng 1A',
    teacherId: 'TCH-001',
    teacherName: 'John Smith',
    teachingAssistantName: 'Trần Văn A',
    lessonProgress: 'Unit 4 – Lesson 2: At the zoo',
    sessionType: 'regular',
    status: 'completed',
    totalStudents: 10,
    completedStudents: 10,
    completionPercentage: 100,
    locked: true,
    lockedAt: '2026-11-06 20:30',
    lockedBy: 'Academic Manager',
    studentReports: [
      {
        studentId: 'LG-STU-001',
        studentName: 'Nguyễn Văn An',
        homeworkStatus: 'Đạt',
        previousLessonStatus: 'Đạt',
        comments: 'Học sinh hăng hái phát biểu, phát âm chuẩn các từ vựng về động vật.',
        assignedHomework: 'Làm bài tập trang 34 sách Workbook, nghe audio bài 4.',
        notes: 'Speaking: 9.0/10',
        completed: true
      },
      {
        studentId: 'LG-STU-002',
        studentName: 'Trần Thị Mai',
        homeworkStatus: 'Đạt',
        previousLessonStatus: 'Đạt',
        comments: 'Tiếp thu bài nhanh, tự tin giao tiếp phản xạ với giáo viên bản ngữ.',
        assignedHomework: 'Làm bài tập trang 34 sách Workbook.',
        notes: 'Speaking: 8.5/10',
        completed: true
      }
    ]
  }
];

export const initialMakeupSessions: MakeupClassSession[] = [];
export const initialIncompleteReports: IncompleteReportRecord[] = [];

export interface AppDataStore {
  students: Student[];
  classes: ClassItem[];
  teachers: Teacher[];
  teachingAssistants: TeachingAssistant[];
  programs: AcademicProgram[];
  timetable: TimetableSession[];
  attendance: AttendanceRecord[];
  assessments: AssessmentRecord[];
  lessonPlans: LessonPlanReport[];
  users: User[];
  parents: Parent[];
  settings: CenterSettings;
  activityLogs: ActivityLog[];
  teachingSchedules: MonthlyTeachingSchedule[];

  // Staff Attendance & Payroll V2 Extension
  staffList: StaffMember[];
  staffShifts: WorkingShift[];
  staffAttendance: StaffAttendanceRecord[];
  staffPayRates: StaffPayRate[];
  staffAdjustments: StaffPayrollAdjustment[];
  payrollBatches: StaffPayrollBatch[];
  periodLocks: AttendancePeriodLock[];
  payrollAuditLogs: PayrollAuditLog[];

  // Course Duration Extension
  courseDurations: CourseDurationRecord[];
  courseHolidays: CourseHoliday[];
  courseMakeups: CourseMakeupSession[];
  courseDurationHistory: CourseDurationHistory[];

  // Lesson Report Extension
  lessonReports: LessonReport[];
  makeupSessions: MakeupClassSession[];
  incompleteReports: IncompleteReportRecord[];
}

export function loadInitialStorage(): AppDataStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all keys exist with fallback to initial data
      return {
        students: parsed.students || initialStudents,
        classes: parsed.classes || initialClasses,
        teachers: parsed.teachers || initialTeachers,
        teachingAssistants: parsed.teachingAssistants || initialTeachingAssistants,
        programs: parsed.programs || initialAcademicPrograms,
        timetable: parsed.timetable || initialTimetableSessions,
        attendance: parsed.attendance || initialAttendanceRecords,
        assessments: parsed.assessments || initialAssessments,
        lessonPlans: parsed.lessonPlans || initialLessonPlans,
        users: parsed.users || initialUsers,
        parents: parsed.parents || initialParents,
        settings: parsed.settings || initialSettings,
        activityLogs: parsed.activityLogs || initialActivityLogs,
        teachingSchedules: parsed.teachingSchedules || initialTeachingSchedules,

        // Staff Attendance & Payroll V2
        staffList: parsed.staffList || initialStaffList,
        staffShifts: parsed.staffShifts || initialStaffShifts,
        staffAttendance: parsed.staffAttendance || initialStaffAttendanceRecords,
        staffPayRates: parsed.staffPayRates || initialStaffPayRates,
        staffAdjustments: parsed.staffAdjustments || initialStaffAdjustments,
        payrollBatches: parsed.payrollBatches || initialPayrollBatches,
        periodLocks: parsed.periodLocks || initialPeriodLocks,
        payrollAuditLogs: parsed.payrollAuditLogs || initialPayrollAuditLogs,

        // Course Duration
        courseDurations: parsed.courseDurations || initialCourseDurations,
        courseHolidays: parsed.courseHolidays || initialCourseHolidays,
        courseMakeups: parsed.courseMakeups || initialCourseMakeups,
        courseDurationHistory: parsed.courseDurationHistory || initialCourseDurationHistory,

        // Lesson Report
        lessonReports: parsed.lessonReports || initialLessonReports,
        makeupSessions: parsed.makeupSessions || initialMakeupSessions,
        incompleteReports: parsed.incompleteReports || initialIncompleteReports
      };
    }
  } catch (err) {
    console.error('Failed to parse localStorage data, falling back to initial data', err);
  }

  const defaultData: AppDataStore = {
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
    teachingSchedules: initialTeachingSchedules,

    // Staff Attendance & Payroll V2
    staffList: initialStaffList,
    staffShifts: initialStaffShifts,
    staffAttendance: initialStaffAttendanceRecords,
    staffPayRates: initialStaffPayRates,
    staffAdjustments: initialStaffAdjustments,
    payrollBatches: initialPayrollBatches,
    periodLocks: initialPeriodLocks,
    payrollAuditLogs: initialPayrollAuditLogs,

    // Course Duration
    courseDurations: initialCourseDurations,
    courseHolidays: initialCourseHolidays,
    courseMakeups: initialCourseMakeups,
    courseDurationHistory: initialCourseDurationHistory,

    // Lesson Report
    lessonReports: initialLessonReports,
    makeupSessions: initialMakeupSessions,
    incompleteReports: initialIncompleteReports
  };

  saveStorage(defaultData);
  return defaultData;
}

export function saveStorage(data: AppDataStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

export function resetStorage(): AppDataStore {
  const defaultData: AppDataStore = {
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
    teachingSchedules: initialTeachingSchedules,

    // Staff Attendance & Payroll V2
    staffList: initialStaffList,
    staffShifts: initialStaffShifts,
    staffAttendance: initialStaffAttendanceRecords,
    staffPayRates: initialStaffPayRates,
    staffAdjustments: initialStaffAdjustments,
    payrollBatches: initialPayrollBatches,
    periodLocks: initialPeriodLocks,
    payrollAuditLogs: initialPayrollAuditLogs,

    // Course Duration
    courseDurations: initialCourseDurations,
    courseHolidays: initialCourseHolidays,
    courseMakeups: initialCourseMakeups,
    courseDurationHistory: initialCourseDurationHistory,

    // Lesson Report
    lessonReports: initialLessonReports,
    makeupSessions: initialMakeupSessions,
    incompleteReports: initialIncompleteReports
  };
  saveStorage(defaultData);
  return defaultData;
}

// ==========================================
// EXCEL & WORD EXPORT FUNCTIONS
// ==========================================

export function exportStudentsToExcel(students: Student[], classes: ClassItem[]): void {
  const classMap = new Map(classes.map(c => [c.id, c.name]));
  const exportData = students.map((s, idx) => ({
    'STT': idx + 1,
    'Mã học sinh': s.id,
    'Họ và tên': s.fullName,
    'Tên tiếng Anh': s.vietnameseName,
    'Ngày sinh': s.dob,
    'Giới tính': s.gender === 'male' ? 'Nam' : 'Nữ',
    'Trường học': s.school,
    'Khối lớp': s.grade,
    'Trình độ hiện tại': s.currentLevel,
    'Lớp đang học': s.classIds.map(cid => classMap.get(cid) || cid).join(', '),
    'Họ tên phụ huynh': s.parentName,
    'SĐT liên hệ': s.parentPhone,
    'Email phụ huynh': s.parentEmail,
    'Địa chỉ': s.address,
    'Ngày nhập học': s.enrollmentDate,
    'Trạng thái': s.status === 'studying' ? 'Đang học' : s.status === 'reserved' ? 'Bảo lưu' : s.status === 'graduated' ? 'Đã tốt nghiệp' : 'Nghỉ học',
    'Ghi chú': s.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách học sinh');
  XLSX.writeFile(workbook, `LeeGo_Danh_Sach_Hoc_Sinh_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportAttendanceReportToExcel(attendance: AttendanceRecord[]): void {
  const flatData: any[] = [];
  attendance.forEach(att => {
    att.records.forEach(rec => {
      flatData.push({
        'Mã lớp': att.classId,
        'Tên lớp': att.className,
        'Ngày học': att.date,
        'Ca học': att.sessionTime,
        'Giáo viên': att.teacherName,
        'Mã học sinh': rec.studentId,
        'Tên học sinh': rec.studentName,
        'Trạng thái': rec.status === 'present' ? 'Có mặt' : rec.status === 'absent' ? 'Vắng không phép' : rec.status === 'late' ? 'Đi muộn' : 'Vắng có phép',
        'Ghi chú': rec.note || ''
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(flatData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo điểm danh');
  XLSX.writeFile(workbook, `LeeGo_Bao_Cao_Diem_Danh_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportAssessmentReportToExcel(assessments: AssessmentRecord[]): void {
  const flatData: any[] = [];
  assessments.forEach(asm => {
    asm.scores.forEach((sc, idx) => {
      flatData.push({
        'STT': idx + 1,
        'Kỳ thi': asm.title,
        'Mã lớp': asm.classId,
        'Tên lớp': asm.className,
        'Ngày kiểm tra': asm.date,
        'Mã học sinh': sc.studentId,
        'Họ tên học sinh': sc.studentName,
        'Nghe (Listening)': sc.listening,
        'Nói (Speaking)': sc.speaking,
        'Đọc (Reading)': sc.reading,
        'Viết (Writing)': sc.writing,
        'Ngữ pháp (Grammar)': sc.grammar,
        'Tổng điểm': sc.totalScore,
        'Số Khiên (nếu có)': sc.shields || '-',
        'Xếp loại': sc.status === 'excellent' ? 'Xuất sắc' : sc.status === 'good' ? 'Giỏi' : sc.status === 'pass' ? 'Đạt' : 'Cần cố gắng',
        'Nhận xét của GV': sc.teacherFeedback
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(flatData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ket_qua_danh_gia');
  XLSX.writeFile(workbook, `LeeGo_Ket_Qua_Danh_Gia_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportTeacherWorkloadToExcel(teachers: Teacher[], classes: ClassItem[]): void {
  const data = teachers.map((t, idx) => {
    const assignedClasses = classes.filter(c => c.teacherId === t.id);
    return {
      'STT': idx + 1,
      'Mã GV': t.id,
      'Họ và tên': t.fullName,
      'Tên gọi VN': t.vietnameseName || '',
      'Quốc tịch': t.nationality,
      'Giáo viên bản ngữ': t.isNative ? 'Có' : 'Không',
      'Email': t.email,
      'Số điện thoại': t.phone,
      'Bằng cấp': t.qualifications,
      'Số năm kinh nghiệm': t.experienceYears,
      'Số lớp phụ trách': assignedClasses.length,
      'Danh sách lớp': assignedClasses.map(c => c.name).join(', '),
      'Số giờ dạy/tuần': t.workloadHours,
      'Trạng thái': t.status === 'active' ? 'Đang giảng dạy' : 'Tạm nghỉ'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Gio_day_Giao_vien');
  XLSX.writeFile(workbook, `LeeGo_Bao_Cao_Cong_Tac_Giao_Vien_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 1. RESTORED: Export Course Durations / Class Schedules to Excel (.xlsx)
 * Required by CourseDurationView.tsx
 */
export function exportCourseDurationsToExcel(
  items: any[],
  programs?: AcademicProgram[]
): void {
  const progMap = new Map((programs || []).map(p => [p.id, p]));
  const rows = (items || []).map((item, idx) => {
    const prog = progMap.get(item.courseId || item.programId);
    const studentCount = Array.isArray(item.studentIds) ? item.studentIds.length : (item.studentCount || 0);

    return {
      'STT': idx + 1,
      'Mã lớp': item.id || item.code || '',
      'Tên lớp học / Khóa học': item.courseName || item.name || item.className || '',
      'Trình độ / Level': item.level || prog?.level || '',
      'Chương trình học': item.curriculum || prog?.curriculum || prog?.name || '',
      'Giáo trình': item.courseBook || item.textbook || prog?.textbook || '',
      'Ngày bắt đầu': item.courseStartDate || item.startDate || '',
      'Ngày kết thúc dự kiến': item.currentExpectedCompletionDate || item.endDate || '',
      'Tổng số buổi': item.requiredSessions || item.totalLessons || prog?.totalLessons || item.duration || '48 buổi',
      'Buổi đã hoàn thành': item.completedSessions || 0,
      'Tiến độ': item.progressPercentage ? `${item.progressPercentage}%` : '0%',
      'Chính sách gia hạn': item.extensionPolicy || 'Mặc định',
      'Giáo viên phụ trách': item.teacherName || item.teacherId || '',
      'Trạng thái': item.status === 'in_progress'
        ? 'Đang diễn ra'
        : item.status === 'completed'
        ? 'Đã kết thúc'
        : item.status === 'near_completion'
        ? 'Sắp hoàn thành'
        : item.status === 'extended'
        ? 'Đã gia hạn'
        : item.status || 'Đang học',
      'Ghi chú': item.notes || item.calculationExplanation || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã lớp
    { wch: 28 }, // Tên lớp học / Khóa học
    { wch: 18 }, // Level
    { wch: 24 }, // Chương trình
    { wch: 24 }, // Giáo trình
    { wch: 14 }, // Ngày bắt đầu
    { wch: 18 }, // Ngày kết thúc
    { wch: 16 }, // Tổng số buổi
    { wch: 16 }, // Buổi hoàn thành
    { wch: 12 }, // Tiến độ
    { wch: 20 }, // Chính sách
    { wch: 22 }, // Giáo viên
    { wch: 16 }, // Trạng thái
    { wch: 32 }, // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Thoi_luong_khoa_hoc');
  XLSX.writeFile(workbook, `LeeGo_Thoi_Luong_Khoa_Hoc_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 2. RESTORED: Export Lesson Plan Reports / Lesson Reports to Excel (.xlsx)
 * Required by LessonReportsView.tsx
 */
export function exportLessonReportToExcel(reports: any): void {
  const list: any[] = Array.isArray(reports) ? reports : [reports];
  const rows: any[] = [];

  list.forEach((r, idx) => {
    // If it's a daily LessonReport with student reports
    if (Array.isArray(r.studentReports) && r.studentReports.length > 0) {
      r.studentReports.forEach((st: any, sIdx: number) => {
        rows.push({
          'STT': rows.length + 1,
          'Lớp học': r.className || '',
          'Ngày học': r.teachingDate || r.date || '',
          'Ca học': r.scheduledTime || '',
          'Phòng học': r.classroom || '',
          'Giáo viên': r.teacherName || '',
          'Tiến độ bài học': r.lessonProgress || '',
          'Mã học viên': st.studentId || '',
          'Tên học viên': st.studentName || '',
          'Tình hình BTVN': st.homeworkStatus || '',
          'Tình hình bài cũ': st.previousLessonStatus || '',
          'Nhận xét của giáo viên': st.comments || '',
          'Bài tập về nhà giao': st.assignedHomework || '',
          'Ghi chú / Điểm thi': st.notes || '',
          'Trạng thái khóa sổ': r.locked ? 'Đã khóa' : 'Đang mở'
        });
      });
    } else {
      // Fallback for flat lesson plan report
      rows.push({
        'STT': idx + 1,
        'Lớp học': r.className || '',
        'Ngày học': r.teachingDate || r.date || '',
        'Ca học': r.scheduledTime || '',
        'Phòng học': r.classroom || '',
        'Giáo viên': r.teacherName || '',
        'Tiến độ bài học': r.lessonProgress || r.lessonContent || '',
        'Mã học viên': '',
        'Tên học viên': 'Tất cả học viên',
        'Tình hình BTVN': r.homeworkAssigned || '',
        'Tình hình bài cũ': '',
        'Nhận xét của giáo viên': r.teachingNotes || '',
        'Bài tập về nhà giao': r.homeworkAssigned || '',
        'Ghi chú / Điểm thi': r.notes || '',
        'Trạng thái khóa sổ': r.locked ? 'Đã khóa' : 'Đang mở'
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 20 }, // Lớp
    { wch: 14 }, // Ngày
    { wch: 16 }, // Ca
    { wch: 14 }, // Phòng
    { wch: 20 }, // Giáo viên
    { wch: 28 }, // Tiến độ
    { wch: 14 }, // Mã HV
    { wch: 24 }, // Tên HV
    { wch: 18 }, // BTVN
    { wch: 18 }, // Bài cũ
    { wch: 36 }, // Nhận xét
    { wch: 28 }, // Giao BTVN
    { wch: 24 }, // Ghi chú
    { wch: 16 }, // Khóa sổ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bao_cao_hoc_tap');
  const dateStr = list[0]?.teachingDate || list[0]?.date || new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `LeeGo_Bao_Cao_Hoc_Tap_${dateStr}.xlsx`);
}

/**
 * 3. RESTORED: Export Lesson Report to Microsoft Word (.docx)
 * Formatted professionally with 7-column Parent Report Table
 * Required by LessonReportsView.tsx
 */
export async function exportLessonReportToWord(report: any): Promise<void> {
  const r: any = Array.isArray(report) ? report[0] : report;
  if (!r) return;

  const borderSingle = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };

  const studentsList: any[] = Array.isArray(r.studentReports) ? r.studentReports : [];
  const teachingDateFormatted = (r.teachingDate || r.date || '').split('-').reverse().join('/');

  // Header Table Row
  const headerRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 14, type: WidthType.PERCENTAGE },
        borders: borderSingle,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Lớp', font: 'Times New Roman', bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 18, type: WidthType.PERCENTAGE },
        borders: borderSingle,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Học viên', font: 'Times New Roman', bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 12, type: WidthType.PERCENTAGE },
        borders: borderSingle,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Làm BVN', font: 'Times New Roman', bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 12, type: WidthType.PERCENTAGE },
        borders: borderSingle,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Học bài cũ', font: 'Times New Roman', bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 24, type: WidthType.PERCENTAGE },
        borders: borderSingle,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Nhận xét', font: 'Times New Roman', bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        borders: borderSingle,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Giao BVN', font: 'Times New Roman', bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        borders: borderSingle,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Ghi chú', font: 'Times New Roman', bold: true, size: 20 })],
          }),
        ],
      }),
    ],
  });

  // Body Table Rows
  const studentRows = studentsList.map((st, idx) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          borders: borderSingle,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: idx === 0 ? r.className || '' : '', font: 'Times New Roman', bold: true, size: 19 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: borderSingle,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              children: [new TextRun({ text: st.studentName || '', font: 'Times New Roman', bold: true, size: 19 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          borders: borderSingle,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: st.homeworkStatus || '—', font: 'Times New Roman', size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          borders: borderSingle,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: st.previousLessonStatus || '—', font: 'Times New Roman', size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 24, type: WidthType.PERCENTAGE },
          borders: borderSingle,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              children: [new TextRun({ text: st.comments || '—', font: 'Times New Roman', size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          borders: borderSingle,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              children: [new TextRun({ text: st.assignedHomework || '—', font: 'Times New Roman', size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          borders: borderSingle,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              children: [new TextRun({ text: st.notes || '', font: 'Times New Roman', color: 'DC2626', size: 18 })],
            }),
          ],
        }),
      ],
    });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderSingle,
    rows: [headerRow, ...studentRows],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: `BÁO CÁO TÌNH HÌNH HỌC TẬP CỦA LỚP ${(r.className || '').toUpperCase()}`,
                font: 'Times New Roman',
                size: 28, // 14pt
                bold: true,
                color: 'C00000',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 20, after: 60 },
            children: [
              new TextRun({
                text: `BUỔI HỌC NGÀY ${teachingDateFormatted}`,
                font: 'Times New Roman',
                size: 24, // 12pt
                bold: true,
                color: '000000',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 20, after: 120 },
            children: [
              new TextRun({
                text: `TIẾN ĐỘ BÀI HỌC: ${r.lessonProgress || 'Chưa cập nhật'}`,
                font: 'Times New Roman',
                size: 22,
                bold: true,
                color: '1D4ED8',
              }),
            ],
          }),
          table,
          new Paragraph({
            spacing: { before: 140, after: 40 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Giáo viên phụ trách: ${r.teacherName || ''}`,
                font: 'Times New Roman',
                italics: true,
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanClassName = (r.className || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Bao_Cao_${cleanClassName}_${r.teachingDate || 'Date'}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parse Excel file to students
export function parseExcelToStudents(file: File): Promise<Partial<Student>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const parsedStudents: Partial<Student>[] = json.map((row, index) => {
          return {
            id: row['Mã học sinh'] || `LG-STU-IMP-${Date.now().toString().slice(-4)}${index}`,
            fullName: row['Họ và tên'] || row['Họ tên'] || row['Name'] || 'Học sinh mới',
            vietnameseName: row['Tên tiếng Anh'] || row['Nick Name'] || '',
            dob: row['Ngày sinh'] || '2016-01-01',
            gender: (row['Giới tính'] === 'Nữ' || row['Giới tính'] === 'female') ? 'female' : 'male',
            school: row['Trường học'] || row['Trường'] || 'Tiểu học',
            grade: row['Khối lớp'] || row['Lớp'] || 'Lớp 3',
            currentLevel: row['Trình độ'] || row['Trình độ hiện tại'] || 'A1 Movers',
            parentName: row['Họ tên phụ huynh'] || row['Phụ huynh'] || 'Phụ huynh',
            parentPhone: String(row['SĐT liên hệ'] || row['SĐT'] || '0900000000'),
            parentEmail: row['Email phụ huynh'] || row['Email'] || '',
            address: row['Địa chỉ'] || 'Hà Nội',
            enrollmentDate: row['Ngày nhập học'] || new Date().toISOString().slice(0, 10),
            classIds: [],
            status: 'studying',
            notes: row['Ghi chú'] || 'Được import từ file Excel'
          };
        });

        resolve(parsedStudents);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Export Teaching Schedule to Microsoft Word (.docx)
 */
export async function exportTeachingScheduleToWord(schedule: MonthlyTeachingSchedule): Promise<void> {
  const monthName = MONTH_NAMES[schedule.month - 1] || `Tháng ${schedule.month}`;
  const titleText = `TEACHING SCHEDULE – ${monthName.toUpperCase()}, ${schedule.year}`;

  const borderSingle = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };

  const sessions = schedule.sessions;

  const createCell = (
    textLines: { text: string; bold?: boolean; color?: string; italic?: boolean }[],
    options?: { isHeader?: boolean; widthPct?: number }
  ) => {
    return new TableCell({
      borders: borderSingle,
      verticalAlign: VerticalAlign.TOP,
      shading: options?.isHeader ? { fill: 'F3F4F6', type: ShadingType.CLEAR } : undefined,
      children: textLines.map(
        line =>
          new Paragraph({
            spacing: { before: 40, after: 40, line: 240 },
            alignment: options?.isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: line.text,
                font: 'Times New Roman',
                size: 19, // 9.5pt
                bold: line.bold ?? false,
                italics: line.italic ?? false,
                color: line.color || '000000',
              }),
            ],
          })
      ),
    });
  };

  const createMultilineCell = (text: string, color?: string, bold?: boolean) => {
    const lines = (text || '').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      return createCell([{ text: '' }]);
    }
    return new TableCell({
      borders: borderSingle,
      verticalAlign: VerticalAlign.TOP,
      children: lines.map(
        line =>
          new Paragraph({
            spacing: { before: 20, after: 20, line: 220 },
            children: [
              new TextRun({
                text: line,
                font: 'Times New Roman',
                size: 18, // 9pt
                color: color || '000000',
                bold: bold ?? false,
              }),
            ],
          })
      ),
    });
  };

  const dateRow = new TableRow({
    children: [
      createCell([{ text: 'Date', bold: true }], { isHeader: true }),
      ...sessions.map(s => createCell([{ text: s.dateOrdinal || s.date, bold: true }], { isHeader: true })),
    ],
  });

  const teacherRow = new TableRow({
    children: [
      createCell([{ text: 'Teacher', bold: true }], { isHeader: true }),
      ...sessions.map(s => createCell([{ text: s.teacherName || '' }])),
    ],
  });

  const taRow = new TableRow({
    children: [
      createCell([{ text: 'T.A', bold: true }], { isHeader: true }),
      ...sessions.map(s => createCell([{ text: s.teachingAssistantName || '' }])),
    ],
  });

  const lessonRow = new TableRow({
    children: [
      createCell([{ text: 'Lesson', bold: true }], { isHeader: true }),
      ...sessions.map(s => createMultilineCell(s.lesson || '', undefined, true)),
    ],
  });

  const contentsRow = new TableRow({
    children: [
      createCell([{ text: 'Contents', bold: true }], { isHeader: true }),
      ...sessions.map(s => createMultilineCell(s.contents || '')),
    ],
  });

  const notesRow = new TableRow({
    children: [
      createCell([{ text: 'Notes', bold: true }], { isHeader: true }),
      ...sessions.map(s => {
        const isHighlight = s.notesHighlight || /test|speaking|important|red/i.test(s.notes || '');
        return createMultilineCell(s.notes || '', isHighlight ? 'DC2626' : undefined, isHighlight);
      }),
    ],
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderSingle,
    rows: [dateRow, teacherRow, taRow, lessonRow, contentsRow, notesRow],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 140 },
            children: [
              new TextRun({
                text: titleText,
                font: 'Times New Roman',
                size: 32,
                bold: true,
                color: 'C00000',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({ text: 'Class: ', font: 'Times New Roman', bold: true, size: 22 }),
              new TextRun({ text: `${schedule.className}   –   `, font: 'Times New Roman', size: 22 }),
              new TextRun({ text: 'Teacher: ', font: 'Times New Roman', bold: true, size: 22 }),
              new TextRun({ text: `${schedule.teacherName}   –   `, font: 'Times New Roman', size: 22 }),
              new TextRun({ text: 'T.A: ', font: 'Times New Roman', bold: true, size: 22 }),
              new TextRun({ text: `${schedule.teachingAssistantName || 'None'}`, font: 'Times New Roman', size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({ text: 'Time: ', font: 'Times New Roman', bold: true, size: 22 }),
              new TextRun({ text: `${schedule.defaultTime}   |   `, font: 'Times New Roman', size: 22 }),
              new TextRun({ text: 'Class Room: ', font: 'Times New Roman', bold: true, size: 22 }),
              new TextRun({ text: `${schedule.defaultClassroom}   |   `, font: 'Times New Roman', size: 22 }),
              new TextRun({ text: 'Course book: ', font: 'Times New Roman', bold: true, size: 22 }),
              new TextRun({
                text: `${schedule.courseBook}`,
                font: 'Times New Roman',
                bold: true,
                size: 22,
                color: '1D4ED8',
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanClassName = schedule.className.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Teaching_Schedule_${cleanClassName}_${monthName}_${schedule.year}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Teaching Schedule to Microsoft Excel (.xlsx)
 */
export function exportTeachingScheduleToExcel(schedule: MonthlyTeachingSchedule): void {
  const monthName = MONTH_NAMES[schedule.month - 1] || `Tháng ${schedule.month}`;
  const title = `TEACHING SCHEDULE – ${monthName.toUpperCase()}, ${schedule.year}`;
  const classInfo = `Class: ${schedule.className} – Teacher: ${schedule.teacherName}${schedule.teachingAssistantName ? ` – T.A (${schedule.teachingAssistantName})` : ''} | Time: ${schedule.defaultTime} | Room: ${schedule.defaultClassroom} | Course book: ${schedule.courseBook}`;

  const headerRow = ['Date', ...schedule.sessions.map(s => s.dateOrdinal || s.date)];
  const teacherRow = ['Teacher', ...schedule.sessions.map(s => s.teacherName || '')];
  const taRow = ['T.A', ...schedule.sessions.map(s => s.teachingAssistantName || '')];
  const lessonRow = ['Lesson', ...schedule.sessions.map(s => s.lesson || '')];
  const contentsRow = ['Contents', ...schedule.sessions.map(s => s.contents || '')];
  const notesRow = ['Notes', ...schedule.sessions.map(s => s.notes || '')];

  const aoa = [
    [title],
    [classInfo],
    [],
    headerRow,
    teacherRow,
    taRow,
    lessonRow,
    contentsRow,
    notesRow,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  const colWidths = [{ wch: 15 }];
  schedule.sessions.forEach(() => {
    colWidths.push({ wch: 28 });
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Schedule_${schedule.month}_${schedule.year}`);
  const cleanClassName = schedule.className.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(
    workbook,
    `LeeGo_Teaching_Schedule_${cleanClassName}_${monthName}_${schedule.year}.xlsx`
  );
}
