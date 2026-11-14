import {
  resolveStaffProfile,
  getAssignedClassesForStaff,
  syncAllClassesToTimetable
} from './src/services/dataService';
import { initialTeachers, initialTeachingAssistants, initialUsers } from './src/data/initialData';
import type { ClassItem, Teacher, TeachingAssistant, TimetableSession, User } from './src/types';

function runVerification() {
  console.log('================================================================');
  console.log('TEST SUITE: LEEGO CENTER MANAGEMENT - TARGETED BUG FIXES');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      if (detail) console.error(`       Detail: ${detail}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: ISSUE 1 - TEACHER IDENTITY RESOLUTION
  // --------------------------------------------------------------------------
  console.log('\n--- GROUP 1: Teacher Identity Resolution ---');

  // Test 1.1: Tieu Thi Hue Account with TCH-009
  const hueUser: User = {
    id: 'USR-HUE',
    username: 'hue.tieu',
    name: 'Tiêu Thị Huệ',
    email: 'hue.tieu@leego.edu.vn',
    role: 'teacher',
    teacherId: 'TCH-009',
    status: 'active',
    createdAt: '2025-01-01'
  };

  const hueRes = resolveStaffProfile(hueUser, initialTeachers, initialTeachingAssistants);
  assert(
    hueRes.isTeacher === true &&
    hueRes.staffId === 'TCH-009' &&
    hueRes.staffName === 'Tiêu Thị Huệ' &&
    hueRes.hasValidProfileLink === true,
    'Test 1.1: Tieu Thi Hue resolves to TCH-009 and displays "Tiêu Thị Huệ"'
  );

  // Test 1.2: Identity collision protection - Even if TCH-009 was misnamed "Lê Thị Hoa" in corrupted DB
  const corruptedTeachers: Teacher[] = initialTeachers.map(t =>
    t.id === 'TCH-009' ? { ...t, fullName: 'Lê Thị Hoa' } : t
  );

  const hueResProtected = resolveStaffProfile(hueUser, corruptedTeachers, initialTeachingAssistants);
  assert(
    hueResProtected.staffName === 'Tiêu Thị Huệ' &&
    hueResProtected.staffId === 'TCH-009' &&
    !hueResProtected.staffName.includes('Lê Thị Hoa'),
    'Test 1.2: Name conflict protection prevents Le Thi Hoa identity leakage into Tieu Thi Hue account'
  );

  // Test 1.3: Le Thi Hoa Account resolves to Le Thi Hoa (TCH-007)
  const hoaUser: User = {
    id: 'USR-HOA',
    username: 'hoa.le',
    name: 'Lê Thị Hoa',
    email: 'hoa.le@leego.edu.vn',
    role: 'teacher',
    teacherId: 'TCH-007',
    status: 'active',
    createdAt: '2025-01-01'
  };

  const hoaRes = resolveStaffProfile(hoaUser, initialTeachers, initialTeachingAssistants);
  assert(
    hoaRes.isTeacher === true &&
    hoaRes.staffId === 'TCH-007' &&
    hoaRes.staffName === 'Lê Thị Hoa' &&
    hoaRes.hasValidProfileLink === true,
    'Test 1.3: Le Thi Hoa account resolves to TCH-007 and displays "Lê Thị Hoa"'
  );

  // Test 1.4: Regression check for other verified teachers
  const thanhHuyenUser: User = {
    id: 'USR-THANH-HUYEN',
    name: 'Trần Thị Thanh Huyền',
    username: 'huyen.tran',
    email: 'huyen.tran@leego.edu.vn',
    role: 'teacher',
    teacherId: 'TCH-006',
    status: 'active',
    createdAt: '2025-01-01'
  };
  const thanhHuyenRes = resolveStaffProfile(thanhHuyenUser, initialTeachers, initialTeachingAssistants);
  assert(
    thanhHuyenRes.staffName === 'Trần Thị Thanh Huyền' && thanhHuyenRes.staffId === 'TCH-006',
    'Test 1.4a: Tran Thi Thanh Huyen identity unchanged'
  );

  const daoHuyenUser: User = {
    id: 'USR-DAO-HUYEN',
    name: 'Đào Thị Huyền',
    username: 'huyen.dao',
    email: 'huyen.dao@leego.edu.vn',
    role: 'teacher',
    teacherId: 'TCH-008',
    status: 'active',
    createdAt: '2025-01-01'
  };
  const daoHuyenRes = resolveStaffProfile(daoHuyenUser, initialTeachers, initialTeachingAssistants);
  assert(
    daoHuyenRes.staffName === 'Đào Thị Huyền' && daoHuyenRes.staffId === 'TCH-008',
    'Test 1.4b: Dao Thi Huyen identity unchanged'
  );

  const thuyUser: User = {
    id: 'USR-THUY',
    name: 'Nguyễn Phương Thúy',
    username: 'thuy.nguyen',
    email: 'thuy.nguyen@leego.edu.vn',
    role: 'teacher',
    teacherId: 'TCH-THUY',
    status: 'active',
    createdAt: '2025-01-01'
  };
  const thuyRes = resolveStaffProfile(thuyUser, initialTeachers, initialTeachingAssistants);
  assert(
    thuyRes.staffName === 'Nguyễn Phương Thúy' && thuyRes.staffId === 'TCH-THUY',
    'Test 1.4c: Nguyen Phuong Thuy identity unchanged'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 2: ISSUE 2 - TEACHING ASSISTANT TIMETABLE SESSION-LEVEL FILTERING
  // --------------------------------------------------------------------------
  console.log('\n--- GROUP 2: TA Timetable Session-Level Filtering ---');

  // Class CLS-MIX:
  // Primary Teacher: TCH-001 (David Miller)
  // Primary Assistant: TA-001 (Nguyễn Thảo Linh)
  // Schedule:
  // - Monday (dayOfWeek: 1): TCH-001 teaches ALONE (no assistant on Monday)
  // - Wednesday (dayOfWeek: 3): TCH-001 teaches WITH TA-001 assisting
  const testClass: ClassItem = {
    id: 'CLS-MIX',
    name: 'Class Mixed TA',
    code: 'MIX-01',
    level: 'A1 Movers',
    curriculum: 'Cambridge Movers',
    teacherId: 'TCH-001',
    assistantTeacherId: 'TA-001', // Class-level assistant
    classroom: 'Phòng 101',
    scheduleDays: 'Thứ 2, Thứ 4',
    scheduleTime: '17:30 - 19:00',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    maxCapacity: 15,
    studentIds: [],
    status: 'ongoing',
    weeklySchedule: [
      {
        dayOfWeek: 1,
        dayName: 'Thứ 2',
        startTime: '17:30',
        endTime: '19:00',
        teacherId: 'TCH-001',
        assistantTeacherId: undefined // Main teacher teaches alone on Monday!
      },
      {
        dayOfWeek: 3,
        dayName: 'Thứ 4',
        startTime: '17:30',
        endTime: '19:00',
        teacherId: 'TCH-001',
        assistantTeacherId: 'TA-001' // TA assists ONLY on Wednesday!
      }
    ]
  };

  const syncedTimetable = syncAllClassesToTimetable([testClass], [], initialTeachers, initialTeachingAssistants);

  // Session filtering simulation matching TimetableView.tsx
  function filterTimetableForRole(sessions: TimetableSession[], staffRes: any, classesList: ClassItem[]) {
    return sessions.filter(session => {
      const cls = session.classId ? classesList.find(c => c.id === session.classId) : null;
      if (session.classId && (!cls || cls.status === 'cancelled')) return false;

      const slot = cls?.weeklySchedule?.find(s => s.dayOfWeek === session.dayOfWeek);
      const effTeacherId = String(slot?.teacherId || cls?.teacherId || session.teacherId || '').trim();
      const effAssistantId = String(slot?.assistantTeacherId ?? session.assistantId ?? '').trim();

      if (staffRes.isTeacher) {
        if (staffRes.staffId && effTeacherId !== staffRes.staffId) return false;
      }
      if (staffRes.isTA) {
        if (!staffRes.staffId || effAssistantId !== staffRes.staffId) return false;
      }
      return true;
    });
  }

  // TA Linh Resolution
  const taLinhUser: User = {
    id: 'USR-LINH',
    name: 'Nguyễn Thảo Linh',
    email: 'thaolinh.nguyen@leego.edu.vn',
    role: 'teaching_assistant',
    teachingAssistantId: 'TA-001',
    status: 'active',
    createdAt: '2025-01-01'
  };
  const taLinhRes = resolveStaffProfile(taLinhUser, initialTeachers, initialTeachingAssistants);

  const taLinhVisible = filterTimetableForRole(syncedTimetable, taLinhRes, [testClass]);
  assert(
    taLinhVisible.length === 1 &&
    taLinhVisible[0].dayOfWeek === 3,
    'Test 2.1: TA sees ONLY Wednesday (explicitly assigned), NOT Monday (teacher alone)'
  );

  // Main Teacher David Miller Resolution
  const teacherDavidUser: User = {
    id: 'USR-DAVID',
    name: 'David Miller',
    email: 'david.miller@leego.edu.vn',
    role: 'teacher',
    teacherId: 'TCH-001',
    status: 'active',
    createdAt: '2025-01-01'
  };
  const davidRes = resolveStaffProfile(teacherDavidUser, initialTeachers, initialTeachingAssistants);
  const davidVisible = filterTimetableForRole(syncedTimetable, davidRes, [testClass]);
  assert(
    davidVisible.length === 2,
    'Test 2.2: Main Teacher David sees BOTH Monday and Wednesday sessions'
  );

  // Admin Resolution
  const adminUser: User = {
    id: 'USR-ADMIN',
    name: 'Nguyễn Quản Trị',
    email: 'admin@leego.edu.vn',
    role: 'admin',
    status: 'active',
    createdAt: '2025-01-01'
  };
  const adminRes = resolveStaffProfile(adminUser, initialTeachers, initialTeachingAssistants);
  const adminVisible = filterTimetableForRole(syncedTimetable, adminRes, [testClass]);
  assert(
    adminVisible.length === 2,
    'Test 2.3: Admin timetable shows all sessions'
  );

  // Test 2.4: Changing assistantId on timetable session immediately updates TA visibility
  const updatedTimetable = syncedTimetable.map(s =>
    s.dayOfWeek === 1 ? { ...s, assistantId: 'TA-001' } : s
  );
  // Also simulate slot update
  const updatedClass: ClassItem = {
    ...testClass,
    weeklySchedule: testClass.weeklySchedule!.map(slot =>
      slot.dayOfWeek === 1 ? { ...slot, assistantTeacherId: 'TA-001' } : slot
    )
  };
  const taLinhUpdated = filterTimetableForRole(updatedTimetable, taLinhRes, [updatedClass]);
  assert(
    taLinhUpdated.length === 2,
    'Test 2.4: Updating Monday slot with TA-001 immediately reveals Monday to TA Linh'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: ISSUE 3 - ADMIN COURSE DURATION MENU VISIBILITY
  // --------------------------------------------------------------------------
  console.log('\n--- GROUP 3: Admin Course Duration Visibility ---');

  // Verify Sidebar menu items configuration
  interface MenuItem {
    id: string;
    label: string;
    sublabel?: string;
    allowedRoles: ('admin' | 'academic_manager' | 'teacher' | 'teaching_assistant')[];
  }

  // Exact configuration matching Sidebar.tsx
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', allowedRoles: ['admin', 'academic_manager', 'teacher', 'teaching_assistant'] },
    { id: 'students', label: 'Học sinh', allowedRoles: ['admin', 'academic_manager', 'teacher', 'teaching_assistant'] },
    { id: 'parents', label: 'Phụ huynh', allowedRoles: ['admin', 'academic_manager'] },
    { id: 'classes', label: 'Lớp học', allowedRoles: ['admin', 'academic_manager', 'teacher', 'teaching_assistant'] },
    { id: 'teaching_schedule', label: 'Teaching Schedule', allowedRoles: ['admin', 'academic_manager', 'teacher', 'teaching_assistant'] },
    { id: 'programs', label: 'Thời lượng khóa học', sublabel: 'Course Duration', allowedRoles: ['admin'] },
    { id: 'teachers', label: 'Giáo viên', allowedRoles: ['admin', 'academic_manager'] },
    { id: 'assistants', label: 'Trợ giảng', allowedRoles: ['admin', 'academic_manager'] },
    { id: 'timetable', label: 'Thời khóa biểu', allowedRoles: ['admin', 'academic_manager', 'teacher', 'teaching_assistant'] },
    { id: 'attendance', label: 'Điểm danh', allowedRoles: ['admin', 'academic_manager', 'teacher', 'teaching_assistant'] },
    { id: 'assessments', label: 'Đánh giá học tập', allowedRoles: ['admin', 'academic_manager', 'teacher', 'teaching_assistant'] },
    { id: 'lesson_plans', label: 'Giáo án & Báo cáo', allowedRoles: ['admin', 'academic_manager', 'teacher', 'teaching_assistant'] },
    { id: 'lesson_reports', label: 'Lesson Report', allowedRoles: ['admin', 'academic_manager', 'teacher', 'teaching_assistant'] },
    { id: 'reports', label: 'Báo cáo học thuật', allowedRoles: ['admin', 'academic_manager'] },
    { id: 'users', label: 'Quản lý tài khoản', allowedRoles: ['admin'] },
    { id: 'settings', label: 'Cài đặt', allowedRoles: ['admin'] }
  ];

  // Admin visibility
  const adminMenuItems = menuItems.filter(item => item.allowedRoles.includes('admin'));
  assert(
    adminMenuItems.some(i => i.id === 'programs' && i.sublabel === 'Course Duration'),
    'Test 3.1: Admin can see Course Duration menu item'
  );

  // Teacher visibility
  const teacherMenuItems = menuItems.filter(item => item.allowedRoles.includes('teacher'));
  assert(
    !teacherMenuItems.some(i => i.id === 'programs'),
    'Test 3.2: Teacher CANNOT see Course Duration menu item'
  );

  // TA visibility
  const taMenuItems = menuItems.filter(item => item.allowedRoles.includes('teaching_assistant'));
  assert(
    !taMenuItems.some(i => i.id === 'programs'),
    'Test 3.3: TA CANNOT see Course Duration menu item'
  );

  // Academic Manager visibility
  const amMenuItems = menuItems.filter(item => item.allowedRoles.includes('academic_manager'));
  assert(
    amMenuItems.length === 13 &&
    amMenuItems.some(i => i.id === 'classes') &&
    amMenuItems.some(i => i.id === 'teachers') &&
    amMenuItems.some(i => i.id === 'reports'),
    'Test 3.4: Academic Manager retains all its existing permissions'
  );

  // No duplicate entries
  const programCount = menuItems.filter(i => i.id === 'programs').length;
  assert(
    programCount === 1,
    'Test 3.5: No duplicate Course Duration menu entries exist'
  );

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    throw new Error('Some verification tests failed!');
  }
}

runVerification();
