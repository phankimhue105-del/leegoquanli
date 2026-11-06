import * as XLSX from 'xlsx';
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
  Parent
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
  initialParents
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
