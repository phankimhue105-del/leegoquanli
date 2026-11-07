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
  LessonReport,
  IncompleteReportRecord,
  MakeupClassSession,
  CourseDurationRecord,
  CourseHoliday,
  CourseMakeupSession,
  CourseDurationHistoryEntry
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
  initialTeachingSchedules,
  initialLessonReports,
  initialIncompleteReports,
  initialMakeupSessions,
  initialCourseDurations,
  initialCourseHolidays,
  initialCourseMakeups,
  initialCourseDurationHistory
} from '../data/initialData';

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
  lessonReports: LessonReport[];
  incompleteReports: IncompleteReportRecord[];
  makeupSessions: MakeupClassSession[];
  courseDurations: CourseDurationRecord[];
  courseHolidays: CourseHoliday[];
  courseMakeups: CourseMakeupSession[];
  courseDurationHistory: CourseDurationHistoryEntry[];
}

export function loadInitialStorage(): AppDataStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
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
        lessonReports: parsed.lessonReports || initialLessonReports,
        incompleteReports: parsed.incompleteReports || initialIncompleteReports,
        makeupSessions: parsed.makeupSessions || initialMakeupSessions,
        courseDurations: parsed.courseDurations || initialCourseDurations,
        courseHolidays: parsed.courseHolidays || initialCourseHolidays,
        courseMakeups: parsed.courseMakeups || initialCourseMakeups,
        courseDurationHistory: parsed.courseDurationHistory || initialCourseDurationHistory,
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
    lessonReports: initialLessonReports,
    incompleteReports: initialIncompleteReports,
    makeupSessions: initialMakeupSessions,
    courseDurations: initialCourseDurations,
    courseHolidays: initialCourseHolidays,
    courseMakeups: initialCourseMakeups,
    courseDurationHistory: initialCourseDurationHistory,
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
    lessonReports: initialLessonReports,
    incompleteReports: initialIncompleteReports,
    makeupSessions: initialMakeupSessions,
    courseDurations: initialCourseDurations,
    courseHolidays: initialCourseHolidays,
    courseMakeups: initialCourseMakeups,
    courseDurationHistory: initialCourseDurationHistory,
  };
  saveStorage(defaultData);
  return defaultData;
}

// Excel Export Functions
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
                size: 19,
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
                size: 18,
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
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
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

// ==========================================
// LESSON REPORT EXPORT (WORD & EXCEL)
// ==========================================

/**
 * Export Daily Parent Learning Report to Microsoft Word (.docx)
 * Clean educational layout with 7 columns, Times New Roman, and official header.
 */
export async function exportLessonReportToWord(report: LessonReport): Promise<void> {
  const borderSingle = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };

  const createCell = (
    text: string,
    options?: { isHeader?: boolean; bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string }
  ) => {
    const lines = (text || '').split('\n');
    return new TableCell({
      borders: borderSingle,
      verticalAlign: VerticalAlign.CENTER,
      shading: options?.isHeader ? { fill: 'F3F4F6', type: ShadingType.CLEAR } : undefined,
      children: lines.map(
        line =>
          new Paragraph({
            spacing: { before: 30, after: 30, line: 240 },
            alignment: options?.align || (options?.isHeader ? AlignmentType.CENTER : AlignmentType.LEFT),
            children: [
              new TextRun({
                text: line,
                font: 'Times New Roman',
                size: options?.isHeader ? 20 : 19,
                bold: options?.bold ?? options?.isHeader ?? false,
                color: options?.color || '000000',
              }),
            ],
          })
      ),
    });
  };

  // Header row
  const headerRow = new TableRow({
    children: [
      createCell('Lớp', { isHeader: true }),
      createCell('Học viên', { isHeader: true }),
      createCell('Tình hình làm BVN', { isHeader: true }),
      createCell('Tình hình học bài cũ', { isHeader: true }),
      createCell('Nhận xét', { isHeader: true }),
      createCell('Giao BVN', { isHeader: true }),
      createCell('Ghi chú', { isHeader: true }),
    ],
  });

  // Student rows
  const studentRows = report.studentReports.map(student => {
    return new TableRow({
      children: [
        createCell(report.className, { align: AlignmentType.CENTER, bold: true }),
        createCell(student.studentName, { bold: true }),
        createCell(student.homeworkStatus || '—', { align: AlignmentType.CENTER }),
        createCell(student.previousLessonStatus || '—', { align: AlignmentType.CENTER }),
        createCell(student.comments || '—'),
        createCell(student.assignedHomework || '—'),
        createCell(student.notes || ''),
      ],
    });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderSingle,
    rows: [headerRow, ...studentRows],
  });

  const [y, m, d] = report.teachingDate.split('-');
  const dateFormatted = `${d}/${m}/${y}`;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 60 },
            children: [
              new TextRun({
                text: `BÁO CÁO TÌNH HÌNH HỌC TẬP CỦA LỚP ${report.className.toUpperCase()}`,
                font: 'Times New Roman',
                size: 28,
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
                text: `BUỔI HỌC NGÀY ${dateFormatted}`,
                font: 'Times New Roman',
                size: 24,
                bold: true,
                color: '1E293B',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 20, after: 120 },
            children: [
              new TextRun({
                text: `TIẾN ĐỘ BÀI HỌC: `,
                font: 'Times New Roman',
                size: 22,
                bold: true,
                color: '0F172A',
              }),
              new TextRun({
                text: report.lessonProgress || 'Chưa cập nhật',
                font: 'Times New Roman',
                size: 22,
                bold: true,
                color: '1D4ED8',
              }),
            ],
          }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanClassName = report.className.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Bao_Cao_Hoc_Tap_${cleanClassName}_${report.teachingDate}.docx`;

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
 * Export Daily Parent Learning Report to Microsoft Excel (.xlsx)
 */
export function exportLessonReportToExcel(report: LessonReport): void {
  const [y, m, d] = report.teachingDate.split('-');
  const dateFormatted = `${d}/${m}/${y}`;

  const titleRow = [`BÁO CÁO TÌNH HÌNH HỌC TẬP CỦA LỚP ${report.className.toUpperCase()}`];
  const dateRow = [`BUỔI HỌC NGÀY ${dateFormatted}`];
  const progressRow = [`TIẾN ĐỘ BÀI HỌC: ${report.lessonProgress || 'Chưa cập nhật'}`];
  const infoRow = [`Giáo viên: ${report.teacherName}${report.teachingAssistantName ? ` | Trợ giảng: ${report.teachingAssistantName}` : ''} | Ca học: ${report.scheduledTime} | Phòng: ${report.classroom}`];

  const headerRow = [
    'Lớp',
    'Học viên',
    'Tình hình làm BVN',
    'Tình hình học bài cũ',
    'Nhận xét',
    'Giao BVN',
    'Ghi chú',
  ];

  const dataRows = report.studentReports.map(s => [
    report.className,
    s.studentName,
    s.homeworkStatus || '',
    s.previousLessonStatus || '',
    s.comments || '',
    s.assignedHomework || '',
    s.notes || '',
  ]);

  const aoa = [
    titleRow,
    dateRow,
    progressRow,
    infoRow,
    [],
    headerRow,
    ...dataRows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  worksheet['!cols'] = [
    { wch: 16 }, // Lớp
    { wch: 24 }, // Học viên
    { wch: 20 }, // Tình hình làm BVN
    { wch: 22 }, // Tình hình học bài cũ
    { wch: 40 }, // Nhận xét
    { wch: 30 }, // Giao BVN
    { wch: 25 }, // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BaoCaoHocTap');
  const cleanClassName = report.className.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(
    workbook,
    `LeeGo_Bao_Cao_Hoc_Tap_${cleanClassName}_${report.teachingDate}.xlsx`
  );
}


/**
 * Export Course Duration Management List to Excel (.xlsx)
 */
export function exportCourseDurationsToExcel(courses: CourseDurationRecord[]): void {
  const titleRow = ['BÁO CÁO QUẢN LÝ THỜI GIAN KHÓA HỌC – LEEGO CENTER'];
  const generatedRow = [`Thời điểm xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`];
  const summaryRow = [`Tổng số khóa học theo dõi: ${courses.length}`];

  const headerRow = [
    'Mã khóa học',
    'Tên khóa học',
    'Lớp học',
    'Giáo viên phụ trách',
    'Giáo trình',
    'Hình thức thời lượng',
    'Thời lượng',
    'Ngày bắt đầu',
    'Ngày hoàn thành ban đầu',
    'Ngày hoàn thành hiện tại',
    'Chính sách gia hạn',
    'Buổi yêu cầu',
    'Buổi hoàn thành',
    'Buổi còn lại',
    'Tiến độ (%)',
    'Trạng thái',
    'Ghi chú & Giải thích tính toán'
  ];

  const durationModeLabels: Record<string, string> = {
    months: 'Tháng lịch',
    calendar_days: 'Ngày lịch',
    learning_days: 'Ngày học thực tế',
    learning_sessions: 'Số buổi học'
  };

  const statusLabels: Record<string, string> = {
    not_started: 'Chưa khai giảng',
    in_progress: 'Đang diễn ra',
    near_completion: 'Sắp hoàn thành',
    completed: 'Đã hoàn thành',
    extended: 'Đã gia hạn',
    on_hold: 'Tạm dừng'
  };

  const policyLabels: Record<string, string> = {
    none: 'Không tự động kéo dài',
    missed_scheduled_lessons: 'Gia hạn theo buổi nghỉ có phép',
    scheduled_holidays: 'Gia hạn theo ngày nghỉ lễ trung tâm',
    all_non_study_days: 'Gia hạn toàn bộ ngày không học',
    custom: 'Chính sách tùy chỉnh'
  };

  const dataRows = courses.map(c => [
    c.id,
    c.courseName,
    c.className || 'Chưa gán',
    c.teacherName || 'Chưa gán',
    c.courseBook || '',
    durationModeLabels[c.durationMode] || c.durationMode,
    c.durationValue,
    c.courseStartDate,
    c.originalExpectedCompletionDate,
    c.currentExpectedCompletionDate,
    policyLabels[c.extensionPolicy] || c.extensionPolicy,
    c.requiredSessions,
    c.completedSessions,
    c.remainingSessions,
    `${c.progressPercentage}%`,
    statusLabels[c.status] || c.status,
    c.notes ? `${c.notes} | ${c.calculationExplanation || ''}` : (c.calculationExplanation || '')
  ]);

  const aoa = [
    titleRow,
    generatedRow,
    summaryRow,
    [],
    headerRow,
    ...dataRows
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  worksheet['!cols'] = [
    { wch: 14 }, // Mã
    { wch: 32 }, // Tên
    { wch: 24 }, // Lớp
    { wch: 22 }, // GV
    { wch: 26 }, // Giáo trình
    { wch: 18 }, // Hình thức
    { wch: 12 }, // Thời lượng
    { wch: 14 }, // Ngày bắt đầu
    { wch: 18 }, // Ngày HT ban đầu
    { wch: 18 }, // Ngày HT hiện tại
    { wch: 26 }, // Chính sách
    { wch: 12 }, // Yêu cầu
    { wch: 14 }, // Hoàn thành
    { wch: 12 }, // Còn lại
    { wch: 12 }, // Tiến độ
    { wch: 16 }, // Trạng thái
    { wch: 45 }  // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ThoiGianKhoaHoc');
  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `LeeGo_Quan_Ly_Thoi_Gian_Khoa_Hoc_${dateStamp}.xlsx`);
}
