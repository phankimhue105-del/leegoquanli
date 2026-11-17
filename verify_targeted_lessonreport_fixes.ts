import {
  mergeCenterData,
  normalizeAppDataStore,
  cleanEditorName,
  cleanEditTimestamp,
  recordLocalDeletedMakeupSessionId,
  recordLocalDeletedLessonReportId,
  getLocalDeletedMakeupSessionIds,
  getLocalDeletedLessonReportIds,
  AppDataStore
} from './src/services/dataService';
import { initialUsers, initialSettings } from './src/data/initialData';
import { LessonReport, MakeupClassSession } from './src/types';

// Mock localStorage if not present in CLI environment
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('=== TEST SUITE: TARGETED LESSON REPORT FIXES ===\n');

// ============================================================================
// TEST A: Last Editor Information & Sensitive Credential Shielding
// ============================================================================
console.log('--- TEST A: Editor Information & Password Shielding ---');

// 1. Timestamp sanitization
const rawTimestampWithPassword = '2026-11-17 19:44:25 (Lg1010@@@)';
const cleanTs1 = cleanEditTimestamp(rawTimestampWithPassword);
assert(cleanTs1 === '2026-11-17 19:44:25', `cleanEditTimestamp stripped password in parens: "${cleanTs1}"`);
assert(!cleanTs1.includes('Lg1010'), 'Timestamp does not contain password string');

const normalTs = '2026-11-17 19:44:25';
const cleanTs2 = cleanEditTimestamp(normalTs);
assert(cleanTs2 === '2026-11-17 19:44:25', `Normal timestamp is preserved intact: "${cleanTs2}"`);

const bulletTs = '2026-11-17 19:44:25 • thuy.nguyen';
const cleanTs3 = cleanEditTimestamp(bulletTs);
assert(cleanTs3 === '2026-11-17 19:44:25', `Bullet trailing username stripped: "${cleanTs3}"`);

assert(cleanEditTimestamp('') === '', 'Empty timestamp returns empty string');
assert(cleanEditTimestamp(undefined) === '', 'Undefined timestamp returns empty string');

// 2. Editor name sanitization
const rawNameWithCredential = 'Nguyễn Phương Thùy (Lg1010@@@)';
const cleanName1 = cleanEditorName(rawNameWithCredential, 'USR-THUY', initialUsers);
assert(cleanName1 === 'Nguyễn Phương Thùy', `cleanEditorName stripped trailing password in parens: "${cleanName1}"`);
assert(!cleanName1.includes('Lg1010'), 'Editor name does not contain password');

const normalName = 'Nguyễn Phương Thùy';
const cleanName2 = cleanEditorName(normalName, 'USR-THUY', initialUsers);
assert(cleanName2 === 'Nguyễn Phương Thùy', `Normal editor name preserved: "${cleanName2}"`);

// 3. Fallback resolution if stored name was accidentally set to a password/credential
const passwordAsName = 'Lg1010@@@';
const cleanName3 = cleanEditorName(passwordAsName, 'USR-THUY', initialUsers);
assert(cleanName3 === 'Nguyễn Phương Thúy', `Password-like editor name resolved to real staff display name: "${cleanName3}"`);

console.log('✅ TEST A PASSED: All credential exposure vectors neutralized.\n');

// ============================================================================
// TEST B: Star 4 Makeup Lesson Report Deletion & Cloud Sync
// ============================================================================
console.log('--- TEST B: Deleted Star 4 Makeup Report Sync & Tombstone ---');

const baseStore: AppDataStore = {
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
  users: [...initialUsers],
  parents: [],
  settings: {
    ...initialSettings,
    deletedClassIds: [],
    deletedMakeupSessionIds: [],
    deletedLessonReportIds: []
  },
  activityLogs: [],
  teachingSchedules: [],
  lessonReports: [],
  incompleteReports: [],
  makeupSessions: [],
  lessonReportLockAudits: [],
  courseDurations: [],
  courseHolidays: [],
  courseMakeups: [],
  courseDurationHistory: []
};

// 1. Set up a Star 4 makeup session and its lesson report
const star4MakeupSessionId = 'MK-STAR4-001';
const star4ReportId = `LR-MAKEUP-${star4MakeupSessionId}`;

const star4MakeupSession: MakeupClassSession = {
  id: star4MakeupSessionId,
  classId: 'CLS-STA-04',
  className: 'Star 4',
  date: '2026-11-17',
  time: '18:00 - 19:30',
  classroom: 'Phòng 101 - Smart Room',
  teacherId: 'TCH-001',
  teacherName: 'David Miller',
  lessonProgress: 'Học bù bài 4',
  notes: 'Lớp học bù'
};

const star4Report: LessonReport = {
  id: star4ReportId,
  classId: 'CLS-STA-04',
  className: 'Star 4',
  teachingDate: '2026-11-17',
  scheduledTime: '18:00 - 19:30',
  classroom: 'Phòng 101 - Smart Room',
  teacherId: 'TCH-001',
  teacherName: 'David Miller',
  lessonProgress: 'Học bù bài 4',
  sessionType: 'makeup',
  status: 'submitted',
  totalStudents: 10,
  completedStudents: 10,
  completionPercentage: 100,
  deadlineAt: '2026-11-18T17:00:00+07:00',
  locked: false,
  studentReports: []
};

// A valid regular report for Star 1 that must NOT be touched
const regularReportId = 'LR-CLS-STA-01-2026-11-17';
const regularReport: LessonReport = {
  id: regularReportId,
  classId: 'CLS-STA-01',
  className: 'Star 1',
  teachingDate: '2026-11-17',
  scheduledTime: '17:30 - 19:00',
  classroom: 'Phòng 102 - Creative Hub',
  teacherId: 'TCH-001',
  teacherName: 'David Miller',
  lessonProgress: 'Unit 5 Lesson 2',
  sessionType: 'regular',
  status: 'completed',
  totalStudents: 12,
  completedStudents: 12,
  completionPercentage: 100,
  deadlineAt: '2026-11-18T17:00:00+07:00',
  locked: false,
  studentReports: []
};

// Another valid makeup session for Movers 1 that must NOT be touched
const moversMakeupSession: MakeupClassSession = {
  id: 'MK-MOV-001',
  classId: 'CLS-MOV-01',
  className: 'Movers Adventurer 01',
  date: '2026-11-17',
  time: '19:30 - 21:00',
  classroom: 'Phòng 201 - Global Lab',
  teacherId: 'TCH-002',
  teacherName: 'Cô Lê Thu Trang',
  lessonProgress: 'Học bù Movers',
  notes: 'Học bù'
};

// 2. Simulate Local state where Admin just deleted Star 4 makeup lesson
recordLocalDeletedMakeupSessionId(star4MakeupSessionId);
recordLocalDeletedLessonReportId(star4ReportId);

assert(getLocalDeletedMakeupSessionIds().includes(star4MakeupSessionId), 'Local tombstone for makeup session recorded');
assert(getLocalDeletedLessonReportIds().includes(star4ReportId), 'Local tombstone for lesson report recorded');

const localDataAfterAdminDelete: AppDataStore = {
  ...baseStore,
  makeupSessions: [moversMakeupSession], // Star 4 makeup removed locally
  lessonReports: [regularReport], // Star 4 report removed locally
  settings: {
    ...baseStore.settings,
    deletedMakeupSessionIds: [star4MakeupSessionId],
    deletedLessonReportIds: [star4ReportId]
  }
};

// 3. Simulate Stale Cloud Data (still contains Star 4 makeup session and Star 4 report)
const staleCloudData: Partial<AppDataStore> = {
  makeupSessions: [star4MakeupSession, moversMakeupSession],
  lessonReports: [star4Report, regularReport],
  settings: {
    ...baseStore.settings
  }
};

// 4. Perform Cloud Merge
console.log('Merging local deletion with stale Cloud data...');
const mergeResult = mergeCenterData(localDataAfterAdminDelete, staleCloudData, true);

// 5. Verifications
const mergedMakeups = mergeResult.merged.makeupSessions || [];
const hasStar4Makeup = mergedMakeups.some(m => m.id === star4MakeupSessionId || m.className === 'Star 4');
assert(!hasStar4Makeup, 'Deleted Star 4 makeup session does NOT reappear in merged makeupSessions');

const hasMoversMakeup = mergedMakeups.some(m => m.id === 'MK-MOV-001');
assert(hasMoversMakeup, 'Other valid makeup sessions (Movers) remain intact');

const mergedReports = mergeResult.merged.lessonReports || [];
const hasStar4Report = mergedReports.some(r => r.id === star4ReportId || (r.className === 'Star 4' && r.sessionType === 'makeup'));
assert(!hasStar4Report, 'Deleted Star 4 makeup Lesson Report does NOT reappear in merged lessonReports');

const hasRegularReport = mergedReports.some(r => r.id === regularReportId);
assert(hasRegularReport, 'Other valid regular Lesson Reports (Star 1) remain completely intact');

assert(mergeResult.needsUpload === true, 'needsUpload is true so Cloud is automatically updated to delete stale records');

assert(
  Boolean(mergeResult.merged.settings?.deletedMakeupSessionIds?.includes(star4MakeupSessionId)),
  'merged.settings persists deletedMakeupSessionIds tombstone'
);
assert(
  Boolean(mergeResult.merged.settings?.deletedLessonReportIds?.includes(star4ReportId)),
  'merged.settings persists deletedLessonReportIds tombstone'
);

// 6. Test Store Normalization
const unnormalizedStore: AppDataStore = {
  ...baseStore,
  makeupSessions: [star4MakeupSession, moversMakeupSession],
  lessonReports: [star4Report, regularReport],
  settings: {
    ...baseStore.settings,
    deletedMakeupSessionIds: [star4MakeupSessionId],
    deletedLessonReportIds: [star4ReportId]
  }
};

const normalized = normalizeAppDataStore(unnormalizedStore);
assert(!normalized.makeupSessions?.some(m => m.id === star4MakeupSessionId), 'normalizeAppDataStore filters out tombstoned makeup session');
assert(!normalized.lessonReports?.some(r => r.id === star4ReportId), 'normalizeAppDataStore filters out tombstoned lesson report');
assert(normalized.makeupSessions?.some(m => m.id === 'MK-MOV-001'), 'normalizeAppDataStore preserves non-tombstoned makeup session');
assert(normalized.lessonReports?.some(r => r.id === regularReportId), 'normalizeAppDataStore preserves non-tombstoned regular report');

console.log('✅ TEST B PASSED: Deletion persistence and cloud synchronization verified.\n');

console.log('=================================================================');
console.log('🎉 ALL TESTS PASSED: Lesson Report fixes verified successfully!');
console.log('=================================================================');
