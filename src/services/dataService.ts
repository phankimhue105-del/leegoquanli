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
  VerticalMergeType,
  ShadingType
} from 'docx';
import {
  Student,
  ClassItem,
  ClassScheduleSlot,
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
  TeachingSession
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

export const WEEKDAY_OPTIONS: { dayOfWeek: number; label: string; shortLabel: string }[] = [
  { dayOfWeek: 1, label: 'Thứ 2', shortLabel: 'T2' },
  { dayOfWeek: 2, label: 'Thứ 3', shortLabel: 'T3' },
  { dayOfWeek: 3, label: 'Thứ 4', shortLabel: 'T4' },
  { dayOfWeek: 4, label: 'Thứ 5', shortLabel: 'T5' },
  { dayOfWeek: 5, label: 'Thứ 6', shortLabel: 'T6' },
  { dayOfWeek: 6, label: 'Thứ 7', shortLabel: 'T7' },
  { dayOfWeek: 7, label: 'Chủ Nhật', shortLabel: 'CN' },
];

export function getWeekdayLabel(dayOfWeek: number): string {
  return WEEKDAY_OPTIONS.find(d => d.dayOfWeek === dayOfWeek)?.label || `Thứ ${dayOfWeek + 1}`;
}

export function getWeekdayShortLabel(dayOfWeek: number): string {
  return WEEKDAY_OPTIONS.find(d => d.dayOfWeek === dayOfWeek)?.shortLabel || `T${dayOfWeek + 1}`;
}

export function timeStringToMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec((timeStr || '').trim());
  if (!match) return NaN;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start = timeStringToMinutes(startTime);
  const end = timeStringToMinutes(endTime);
  return !Number.isNaN(start) && !Number.isNaN(end) && end > start;
}

export function parseLegacyScheduleDays(rawDays: string): number[] {
  const lower = (rawDays || '').toLowerCase();
  const days: number[] = [];

  if (lower.includes('thứ 2') || /\bt2\b/.test(lower) || lower.includes('monday') || /\bmon\b/.test(lower)) days.push(1);
  if (lower.includes('thứ 3') || /\bt3\b/.test(lower) || lower.includes('tuesday') || /\btue\b/.test(lower)) days.push(2);
  if (lower.includes('thứ 4') || /\bt4\b/.test(lower) || lower.includes('wednesday') || /\bwed\b/.test(lower)) days.push(3);
  if (lower.includes('thứ 5') || /\bt5\b/.test(lower) || lower.includes('thursday') || /\bthu\b/.test(lower)) days.push(4);
  if (lower.includes('thứ 6') || /\bt6\b/.test(lower) || lower.includes('friday') || /\bfri\b/.test(lower)) days.push(5);
  if (lower.includes('thứ 7') || /\bt7\b/.test(lower) || lower.includes('saturday') || /\bsat\b/.test(lower)) days.push(6);
  if (lower.includes('chủ nhật') || /\bcn\b/.test(lower) || lower.includes('sunday') || /\bsun\b/.test(lower)) days.push(7);

  return days;
}

export function parseLegacyTimeSlot(rawTime: string): { startTime: string; endTime: string } {
  const match = /(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(rawTime || '');
  if (!match) {
    return { startTime: '17:30', endTime: '19:00' };
  }

  let sh = Number(match[1]);
  const sm = match[2];
  const sMer = (match[3] || '').toLowerCase();
  let eh = Number(match[4]);
  const em = match[5];
  const eMer = (match[6] || '').toLowerCase();

  if (eMer === 'pm' && eh < 12) {
    eh += 12;
    if (!sMer && sh < 12) sh += 12;
  } else if (eMer === 'am' && eh === 12) {
    eh = 0;
  }

  if (sMer === 'pm' && sh < 12) sh += 12;
  if (sMer === 'am' && sh === 12) sh = 0;

  return {
    startTime: `${String(sh).padStart(2, '0')}:${sm}`,
    endTime: `${String(eh).padStart(2, '0')}:${em}`
  };
}

export function sortAndDedupeScheduleSlots(slots: ClassScheduleSlot[]): ClassScheduleSlot[] {
  const byDay = new Map<number, ClassScheduleSlot>();
  slots.forEach(slot => {
    if (slot.dayOfWeek >= 1 && slot.dayOfWeek <= 7) {
      byDay.set(slot.dayOfWeek, {
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        ...(slot.teacherId !== undefined ? { teacherId: slot.teacherId } : {}),
        ...(slot.assistantTeacherId !== undefined ? { assistantTeacherId: slot.assistantTeacherId } : {})
      });
    }
  });
  return Array.from(byDay.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

/**
 * Safely resolve per-weekday schedule slots for both new (`weeklySchedule`)
 * and legacy (`scheduleDays` + `scheduleTime`) class records without destructive migration.
 */
export function getClassWeeklySchedule(
  cls: Pick<ClassItem, 'weeklySchedule' | 'scheduleDays' | 'scheduleTime'> & {
    teacherId?: string;
    assistantTeacherId?: string;
  }
): ClassScheduleSlot[] {
  if (Array.isArray(cls.weeklySchedule) && cls.weeklySchedule.length > 0) {
    return sortAndDedupeScheduleSlots(cls.weeklySchedule);
  }

  const days = parseLegacyScheduleDays(cls.scheduleDays || '');
  const { startTime, endTime } = parseLegacyTimeSlot(cls.scheduleTime || '');
  return days.map(dayOfWeek => ({
    dayOfWeek,
    startTime,
    endTime,
    ...(cls.teacherId ? { teacherId: cls.teacherId } : {}),
    ...(cls.assistantTeacherId ? { assistantTeacherId: cls.assistantTeacherId } : {})
  }));
}

export function formatScheduleDaysLabel(slots: ClassScheduleSlot[]): string {
  const ordered = sortAndDedupeScheduleSlots(slots);
  return ordered.map(s => getWeekdayLabel(s.dayOfWeek)).join(', ');
}

export function formatScheduleTimeSummary(slots: ClassScheduleSlot[]): string {
  const ordered = sortAndDedupeScheduleSlots(slots);
  if (ordered.length === 0) return '';

  const first = ordered[0];
  const allSame = ordered.every(s => s.startTime === first.startTime && s.endTime === first.endTime);
  if (allSame) {
    return `${first.startTime} - ${first.endTime}`;
  }

  return ordered
    .map(s => `${getWeekdayShortLabel(s.dayOfWeek)}: ${s.startTime}-${s.endTime}`)
    .join(' | ');
}

export function getDayOfWeekFromDateString(dateStr: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || '').trim());
  if (!match) return null;
  const dateObj = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const jsDay = dateObj.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function getSessionTimeForDate(cls: ClassItem, dateStr: string): string {
  const slots = getClassWeeklySchedule(cls);
  const dayOfWeek = getDayOfWeekFromDateString(dateStr);
  if (dayOfWeek !== null) {
    const matched = slots.find(s => s.dayOfWeek === dayOfWeek);
    if (matched) {
      return `${matched.startTime} - ${matched.endTime}`;
    }
  }
  return formatScheduleTimeSummary(slots) || cls.scheduleTime || '';
}

export function doWeeklySchedulesOverlap(
  slotsA: ClassScheduleSlot[],
  slotsB: ClassScheduleSlot[]
): ClassScheduleSlot | null {
  for (const a of slotsA) {
    const startA = timeStringToMinutes(a.startTime);
    const endA = timeStringToMinutes(a.endTime);
    if (Number.isNaN(startA) || Number.isNaN(endA)) continue;

    for (const b of slotsB) {
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      const startB = timeStringToMinutes(b.startTime);
      const endB = timeStringToMinutes(b.endTime);
      if (Number.isNaN(startB) || Number.isNaN(endB)) continue;

      if (Math.max(startA, startB) < Math.min(endA, endB)) {
        return a;
      }
    }
  }
  return null;
}

export interface CourseDurationExportItem {
  id: string;
  courseName: string;
  classId?: string;
  className?: string;
  courseBook?: string;
  teacherId?: string;
  teacherName?: string;
  durationMode?: string;
  durationValue?: number;
  courseStartDate?: string;
  originalExpectedCompletionDate?: string;
  currentExpectedCompletionDate?: string;
  extensionPolicy?: string;
  requiredSessions?: number;
  completedSessions?: number;
  remainingSessions?: number;
  progressPercentage?: number;
  status?: string;
  calculationExplanation?: string;
  notes?: string;
}

export interface StudentLessonReportExportEntry {
  studentId: string;
  studentName: string;
  homeworkStatus?: string;
  previousLessonStatus?: string;
  comments?: string;
  assignedHomework?: string;
  notes?: string;
  completed?: boolean;
}

export interface LessonReportExportItem {
  id: string;
  classId: string;
  className: string;
  teachingDate: string;
  scheduledTime?: string;
  classroom?: string;
  teacherId?: string;
  teacherName?: string;
  teachingAssistantName?: string;
  lessonProgress?: string;
  studentReports?: StudentLessonReportExportEntry[];
}

function getCourseDurationModeLabel(mode?: string): string {
  switch (mode) {
    case 'months':
      return 'Tháng lịch';
    case 'calendar_days':
      return 'Ngày lịch';
    case 'learning_days':
      return 'Ngày học thực tế';
    case 'learning_sessions':
      return 'Số buổi học';
    default:
      return mode || '';
  }
}

function getCourseExtensionPolicyLabel(policy?: string): string {
  switch (policy) {
    case 'none':
      return 'Không gia hạn';
    case 'scheduled_holidays':
      return 'Gia hạn theo ngày lễ trung tâm';
    case 'all_non_study_days':
      return 'Gia hạn mọi ngày nghỉ';
    case 'missed_scheduled_lessons':
      return 'Gia hạn buổi nghỉ có phép';
    case 'custom':
      return 'Tùy chỉnh';
    default:
      return policy || 'Theo lịch chuẩn';
  }
}

function getCourseStatusLabel(status?: string): string {
  switch (status) {
    case 'not_started':
      return 'Chưa bắt đầu';
    case 'in_progress':
      return 'Đang học';
    case 'near_completion':
      return 'Sắp hoàn thành';
    case 'completed':
      return 'Đã hoàn thành';
    case 'extended':
      return 'Đã gia hạn';
    case 'on_hold':
      return 'Tạm hoãn';
    default:
      return status || '';
  }
}

function formatIsoDateVN(isoDate?: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

/**
 * Export Course Duration tracking records to Microsoft Excel (.xlsx)
 */
export function exportCourseDurationsToExcel(
  courseDurations: CourseDurationExportItem[],
  programs: AcademicProgram[] = []
): void {
  const programById = new Map(programs.map(p => [p.id, p]));
  const rows = (courseDurations || []).map((course, idx) => {
    const required = Number(course.requiredSessions || 0);
    const completed = Number(course.completedSessions || 0);
    const remaining =
      course.remainingSessions !== undefined
        ? course.remainingSessions
        : Math.max(0, required - completed);
    const linkedProgram = course.classId ? programById.get(course.classId) : undefined;

    return {
      'STT': idx + 1,
      'Mã khóa học': course.id || '',
      'Tên khóa học': course.courseName || '',
      'Lớp học': course.className || '',
      'Giáo trình': course.courseBook || linkedProgram?.textbook || '',
      'Giáo viên': course.teacherName || '',
      'Ngày bắt đầu': formatIsoDateVN(course.courseStartDate),
      'Chế độ thời lượng': getCourseDurationModeLabel(course.durationMode),
      'Thời lượng': course.durationValue ?? '',
      'Hoàn thành dự kiến ban đầu': formatIsoDateVN(course.originalExpectedCompletionDate),
      'Hoàn thành dự kiến hiện tại': formatIsoDateVN(course.currentExpectedCompletionDate),
      'Chính sách gia hạn': getCourseExtensionPolicyLabel(course.extensionPolicy),
      'Số buổi yêu cầu': required,
      'Số buổi đã học': completed,
      'Số buổi còn lại': remaining,
      'Tiến độ (%)': `${course.progressPercentage ?? 0}%`,
      'Trạng thái': getCourseStatusLabel(course.status),
      'Giải thích cách tính': course.calculationExplanation || '',
      'Ghi chú': course.notes || ''
    };
  });

  const exportRows =
    rows.length > 0
      ? rows
      : [
          {
            'STT': '',
            'Mã khóa học': '',
            'Tên khóa học': '',
            'Lớp học': '',
            'Giáo trình': '',
            'Giáo viên': '',
            'Ngày bắt đầu': '',
            'Chế độ thời lượng': '',
            'Thời lượng': '',
            'Hoàn thành dự kiến ban đầu': '',
            'Hoàn thành dự kiến hiện tại': '',
            'Chính sách gia hạn': '',
            'Số buổi yêu cầu': '',
            'Số buổi đã học': '',
            'Số buổi còn lại': '',
            'Tiến độ (%)': '',
            'Trạng thái': '',
            'Giải thích cách tính': '',
            'Ghi chú': ''
          }
        ];

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 36 },
    { wch: 28 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Thoi_gian_khoa_hoc');
  XLSX.writeFile(
    workbook,
    `LeeGo_Thoi_Gian_Khoa_Hoc_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

/**
 * Export Lesson Report to Microsoft Word (.docx) matching the Parent Report layout
 */
export async function exportLessonReportToWord(report: LessonReportExportItem): Promise<void> {
  const displayDate = formatIsoDateVN(report.teachingDate) || report.teachingDate || '';
  const classTitle = (report.className || '').toUpperCase();
  const studentRows = report.studentReports || [];

  const borderSingle = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };

  const makeCell = (
    text: string,
    options?: {
      bold?: boolean;
      color?: string;
      align?: (typeof AlignmentType)[keyof typeof AlignmentType];
      isHeader?: boolean;
      verticalMerge?: (typeof VerticalMergeType)[keyof typeof VerticalMergeType];
    }
  ) => {
    const lines = String(text || '').split('\n');
    return new TableCell({
      borders: borderSingle,
      verticalAlign: VerticalAlign.CENTER,
      verticalMerge: options?.verticalMerge,
      shading: options?.isHeader ? { fill: 'F3F4F6', type: ShadingType.CLEAR } : undefined,
      children: lines.map(
        line =>
          new Paragraph({
            alignment: options?.align || AlignmentType.LEFT,
            spacing: { before: 40, after: 40, line: 240 },
            children: [
              new TextRun({
                text: line,
                font: 'Times New Roman',
                size: 20, // 10pt
                bold: options?.bold ?? false,
                color: options?.color || '000000',
              }),
            ],
          })
      ),
    });
  };

  const headerRow = new TableRow({
    children: [
      makeCell('Lớp', { bold: true, align: AlignmentType.CENTER, isHeader: true }),
      makeCell('Học viên', { bold: true, align: AlignmentType.CENTER, isHeader: true }),
      makeCell('Tình hình làm BVN', { bold: true, align: AlignmentType.CENTER, isHeader: true }),
      makeCell('Tình hình học bài cũ', { bold: true, align: AlignmentType.CENTER, isHeader: true }),
      makeCell('Nhận xét', { bold: true, align: AlignmentType.CENTER, isHeader: true }),
      makeCell('Giao BVN', { bold: true, align: AlignmentType.CENTER, isHeader: true }),
      makeCell('Ghi chú', { bold: true, align: AlignmentType.CENTER, isHeader: true }),
    ],
  });

  const bodyRows =
    studentRows.length > 0
      ? studentRows.map(
          (student, idx) =>
            new TableRow({
              children: [
                makeCell(idx === 0 ? report.className || '' : '', {
                  bold: idx === 0,
                  align: AlignmentType.CENTER,
                  verticalMerge:
                    idx === 0 ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE,
                }),
                makeCell(student.studentName || '', { bold: true }),
                makeCell(student.homeworkStatus || '—', { align: AlignmentType.CENTER }),
                makeCell(student.previousLessonStatus || '—', { align: AlignmentType.CENTER }),
                makeCell(student.comments || '—'),
                makeCell(student.assignedHomework || '—'),
                makeCell(student.notes || '', { bold: Boolean(student.notes), color: 'DC2626' }),
              ],
            })
        )
      : [
          new TableRow({
            children: [
              makeCell(report.className || '', { bold: true, align: AlignmentType.CENTER }),
              makeCell('Chưa có dữ liệu học viên', { align: AlignmentType.CENTER }),
              makeCell('—', { align: AlignmentType.CENTER }),
              makeCell('—', { align: AlignmentType.CENTER }),
              makeCell('—'),
              makeCell('—'),
              makeCell(''),
            ],
          }),
        ];

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderSingle,
    rows: [headerRow, ...bodyRows],
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
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({
                text: `BÁO CÁO TÌNH HÌNH HỌC TẬP CỦA LỚP ${classTitle}`,
                font: 'Times New Roman',
                size: 30, // 15pt
                bold: true,
                color: 'DC2626',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text: `BUỔI HỌC NGÀY ${displayDate}`,
                font: 'Times New Roman',
                size: 24, // 12pt
                bold: true,
                color: '1E293B',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 140 },
            children: [
              new TextRun({
                text: `TIẾN ĐỘ BÀI HỌC: ${report.lessonProgress || 'Chưa cập nhật'}`,
                font: 'Times New Roman',
                size: 22, // 11pt
                bold: true,
                color: '1D4ED8',
              }),
            ],
          }),
          table,
          new Paragraph({
            spacing: { before: 160, after: 40 },
            children: [
              new TextRun({
                text: `Trung tâm Anh ngữ LeeGo Center • www.leego.edu.vn   |   Giáo viên phụ trách: ${report.teacherName || ''}`,
                font: 'Times New Roman',
                size: 18,
                italics: true,
                color: '475569',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanClassName = (report.className || report.classId || 'Lop').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Bao_Cao_Hoc_Tap_${cleanClassName}_${report.teachingDate || new Date().toISOString().slice(0, 10)}.docx`;

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
 * Export Lesson Report to Microsoft Excel (.xlsx)
 */
export function exportLessonReportToExcel(report: LessonReportExportItem): void {
  const displayDate = formatIsoDateVN(report.teachingDate) || report.teachingDate || '';
  const classTitle = (report.className || '').toUpperCase();
  const studentRows = report.studentReports || [];

  const metaLine = [
    `Buổi học ngày: ${displayDate}`,
    report.scheduledTime ? `Ca học: ${report.scheduledTime}` : '',
    report.classroom ? `Phòng: ${report.classroom}` : '',
    report.teacherName ? `Giáo viên: ${report.teacherName}` : '',
    report.teachingAssistantName ? `Trợ giảng: ${report.teachingAssistantName}` : ''
  ]
    .filter(Boolean)
    .join(' | ');

  const aoa: any[][] = [
    [`BÁO CÁO TÌNH HÌNH HỌC TẬP CỦA LỚP ${classTitle}`],
    [metaLine],
    [`TIẾN ĐỘ BÀI HỌC: ${report.lessonProgress || 'Chưa cập nhật'}`],
    [],
    ['STT', 'Lớp', 'Học viên', 'Tình hình làm BVN', 'Tình hình học bài cũ', 'Nhận xét', 'Giao BVN', 'Ghi chú']
  ];

  studentRows.forEach((student, idx) => {
    aoa.push([
      idx + 1,
      report.className || '',
      student.studentName || '',
      student.homeworkStatus || '—',
      student.previousLessonStatus || '—',
      student.comments || '—',
      student.assignedHomework || '—',
      student.notes || ''
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 24 },
    { wch: 18 },
    { wch: 20 },
    { wch: 40 },
    { wch: 30 },
    { wch: 24 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bao_cao_hoc_tap');
  const cleanClassName = (report.className || report.classId || 'Lop').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(
    workbook,
    `LeeGo_Bao_Cao_Hoc_Tap_${cleanClassName}_${report.teachingDate || new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
