import {
  reconcileTimetableWithClasses,
  recalculateTeacherAssignedClasses,
  normalizeAppDataStore
} from './src/services/dataService';
import type { AppDataStore, ClassItem, Teacher, TimetableSession } from './src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${msg}`);
  }
  console.log(`[PASS] ${msg}`);
}

console.log('================================================================');
console.log('TEST SUITE: TIMETABLE SOURCE-OF-TRUTH & STALE SCHEDULE ELIMINATION');
console.log('================================================================\n');

// Mock teachers
const teacherThuy: Teacher = {
  id: 'TCH-THUY',
  fullName: 'Cô Thúy',
  email: 'thuy@leego.edu.vn',
  phone: '0901111111',
  nationality: 'Vietnam',
  isNative: false,
  qualifications: 'IELTS 8.0',
  experienceYears: 5,
  assignedClassIds: [],
  hourlyRate: 200000,
  workloadHours: 0
};

const teacherHue: Teacher = {
  id: 'TCH-HUE',
  fullName: 'Cô Huệ',
  email: 'hue@leego.edu.vn',
  phone: '0902222222',
  nationality: 'Vietnam',
  isNative: false,
  qualifications: 'TESOL',
  experienceYears: 4,
  assignedClassIds: [],
  hourlyRate: 200000,
  workloadHours: 0
};

const teacherJohn: Teacher = {
  id: 'TCH-JOHN',
  fullName: 'Mr. John',
  email: 'john@leego.edu.vn',
  phone: '0903333333',
  nationality: 'UK',
  isNative: true,
  qualifications: 'CELTA',
  experienceYears: 6,
  assignedClassIds: [],
  hourlyRate: 400000,
  workloadHours: 0
};

let teachers = [teacherThuy, teacherHue, teacherJohn];

// Filter simulation identical to TimetableView
function filterTimetable(
  sessions: TimetableSession[],
  classesList: ClassItem[],
  isTeacher: boolean,
  currentTeacherId: string,
  filterDay?: number
) {
  return sessions.filter(session => {
    const cls = session.classId
      ? classesList.find(c => String(c.id).trim() === String(session.classId).trim())
      : null;

    // A timetable item must not be displayed if its classId is set but no longer exists in Classes (or is cancelled)
    if (session.classId && (!cls || cls.status === 'cancelled')) {
      return false;
    }

    const slot = cls?.weeklySchedule?.find(s => s.dayOfWeek === session.dayOfWeek);
    const effTeacherId = String(slot?.teacherId || cls?.teacherId || session.teacherId || '').trim();

    if (isTeacher) {
      if (currentTeacherId && effTeacherId !== currentTeacherId) return false;
    }

    if (filterDay !== undefined && session.dayOfWeek !== filterDay) {
      return false;
    }

    return true;
  });
}

// --------------------------------------------------------------------------
// TEST A & B:
// Thuy assigned 7B (Tue, Thu) & 9A (Fri).
// Class 7A belongs to another teacher (John, Mon, Wed).
// --------------------------------------------------------------------------
console.log('--- TEST A & B: Thuy assigned 7B and 9A; 7A belongs to John ---');

const class7B: ClassItem = {
  id: 'CLS-7B',
  name: 'Lớp 7B',
  code: '7B',
  level: 'Secondary',
  courseId: 'PROG-SEC',
  curriculum: 'English 7',
  teacherId: 'TCH-THUY',
  classroom: 'Phòng 101',
  scheduleDays: 'Thứ 3, Thứ 5',
  scheduleTime: '17:30 - 19:00',
  weeklySchedule: [
    { dayOfWeek: 2, dayName: 'Thứ 3', startTime: '17:30', endTime: '19:00', teacherId: 'TCH-THUY' },
    { dayOfWeek: 4, dayName: 'Thứ 5', startTime: '17:30', endTime: '19:00', teacherId: 'TCH-THUY' }
  ],
  startDate: '2026-09-01',
  endDate: '2027-05-31',
  maxCapacity: 15,
  studentIds: ['STU-01'],
  status: 'active'
};

const class9A: ClassItem = {
  id: 'CLS-9A',
  name: 'Lớp 9A',
  code: '9A',
  level: 'Secondary',
  courseId: 'PROG-SEC',
  curriculum: 'English 9',
  teacherId: 'TCH-THUY',
  classroom: 'Phòng 102',
  scheduleDays: 'Thứ 6',
  scheduleTime: '18:00 - 19:30',
  weeklySchedule: [
    { dayOfWeek: 5, dayName: 'Thứ 6', startTime: '18:00', endTime: '19:30', teacherId: 'TCH-THUY' }
  ],
  startDate: '2026-09-01',
  endDate: '2027-05-31',
  maxCapacity: 15,
  studentIds: ['STU-02'],
  status: 'active'
};

const class7A: ClassItem = {
  id: 'CLS-7A',
  name: 'Lớp 7A',
  code: '7A',
  level: 'Secondary',
  courseId: 'PROG-SEC',
  curriculum: 'English 7',
  teacherId: 'TCH-JOHN', // Belongs to John, NOT Thuy!
  classroom: 'Phòng 103',
  scheduleDays: 'Thứ 2, Thứ 4',
  scheduleTime: '17:30 - 19:00',
  weeklySchedule: [
    { dayOfWeek: 1, dayName: 'Thứ 2', startTime: '17:30', endTime: '19:00', teacherId: 'TCH-JOHN' },
    { dayOfWeek: 3, dayName: 'Thứ 4', startTime: '17:30', endTime: '19:00', teacherId: 'TCH-JOHN' }
  ],
  startDate: '2026-09-01',
  endDate: '2027-05-31',
  maxCapacity: 15,
  studentIds: ['STU-03'],
  status: 'active'
};

let classes = [class7B, class9A, class7A];
teachers = recalculateTeacherAssignedClasses(classes, teachers);

// Seed with potentially dirty timetable (e.g. old record where 7A mistakenly had Thuy's ID)
let rawTimetable: TimetableSession[] = [
  {
    id: 'SES-DIRTY-7A',
    classId: 'CLS-7A',
    className: 'Lớp 7A',
    teacherId: 'TCH-THUY', // STALE / DIRTY ID from legacy
    teacherName: 'Cô Thúy',
    classroom: 'Phòng 103',
    dayOfWeek: 1,
    dayName: 'Thứ 2',
    startTime: '17:30',
    endTime: '19:00',
    status: 'scheduled'
  }
];

// Run reconciliation
let timetable = reconcileTimetableWithClasses(classes, rawTimetable, teachers, []);

// Test A Verification: Thuy Timetable shows 7B and 9A only
const thuySessions = filterTimetable(timetable, classes, true, 'TCH-THUY');
const thuyClassIds = Array.from(new Set(thuySessions.map(s => s.classId)));
assert(
  thuyClassIds.includes('CLS-7B') && thuyClassIds.includes('CLS-9A') && thuyClassIds.length === 2,
  'TEST A: Teacher Thuy Timetable shows 7B and 9A only (exactly 2 classes, 3 sessions: Tue, Thu, Fri)'
);
assert(thuySessions.length === 3, 'Teacher Thuy has exactly 3 sessions (7B Tue, 7B Thu, 9A Fri)');

// Test B Verification: 7A belongs to John -> Thuy never sees 7A
assert(
  !thuySessions.some(s => s.classId === 'CLS-7A'),
  'TEST B: Teacher Thuy NEVER sees Class 7A in Timetable'
);
const johnSessions = filterTimetable(timetable, classes, true, 'TCH-JOHN');
assert(
  johnSessions.some(s => s.classId === 'CLS-7A'),
  'TEST B: Class 7A belongs to John and appears in John Timetable'
);

// --------------------------------------------------------------------------
// TEST C: Reassign 9A from Thuy to Hue -> Thuy loses 9A; Hue receives 9A
// --------------------------------------------------------------------------
console.log('\n--- TEST C: Reassign 9A from Thuy to Hue ---');

const reassigned9A: ClassItem = {
  ...class9A,
  teacherId: 'TCH-HUE',
  weeklySchedule: [
    { dayOfWeek: 5, dayName: 'Thứ 6', startTime: '18:00', endTime: '19:30', teacherId: 'TCH-HUE' }
  ]
};

classes = classes.map(c => (c.id === 'CLS-9A' ? reassigned9A : c));
teachers = recalculateTeacherAssignedClasses(classes, teachers);
timetable = reconcileTimetableWithClasses(classes, timetable, teachers, []);

const thuySessionsAfterC = filterTimetable(timetable, classes, true, 'TCH-THUY');
const hueSessionsAfterC = filterTimetable(timetable, classes, true, 'TCH-HUE');

assert(
  !thuySessionsAfterC.some(s => s.classId === 'CLS-9A'),
  'TEST C: Teacher Thuy loses 9A from Timetable'
);
assert(
  thuySessionsAfterC.every(s => s.classId === 'CLS-7B'),
  'TEST C: Teacher Thuy now ONLY has Class 7B'
);
assert(
  hueSessionsAfterC.some(s => s.classId === 'CLS-9A'),
  'TEST C: Teacher Hue receives Class 9A in Timetable'
);

// --------------------------------------------------------------------------
// TEST D: Delete Demo Star 7 -> Hue loses Star 7 after refresh & account switching
// --------------------------------------------------------------------------
console.log('\n--- TEST D: Delete Demo Star 7 and verify complete elimination ---');

// Admin creates Demo Star 7 for Hue
const demoStar7: ClassItem = {
  id: 'CLS-STAR-7',
  name: 'Demo Star 7',
  code: 'STAR-7',
  level: 'Pre A1 Starters',
  courseId: 'PROG-STA',
  curriculum: 'Starters',
  teacherId: 'TCH-HUE',
  classroom: 'Phòng 201',
  scheduleDays: 'Thứ 7',
  scheduleTime: '09:00 - 10:30',
  weeklySchedule: [
    { dayOfWeek: 6, dayName: 'Thứ 7', startTime: '09:00', endTime: '10:30', teacherId: 'TCH-HUE' }
  ],
  startDate: '2026-09-01',
  endDate: '2027-05-31',
  maxCapacity: 10,
  studentIds: [],
  status: 'active'
};

classes = [...classes, demoStar7];
teachers = recalculateTeacherAssignedClasses(classes, teachers);
timetable = reconcileTimetableWithClasses(classes, timetable, teachers, []);

// Hue sees Star 7 before deletion
const hueBeforeDelete = filterTimetable(timetable, classes, true, 'TCH-HUE');
assert(
  hueBeforeDelete.some(s => s.classId === 'CLS-STAR-7'),
  'Teacher Hue sees Star 7 before deletion'
);

// Admin deletes Demo Star 7
classes = classes.filter(c => c.id !== 'CLS-STAR-7');
teachers = recalculateTeacherAssignedClasses(classes, teachers);
timetable = reconcileTimetableWithClasses(classes, timetable, teachers, []);

// Hue timetable immediately loses Star 7
const hueAfterDelete = filterTimetable(timetable, classes, true, 'TCH-HUE');
assert(
  !hueAfterDelete.some(s => s.classId === 'CLS-STAR-7'),
  'TEST D: Teacher Hue immediately loses Star 7 from Timetable'
);

// Simulate page refresh / account switching / remote cloud pull
const mockCloudPullWithStaleStar7: any = {
  classes: classes, // Star 7 is deleted in classes
  teachers: teachers,
  // Cloud or stale storage still had orphaned Star 7 record
  timetable: [
    ...timetable,
    {
      id: 'SES-STAR-7-STALE',
      classId: 'CLS-STAR-7',
      className: 'Demo Star 7',
      teacherId: 'TCH-HUE',
      classroom: 'Phòng 201',
      dayOfWeek: 6,
      dayName: 'Thứ 7',
      startTime: '09:00',
      endTime: '10:30',
      status: 'scheduled'
    }
  ],
  students: [],
  teachingAssistants: [],
  academicManagers: [],
  attendance: [],
  assessments: [],
  lessonReports: [],
  users: []
};

// Account switching or refresh calls normalizeAppDataStore:
const refreshedStore = normalizeAppDataStore(mockCloudPullWithStaleStar7 as AppDataStore);

// Assert orphaned Star 7 record was completely purged from the data source:
assert(
  !refreshedStore.timetable.some(s => s.classId === 'CLS-STAR-7'),
  'TEST D: Stale Demo Star 7 is completely PURGED from data store upon refresh/account switching'
);

const hueRefreshed = filterTimetable(refreshedStore.timetable, refreshedStore.classes, true, 'TCH-HUE');
assert(
  !hueRefreshed.some(s => s.classId === 'CLS-STAR-7'),
  'TEST D: Teacher Hue does NOT see Star 7 after refresh and account switching'
);

// --------------------------------------------------------------------------
// TEST E: Create a new class -> Admin and assigned Teacher see its timetable
// --------------------------------------------------------------------------
console.log('\n--- TEST E: Create new class and verify timetable appearance ---');

const newClassMover: ClassItem = {
  id: 'CLS-NEW-MOV',
  name: 'Movers New 2026',
  code: 'MOV-26',
  level: 'A1 Movers',
  courseId: 'PROG-MOV',
  curriculum: 'Movers',
  teacherId: 'TCH-HUE',
  classroom: 'Phòng 205',
  scheduleDays: 'Thứ 4',
  scheduleTime: '18:00 - 19:30',
  weeklySchedule: [
    { dayOfWeek: 3, dayName: 'Thứ 4', startTime: '18:00', endTime: '19:30', teacherId: 'TCH-HUE' }
  ],
  startDate: '2026-09-01',
  endDate: '2027-05-31',
  maxCapacity: 12,
  studentIds: [],
  status: 'active'
};

classes = [...refreshedStore.classes, newClassMover];
teachers = recalculateTeacherAssignedClasses(classes, refreshedStore.teachers);
timetable = reconcileTimetableWithClasses(classes, refreshedStore.timetable, teachers, []);

// Admin Timetable shows new class
const adminTimetableE = filterTimetable(timetable, classes, false, '');
assert(
  adminTimetableE.some(s => s.classId === 'CLS-NEW-MOV'),
  'TEST E: Admin Timetable displays the new class (Movers New 2026)'
);

// Assigned Teacher (Hue) Timetable shows new class
const hueTimetableE = filterTimetable(timetable, classes, true, 'TCH-HUE');
assert(
  hueTimetableE.some(s => s.classId === 'CLS-NEW-MOV'),
  'TEST E: Assigned Teacher (Hue) Timetable displays the new class'
);

// Other Teachers do NOT see new class
const thuyTimetableE = filterTimetable(timetable, classes, true, 'TCH-THUY');
assert(
  !thuyTimetableE.some(s => s.classId === 'CLS-NEW-MOV'),
  'TEST E: Unassigned Teacher (Thuy) does NOT see the new class'
);

// --------------------------------------------------------------------------
// TEST F: Change weekday/time -> updated schedule, no duplicate entries
// --------------------------------------------------------------------------
console.log('\n--- TEST F: Change weekday/time -> updated schedule, no duplicate entries ---');

// Change Movers New 2026 from Wednesday (dayOfWeek: 3) to Saturday (dayOfWeek: 6) 15:00 - 16:30
const updatedMoverF: ClassItem = {
  ...newClassMover,
  scheduleDays: 'Thứ 7',
  scheduleTime: '15:00 - 16:30',
  weeklySchedule: [
    { dayOfWeek: 6, dayName: 'Thứ 7', startTime: '15:00', endTime: '16:30', teacherId: 'TCH-HUE' }
  ]
};

classes = classes.map(c => (c.id === 'CLS-NEW-MOV' ? updatedMoverF : c));
timetable = reconcileTimetableWithClasses(classes, timetable, teachers, []);

// Wednesday must have 0 sessions for this class
const wedSessions = filterTimetable(timetable, classes, false, '', 3).filter(s => s.classId === 'CLS-NEW-MOV');
assert(
  wedSessions.length === 0,
  'TEST F: Old Wednesday schedule slot is completely removed'
);

// Saturday must have exactly 1 session
const satSessions = filterTimetable(timetable, classes, false, '', 6).filter(s => s.classId === 'CLS-NEW-MOV');
assert(
  satSessions.length === 1,
  'TEST F: Saturday schedule slot is created with updated time 15:00 - 16:30'
);
assert(
  satSessions[0].startTime === '15:00' && satSessions[0].endTime === '16:30',
  'TEST F: Session reflects the updated start/end time'
);

// Total sessions for CLS-NEW-MOV across the entire timetable MUST be exactly 1 (NO DUPLICATES)
const totalSessionsForClass = timetable.filter(s => s.classId === 'CLS-NEW-MOV');
assert(
  totalSessionsForClass.length === 1,
  'TEST F: Exactly 1 total session exists for this class (NO DUPLICATES)'
);

console.log('\n================================================================');
console.log('ALL SIX REQUIRED TESTS (A, B, C, D, E, F) PASSED WITH 100% SUCCESS!');
console.log('================================================================');
