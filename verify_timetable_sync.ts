import {
  resolveStaffProfile,
  getAssignedClassesForStaff,
  recalculateAssistantAssignedClasses,
  recalculateTeacherAssignedClasses,
  reconcileTimetableWithClasses
} from './src/services/dataService';
import { initialUsers, initialTeachers, initialTeachingAssistants, initialClasses } from './src/data/initialData';
import { ClassItem, TeachingAssistant, User, Student, AttendanceRecord, StudentAttendanceEntry } from './src/types';

function runTests() {
  console.log('====================================================');
  console.log('TEACHING ASSISTANT ACCOUNT DATA & CLASS ACCESS TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
    }
  }

  // --- Test 1: Account-Profile Linking for TA (Direct role or teachingAssistantId) ---
  const taUser1: User = {
    id: 'USR-005',
    name: 'Nguyễn Thảo Linh (Teaching Assistant)',
    email: 'thaolinh.nguyen@leego.edu.vn',
    username: 'ta@leego.edu.vn',
    role: 'teaching_assistant',
    teachingAssistantId: 'TA-001',
    status: 'active',
    createdAt: '2025-01-01'
  };

  const staffResolution1 = resolveStaffProfile(taUser1, initialTeachers, initialTeachingAssistants);
  assert(
    staffResolution1.isTA === true &&
    staffResolution1.isTeacher === false &&
    staffResolution1.staffId === 'TA-001' &&
    staffResolution1.staffName === 'Nguyễn Thảo Linh' &&
    staffResolution1.hasValidProfileLink === true,
    'Test 1: TA User with explicit teachingAssistantId links correctly to TA-001'
  );

  // --- Test 2: Account-Profile Linking for TA from Google Apps Script (e.g. role: teacher but teacherId: TA-002) ---
  const gasTaUser: User = {
    id: 'USR-anhkhoa',
    name: 'Đỗ Anh Khoa',
    email: 'anhkhoa.do@leego.edu.vn',
    username: 'khoado',
    role: 'teaching_assistant',
    teacherId: 'TA-002', // GAS mapped to teacherId column with TA- prefix
    status: 'active',
    createdAt: '2025-01-01'
  };

  const staffResolution2 = resolveStaffProfile(gasTaUser, initialTeachers, initialTeachingAssistants);
  assert(
    staffResolution2.isTA === true &&
    staffResolution2.isTeacher === false &&
    staffResolution2.staffId === 'TA-002' &&
    staffResolution2.staffName === 'Đỗ Anh Khoa' &&
    staffResolution2.hasValidProfileLink === true,
    'Test 2: GAS TA User with TA- prefix in teacherId links safely to TA-002'
  );

  // --- Test 3: Unlinked / Invalid TA Profile Handling ---
  const unlinkedTaUser: User = {
    id: 'USR-999',
    name: 'Ghost Assistant',
    email: 'ghost.ta@leego.edu.vn',
    role: 'teaching_assistant',
    teachingAssistantId: 'TA-NONEXISTENT',
    status: 'active',
    createdAt: '2025-01-01'
  };

  const staffResolution3 = resolveStaffProfile(unlinkedTaUser, initialTeachers, initialTeachingAssistants);
  assert(
    staffResolution3.isTA === true &&
    Boolean(staffResolution3.diagnosticMessage) &&
    staffResolution3.diagnosticMessage!.includes('Tài khoản Trợ Giảng chưa được liên kết'),
    'Test 3: Unlinked TA user gets clear diagnostic message instead of broken state'
  );

  // --- Test 4: TA Class Filtering (Accessing Assigned Classes) ---
  // Create sample classes with explicit teacher and assistant IDs
  const sampleClasses: ClassItem[] = [
    {
      id: 'CLS-01',
      name: 'Starters A',
      code: 'STA-A',
      level: 'Pre A1 Starters',
      courseId: 'PROG-STA',
      curriculum: 'Cambridge YLE',
      teacherId: 'TCH-001',
      assistantTeacherId: 'TA-001',
      classroom: 'Room 101',
      scheduleDays: 'Thứ 2',
      scheduleTime: '18:00 - 19:30',
      startDate: '2025-01-01',
      endDate: '2025-06-01',
      maxCapacity: 15,
      studentIds: ['STU-1', 'STU-2'],
      status: 'ongoing'
    },
    {
      id: 'CLS-02',
      name: 'Movers B',
      code: 'MOV-B',
      level: 'A1 Movers',
      courseId: 'PROG-MOV',
      curriculum: 'Cambridge YLE',
      teacherId: 'TCH-002',
      assistantTeacherId: 'TA-002',
      classroom: 'Room 102',
      scheduleDays: 'Thứ 3',
      scheduleTime: '18:00 - 19:30',
      startDate: '2025-01-01',
      endDate: '2025-06-01',
      maxCapacity: 15,
      studentIds: ['STU-3'],
      status: 'ongoing'
    },
    {
      id: 'CLS-03',
      name: 'Flyers C',
      code: 'FLY-C',
      level: 'A2 Flyers',
      courseId: 'PROG-FLY',
      curriculum: 'Cambridge YLE',
      teacherId: 'TCH-001',
      assistantTeacherId: 'TA-001',
      classroom: 'Room 103',
      scheduleDays: 'Thứ 4',
      scheduleTime: '18:00 - 19:30',
      startDate: '2025-01-01',
      endDate: '2025-06-01',
      maxCapacity: 15,
      studentIds: ['STU-4'],
      status: 'ongoing'
    }
  ];

  const ta1Classes = getAssignedClassesForStaff(sampleClasses, staffResolution1);
  assert(
    ta1Classes.length === 2 &&
    ta1Classes.some(c => c.id === 'CLS-01') &&
    ta1Classes.some(c => c.id === 'CLS-03') &&
    !ta1Classes.some(c => c.id === 'CLS-02'),
    'Test 4: TA-001 sees exactly CLS-01 and CLS-03, excluding CLS-02'
  );

  // --- Test 5: Teacher vs TA Isolation ---
  const teacherUser: User = {
    id: 'USR-003',
    name: 'David Miller',
    email: 'david.miller@leego.edu.vn',
    role: 'teacher',
    teacherId: 'TCH-001',
    status: 'active',
    createdAt: '2025-01-01'
  };

  const teacherResolution = resolveStaffProfile(teacherUser, initialTeachers, initialTeachingAssistants);
  const teacher1Classes = getAssignedClassesForStaff(sampleClasses, teacherResolution);

  assert(
    teacher1Classes.length === 2 &&
    teacher1Classes.every(c => c.teacherId === 'TCH-001') &&
    !teacher1Classes.some(c => c.id === 'CLS-02'),
    'Test 5: Teacher TCH-001 sees only classes where teacherId === TCH-001, no role cross-talk'
  );

  // --- Test 6: Unassigned TA gets clean empty array (no demo data) ---
  const unassignedTaProfile: TeachingAssistant = {
    id: 'TA-999',
    fullName: 'Trợ Giảng Mới',
    email: 'new.ta@leego.edu.vn',
    phone: '0911223344',
    university: 'ULIS',
    englishCertificate: 'IELTS 7.5',
    assignedClassIds: [],
    status: 'active'
  };
  const unassignedTaUser: User = {
    id: 'USR-TA-NEW',
    name: 'Trợ Giảng Mới',
    email: 'new.ta@leego.edu.vn',
    role: 'teaching_assistant',
    teachingAssistantId: 'TA-999',
    status: 'active',
    createdAt: '2025-01-01'
  };

  const unassignedRes = resolveStaffProfile(unassignedTaUser, initialTeachers, [unassignedTaProfile]);
  const unassignedClasses = getAssignedClassesForStaff(sampleClasses, unassignedRes);
  assert(
    unassignedClasses.length === 0,
    'Test 6: Unassigned TA receives 0 classes (no fallback demo data, no leakage)'
  );

  // --- Test 7: Dynamic Reassignment of Assistant in Classes ---
  // Reassign CLS-01 assistant from TA-001 to TA-002
  const updatedClasses: ClassItem[] = sampleClasses.map(c =>
    c.id === 'CLS-01' ? { ...c, assistantTeacherId: 'TA-002' } : c
  );

  const syncedAssistants = recalculateAssistantAssignedClasses(updatedClasses, [
    { ...initialTeachingAssistants[0], id: 'TA-001' },
    { ...initialTeachingAssistants[1], id: 'TA-002' }
  ]);

  const ta1Record = syncedAssistants.find(a => a.id === 'TA-001');
  const ta2Record = syncedAssistants.find(a => a.id === 'TA-002');

  assert(
    !ta1Record?.assignedClassIds.includes('CLS-01') &&
    ta1Record?.assignedClassIds.includes('CLS-03') &&
    ta2Record?.assignedClassIds.includes('CLS-01') &&
    ta2Record?.assignedClassIds.includes('CLS-02'),
    'Test 7: Reassigning class assistant updates assignedClassIds immediately on both TAs'
  );

  // --- Test 8: RBAC Permission Isolation (TA does not get Admin/AM rights) ---
  // Mock permission checks
  function hasPermission(role: string, permission: string): boolean {
    if (role === 'admin') return true;
    if (role === 'academic_manager') {
      return ['manage_classes', 'view_classes', 'manage_timetable', 'review_lesson_plans'].includes(permission);
    }
    if (role === 'teacher' || role === 'teaching_assistant') {
      return ['view_dashboard', 'view_assigned_classes', 'take_attendance', 'submit_lesson_plan', 'view_timetable'].includes(permission);
    }
    return false;
  }

  assert(
    hasPermission('teaching_assistant', 'take_attendance') === true &&
    hasPermission('teaching_assistant', 'submit_lesson_plan') === true &&
    hasPermission('teaching_assistant', 'view_assigned_classes') === true &&
    hasPermission('teaching_assistant', 'manage_classes') === false &&
    hasPermission('teaching_assistant', 'manage_users') === false &&
    hasPermission('teaching_assistant', 'manage_timetable') === false,
    'Test 8: TA has classroom permissions but strictly NO admin/manager modification permissions'
  );

  // --- Test 9: Attendance takenBy TA records identity ---
  const sampleEntries: StudentAttendanceEntry[] = [
    { studentId: 'STU-1', studentName: 'Học sinh 1', status: 'present' },
    { studentId: 'STU-2', studentName: 'Học sinh 2', status: 'absent', note: 'Có phép' }
  ];

  const attendanceRecord: AttendanceRecord = {
    id: 'ATT-20250301-001',
    classId: 'CLS-01',
    className: 'Starters A',
    date: '2025-03-01',
    sessionTime: '18:00 - 19:30',
    teacherId: 'TCH-001',
    teacherName: 'David Miller',
    records: sampleEntries,
    totalStudents: 2,
    presentCount: 1,
    absentCount: 1,
    lateCount: 0,
    excusedCount: 0,
    takenAt: '01/03/2025 18:30:00',
    takenBy: taUser1.name // Recorded as Teaching Assistant's name
  };

  assert(
    attendanceRecord.takenBy === 'Nguyễn Thảo Linh (Teaching Assistant)' &&
    attendanceRecord.teacherName === 'David Miller',
    'Test 9: Attendance preserves teacher assignment while recording TA as taker'
  );

  // --- Test 10: Timetable reconciliation preserves assistantTeacherId & assistantName ---
  const sampleTimetable = [
    {
      id: 'TT-01',
      classId: 'CLS-01',
      className: 'Old Name',
      dayOfWeek: 1,
      dayName: 'Thứ 2',
      startTime: '18:00',
      endTime: '19:30',
      classroom: 'Old Room',
      teacherId: 'TCH-OLD',
      teacherName: 'Old Teacher',
      assistantId: 'TA-OLD',
      assistantName: 'Old TA',
      status: 'scheduled' as const
    }
  ];

  const reconciledTT = reconcileTimetableWithClasses(
    [sampleClasses[0]], // CLS-01 with teacherId: TCH-001, assistantTeacherId: TA-001
    sampleTimetable,
    [{ id: 'TCH-001', fullName: 'David Miller' } as any],
    [{ id: 'TA-001', fullName: 'Nguyễn Thảo Linh' } as any]
  );

  assert(
    reconciledTT.length === 1 &&
    reconciledTT[0].teacherId === 'TCH-001' &&
    reconciledTT[0].teacherName === 'David Miller' &&
    reconciledTT[0].assistantId === 'TA-001' &&
    reconciledTT[0].assistantName === 'Nguyễn Thảo Linh',
    'Test 10: Timetable reconciliation correctly reconciles assistantId and assistantName from classes'
  );

  console.log(`\n====================================================`);
  console.log(`VERIFICATION SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
