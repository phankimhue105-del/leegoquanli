import {
  getClassWeeklySchedule,
  mergeCenterData,
  normalizeAppDataStore,
  getLocalDeletedCourseDurationIds,
  recordLocalDeletedCourseDurationId,
  BASELINE_DATA_MAP
} from '../src/services/dataService';
import { initialClasses } from '../src/data/initialData';
import { ClassItem, AppDataStore, DurationMode, ExtensionPolicy, CourseHoliday, CourseMakeupSession, CourseDurationRecord } from '../src/types';

// Standalone implementation of the calculation engine from DataContext to test in isolated node/bun environment
function runCalculation(params: {
  startDate: string;
  durationMode: DurationMode;
  durationValue: number;
  classId?: string;
  extensionPolicy?: ExtensionPolicy;
  classes: ClassItem[];
  timetable?: any[];
  courseHolidays?: CourseHoliday[];
  courseMakeups?: CourseMakeupSession[];
}) {
  const {
    startDate,
    durationMode,
    durationValue,
    classId,
    extensionPolicy = 'scheduled_holidays',
    classes,
    timetable = [],
    courseHolidays = [],
    courseMakeups = []
  } = params;

  const toLocalDateStr = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseLocalDate = (dateStr: string): Date => {
    const parts = (dateStr || '').trim().split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d, 0, 0, 0, 0);
      }
    }
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  };

  const start = parseLocalDate(startDate || toLocalDateStr(new Date()));
  const holidays = courseHolidays.filter(h => h.affectsScheduledLessons);
  const isHoliday = (d: Date) => {
    const iso = toLocalDateStr(d);
    return holidays.some(h => iso >= h.startDate && iso <= h.endDate);
  };

  const targetClass = classId
    ? classes.find(c => c.id === classId || c.code === classId || c.name === classId)
    : null;
  const resolvedClassId = targetClass?.id || classId;

  const scheduleDaysSet = new Set<number>();
  if (targetClass) {
    const classSlots = getClassWeeklySchedule(targetClass);
    if (classSlots.length > 0) {
      classSlots.forEach(s => {
        if (typeof s.dayOfWeek === 'number' && s.dayOfWeek >= 1 && s.dayOfWeek <= 7) {
          scheduleDaysSet.add(s.dayOfWeek);
        }
      });
    }
  }

  if (scheduleDaysSet.size === 0 && resolvedClassId) {
    const timetables = timetable.filter(t => t.classId === resolvedClassId && t.status !== 'cancelled');
    if (timetables.length > 0) {
      timetables.forEach(t => {
        if (typeof t.dayOfWeek === 'number' && t.dayOfWeek >= 1 && t.dayOfWeek <= 7) {
          scheduleDaysSet.add(t.dayOfWeek);
        }
      });
    }
  }

  const hasScheduleWarning = scheduleDaysSet.size === 0;
  const warningMessage = hasScheduleWarning
    ? (targetClass
        ? `Lớp "${targetClass.name}" chưa được cấu hình lịch học trong tuần. Vui lòng cập nhật thời khóa biểu của lớp.`
        : 'Chưa chọn lớp học hoặc lớp học chưa có lịch học trong tuần.')
    : undefined;

  const isClassDay = (d: Date) => {
    const jsDay = d.getDay();
    const appDay = jsDay === 0 ? 7 : jsDay;
    return scheduleDaysSet.has(appDay);
  };

  let currentDate = new Date(start);
  let scheduledSessionsCount = 0;
  let holidaysEncounteredCount = 0;
  const breakdownDates: { date: string; type: string; note: string }[] = [];

  if (hasScheduleWarning) {
    return {
      expectedCompletionDate: toLocalDateStr(start),
      totalDaysSpan: 0,
      explanation: `⚠️ Cảnh báo: ${warningMessage}`,
      scheduledSessionsCount: 0,
      holidaysEncounteredCount: 0,
      makeupsCount: 0,
      breakdownDates: [],
      hasScheduleWarning: true,
      warningMessage
    };
  }

  if (durationMode === 'learning_sessions') {
    const targetSessions = Number(durationValue) || 48;
    while (scheduledSessionsCount < targetSessions) {
      const iso = toLocalDateStr(currentDate);
      if (isClassDay(currentDate)) {
        if (extensionPolicy !== 'none' && isHoliday(currentDate)) {
          holidaysEncounteredCount++;
          breakdownDates.push({ date: iso, type: 'holiday_skipped', note: 'Nghỉ lễ' });
        } else {
          scheduledSessionsCount++;
          breakdownDates.push({ date: iso, type: 'regular', note: `Buổi ${scheduledSessionsCount}` });
        }
      }
      if (scheduledSessionsCount < targetSessions) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  } else if (durationMode === 'months') {
    const targetMonths = Number(durationValue) || 6;
    currentDate.setMonth(currentDate.getMonth() + targetMonths);
    let checkDate = new Date(start);
    while (checkDate <= currentDate) {
      if (isClassDay(checkDate)) {
        if (isHoliday(checkDate)) {
          holidaysEncounteredCount++;
        } else {
          scheduledSessionsCount++;
        }
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    if (extensionPolicy === 'scheduled_holidays' && holidaysEncounteredCount > 0) {
      const sessionsPerWeek = scheduleDaysSet.size || 2;
      const addedDays = Math.ceil((holidaysEncounteredCount / sessionsPerWeek) * 7);
      currentDate.setDate(currentDate.getDate() + addedDays);
    }
  }

  const expectedDateStr = toLocalDateStr(currentDate);
  const totalDaysSpan = Math.max(1, Math.round((currentDate.getTime() - start.getTime()) / (1000 * 3600 * 24)));

  const weekdayNames = Array.from(scheduleDaysSet)
    .sort((a, b) => a - b)
    .map(d => (d === 7 ? 'Chủ Nhật' : `Thứ ${d + 1}`))
    .join(', ');

  return {
    expectedCompletionDate: expectedDateStr,
    totalDaysSpan,
    explanation: `Lịch học: ${weekdayNames}`,
    scheduledSessionsCount,
    holidaysEncounteredCount,
    makeupsCount: 0,
    breakdownDates,
    hasScheduleWarning: false,
    countedWeekdays: Array.from(scheduleDaysSet).sort()
  };
}

async function runAllTests() {
  console.log('====================================================');
  console.log('VERIFYING COURSE DURATION CALCULATION & SYNC FIXES');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  // TEST A: Star 4 with Monday (1) and Friday (5) schedule
  console.log('--- TEST A: Class Star 4 (Monday + Friday) ---');
  const star4Class: ClassItem = {
    id: 'CLS-STAR-4',
    name: 'Star 4 (Movers Advanced)',
    code: 'STA-04',
    level: 'Pre A1 Starters',
    courseId: 'PROG-STA',
    curriculum: 'Cambridge Movers',
    teacherId: 'TCH-001',
    classroom: 'Phòng 101',
    scheduleDays: 'Thứ 2, Thứ 6 (17:30 - 19:00)',
    weeklySchedule: [
      { dayOfWeek: 1, startTime: '17:30', endTime: '19:00', dayName: 'Thứ 2' },
      { dayOfWeek: 5, startTime: '17:30', endTime: '19:00', dayName: 'Thứ 6' }
    ],
    startDate: '2026-11-02',
    endDate: '2027-05-30',
    maxCapacity: 14,
    studentIds: [],
    status: 'ongoing'
  };

  const resA = runCalculation({
    startDate: '2026-11-02', // Monday
    durationMode: 'learning_sessions',
    durationValue: 4,
    classId: 'CLS-STAR-4',
    classes: [star4Class]
  });

  assert(!resA.hasScheduleWarning, 'Star 4 schedule recognized without warning');
  assert(
    JSON.stringify(resA.countedWeekdays) === JSON.stringify([1, 5]),
    `Star 4 correctly counts only Monday (1) and Friday (5), got: ${JSON.stringify(resA.countedWeekdays)}`
  );
  // 4 sessions starting Mon Nov 2, 2026:
  // Session 1: Mon Nov 2
  // Session 2: Fri Nov 6
  // Session 3: Mon Nov 9
  // Session 4: Fri Nov 13
  assert(resA.expectedCompletionDate === '2026-11-13', `4 sessions end on 2026-11-13, got ${resA.expectedCompletionDate}`);
  assert(resA.breakdownDates.length === 4, '4 regular breakdown sessions recorded');
  const allAreMonOrFri = resA.breakdownDates.every(b => {
    const d = new Date(b.date + 'T00:00:00');
    const day = d.getDay();
    return day === 1 || day === 5;
  });
  assert(allAreMonOrFri, 'Every scheduled breakdown session date is strictly Monday or Friday');

  // TEST B: Different Class scheduled Tuesday (2) and Thursday (4)
  console.log('\n--- TEST B: Different Class (Tuesday + Thursday) ---');
  const tueThuClass: ClassItem = {
    id: 'CLS-TUETHU-01',
    name: 'Tuesday Thursday Explorers',
    code: 'TT-01',
    level: 'A1 Movers',
    courseId: 'PROG-MOV',
    curriculum: 'Movers Fun',
    teacherId: 'TCH-002',
    classroom: 'Phòng 202',
    scheduleDays: 'Thứ 3, Thứ 5',
    weeklySchedule: [
      { dayOfWeek: 2, startTime: '18:00', endTime: '19:30', dayName: 'Thứ 3' },
      { dayOfWeek: 4, startTime: '18:00', endTime: '19:30', dayName: 'Thứ 5' }
    ],
    startDate: '2026-11-03',
    endDate: '2027-05-30',
    maxCapacity: 12,
    studentIds: [],
    status: 'ongoing'
  };

  const resB = runCalculation({
    startDate: '2026-11-03', // Tuesday
    durationMode: 'learning_sessions',
    durationValue: 4,
    classId: 'CLS-TUETHU-01',
    classes: [star4Class, tueThuClass]
  });

  assert(
    JSON.stringify(resB.countedWeekdays) === JSON.stringify([2, 4]),
    `Tuesday/Thursday class correctly counts only Tuesday (2) and Thursday (4), got: ${JSON.stringify(resB.countedWeekdays)}`
  );
  // Session 1: Tue Nov 3
  // Session 2: Thu Nov 5
  // Session 3: Tue Nov 10
  // Session 4: Thu Nov 12
  assert(resB.expectedCompletionDate === '2026-11-12', `4 sessions end on 2026-11-12, got ${resB.expectedCompletionDate}`);

  // TEST C: Class Schedule Change (Dynamic recalculation)
  console.log('\n--- TEST C: Schedule Change Simulation ---');
  // Copy star4Class and change schedule to Tue/Thu
  const updatedStar4Class: ClassItem = {
    ...star4Class,
    scheduleDays: 'Thứ 3, Thứ 5',
    weeklySchedule: [
      { dayOfWeek: 2, startTime: '17:30', endTime: '19:00', dayName: 'Thứ 3' },
      { dayOfWeek: 4, startTime: '17:30', endTime: '19:00', dayName: 'Thứ 5' }
    ]
  };

  const resC = runCalculation({
    startDate: '2026-11-03',
    durationMode: 'learning_sessions',
    durationValue: 4,
    classId: 'CLS-STAR-4',
    classes: [updatedStar4Class, tueThuClass]
  });

  assert(
    JSON.stringify(resC.countedWeekdays) === JSON.stringify([2, 4]),
    `After schedule change, Star 4 calculation dynamically updates to Tue/Thu: ${JSON.stringify(resC.countedWeekdays)}`
  );

  // TEST D: Holidays and Makeup Rules
  console.log('\n--- TEST D: Holidays and Makeup Rules ---');
  // Add a holiday on Friday Nov 6, 2026
  const holidayNov6: CourseHoliday = {
    id: 'HOL-TEST-01',
    holidayName: 'Ngày nghỉ kiểm định trung tâm',
    startDate: '2026-11-06',
    endDate: '2026-11-06',
    holidayType: 'center',
    affectsScheduledLessons: true
  };

  const resD = runCalculation({
    startDate: '2026-11-02',
    durationMode: 'learning_sessions',
    durationValue: 4,
    classId: 'CLS-STAR-4',
    classes: [star4Class],
    courseHolidays: [holidayNov6],
    extensionPolicy: 'scheduled_holidays'
  });

  assert(resD.holidaysEncounteredCount === 1, `Holiday was encountered once, got: ${resD.holidaysEncounteredCount}`);
  // With Nov 6 skipped as holiday:
  // Session 1: Mon Nov 2
  // Skipped: Fri Nov 6 (Holiday)
  // Session 2: Mon Nov 9
  // Session 3: Fri Nov 13
  // Session 4: Mon Nov 16
  assert(resD.expectedCompletionDate === '2026-11-16', `Completion date extended by 1 class session to 2026-11-16, got: ${resD.expectedCompletionDate}`);

  // TEST E: Timezone Boundary and Year End rollover
  console.log('\n--- TEST E: Timezone and Year Boundary ---');
  const resE = runCalculation({
    startDate: '2026-12-28', // Monday
    durationMode: 'learning_sessions',
    durationValue: 4,
    classId: 'CLS-STAR-4',
    classes: [star4Class]
  });
  // Mon Dec 28 2026 (S1)
  // Fri Jan 01 2027 (S2)
  // Mon Jan 04 2027 (S3)
  // Fri Jan 08 2027 (S4)
  assert(resE.expectedCompletionDate === '2027-01-08', `Year boundary crossed seamlessly: expected 2027-01-08, got ${resE.expectedCompletionDate}`);

  // TEST F: Class with no weekly schedule warning
  console.log('\n--- TEST F: Missing Weekly Schedule Warning ---');
  const unscheduledClass: ClassItem = {
    id: 'CLS-EMPTY-SCHED',
    name: 'Unscheduled Class',
    code: 'UNSCH-01',
    level: 'Pre A1 Starters',
    courseId: 'PROG-STA',
    curriculum: 'Starters',
    teacherId: 'TCH-001',
    classroom: 'Phòng 101',
    startDate: '2026-11-02',
    endDate: '2027-05-30',
    maxCapacity: 14,
    studentIds: [],
    status: 'ongoing'
  };

  const resF = runCalculation({
    startDate: '2026-11-02',
    durationMode: 'learning_sessions',
    durationValue: 24,
    classId: 'CLS-EMPTY-SCHED',
    classes: [unscheduledClass]
  });

  assert(resF.hasScheduleWarning === true, 'Class with no schedule sets hasScheduleWarning = true');
  assert(resF.warningMessage?.includes('chưa được cấu hình lịch học'), 'Displays clear warning message');

  // TEST G: Cloud Keys Compatibility (BASELINE_DATA_MAP & ALL_DATA_KEYS)
  console.log('\n--- TEST G: BASELINE_DATA_MAP includes course duration keys ---');
  assert(Array.isArray(BASELINE_DATA_MAP.courseDurations), 'BASELINE_DATA_MAP includes courseDurations');
  assert(Array.isArray(BASELINE_DATA_MAP.courseHolidays), 'BASELINE_DATA_MAP includes courseHolidays');
  assert(Array.isArray(BASELINE_DATA_MAP.courseMakeups), 'BASELINE_DATA_MAP includes courseMakeups');
  assert(Array.isArray(BASELINE_DATA_MAP.courseDurationHistory), 'BASELINE_DATA_MAP includes courseDurationHistory');

  // TEST H: Admin - Academic Manager Synchronization & Merge
  console.log('\n--- TEST H: Multi-role Sync & Merge Simulation ---');
  const mockAdminLocal: AppDataStore = normalizeAppDataStore({
    students: [],
    classes: [star4Class],
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
    settings: {
      centerName: 'LeeGo',
      subtitle: 'English',
      hotline: '',
      email: '',
      address: '',
      taxId: '',
      academicYear: '2026-2027',
      currentTerm: 'Học kỳ 1',
      classrooms: ['Phòng 101'],
      maxClassCapacityDefault: 14,
      firebaseConnected: true,
      demoMode: false
    },
    activityLogs: [],
    teachingSchedules: [],
    courseDurations: [
      {
        id: 'CD-STAR-04',
        courseName: 'Khóa Star 4 Tiêu Chuẩn',
        classId: 'CLS-STAR-4',
        className: 'Star 4 (Movers Advanced)',
        durationMode: 'learning_sessions',
        durationValue: 48,
        courseStartDate: '2026-11-02',
        currentExpectedCompletionDate: '2027-04-23',
        extensionPolicy: 'scheduled_holidays',
        requiredSessions: 48,
        completedSessions: 12,
        remainingSessions: 36,
        progressPercentage: 25,
        status: 'in_progress'
      }
    ]
  });

  // Academic Manager on another device initially has empty courseDurations
  const mockAmLocal: AppDataStore = normalizeAppDataStore({
    ...mockAdminLocal,
    courseDurations: []
  });

  // Remote data fetched from Cloud by Academic Manager (simulating Admin having saved CD-STAR-04 to Cloud)
  const remoteCloudData: Partial<AppDataStore> = {
    classes: [star4Class],
    courseDurations: mockAdminLocal.courseDurations
  };

  const amMergeResult = mergeCenterData(mockAmLocal, remoteCloudData, true);
  assert(amMergeResult.merged.courseDurations?.length === 1, 'Academic Manager pulls and merges courseDurations from Cloud');
  assert(
    amMergeResult.merged.courseDurations?.[0]?.id === 'CD-STAR-04',
    'Academic Manager sees Admin-created CD-STAR-04 course duration record'
  );

  // TEST I: Deletion Tombstone Persistence (Admin deletes, AM refreshes)
  console.log('\n--- TEST I: Deletion Tombstone Persistence ---');
  // Admin deletes CD-STAR-04
  recordLocalDeletedCourseDurationId('CD-STAR-04');
  const mockAdminAfterDelete: AppDataStore = normalizeAppDataStore({
    ...mockAdminLocal,
    courseDurations: [],
    settings: {
      ...mockAdminLocal.settings,
      deletedCourseDurationIds: ['CD-STAR-04']
    }
  });

  // Remote still temporarily has CD-STAR-04 from older state, but tombstone prevents resurrection
  const mergeAfterDelete = mergeCenterData(mockAdminAfterDelete, remoteCloudData, true);
  assert(
    (mergeAfterDelete.merged.courseDurations || []).length === 0,
    'Tombstone ensures deleted course duration NEVER reappears after sync or refresh'
  );
  assert(
    mergeAfterDelete.merged.settings.deletedCourseDurationIds?.includes('CD-STAR-04') === true,
    'Tombstone ID is stored in merged settings for cloud propagation'
  );

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');
}

runAllTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
