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
  LessonReportLockAuditEntry,
  StudentLessonReportEntry
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
  lessonReports?: LessonReport[];
  incompleteReports?: IncompleteReportRecord[];
  makeupSessions?: MakeupClassSession[];
  lessonReportLockAudits?: LessonReportLockAuditEntry[];
}

export function loadInitialStorage(): AppDataStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all keys exist
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
        lessonReports: Array.isArray(parsed.lessonReports) ? parsed.lessonReports : [],
        incompleteReports: Array.isArray(parsed.incompleteReports) ? parsed.incompleteReports : [],
        makeupSessions: Array.isArray(parsed.makeupSessions) ? parsed.makeupSessions : [],
        lessonReportLockAudits: Array.isArray(parsed.lessonReportLockAudits) ? parsed.lessonReportLockAudits : [],
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
    lessonReports: [],
    incompleteReports: [],
    makeupSessions: [],
    lessonReportLockAudits: [],
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
 * Formatted professionally with Landscape orientation, Times New Roman,
 * clear borders, centered red title, blue course book title, and accurate session data.
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
  const numCols = sessions.length + 1; // 1 label column + sessions

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
 * Table horizontal format: 1 column per session, 1 row per field.
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

  // Set column widths: 1st label column ~15 chars, each session ~28 chars
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

export function getVietnamTodayISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value || '2026';
  const m = parts.find(p => p.type === 'month')?.value || '01';
  const d = parts.find(p => p.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
}

export function getVietnamNowFormatted(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

export function computeReportDeadlineISO(teachingDate: string): string {
  const match = (teachingDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return `${getVietnamTodayISO()}T17:00:00+07:00`;
  }
  const utcMidnight = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const nextDay = new Date(utcMidnight + 24 * 60 * 60 * 1000);
  const y = nextDay.getUTCFullYear();
  const m = String(nextDay.getUTCMonth() + 1).padStart(2, '0');
  const d = String(nextDay.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}T17:00:00+07:00`;
}

export function isReportExpired(report: Pick<LessonReport, 'teachingDate' | 'deadlineAt'>): boolean {
  const deadlineStr = report.deadlineAt || computeReportDeadlineISO(report.teachingDate);
  const deadlineMs = Date.parse(deadlineStr);
  if (Number.isNaN(deadlineMs)) return false;
  return Date.now() >= deadlineMs;
}

export function isStudentReportEntryComplete(entry: StudentLessonReportEntry): boolean {
  return Boolean(
    entry.homeworkStatus &&
      entry.previousLessonStatus &&
      entry.comments &&
      entry.comments.trim().length > 0
  );
}

export async function exportLessonReportToWord(report: LessonReport) {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 6,
    color: '000000'
  };
  const cellBorders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle
  };

  const headerRow = new TableRow({
    children: [
      'Lớp',
      'Học viên',
      'Tình hình làm BTVN',
      'Tình hình học bài cũ',
      'Nhận xét',
      'Giáo viên',
      'Ghi chú'
    ].map(
      text =>
        new TableCell({
          borders: cellBorders,
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text, bold: true, size: 20, font: 'Times New Roman' })]
            })
          ]
        })
    )
  });

  const dataRows = (report.studentReports || []).map(
    (s, idx) =>
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: idx === 0 ? report.className : '',
                    bold: true,
                    size: 20,
                    font: 'Times New Roman'
                  })
                ]
              })
            ]
          }),
          new TableCell({
            borders: cellBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: s.studentName, bold: true, size: 20, font: 'Times New Roman' })]
              })
            ]
          }),
          new TableCell({
            borders: cellBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: s.homeworkStatus || '—', size: 20, font: 'Times New Roman' })]
              })
            ]
          }),
          new TableCell({
            borders: cellBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: s.previousLessonStatus || '—', size: 20, font: 'Times New Roman' })]
              })
            ]
          }),
          new TableCell({
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [new TextRun({ text: s.comments || '—', size: 20, font: 'Times New Roman' })]
              })
            ]
          }),
          new TableCell({
            borders: cellBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: report.teacherName || '—', size: 20, font: 'Times New Roman' })]
              })
            ]
          }),
          new TableCell({
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [new TextRun({ text: s.notes || '', color: 'DC2626', bold: true, size: 20, font: 'Times New Roman' })]
              })
            ]
          })
        ]
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `BÁO CÁO TÌNH HÌNH HỌC TẬP CỦA LỚP ${(report.className || '').toUpperCase()}`,
                bold: true,
                color: 'DC2626',
                size: 28,
                font: 'Times New Roman'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `BUỔI HỌC NGÀY ${(report.teachingDate || '').split('-').reverse().join('/')}`,
                bold: true,
                size: 24,
                font: 'Times New Roman'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `TIẾN ĐỘ BÀI HỌC: ${report.lessonProgress || 'Chưa cập nhật'}`,
                bold: true,
                color: '1D4ED8',
                size: 22,
                font: 'Times New Roman'
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanClassName = (report.className || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `Lesson_Report_${cleanClassName}_${report.teachingDate}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ClassWeeklyScheduleSlot {
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  timeRange: string;
}

const WEEKDAY_MATCHERS: { dayOfWeek: number; dayName: string; patterns: RegExp[] }[] = [
  { dayOfWeek: 1, dayName: 'Thứ 2', patterns: [/thứ\s*2/i, /\bt2\b/i, /\bmonday\b/i, /\bmon\b/i] },
  { dayOfWeek: 2, dayName: 'Thứ 3', patterns: [/thứ\s*3/i, /\bt3\b/i, /\btuesday\b/i, /\btue\b/i] },
  { dayOfWeek: 3, dayName: 'Thứ 4', patterns: [/thứ\s*4/i, /\bt4\b/i, /\bwednesday\b/i, /\bwed\b/i] },
  { dayOfWeek: 4, dayName: 'Thứ 5', patterns: [/thứ\s*5/i, /\bt5\b/i, /\bthursday\b/i, /\bthu\b/i] },
  { dayOfWeek: 5, dayName: 'Thứ 6', patterns: [/thứ\s*6/i, /\bt6\b/i, /\bfriday\b/i, /\bfri\b/i] },
  { dayOfWeek: 6, dayName: 'Thứ 7', patterns: [/thứ\s*7/i, /\bt7\b/i, /\bsaturday\b/i, /\bsat\b/i] },
  { dayOfWeek: 7, dayName: 'Chủ Nhật', patterns: [/chủ\s*nhật/i, /\bcn\b/i, /\bsunday\b/i, /\bsun\b/i] }
];

const TIME_RANGE_REGEX =
  /(\d{1,2}\s*[:h]\s*\d{2}(?:\s*(?:am|pm))?)\s*[-–—]\s*(\d{1,2}\s*[:h]\s*\d{2}(?:\s*(?:am|pm))?)/i;

function splitTimeRange(timeStr: string): { startTime: string; endTime: string; timeRange: string } {
  const cleaned = (timeStr || '').trim();
  const match = cleaned.match(TIME_RANGE_REGEX);
  if (match) {
    const startTime = match[1].trim();
    const endTime = match[2].trim();
    return { startTime, endTime, timeRange: `${startTime} – ${endTime}` };
  }
  return { startTime: cleaned, endTime: '', timeRange: cleaned };
}

/**
 * Parse a ClassItem's schedule (supports per-weekday schedule strings and legacy scheduleDays + scheduleTime)
 */
export function getClassWeeklySchedule(cls?: ClassItem | null): ClassWeeklyScheduleSlot[] {
  if (!cls) return [];

  const maybeWeekly = (cls as { weeklySchedule?: Array<Partial<ClassWeeklyScheduleSlot>> }).weeklySchedule;
  if (Array.isArray(maybeWeekly) && maybeWeekly.length > 0) {
    return maybeWeekly
      .filter((slot): slot is Partial<ClassWeeklyScheduleSlot> & { dayOfWeek: number } =>
        Boolean(slot && typeof slot.dayOfWeek === 'number')
      )
      .map(slot => {
        const startTime = typeof slot.startTime === 'string' ? slot.startTime.trim() : '';
        const endTime = typeof slot.endTime === 'string' ? slot.endTime.trim() : '';
        const timeRange =
          typeof slot.timeRange === 'string' && slot.timeRange.trim()
            ? slot.timeRange.trim()
            : startTime && endTime
            ? `${startTime} – ${endTime}`
            : startTime || endTime || '';
        return {
          dayOfWeek: slot.dayOfWeek,
          dayName: typeof slot.dayName === 'string' ? slot.dayName : '',
          startTime,
          endTime,
          timeRange
        };
      })
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  const scheduleDays = typeof cls.scheduleDays === 'string' ? cls.scheduleDays : '';
  const fallbackTime = typeof cls.scheduleTime === 'string' ? cls.scheduleTime : '';
  if (!scheduleDays.trim()) return [];

  const slotsByDay = new Map<number, ClassWeeklyScheduleSlot>();
  const segments = scheduleDays.split(/[,;/\n]+/).map(s => s.trim()).filter(Boolean);

  for (const segment of segments) {
    const segmentTimeMatch = segment.match(TIME_RANGE_REGEX);
    const segmentTime = segmentTimeMatch ? segmentTimeMatch[0] : fallbackTime;
    const { startTime, endTime, timeRange } = splitTimeRange(segmentTime);

    for (const day of WEEKDAY_MATCHERS) {
      if (day.patterns.some(p => p.test(segment)) && !slotsByDay.has(day.dayOfWeek)) {
        slotsByDay.set(day.dayOfWeek, {
          dayOfWeek: day.dayOfWeek,
          dayName: day.dayName,
          startTime,
          endTime,
          timeRange
        });
      }
    }
  }

  return Array.from(slotsByDay.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

/**
 * Format weekly schedule slots into a concise summary string for display.
 */
export function formatScheduleTimeSummary(slots: ClassWeeklyScheduleSlot[]): string {
  if (!Array.isArray(slots) || slots.length === 0) return '';

  const nonEmptyTimes = slots
    .map(s => (typeof s?.timeRange === 'string' ? s.timeRange.trim() : ''))
    .filter(Boolean);
  if (nonEmptyTimes.length === 0) {
    return slots.map(s => s?.dayName || '').filter(Boolean).join(', ');
  }

  const uniqueTimes = Array.from(new Set(nonEmptyTimes));
  if (uniqueTimes.length === 1) {
    const daysLabel = slots.map(s => s?.dayName || '').filter(Boolean).join(', ');
    return daysLabel ? `${uniqueTimes[0]} (${daysLabel})` : uniqueTimes[0];
  }

  return slots
    .map(s => {
      const time = typeof s?.timeRange === 'string' ? s.timeRange.trim() : '';
      const day = s?.dayName || '';
      if (day && time) return `${day}: ${time}`;
      return day || time;
    })
    .filter(Boolean)
    .join(' | ');
}

export function exportLessonReportToExcel(report: LessonReport) {
  const rows = (report.studentReports || []).map((s, idx) => ({
    STT: idx + 1,
    'Lớp': report.className,
    'Học viên': s.studentName,
    'Tình hình làm BTVN': s.homeworkStatus || '',
    'Tình hình học bài cũ': s.previousLessonStatus || '',
    'Nhận xét': s.comments || '',
    'Giáo viên': report.teacherName || '',
    'Ghi chú': s.notes || ''
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'LessonReport');
  const cleanClassName = (report.className || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `Lesson_Report_${cleanClassName}_${report.teachingDate}.xlsx`);
}

