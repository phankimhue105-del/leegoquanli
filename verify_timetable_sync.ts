import {
  syncSingleClassToTimetable,
  syncAllClassesToTimetable,
  recalculateTeacherAssignedClasses,
  normalizeAppDataStore
} from './src/services/dataService';
import type { AppDataStore, ClassItem, Teacher, TimetableSession } from './src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[FAIL] Assertion failed: ${msg}`);
  }
  console.log(`[PASS] ${msg}`);
}

console.log('=== STARTING TIMETABLE & CLASS ASSIGNMENT SYNC VERIFICATION ===\n');

// Mock teachers
const teacherX: Teacher = {
  id: 'TCH-X',
  fullName: 'Teacher X (Original)',
  email: 'teacherx@leego.edu.vn',
  phone: '0901111111',
  nationality: 'Vietnam',
  isNative: false,
  qualifications: 'IELTS 8.0',
  experienceYears: 4,
  assignedClassIds: [],
  hourlyRate: 200000,
  workloadHours: 0
};

const teacherY: Teacher = {
  id: 'TCH-Y',
  fullName: 'Teacher Y (Replacement)',
  email: 'teachery@leego.edu.vn',
  phone: '0902222222',
  nationality: 'Vietnam',
  isNative: false,
  qualifications: 'TESOL',
  experienceYears: 3,
  assignedClassIds: [],
  hourlyRate: 200000,
  workloadHours: 0
};

let teachers = [teacherX, teacherY];
let classes: ClassItem[] = [];
let timetable: TimetableSession[] = [];

// Helper to filter Timetable like TimetableView
function filterTimetable(
  sessions: TimetableSession[],
  classesList: ClassItem[],
  isTeacher: boolean,
  teacherId: string,
  filterDay?: number
) {
  return sessions.filter(session => {
    const cls = session.classId
      ? classesList.find(c => String(c.id).trim() === String(session.classId).trim())
      : null;
    if (cls && cls.status === 'cancelled') return false;

    const effTeacherId = String(session.teacherId || cls?.teacherId || '').trim();

    if (isTeacher) {
      if (teacherId && effTeacherId !== teacherId) return false;
    }

    if (filterDay !== undefined && session.dayOfWeek !== filterDay) {
      return false;
    }

    return true;
  });
}

// --------------------------------------------------------------------------
// TEST CASE 1: Create Class A assigned to Teacher X, Monday 18:00–19:30
// --------------------------------------------------------------------------
console.log('--- TEST CASE 1: Create Class A assigned to Teacher X, Monday 18:00–19:30 ---');
const classA: ClassItem = {
  id: 'CLS-A',
  name: 'Class A - Starters',
  code: 'CLS-A-01',
  level: 'Pre A1 Starters',
  courseId: 'PROG-STA',
  curriculum: 'Cambridge YLE Starters',
  teacherId: 'TCH-X',
  classroom: 'Phòng 101',
  scheduleDays: 'Thứ 2',
  scheduleTime: '18:00 - 19:30',
  weeklySchedule: [
    {
      dayOfWeek: 1, // Monday
      dayName: 'Thứ 2',
      startTime: '18:00',
      endTime: '19:30',
      teacherId: 'TCH-X'
    }
  ],
  startDate: '2026-03-01',
  endDate: '2026-08-30',
  maxCapacity: 15,
  studentIds: ['STU-01', 'STU-02'],
  status: 'active'
};

classes = [classA];
teachers = recalculateTeacherAssignedClasses(classes, teachers);
timetable = syncSingleClassToTimetable(classA, timetable, teachers, []);

// Verify Admin Timetable
const adminSessionsT1 = filterTimetable(timetable, classes, false, '');
assert(adminSessionsT1.length === 1, 'Admin Timetable shows Class A session');
assert(adminSessionsT1[0].classId === 'CLS-A', 'Admin Timetable shows correct classId CLS-A');
assert(adminSessionsT1[0].teacherId === 'TCH-X', 'Admin Timetable shows Teacher X assigned');
assert(adminSessionsT1[0].dayOfWeek === 1, 'Admin Timetable shows Monday (dayOfWeek: 1)');
assert(adminSessionsT1[0].startTime === '18:00' && adminSessionsT1[0].endTime === '19:30', 'Admin Timetable shows 18:00–19:30');

// Verify Teacher X Timetable
const teacherXSessionsT1 = filterTimetable(timetable, classes, true, 'TCH-X');
assert(teacherXSessionsT1.length === 1, 'Teacher X Timetable shows Class A');
assert(teacherXSessionsT1[0].classId === 'CLS-A', 'Teacher X Timetable matches classId CLS-A');

// Verify Teacher Y Timetable (does not see Class A)
const teacherYSessionsT1 = filterTimetable(timetable, classes, true, 'TCH-Y');
assert(teacherYSessionsT1.length === 0, 'Teacher Y Timetable correctly does NOT show Class A');

// --------------------------------------------------------------------------
// TEST CASE 2: Reassign Class A from Teacher X to Teacher Y
// --------------------------------------------------------------------------
console.log('\n--- TEST CASE 2: Reassign Class A from Teacher X to Teacher Y ---');
const updatedClassA_T2: ClassItem = {
  ...classA,
  teacherId: 'TCH-Y',
  weeklySchedule: [
    {
      dayOfWeek: 1,
      dayName: 'Thứ 2',
      startTime: '18:00',
      endTime: '19:30',
      teacherId: 'TCH-Y'
    }
  ]
};

classes = [updatedClassA_T2];
teachers = recalculateTeacherAssignedClasses(classes, teachers);
timetable = syncSingleClassToTimetable(updatedClassA_T2, timetable, teachers, []);

// Admin Timetable: updated assignment
const adminSessionsT2 = filterTimetable(timetable, classes, false, '');
assert(adminSessionsT2.length === 1, 'Admin Timetable still shows 1 session for Class A');
assert(adminSessionsT2[0].teacherId === 'TCH-Y', 'Admin Timetable shows updated assignment to Teacher Y');
assert(adminSessionsT2[0].teacherName === 'Teacher Y (Replacement)', 'Admin Timetable shows updated Teacher Y name');

// Teacher X: Class A disappears
const teacherXSessionsT2 = filterTimetable(timetable, classes, true, 'TCH-X');
assert(teacherXSessionsT2.length === 0, 'Teacher X Timetable: Class A DISAPPEARS completely');

// Teacher Y: Class A appears
const teacherYSessionsT2 = filterTimetable(timetable, classes, true, 'TCH-Y');
assert(teacherYSessionsT2.length === 1, 'Teacher Y Timetable: Class A APPEARS');
assert(teacherYSessionsT2[0].classId === 'CLS-A', 'Teacher Y sees Class A on Monday');

// Check teacher assignedClassIds
const tchX = teachers.find(t => t.id === 'TCH-X');
const tchY = teachers.find(t => t.id === 'TCH-Y');
assert(!tchX?.assignedClassIds.includes('CLS-A'), 'Teacher X assignedClassIds no longer contains CLS-A');
assert(Boolean(tchY?.assignedClassIds.includes('CLS-A')), 'Teacher Y assignedClassIds now contains CLS-A');

// --------------------------------------------------------------------------
// TEST CASE 3: Change Class A schedule from Monday to Tuesday
// --------------------------------------------------------------------------
console.log('\n--- TEST CASE 3: Change Class A schedule from Monday to Tuesday ---');
const updatedClassA_T3: ClassItem = {
  ...updatedClassA_T2,
  scheduleDays: 'Thứ 3',
  weeklySchedule: [
    {
      dayOfWeek: 2, // Tuesday
      dayName: 'Thứ 3',
      startTime: '18:00',
      endTime: '19:30',
      teacherId: 'TCH-Y'
    }
  ]
};

classes = [updatedClassA_T3];
teachers = recalculateTeacherAssignedClasses(classes, teachers);
timetable = syncSingleClassToTimetable(updatedClassA_T3, timetable, teachers, []);

// Check that Monday has 0 sessions
const mondayAdmin = filterTimetable(timetable, classes, false, '', 1);
assert(mondayAdmin.length === 0, 'Admin Timetable: Monday has 0 sessions (old Monday session removed)');

// Check that Tuesday has Class A
const tuesdayAdmin = filterTimetable(timetable, classes, false, '', 2);
assert(tuesdayAdmin.length === 1, 'Admin Timetable: Tuesday shows Class A');
assert(tuesdayAdmin[0].dayOfWeek === 2, 'Session is on dayOfWeek: 2 (Tuesday)');

// Check Teacher Y sees Tuesday only
const tuesdayTeacherY = filterTimetable(timetable, classes, true, 'TCH-Y', 2);
const mondayTeacherY = filterTimetable(timetable, classes, true, 'TCH-Y', 1);
assert(tuesdayTeacherY.length === 1, 'Teacher Y Timetable: Tuesday shows Class A');
assert(mondayTeacherY.length === 0, 'Teacher Y Timetable: Monday has 0 sessions');

// --------------------------------------------------------------------------
// TEST CASE 4: Refresh and login with another account/device
// --------------------------------------------------------------------------
console.log('\n--- TEST CASE 4: Refresh and login with another account/device ---');
// Simulate fresh machine / storage deserialization
const mockRawCloudStore: any = {
  classes: classes,
  teachers: [
    { ...teacherX, assignedClassIds: ['OLD-STALE-ID'] },
    { ...teacherY, assignedClassIds: [] }
  ],
  // Stale or partially missing timetable from cloud
  timetable: [
    {
      id: 'SES-STALE',
      classId: 'CLS-A',
      className: 'Class A',
      teacherId: 'TCH-X', // Outdated teacher
      teacherName: 'Teacher X',
      classroom: 'Phòng 101',
      dayOfWeek: 1, // Outdated day
      dayName: 'Thứ 2',
      startTime: '18:00',
      endTime: '19:30',
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

// When Machine B pulls data or page refreshes, normalizeAppDataStore is invoked:
const freshStore = normalizeAppDataStore(mockRawCloudStore as AppDataStore);

// Assert timetable was reconciled with authoritative class schedule:
const freshClassASessions = freshStore.timetable.filter(s => s.classId === 'CLS-A');
assert(freshClassASessions.length === 1, 'Fresh device timetable has exactly 1 session for Class A');
assert(freshClassASessions[0].dayOfWeek === 2, 'Fresh device timetable reflects Tuesday (dayOfWeek: 2)');
assert(freshClassASessions[0].teacherId === 'TCH-Y', 'Fresh device timetable reflects Teacher Y');
assert(freshClassASessions[0].teacherName === 'Teacher Y (Replacement)', 'Fresh device reflects Teacher Y name');

const freshTchX = freshStore.teachers.find(t => t.id === 'TCH-X');
const freshTchY = freshStore.teachers.find(t => t.id === 'TCH-Y');
assert(!freshTchX?.assignedClassIds.includes('CLS-A'), 'Fresh device: Teacher X assignedClassIds does NOT contain CLS-A');
assert(Boolean(freshTchY?.assignedClassIds.includes('CLS-A')), 'Fresh device: Teacher Y assignedClassIds contains CLS-A');

// --------------------------------------------------------------------------
// TEST CASE 5: Repeat edits and verify no duplicate schedule entries
// --------------------------------------------------------------------------
console.log('\n--- TEST CASE 5: Repeat edits and verify no duplicate schedule entries ---');
let repeatedTimetable = freshStore.timetable;
let currentClass = { ...updatedClassA_T3 };

for (let i = 1; i <= 5; i++) {
  currentClass = {
    ...currentClass,
    name: `Class A - Edit ${i}`,
    classroom: `Phòng 10${i}`
  };
  repeatedTimetable = syncSingleClassToTimetable(
    currentClass,
    repeatedTimetable,
    freshStore.teachers,
    []
  );
}

const repeatedClassSessions = repeatedTimetable.filter(s => s.classId === 'CLS-A');
assert(repeatedClassSessions.length === 1, 'After 5 edits, Class A STILL has exactly 1 session (NO DUPLICATES)');
assert(repeatedClassSessions[0].className === 'Class A - Edit 5', 'Session reflects the 5th edit class name');
assert(repeatedClassSessions[0].classroom === 'Phòng 105', 'Session reflects the 5th edit classroom');

// Also test adding a second day (Thursday) to Class A
const twoDayClass: ClassItem = {
  ...currentClass,
  weeklySchedule: [
    { dayOfWeek: 2, dayName: 'Thứ 3', startTime: '18:00', endTime: '19:30', teacherId: 'TCH-Y' },
    { dayOfWeek: 4, dayName: 'Thứ 5', startTime: '18:00', endTime: '19:30', teacherId: 'TCH-Y' }
  ]
};

const twoDayTimetable = syncSingleClassToTimetable(
  twoDayClass,
  repeatedTimetable,
  freshStore.teachers,
  []
);
const twoDaySessions = twoDayTimetable.filter(s => s.classId === 'CLS-A');
assert(twoDaySessions.length === 2, 'Adding Thursday results in exactly 2 sessions for Class A');
assert(
  twoDaySessions.some(s => s.dayOfWeek === 2) && twoDaySessions.some(s => s.dayOfWeek === 4),
  'Sessions correctly placed on Tuesday and Thursday'
);

console.log('\n=== ALL 5 TIMETABLE & CLASS ASSIGNMENT SYNC TESTS PASSED! ===');
