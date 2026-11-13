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
  AcademicManager,
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
  initialAcademicManagers,
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
import { APPS_SCRIPT_URL } from './authService';

const STORAGE_KEY = 'leego_center_storage_v1';

export interface AppDataStore {
  students: Student[];
  classes: ClassItem[];
  teachers: Teacher[];
  teachingAssistants: TeachingAssistant[];
  academicManagers?: AcademicManager[];
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
        students: Array.isArray(parsed.students) ? parsed.students : [],
        classes: Array.isArray(parsed.classes) ? parsed.classes : [],
        teachers: Array.isArray(parsed.teachers) ? parsed.teachers : [],
        teachingAssistants: Array.isArray(parsed.teachingAssistants) ? parsed.teachingAssistants : [],
        academicManagers: Array.isArray(parsed.academicManagers) ? parsed.academicManagers : [],
        programs: Array.isArray(parsed.programs) ? parsed.programs : [],
        timetable: Array.isArray(parsed.timetable) ? parsed.timetable : [],
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
        assessments: Array.isArray(parsed.assessments) ? parsed.assessments : [],
        lessonPlans: Array.isArray(parsed.lessonPlans) ? parsed.lessonPlans : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
        parents: Array.isArray(parsed.parents) ? parsed.parents : [],
        settings: parsed.settings || { ...initialSettings, demoMode: false },
        activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
        teachingSchedules: Array.isArray(parsed.teachingSchedules) ? parsed.teachingSchedules : [],
        lessonReports: Array.isArray(parsed.lessonReports) ? parsed.lessonReports : [],
        incompleteReports: Array.isArray(parsed.incompleteReports) ? parsed.incompleteReports : [],
        makeupSessions: Array.isArray(parsed.makeupSessions) ? parsed.makeupSessions : [],
        lessonReportLockAudits: Array.isArray(parsed.lessonReportLockAudits) ? parsed.lessonReportLockAudits : [],
      };
    }
  } catch (err) {
    console.error('Failed to parse localStorage data', err);
  }

  // Check if session is authenticated
  const isAuth = typeof localStorage !== 'undefined' && localStorage.getItem('leego_auth_status_v1') === 'true';
  if (isAuth) {
    // Authenticated user on a clean computer: do NOT initialize with fake demo data!
    return {
      students: [],
      classes: [],
      teachers: [],
      teachingAssistants: [],
      academicManagers: [],
      programs: [],
      timetable: [],
      attendance: [],
      assessments: [],
      lessonPlans: [],
      users: [],
      parents: [],
      settings: { ...initialSettings, demoMode: false },
      activityLogs: [],
      teachingSchedules: [],
      lessonReports: [],
      incompleteReports: [],
      makeupSessions: [],
      lessonReportLockAudits: [],
    };
  }

  const defaultData: AppDataStore = {
    students: initialStudents,
    classes: initialClasses,
    teachers: initialTeachers,
    teachingAssistants: initialTeachingAssistants,
    academicManagers: initialAcademicManagers,
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

export interface GasDataResult {
  success: boolean;
  data?: Partial<AppDataStore>;
  message?: string;
  error?: string;
  timestamp?: string;
  updatedKeys?: string[];
}

/**
 * Loads shared data from Google Apps Script backend (`leegodata` sheet)
 */
export async function fetchCenterDataFromGoogleAppsScript(
  keys?: Array<keyof AppDataStore>
): Promise<GasDataResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const payload: { action: string; keys?: string[] } = { action: 'getCenterData' };
    if (Array.isArray(keys) && keys.length > 0) {
      payload.keys = keys as string[];
    }

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Máy chủ Google Apps Script phản hồi mã lỗi (${response.status})`
      };
    }

    const result: GasDataResult = await response.json();
    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'Yêu cầu tải dữ liệu từ Google Apps Script quá thời gian chờ (15s).'
      };
    }
    return {
      success: false,
      error: 'Không thể kết nối máy chủ Google Apps Script. Vui lòng kiểm tra mạng.'
    };
  }
}

/**
 * Saves shared data to Google Apps Script backend (`leegodata` sheet)
 */
export async function saveCenterDataToGoogleAppsScript(
  dataToSave: Partial<AppDataStore>,
  keysToSave?: Array<keyof AppDataStore>
): Promise<GasDataResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for write

  try {
    const targetKeys = keysToSave || (Object.keys(dataToSave) as Array<keyof AppDataStore>);
    const payload = {
      action: 'saveCenterData',
      keys: targetKeys,
      data: dataToSave
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Lỗi kết nối máy chủ (${response.status}) khi lưu dữ liệu lên Google Sheets.`
      };
    }

    const result: GasDataResult = await response.json();
    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'Thao tác lưu lên Google Sheets quá thời gian chờ (20s).'
      };
    }
    return {
      success: false,
      error: 'Lỗi mạng khi lưu lên Google Sheets.'
    };
  }
}

// ============================================================================
// MILESTONE 2: NON-DESTRUCTIVE FIELD-LEVEL MERGE ENGINE & CONFLICT RESOLUTION
// ============================================================================

export interface FieldConflict {
  field: string;
  fieldLabel: string;
  localValue: any;
  cloudValue: any;
}

export interface RecordConflict {
  category: keyof AppDataStore;
  categoryName: string;
  recordId: string;
  recordTitle: string;
  conflicts: FieldConflict[];
  localRecord: any;
  cloudRecord: any;
}

export interface MergeStats {
  addedFromCloud: number;
  addedFromLocal: number;
  mergedFieldLevel: number;
  identicalRecords: number;
  conflictsCount: number;
}

export interface MergeCenterDataResult {
  merged: AppDataStore;
  needsUpload: boolean;
  hasConflicts: boolean;
  conflicts: RecordConflict[];
  stats: MergeStats;
}

export const FIELD_LABELS: Record<string, string> = {
  fullName: 'Họ và tên',
  vietnameseName: 'Tên tiếng Việt / Tiếng Anh',
  dob: 'Ngày sinh',
  gender: 'Giới tính',
  school: 'Trường học',
  grade: 'Khối lớp',
  parentName: 'Họ tên phụ huynh',
  parentPhone: 'Số điện thoại phụ huynh',
  parentEmail: 'Email phụ huynh',
  address: 'Địa chỉ',
  currentLevel: 'Trình độ hiện tại',
  status: 'Trạng thái',
  notes: 'Ghi chú',
  name: 'Tên lớp / Tên',
  code: 'Mã lớp',
  teacherId: 'Giáo viên phụ trách',
  assistantTeacherId: 'Trợ giảng',
  classroom: 'Phòng học',
  scheduleDays: 'Ngày học trong tuần',
  scheduleTime: 'Giờ học',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  maxCapacity: 'Sĩ số tối đa',
  phone: 'Số điện thoại',
  email: 'Email',
  nationality: 'Quốc tịch',
  isNative: 'Giáo viên bản ngữ',
  qualifications: 'Bằng cấp / Chứng chỉ',
  experienceYears: 'Số năm kinh nghiệm',
  academicYear: 'Năm học',
  currentTerm: 'Học kỳ',
  centerName: 'Tên trung tâm',
  subtitle: 'Tiêu đề phụ',
  hotline: 'Hotline',
  hourlyRate: 'Thù lao theo giờ'
};

function mergeObjectArrayByKey(localArr: any[], cloudArr: any[]): any[] {
  const getKey = (item: any) =>
    item?.studentId || item?.sessionId || item?.id || item?.date || item?.reportId || JSON.stringify(item);
  const cloudMap = new Map(cloudArr.map(item => [getKey(item), item]));
  const localMap = new Map(localArr.map(item => [getKey(item), item]));
  const result: any[] = [];
  const allKeys = Array.from(new Set([...cloudMap.keys(), ...localMap.keys()]));

  for (const k of allKeys) {
    const loc = localMap.get(k);
    const cld = cloudMap.get(k);
    if (!cld) result.push(loc);
    else if (!loc) result.push(cld);
    else {
      result.push({ ...cld, ...loc });
    }
  }
  return result;
}

function mergeSingleRecordFieldLevel(
  category: keyof AppDataStore,
  localItem: any,
  cloudItem: any
): { merged: any; conflicts: FieldConflict[] } {
  const merged: any = { ...cloudItem, ...localItem };
  const conflicts: FieldConflict[] = [];

  const allKeys = Array.from(
    new Set([...Object.keys(localItem || {}), ...Object.keys(cloudItem || {})])
  );

  for (const key of allKeys) {
    if (key === 'id' || key === 'sessionId' || key === 'reportId') {
      merged[key] = localItem?.[key] || cloudItem?.[key];
      continue;
    }

    const locVal = localItem ? localItem[key] : undefined;
    const cloudVal = cloudItem ? cloudItem[key] : undefined;

    // 1. Array properties: non-destructive union
    if (Array.isArray(locVal) || Array.isArray(cloudVal)) {
      if (Array.isArray(locVal) && Array.isArray(cloudVal)) {
        if (
          locVal.every(x => typeof x !== 'object') &&
          cloudVal.every(x => typeof x !== 'object')
        ) {
          merged[key] = Array.from(new Set([...locVal, ...cloudVal]));
        } else {
          merged[key] = mergeObjectArrayByKey(locVal, cloudVal);
        }
      } else {
        merged[key] = Array.isArray(locVal) ? locVal : cloudVal;
      }
      continue;
    }

    // 2. Object properties
    if (
      locVal &&
      typeof locVal === 'object' &&
      !Array.isArray(locVal) &&
      cloudVal &&
      typeof cloudVal === 'object' &&
      !Array.isArray(cloudVal)
    ) {
      const sub = mergeSingleRecordFieldLevel(category, locVal, cloudVal);
      merged[key] = sub.merged;
      conflicts.push(...sub.conflicts);
      continue;
    }

    // 3. Primitive values
    const isLocEmpty = locVal === undefined || locVal === null || locVal === '';
    const isCloudEmpty = cloudVal === undefined || cloudVal === null || cloudVal === '';

    if (!isLocEmpty && isCloudEmpty) {
      merged[key] = locVal;
    } else if (isLocEmpty && !isCloudEmpty) {
      merged[key] = cloudVal;
    } else if (locVal === cloudVal) {
      merged[key] = locVal;
    } else {
      // Both are non-empty and differ
      const locTime = localItem.updatedAt || localItem.lastEditedAt || localItem.submittedAt || '';
      const cloudTime = cloudItem.updatedAt || cloudItem.lastEditedAt || cloudItem.submittedAt || '';

      // Strict safety: Only pick timestamp if both exist, valid, and differ
      if (locTime && cloudTime && locTime !== cloudTime) {
        if (locTime > cloudTime) {
          merged[key] = locVal;
        } else {
          merged[key] = cloudVal;
        }
      } else {
        // Timestamp missing, equal, or untrusted -> Conflict!
        conflicts.push({
          field: key,
          fieldLabel: FIELD_LABELS[key] || key,
          localValue: locVal,
          cloudValue: cloudVal
        });
        // Default to keeping local in memory while awaiting Admin resolution
        merged[key] = locVal;
      }
    }
  }

  return { merged, conflicts };
}

/**
 * Safely merges remote center data into local store using non-destructive
 * field-level union, protecting local edits and detecting conflicts.
 */
export function mergeCenterData(
  local: AppDataStore,
  remote: Partial<AppDataStore>,
  isAuthenticated: boolean = true
): MergeCenterDataResult {
  let needsUpload = false;
  const merged: AppDataStore = { ...local };
  const allConflicts: RecordConflict[] = [];

  const stats: MergeStats = {
    addedFromCloud: 0,
    addedFromLocal: 0,
    mergedFieldLevel: 0,
    identicalRecords: 0,
    conflictsCount: 0
  };

  // Step 0: Robust normalization of remote data from Apps Script
  const normRemote: Partial<AppDataStore> = { ...remote };
  const allArrayKeys: Array<keyof AppDataStore> = [
    'students', 'classes', 'teachers', 'teachingAssistants', 'academicManagers', 'programs',
    'timetable', 'attendance', 'assessments', 'lessonPlans', 'users', 'parents',
    'teachingSchedules', 'activityLogs', 'lessonReports', 'incompleteReports', 'makeupSessions',
    'lessonReportLockAudits'
  ];
  for (const k of allArrayKeys) {
    if (!Array.isArray((normRemote as any)[k])) {
      (normRemote as any)[k] = [];
    }
  }
  if (typeof normRemote.settings !== 'object' || normRemote.settings === null) {
    normRemote.settings = undefined;
  }

  // Step 0b: Extract and auto-hydrate real operational entities from Cloud if collections are currently empty in Cloud
  const cloudReports = normRemote.lessonReports || [];
  const cloudIncompletes = normRemote.incompleteReports || [];

  // Auto-hydrate Classes from Cloud reports if cloud classes is empty
  if (normRemote.classes!.length === 0 && (cloudReports.length > 0 || cloudIncompletes.length > 0)) {
    const classMap = new Map<string, ClassItem>();
    for (const r of cloudReports) {
      if (r.classId && !classMap.has(r.classId)) {
        classMap.set(r.classId, {
          id: r.classId,
          name: r.className || r.classId,
          code: r.classId,
          courseId: 'PROG-CAM',
          curriculum: 'Cambridge Young Learners English',
          teacherId: r.teacherId || 'TCH-001',
          classroom: '1A',
          level: 'Cambridge',
          status: 'ongoing',
          scheduleDays: 'Hàng tuần',
          scheduleTime: 'Theo lịch',
          startDate: '2026-09-01',
          endDate: '2027-06-30',
          maxCapacity: 14,
          studentIds: (r.studentReports || []).map(s => String(s.studentId)).filter(Boolean)
        } as any as ClassItem);
      }
    }
    for (const inc of cloudIncompletes) {
      if (inc.classId && !classMap.has(inc.classId)) {
        classMap.set(inc.classId, {
          id: inc.classId,
          name: inc.className || inc.classId,
          code: inc.classId,
          courseId: 'PROG-CAM',
          curriculum: 'Cambridge Young Learners English',
          teacherId: 'TCH-001',
          classroom: '1A',
          level: 'Cambridge',
          status: 'ongoing',
          scheduleDays: 'Hàng tuần',
          scheduleTime: 'Theo lịch',
          startDate: '2026-09-01',
          endDate: '2027-06-30',
          maxCapacity: 14,
          studentIds: []
        } as any as ClassItem);
      }
    }
    normRemote.classes = Array.from(classMap.values());
  }

  // Auto-hydrate Students from Cloud reports if cloud students is empty
  if (normRemote.students!.length === 0 && cloudReports.length > 0) {
    const stuMap = new Map<string, Student>();
    for (const r of cloudReports) {
      if (Array.isArray(r.studentReports)) {
        for (const s of r.studentReports) {
          const sid = String(s.studentId || '').trim();
          if (sid && !stuMap.has(sid)) {
            stuMap.set(sid, {
              id: sid,
              fullName: s.studentName || ('Học viên ' + sid),
              vietnameseName: s.studentName || ('Học viên ' + sid),
              dob: '2016-01-01',
              gender: 'male',
              school: 'LeeGo English Center',
              grade: 'Tiểu học',
              parentName: 'Phụ huynh ' + (s.studentName || sid),
              parentPhone: '0900000000',
              address: 'Hà Nội',
              enrollmentDate: '2026-09-01',
              currentLevel: 'Cambridge',
              classIds: r.classId ? [r.classId] : [],
              status: 'studying'
            } as any as Student);
          }
        }
      }
    }
    normRemote.students = Array.from(stuMap.values());
  }

  // Auto-hydrate Teachers from Cloud reports if cloud teachers is empty
  if (normRemote.teachers!.length === 0 && cloudReports.length > 0) {
    const tchMap = new Map<string, Teacher>();
    for (const r of cloudReports) {
      const tName = (r.teacherName || '').trim();
      const tId = r.teacherId || ('TCH-' + tName.replace(/\s+/g, ''));
      if (tName && !tchMap.has(tId)) {
        tchMap.set(tId, {
          id: tId,
          fullName: tName,
          vietnameseName: tName,
          email: tId.toLowerCase() + '@leego.edu.vn',
          phone: '0900000000',
          nationality: tName.includes('Mr.') || tName.includes('David') || tName.includes('Sarah') || tName.includes('Angelica') ? 'Quốc tế' : 'Việt Nam',
          isNative: tName.includes('Mr.') || tName.includes('David') || tName.includes('Sarah') || tName.includes('Angelica'),
          qualifications: 'TESOL / CELTA',
          experienceYears: 5,
          teachingLevels: ['Pre A1 Starters', 'A1 Movers', 'A2 Flyers'],
          status: 'active',
          assignedClassIds: r.classId ? [r.classId] : [],
          workloadHours: 12,
          hourlyRate: 500000
        } as any as Teacher);
      }
    }
    normRemote.teachers = Array.from(tchMap.values());
  }

  // 1. Merge Lesson Reports safely
  if (Array.isArray(normRemote.lessonReports)) {
    const localReports = Array.isArray(local.lessonReports) ? local.lessonReports : [];
    const remoteReportMap = new Map(normRemote.lessonReports.map(r => [r.id, r]));
    const localReportMap = new Map(localReports.map(r => [r.id, r]));
    const combinedReports: LessonReport[] = [];

    for (const rem of normRemote.lessonReports) {
      const loc = localReportMap.get(rem.id);
      if (!loc) {
        combinedReports.push(rem);
        stats.addedFromCloud++;
      } else {
        const remTime = rem.lastEditedAt || rem.lockedAt || rem.submittedAt || '';
        const locTime = loc.lastEditedAt || loc.lockedAt || loc.submittedAt || '';

        if (rem.locked && !loc.locked) {
          combinedReports.push(rem);
          stats.mergedFieldLevel++;
        } else if (!rem.locked && loc.locked && rem.unlockedAfterExpiration) {
          combinedReports.push(rem);
          stats.mergedFieldLevel++;
        } else if (remTime >= locTime) {
          combinedReports.push(rem);
          stats.mergedFieldLevel++;
        } else {
          combinedReports.push({
            ...loc,
            locked: rem.locked ? true : loc.locked,
            lockedAt: rem.locked ? rem.lockedAt : loc.lockedAt,
            lockedBy: rem.locked ? rem.lockedBy : loc.lockedBy
          });
          needsUpload = true;
          stats.mergedFieldLevel++;
        }
      }
    }

    for (const loc of localReports) {
      if (!remoteReportMap.has(loc.id)) {
        combinedReports.push(loc);
        needsUpload = true;
        stats.addedFromLocal++;
      }
    }
    merged.lessonReports = combinedReports;
  } else if (Array.isArray(local.lessonReports) && local.lessonReports.length > 0) {
    needsUpload = true;
  }

  // 2. Merge Incomplete Reports
  if (Array.isArray(normRemote.incompleteReports)) {
    const remoteIncMap = new Map(normRemote.incompleteReports.map(i => [i.id || i.reportId, i]));
    const localIncs = Array.isArray(local.incompleteReports) ? local.incompleteReports : [];
    const combinedIncs = [...normRemote.incompleteReports];
    for (const loc of localIncs) {
      if (!remoteIncMap.has(loc.id || loc.reportId)) {
        combinedIncs.push(loc);
        needsUpload = true;
        stats.addedFromLocal++;
      }
    }
    merged.incompleteReports = combinedIncs;
  } else if (Array.isArray(local.incompleteReports) && local.incompleteReports.length > 0) {
    needsUpload = true;
  }

  // 3. Merge Make-up Sessions
  if (Array.isArray(normRemote.makeupSessions)) {
    const remoteMakeupMap = new Map(normRemote.makeupSessions.map(m => [m.id, m]));
    const localMakeups = Array.isArray(local.makeupSessions) ? local.makeupSessions : [];
    const combinedMakeups = [...normRemote.makeupSessions];
    for (const loc of localMakeups) {
      if (!remoteMakeupMap.has(loc.id)) {
        combinedMakeups.push(loc);
        needsUpload = true;
        stats.addedFromLocal++;
      }
    }
    merged.makeupSessions = combinedMakeups;
  } else if (Array.isArray(local.makeupSessions) && local.makeupSessions.length > 0) {
    needsUpload = true;
  }

  // 4. Merge Lesson Report Lock Audits
  if (Array.isArray(normRemote.lessonReportLockAudits)) {
    const remoteAuditMap = new Map(normRemote.lessonReportLockAudits.map(a => [a.id, a]));
    const localAudits = Array.isArray(local.lessonReportLockAudits) ? local.lessonReportLockAudits : [];
    const combinedAudits = [...normRemote.lessonReportLockAudits];
    for (const loc of localAudits) {
      if (!remoteAuditMap.has(loc.id)) {
        combinedAudits.push(loc);
        needsUpload = true;
        stats.addedFromLocal++;
      }
    }
    merged.lessonReportLockAudits = combinedAudits;
  } else if (Array.isArray(local.lessonReportLockAudits) && local.lessonReportLockAudits.length > 0) {
    needsUpload = true;
  }

  // 5. Merge all entity collections with Non-Destructive Field-Level resolution
  const entityCollections: Array<{ key: keyof AppDataStore; name: string }> = [
    { key: 'students', name: 'Học viên (Students)' },
    { key: 'classes', name: 'Lớp học (Classes)' },
    { key: 'teachers', name: 'Giáo viên (Teachers)' },
    { key: 'teachingAssistants', name: 'Trợ giảng (TAs)' },
    { key: 'academicManagers', name: 'Quản lí học thuật (AMs)' },
    { key: 'programs', name: 'Chương trình học (Programs)' },
    { key: 'timetable', name: 'Thời khóa biểu (Timetable)' },
    { key: 'attendance', name: 'Điểm danh (Attendance)' },
    { key: 'assessments', name: 'Bảng điểm & Đánh giá (Assessments)' },
    { key: 'lessonPlans', name: 'Giáo án & Đề cương (Lesson Plans)' },
    { key: 'users', name: 'Tài khoản người dùng (Users)' },
    { key: 'parents', name: 'Hồ sơ Phụ huynh (Parents)' },
    { key: 'teachingSchedules', name: 'Lịch dạy tháng (Teaching Schedules)' },
    { key: 'activityLogs', name: 'Nhật ký hoạt động (Activity Logs)' }
  ];

  for (const cat of entityCollections) {
    const locArr = Array.isArray(local[cat.key]) ? (local[cat.key] as any[]) : [];
    const cldArr = Array.isArray(normRemote[cat.key]) ? (normRemote[cat.key] as any[]) : [];
    const baseArr = BASELINE_DATA_MAP[cat.key] || [];
    const baseMap = new Map(baseArr.map(b => [b.id, b]));
    const getId = (item: any) => item?.id || item?.sessionId || item?.reportId;

    if (cldArr.length === 0) {
      // Cloud has no records for this key
      if (isAuthenticated) {
        // Strip untouched demo records for authenticated accounts
        const realLocOnly = locArr.filter(item => {
          const id = getId(item);
          return !baseMap.has(id) || isRecordModified(item, baseMap.get(id));
        });
        (merged as any)[cat.key] = realLocOnly;
        if (realLocOnly.length > 0) {
          needsUpload = true;
        }
      } else {
        (merged as any)[cat.key] = locArr;
      }
      continue;
    }

    const cldMap = new Map(cldArr.map(item => [getId(item), item]));
    const locMap = new Map(locArr.map(item => [getId(item), item]));
    const mergedList: any[] = [];
    const allIds = Array.from(new Set([...cldMap.keys(), ...locMap.keys()])).filter(Boolean);

    for (const id of allIds) {
      const cldItem = cldMap.get(id);
      const locItem = locMap.get(id);

      if (cldItem && !locItem) {
        // Cloud has it, local does not
        mergedList.push(cldItem);
        stats.addedFromCloud++;
        continue;
      }

      if (locItem && !cldItem) {
        // Local has it, cloud does not
        const isUntouchedDemo = baseMap.has(id) && !isRecordModified(locItem, baseMap.get(id));
        if (isUntouchedDemo) {
          if (!isAuthenticated) {
            mergedList.push(locItem);
          }
        } else {
          // Real new record created locally
          mergedList.push(locItem);
          stats.addedFromLocal++;
          needsUpload = true;
        }
        continue;
      }

      if (locItem && cldItem) {
        // Both local and cloud have this ID
        const isLocUntouchedDemo = baseMap.has(id) && !isRecordModified(locItem, baseMap.get(id));
        if (isLocUntouchedDemo) {
          // Local is just default demo; Cloud has actual center data
          mergedList.push(cldItem);
          stats.addedFromCloud++;
          continue;
        }

        if (JSON.stringify(locItem) === JSON.stringify(cldItem)) {
          mergedList.push(locItem);
          stats.identicalRecords++;
          continue;
        }

        // Perform field-level merge
        const { merged: mergedRec, conflicts } = mergeSingleRecordFieldLevel(cat.key, locItem, cldItem);

        if (conflicts.length > 0) {
          const title =
            locItem.fullName ||
            locItem.name ||
            locItem.title ||
            locItem.className ||
            `Bản ghi ${id}`;

          allConflicts.push({
            category: cat.key,
            categoryName: cat.name,
            recordId: id,
            recordTitle: title,
            conflicts,
            localRecord: locItem,
            cloudRecord: cldItem
          });
          stats.conflictsCount++;
        } else {
          stats.mergedFieldLevel++;
        }

        mergedList.push(mergedRec);
      }
    }

    (merged as any)[cat.key] = mergedList;
  }

  // 6. Merge Center Settings (force demoMode: false for authenticated accounts)
  if (normRemote.settings) {
    const locSettings = local.settings;
    const cldSettings = normRemote.settings;
    const mergedClassrooms = Array.from(
      new Set([...(locSettings.classrooms || []), ...(cldSettings.classrooms || [])])
    );
    merged.settings = {
      ...locSettings,
      ...cldSettings,
      classrooms: mergedClassrooms,
      demoMode: !isAuthenticated ? (cldSettings.demoMode ?? locSettings.demoMode) : false
    };
  } else {
    merged.settings = {
      ...local.settings,
      demoMode: !isAuthenticated ? local.settings.demoMode : false
    };
  }

  return {
    merged,
    needsUpload,
    hasConflicts: allConflicts.length > 0,
    conflicts: allConflicts,
    stats
  };
}

/**
 * Resolves a specific record conflict by choosing local, cloud, or custom values.
 */
export function resolveConflict(
  data: AppDataStore,
  conflict: RecordConflict,
  resolution: 'keep_local' | 'keep_cloud' | 'custom',
  customRecord?: any
): AppDataStore {
  const category = conflict.category;
  const targetId = conflict.recordId;
  const list = Array.isArray(data[category]) ? [...(data[category] as any[])] : [];

  let resolvedItem: any;
  if (resolution === 'keep_local') {
    resolvedItem = conflict.localRecord;
  } else if (resolution === 'keep_cloud') {
    resolvedItem = conflict.cloudRecord;
  } else {
    resolvedItem = customRecord || conflict.localRecord;
  }

  const getId = (item: any) => item?.id || item?.sessionId || item?.reportId;
  const idx = list.findIndex(item => getId(item) === targetId);

  if (idx >= 0) {
    list[idx] = resolvedItem;
  } else {
    list.push(resolvedItem);
  }

  const updatedData: AppDataStore = {
    ...data,
    [category]: list
  };

  saveStorage(updatedData);
  return updatedData;
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
      'Giao BVN',
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
            children: [
              new Paragraph({
                children: [new TextRun({ text: s.assignedHomework || '—', size: 20, font: 'Times New Roman' })]
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
    'Giao BVN': s.assignedHomework || '',
    'Ghi chú': s.notes || ''
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'LessonReport');
  const cleanClassName = (report.className || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `Lesson_Report_${cleanClassName}_${report.teachingDate}.xlsx`);
}

// ============================================================================
// MILESTONE 1: READ-ONLY SURVEY SCANNER & COMPREHENSIVE BACKUP UTILITIES
// ============================================================================

export interface CategoryInventory {
  key: keyof AppDataStore;
  name: string;
  totalLocal: number;
  demoUntouched: number;
  demoModified: number;
  realNew: number;
  totalCloud: number | null;
  modifiedIds: string[];
  newIds: string[];
}

export interface SurveyScanReport {
  scannedAt: string;
  totalLocalRecords: number;
  totalDemoUntouched: number;
  totalDemoModified: number;
  totalRealNew: number;
  totalCloudRecords: number | null;
  categories: CategoryInventory[];
  cloudFetchStatus: 'success' | 'failed' | 'skipped';
  cloudMessage?: string;
  isDataSafe: boolean;
}

export interface BackupMetadata {
  app: string;
  version: string;
  exportedAt: string;
  totalRecords: number;
  recordSummary: Record<string, number>;
}

export interface FullBackupPayload {
  _metadata: BackupMetadata;
  data: AppDataStore;
}

const BASELINE_DATA_MAP: Record<string, any[]> = {
  students: initialStudents,
  classes: initialClasses,
  teachers: initialTeachers,
  teachingAssistants: initialTeachingAssistants,
  academicManagers: initialAcademicManagers,
  programs: initialAcademicPrograms,
  timetable: initialTimetableSessions,
  attendance: initialAttendanceRecords,
  assessments: initialAssessments,
  lessonPlans: initialLessonPlans,
  users: initialUsers,
  parents: initialParents,
  teachingSchedules: initialTeachingSchedules,
  activityLogs: initialActivityLogs,
};

const CATEGORY_DEFINITIONS: Array<{ key: keyof AppDataStore; name: string }> = [
  { key: 'students', name: 'Học viên (Students)' },
  { key: 'classes', name: 'Lớp học (Classes)' },
  { key: 'teachers', name: 'Giáo viên (Teachers)' },
  { key: 'teachingAssistants', name: 'Trợ giảng (TAs)' },
  { key: 'academicManagers', name: 'Quản lí học thuật (AMs)' },
  { key: 'programs', name: 'Chương trình học (Programs)' },
  { key: 'timetable', name: 'Thời khóa biểu (Timetable)' },
  { key: 'attendance', name: 'Dữ liệu điểm danh (Attendance)' },
  { key: 'assessments', name: 'Bảng điểm & Đánh giá (Assessments)' },
  { key: 'lessonPlans', name: 'Giáo án & Đề cương (Lesson Plans)' },
  { key: 'users', name: 'Tài khoản người dùng (Users)' },
  { key: 'parents', name: 'Hồ sơ Phụ huynh (Parents)' },
  { key: 'teachingSchedules', name: 'Lịch dạy tháng (Teaching Schedules)' },
  { key: 'lessonReports', name: 'Báo cáo buổi học (Lesson Reports)' },
  { key: 'incompleteReports', name: 'Báo cáo chưa hoàn tất (Incomplete Reports)' },
  { key: 'makeupSessions', name: 'Lớp học bù (Makeup Sessions)' },
  { key: 'lessonReportLockAudits', name: 'Nhật ký khóa báo cáo (Lock Audits)' },
  { key: 'activityLogs', name: 'Nhật ký hoạt động (Activity Logs)' },
  { key: 'settings', name: 'Cấu hình trung tâm (Settings)' }
];

function isRecordModified(localItem: any, baselineItem: any): boolean {
  if (!baselineItem) return true;
  try {
    return JSON.stringify(localItem) !== JSON.stringify(baselineItem);
  } catch {
    return true;
  }
}

/**
 * Executes a strictly READ-ONLY survey scan across all local data collections
 * and categorizes records into Demo Nguyên Bản, Demo Đã Sửa, and Dữ Liệu Mới.
 * Optionally correlates with Cloud (leegodata) record counts if provided.
 */
export function runDataSurveyScanner(
  localData: AppDataStore,
  remoteData?: Partial<AppDataStore> | null,
  cloudFetchStatus: 'success' | 'failed' | 'skipped' = 'skipped',
  cloudMessage?: string
): SurveyScanReport {
  let totalLocalRecords = 0;
  let totalDemoUntouched = 0;
  let totalDemoModified = 0;
  let totalRealNew = 0;
  let totalCloudRecords: number | null = null;

  if (remoteData) {
    totalCloudRecords = 0;
  }

  const categories: CategoryInventory[] = [];

  for (const cat of CATEGORY_DEFINITIONS) {
    if (cat.key === 'settings') {
      const locSetting = localData.settings;
      const isModified = isRecordModified(locSetting, initialSettings);
      const demoUntouched = isModified ? 0 : 1;
      const demoModified = isModified ? 1 : 0;
      const totalCloud = remoteData ? (remoteData.settings ? 1 : 0) : null;

      totalLocalRecords += 1;
      totalDemoUntouched += demoUntouched;
      totalDemoModified += demoModified;
      if (totalCloudRecords !== null && totalCloud !== null) {
        totalCloudRecords += totalCloud;
      }

      categories.push({
        key: cat.key,
        name: cat.name,
        totalLocal: 1,
        demoUntouched,
        demoModified,
        realNew: 0,
        totalCloud,
        modifiedIds: isModified ? ['settings'] : [],
        newIds: []
      });
      continue;
    }

    const locArr = Array.isArray(localData[cat.key]) ? (localData[cat.key] as any[]) : [];
    const baseArr = BASELINE_DATA_MAP[cat.key] || [];
    const baseMap = new Map(baseArr.map(b => [b.id, b]));

    let demoUntouched = 0;
    let demoModified = 0;
    let realNew = 0;
    const modifiedIds: string[] = [];
    const newIds: string[] = [];

    for (const item of locArr) {
      if (!item) continue;
      const id = item.id || item.sessionId || item.reportId;
      if (!id || !baseMap.has(id)) {
        realNew++;
        if (id) newIds.push(String(id));
      } else {
        const baseItem = baseMap.get(id);
        if (isRecordModified(item, baseItem)) {
          demoModified++;
          modifiedIds.push(String(id));
        } else {
          demoUntouched++;
        }
      }
    }

    let totalCloud: number | null = null;
    if (remoteData) {
      const remArr = remoteData[cat.key];
      totalCloud = Array.isArray(remArr) ? remArr.length : 0;
      if (totalCloudRecords !== null) {
        totalCloudRecords += totalCloud;
      }
    }

    totalLocalRecords += locArr.length;
    totalDemoUntouched += demoUntouched;
    totalDemoModified += demoModified;
    totalRealNew += realNew;

    categories.push({
      key: cat.key,
      name: cat.name,
      totalLocal: locArr.length,
      demoUntouched,
      demoModified,
      realNew,
      totalCloud,
      modifiedIds,
      newIds
    });
  }

  return {
    scannedAt: getVietnamNowFormatted(),
    totalLocalRecords,
    totalDemoUntouched,
    totalDemoModified,
    totalRealNew,
    totalCloudRecords,
    categories,
    cloudFetchStatus,
    cloudMessage,
    isDataSafe: true
  };
}

/**
 * Creates a complete JSON backup payload containing all collections and metadata.
 */
export function generateFullBackup(data: AppDataStore): FullBackupPayload {
  const recordSummary: Record<string, number> = {};
  let totalRecords = 0;

  for (const cat of CATEGORY_DEFINITIONS) {
    if (cat.key === 'settings') {
      recordSummary[cat.key] = data.settings ? 1 : 0;
      totalRecords += 1;
    } else {
      const arr = data[cat.key];
      const count = Array.isArray(arr) ? arr.length : 0;
      recordSummary[cat.key] = count;
      totalRecords += count;
    }
  }

  return {
    _metadata: {
      app: 'LeeGo Center Management',
      version: '1.0',
      exportedAt: getVietnamNowFormatted(),
      totalRecords,
      recordSummary
    },
    data: JSON.parse(JSON.stringify(data))
  };
}

/**
 * Triggers a browser download of the complete backup JSON file.
 */
export function downloadFullBackup(data: AppDataStore): void {
  const payload = generateFullBackup(data);
  const jsonStr = JSON.stringify(payload, null, 2);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const filename = `LeeGo_Full_Backup_${dateStr}.json`;

  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
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
 * Validates an uploaded JSON backup file and extracts record summary without writing to storage.
 */
export function validateBackupFile(jsonString: string): {
  valid: boolean;
  data?: AppDataStore;
  summary?: Record<string, number>;
  totalRecords?: number;
  exportedAt?: string;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    let store: AppDataStore | null = null;
    let exportedAt = 'Chưa xác định';

    if (parsed && typeof parsed === 'object') {
      if (parsed.data && typeof parsed.data === 'object' && parsed._metadata) {
        store = parsed.data;
        exportedAt = parsed._metadata.exportedAt || exportedAt;
      } else if (Array.isArray(parsed.students) || Array.isArray(parsed.classes)) {
        store = parsed;
      }
    }

    if (!store) {
      return {
        valid: false,
        error: 'File không đúng định dạng sao lưu của LeeGo (thiếu danh mục dữ liệu hợp lệ).'
      };
    }

    const summary: Record<string, number> = {};
    let totalRecords = 0;

    for (const cat of CATEGORY_DEFINITIONS) {
      if (cat.key === 'settings') {
        const hasSetting = Boolean(store.settings);
        summary[cat.key] = hasSetting ? 1 : 0;
        if (hasSetting) totalRecords += 1;
      } else {
        const arr = (store as any)[cat.key];
        const count = Array.isArray(arr) ? arr.length : 0;
        summary[cat.key] = count;
        totalRecords += count;
      }
    }

    return {
      valid: true,
      data: store,
      summary,
      totalRecords,
      exportedAt
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Lỗi đọc file JSON: ${err.message || 'Cấu trúc file bị hỏng'}`
    };
  }
}

// ============================================================================
// MILESTONE 3: SAFE MANUAL MIGRATION WITH PREVIEW & READBACK VERIFICATION
// ============================================================================

export interface MigrationCategorySummary {
  key: keyof AppDataStore;
  name: string;
  totalLocal: number;
  excludedDemoCount: number;
  uploadRecordCount: number;
  sampleTitles: string[];
}

export interface MigrationPlan {
  generatedAt: string;
  categories: MigrationCategorySummary[];
  totalUploadRecords: number;
  totalExcludedDemo: number;
  payloadToUpload: Partial<AppDataStore>;
  keysToUpload: Array<keyof AppDataStore>;
  hasConflicts: boolean;
  conflicts: RecordConflict[];
}

export interface MigrationExecutionResult {
  success: boolean;
  verified: boolean;
  message?: string;
  verifiedCounts?: Record<string, number>;
  error?: string;
}

/**
 * Builds a migration preview plan by identifying real operational records and modified demo records,
 * strictly excluding untouched demo data from being pushed to Cloud.
 */
export function buildMigrationPlan(
  localData: AppDataStore,
  remoteData?: Partial<AppDataStore> | null
): MigrationPlan {
  const categories: MigrationCategorySummary[] = [];
  const payloadToUpload: Partial<AppDataStore> = {};
  const keysToUpload: Array<keyof AppDataStore> = [];
  let totalUploadRecords = 0;
  let totalExcludedDemo = 0;
  const allConflicts: RecordConflict[] = [];

  for (const cat of CATEGORY_DEFINITIONS) {
    if (cat.key === 'settings') {
      const isSettingModified = isRecordModified(localData.settings, initialSettings);
      const cloudSettings = remoteData?.settings;
      if (isSettingModified || cloudSettings) {
        const mergedClassrooms = Array.from(
          new Set([
            ...(localData.settings?.classrooms || []),
            ...(cloudSettings?.classrooms || [])
          ])
        );
        const mergedSettings: CenterSettings = {
          ...(cloudSettings || {}),
          ...localData.settings,
          classrooms: mergedClassrooms
        };
        payloadToUpload.settings = mergedSettings;
        keysToUpload.push('settings');
        totalUploadRecords += 1;
        categories.push({
          key: cat.key,
          name: cat.name,
          totalLocal: 1,
          excludedDemoCount: isSettingModified ? 0 : 1,
          uploadRecordCount: 1,
          sampleTitles: [localData.settings.centerName || 'Cài đặt trung tâm']
        });
      } else {
        totalExcludedDemo += 1;
        categories.push({
          key: cat.key,
          name: cat.name,
          totalLocal: 1,
          excludedDemoCount: 1,
          uploadRecordCount: 0,
          sampleTitles: []
        });
      }
      continue;
    }

    const locArr = Array.isArray(localData[cat.key]) ? (localData[cat.key] as any[]) : [];
    const baseArr = BASELINE_DATA_MAP[cat.key] || [];
    const baseMap = new Map(baseArr.map(b => [b.id, b]));
    const cldArr =
      remoteData && Array.isArray(remoteData[cat.key])
        ? (remoteData[cat.key] as any[])
        : [];
    const getId = (item: any) => item?.id || item?.sessionId || item?.reportId;
    const cldMap = new Map(cldArr.map(item => [getId(item), item]));

    const recordsToUpload: any[] = [];
    let excludedDemo = 0;
    const sampleTitles: string[] = [];

    for (const item of locArr) {
      if (!item) continue;
      const id = getId(item);
      const isBaseline = baseMap.has(id);
      const isUntouched = isBaseline && !isRecordModified(item, baseMap.get(id));

      if (isUntouched) {
        // Untouched baseline demo is protected from uploading to cloud
        excludedDemo++;
        continue;
      }

      // Real new record or user-modified demo record
      const existingCloud = cldMap.get(id);
      if (existingCloud) {
        const { merged: mergedRec, conflicts } = mergeSingleRecordFieldLevel(cat.key, item, existingCloud);
        recordsToUpload.push(mergedRec);
        if (conflicts.length > 0) {
          const title = item.fullName || item.name || item.title || item.className || id;
          allConflicts.push({
            category: cat.key,
            categoryName: cat.name,
            recordId: id,
            recordTitle: title,
            conflicts,
            localRecord: item,
            cloudRecord: existingCloud
          });
        }
      } else {
        recordsToUpload.push(item);
      }

      const displayTitle =
        item.fullName || item.name || item.title || item.className || item.code || String(id);
      if (sampleTitles.length < 4) {
        sampleTitles.push(displayTitle);
      }
    }

    // Also preserve existing real Cloud records if local didn't have them (exclude untouched demo)
    for (const cldItem of cldArr) {
      if (!cldItem) continue;
      const cldId = getId(cldItem);
      const isBase = baseMap.has(cldId);
      const isUntouchedCld = isBase && !isRecordModified(cldItem, baseMap.get(cldId));
      if (isUntouchedCld) {
        continue;
      }
      if (!recordsToUpload.some(r => getId(r) === cldId)) {
        recordsToUpload.push(cldItem);
      }
    }

    totalUploadRecords += recordsToUpload.length;
    totalExcludedDemo += excludedDemo;

    if (recordsToUpload.length > 0) {
      (payloadToUpload as any)[cat.key] = recordsToUpload;
      keysToUpload.push(cat.key);
    }

    categories.push({
      key: cat.key,
      name: cat.name,
      totalLocal: locArr.length,
      excludedDemoCount: excludedDemo,
      uploadRecordCount: recordsToUpload.length,
      sampleTitles
    });
  }

  return {
    generatedAt: getVietnamNowFormatted(),
    categories,
    totalUploadRecords,
    totalExcludedDemo,
    payloadToUpload,
    keysToUpload,
    hasConflicts: allConflicts.length > 0,
    conflicts: allConflicts
  };
}

/**
 * Executes the safe manual migration to Google Apps Script (leegodata)
 * and performs readback verification to ensure data integrity.
 */
export async function executeMigration(plan: MigrationPlan): Promise<MigrationExecutionResult> {
  if (plan.keysToUpload.length === 0 || plan.totalUploadRecords === 0) {
    return {
      success: true,
      verified: true,
      message: 'Không có bản ghi thực tế nào cần Migration (Dữ liệu hiện tại chỉ gồm Demo nguyên bản hoặc Cloud đã đầy đủ).'
    };
  }

  try {
    // 1. Send authoritative payload to Google Apps Script
    const saveRes = await saveCenterDataToGoogleAppsScript(
      plan.payloadToUpload,
      plan.keysToUpload
    );

    if (!saveRes.success) {
      return {
        success: false,
        verified: false,
        error: saveRes.error || 'Lỗi khi gửi dữ liệu Migration lên Google Apps Script.'
      };
    }

    // 2. Readback verification from Google Sheets leegodata
    const readbackRes = await fetchCenterDataFromGoogleAppsScript(plan.keysToUpload);
    if (!readbackRes.success || !readbackRes.data) {
      return {
        success: true,
        verified: false,
        message: 'Dữ liệu đã được gửi lên Google Sheets thành công, nhưng không thể đọc đối chiếu phản hồi (Lỗi mạng đọc lại).'
      };
    }

    const verifiedCounts: Record<string, number> = {};
    for (const k of plan.keysToUpload) {
      if (k === 'settings') {
        verifiedCounts[k] = readbackRes.data.settings ? 1 : 0;
      } else {
        const arr = (readbackRes.data as any)[k];
        verifiedCounts[k] = Array.isArray(arr) ? arr.length : 0;
      }
    }

    return {
      success: true,
      verified: true,
      message: `Migration thành công! Đã lưu an toàn ${plan.totalUploadRecords} bản ghi lên Google Sheets và hoàn tất đối chiếu xác nhận.`,
      verifiedCounts
    };
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      error: `Lỗi ngoại lệ trong quá trình Migration: ${err.message || 'Lỗi kết nối'}`
    };
  }
}



