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
  PayrollAuditLog
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
        payrollAuditLogs: parsed.payrollAuditLogs || initialPayrollAuditLogs
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
    payrollAuditLogs: initialPayrollAuditLogs
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
    payrollAuditLogs: initialPayrollAuditLogs
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
      'Tên lớp học': item.name || item.className || '',
      'Trình độ / Level': item.level || prog?.level || '',
      'Chương trình học': item.curriculum || prog?.curriculum || prog?.name || '',
      'Giáo trình': item.textbook || prog?.textbook || '',
      'Ngày bắt đầu': item.startDate || '',
      'Ngày kết thúc': item.endDate || '',
      'Tổng số buổi': item.totalLessons || prog?.totalLessons || item.duration || '48 buổi',
      'Thời lượng mỗi buổi': item.durationMinutes ? `${item.durationMinutes} phút` : prog?.durationMinutes ? `${prog.durationMinutes} phút` : '90 phút',
      'Số buổi / tuần': item.lessonsPerWeek || prog?.lessonsPerWeek || 2,
      'Lịch học': `${item.scheduleDays || ''} (${item.scheduleTime || ''})`.trim(),
      'Phòng học': item.classroom || '',
      'Giáo viên phụ trách': item.teacherName || item.teacherId || '',
      'Trợ giảng': item.assistantTeacherName || item.assistantTeacherId || '',
      'Sĩ số hiện tại': studentCount,
      'Sĩ số tối đa': item.maxCapacity || 15,
      'Học phí': item.tuitionFee
        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.tuitionFee)
        : (item.fee ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.fee) : 'Chưa thiết lập'),
      'Trạng thái': item.status === 'ongoing'
        ? 'Đang diễn ra'
        : item.status === 'upcoming'
        ? 'Sắp khai giảng'
        : item.status === 'completed'
        ? 'Đã kết thúc'
        : item.status === 'cancelled'
        ? 'Đã hủy'
        : item.status || 'Đang học',
      'Ghi chú': item.notes || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã lớp
    { wch: 24 }, // Tên lớp
    { wch: 18 }, // Level
    { wch: 24 }, // Chương trình
    { wch: 24 }, // Giáo trình
    { wch: 14 }, // Ngày bắt đầu
    { wch: 14 }, // Ngày kết thúc
    { wch: 16 }, // Tổng số buổi
    { wch: 20 }, // Thời lượng
    { wch: 14 }, // Số buổi/tuần
    { wch: 24 }, // Lịch học
    { wch: 14 }, // Phòng học
    { wch: 22 }, // Giáo viên
    { wch: 20 }, // Trợ giảng
    { wch: 14 }, // Sĩ số
    { wch: 14 }, // Sĩ số max
    { wch: 18 }, // Học phí
    { wch: 16 }, // Trạng thái
    { wch: 28 }, // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Thoi_luong_khoa_hoc');
  XLSX.writeFile(workbook, `LeeGo_Thoi_Luong_Khoa_Hoc_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 2. RESTORED: Export Lesson Plan Reports to Excel (.xlsx)
 * Required by LessonReportsView.tsx
 */
export function exportLessonReportToExcel(reports: any): void {
  const list: LessonPlanReport[] = Array.isArray(reports) ? reports : [reports];
  const rows = list.map((r, idx) => ({
    'STT': idx + 1,
    'Mã báo cáo': r.id || '',
    'Mã lớp': r.classId || '',
    'Tên lớp học': r.className || '',
    'Giáo viên': r.teacherName || '',
    'Ngày dạy': r.date || '',
    'Bài số': r.lessonNumber || '',
    'Giáo trình / Sách': r.textbook || '',
    'Nội dung bài học': r.lessonContent || '',
    'Mục tiêu bài học': r.learningObjectives || '',
    'Hoạt động đã triển khai': r.activitiesCompleted || '',
    'Bài tập về nhà': r.homeworkAssigned || '',
    'Học sinh cần lưu ý': r.studentsAttention || '',
    'Ghi chú của giáo viên': r.teachingNotes || '',
    'Trạng thái': r.status === 'approved' ? 'Đã duyệt' : r.status === 'reviewed' ? 'Đã kiểm tra' : 'Đã nộp',
    'Nhận xét của Quản lý': r.managerFeedback || '',
    'Thời gian nộp': r.submittedAt || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã báo cáo
    { wch: 14 }, // Mã lớp
    { wch: 22 }, // Tên lớp
    { wch: 20 }, // Giáo viên
    { wch: 14 }, // Ngày dạy
    { wch: 10 }, // Bài số
    { wch: 26 }, // Giáo trình
    { wch: 35 }, // Nội dung
    { wch: 35 }, // Mục tiêu
    { wch: 35 }, // Hoạt động
    { wch: 30 }, // BTVN
    { wch: 28 }, // Lưu ý
    { wch: 28 }, // Ghi chú
    { wch: 14 }, // Trạng thái
    { wch: 30 }, // Nhận xét
    { wch: 18 }  // Thời gian nộp
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bao_cao_bai_giang');
  XLSX.writeFile(workbook, `LeeGo_Bao_Cao_Bai_Giang_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 3. RESTORED: Export Lesson Plan Report to Microsoft Word (.docx)
 * Required by LessonReportsView.tsx
 */
export async function exportLessonReportToWord(report: any): Promise<void> {
  const r: LessonPlanReport = Array.isArray(report) ? report[0] : report;
  if (!r) return;

  const borderSingle = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };

  const createRow = (label: string, content: string) => {
    const lines = (content || '').split('\n').filter(Boolean);
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: borderSingle,
          verticalAlign: VerticalAlign.TOP,
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: label,
                  font: 'Times New Roman',
                  bold: true,
                  size: 20, // 10pt
                  color: '1E293B',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 72, type: WidthType.PERCENTAGE },
          borders: borderSingle,
          verticalAlign: VerticalAlign.TOP,
          children: lines.length > 0
            ? lines.map(
                line =>
                  new Paragraph({
                    spacing: { before: 30, after: 30 },
                    children: [
                      new TextRun({
                        text: line,
                        font: 'Times New Roman',
                        size: 20,
                        color: '000000',
                      }),
                    ],
                  })
              )
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: content || '—',
                      font: 'Times New Roman',
                      size: 20,
                    }),
                  ],
                }),
              ],
        }),
      ],
    });
  };

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderSingle,
    rows: [
      createRow('Mã báo cáo / ID', r.id || 'N/A'),
      createRow('Lớp học (Class)', `${r.className || ''} (${r.classId || ''})`),
      createRow('Giáo viên (Teacher)', r.teacherName || '—'),
      createRow('Ngày giảng dạy (Date)', r.date || '—'),
      createRow('Buổi học số (Lesson No.)', `Lesson ${r.lessonNumber || 1}`),
      createRow('Giáo trình (Textbook)', r.textbook || '—'),
      createRow('Nội dung bài dạy (Content)', r.lessonContent || '—'),
      createRow('Mục tiêu bài học (Objectives)', r.learningObjectives || '—'),
      createRow('Hoạt động đã triển khai (Activities)', r.activitiesCompleted || '—'),
      createRow('Bài tập về nhà (Homework)', r.homeworkAssigned || '—'),
      createRow('Học sinh cần lưu ý (Attention)', r.studentsAttention || '—'),
      createRow('Ghi chú giảng dạy (Teaching Notes)', r.teachingNotes || '—'),
      createRow(
        'Trạng thái phê duyệt (Status)',
        r.status === 'approved' ? 'ĐÃ DUYỆT (Approved)' : r.status === 'reviewed' ? 'ĐÃ KIỂM TRA (Reviewed)' : 'ĐÃ NỘP (Submitted)'
      ),
      createRow('Nhận xét của Quản lý học thuật', r.managerFeedback || 'Chưa có nhận xét'),
      createRow('Thời gian nộp báo cáo', r.submittedAt || '—'),
    ],
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
            spacing: { before: 80, after: 60 },
            children: [
              new TextRun({
                text: 'LEEGO ENGLISH CENTER',
                font: 'Times New Roman',
                size: 24,
                bold: true,
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 140 },
            children: [
              new TextRun({
                text: 'BÁO CÁO BÀI GIẢNG / LESSON PLAN REPORT',
                font: 'Times New Roman',
                size: 32, // 16pt
                bold: true,
                color: 'C00000',
              }),
            ],
          }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanClassName = (r.className || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Lesson_Report_${cleanClassName}_Lesson_${r.lessonNumber || 1}_${r.date || ''}.docx`;

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

  // Helper to create table cell
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

  // Helper for multiline text cell
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

  // Build Table Rows
  // Row 1: Date
  const dateRow = new TableRow({
    children: [
      createCell([{ text: 'Date', bold: true }], { isHeader: true }),
      ...sessions.map(s => createCell([{ text: s.dateOrdinal || s.date, bold: true }], { isHeader: true })),
    ],
  });

  // Row 2: Teacher
  const teacherRow = new TableRow({
    children: [
      createCell([{ text: 'Teacher', bold: true }], { isHeader: true }),
      ...sessions.map(s => createCell([{ text: s.teacherName || '' }])),
    ],
  });

  // Row 3: T.A
  const taRow = new TableRow({
    children: [
      createCell([{ text: 'T.A', bold: true }], { isHeader: true }),
      ...sessions.map(s => createCell([{ text: s.teachingAssistantName || '' }])),
    ],
  });

  // Row 4: Lesson
  const lessonRow = new TableRow({
    children: [
      createCell([{ text: 'Lesson', bold: true }], { isHeader: true }),
      ...sessions.map(s => createMultilineCell(s.lesson || '', undefined, true)),
    ],
  });

  // Row 5: Contents
  const contentsRow = new TableRow({
    children: [
      createCell([{ text: 'Contents', bold: true }], { isHeader: true }),
      ...sessions.map(s => createMultilineCell(s.contents || '')),
    ],
  });

  // Row 6: Notes
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
              top: 720, // 0.5 in
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          // Centered Red Heading
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 140 },
            children: [
              new TextRun({
                text: titleText,
                font: 'Times New Roman',
                size: 32, // 16pt
                bold: true,
                color: 'C00000', // Traditional center red heading
              }),
            ],
          }),

          // Class Information Header Line 1
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

          // Class Information Header Line 2
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
                color: '1D4ED8', // Blue text for course book
              }),
            ],
          }),

          // Spacing before table
          new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }),

          // The Horizontal Schedule Table
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
