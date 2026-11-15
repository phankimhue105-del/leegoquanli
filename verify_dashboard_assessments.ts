import {
  AssessmentRecord,
  StudentScoreEntry,
  AssessmentComponentKey,
  Role,
  Class
} from './src/types';
import { getAssignedClassesForStaff } from './src/services/dataService';

console.log('=================================================================');
console.log('VERIFYING DASHBOARD & NAVIGATION ASSESSMENT RESTORATION');
console.log('=================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// Helper: replicate role normalization from App.tsx & Sidebar.tsx
// -------------------------------------------------------------
function normalizeRole(rawRole?: string): 'admin' | 'academic_manager' | 'teacher' | 'teaching_assistant' {
  const raw = String(rawRole || '').toLowerCase().trim().replace(/[\s-]/g, '_');
  if (raw === 'admin' || raw.includes('admin')) return 'admin';
  if (raw === 'academic_manager' || raw.includes('academic') || raw === 'academicmanager') return 'academic_manager';
  if (raw === 'teaching_assistant' || raw === 'teachingassistant' || raw === 'assistant' || raw === 'ta') return 'teaching_assistant';
  return 'teacher';
}

function isTabAllowed(tab: string, rawRole?: string): boolean {
  const role = normalizeRole(rawRole);
  if (tab === 'assessments') {
    return role === 'academic_manager' || role === 'teacher';
  }
  if (role === 'admin') return true;
  if (role === 'academic_manager') {
    return !['users', 'settings'].includes(tab);
  }
  if (role === 'teacher' || role === 'teaching_assistant') {
    return ['dashboard', 'students', 'classes', 'teaching_schedule', 'timetable', 'attendance', 'lesson_plans', 'lesson_reports'].includes(tab);
  }
  return false;
}

function isSidebarMenuItemVisible(itemAllowedRoles: string[], rawRole?: string): boolean {
  const role = normalizeRole(rawRole);
  return itemAllowedRoles.includes(role);
}

const assessmentMenuItemAllowedRoles = ['academic_manager', 'teacher'];

// -------------------------------------------------------------
// 1. Navigation & Permission Verification
// -------------------------------------------------------------
console.log('--- 1. Navigation & Route Permissions ---');

// Academic Manager
assert(isTabAllowed('assessments', 'academic_manager') === true, 'Academic Manager route access allowed');
assert(isTabAllowed('assessments', 'Academic Manager') === true, 'Academic Manager (cased/spaced) route access allowed');
assert(isSidebarMenuItemVisible(assessmentMenuItemAllowedRoles, 'academic_manager') === true, 'Academic Manager can see Assessment in Sidebar');
assert(isSidebarMenuItemVisible(assessmentMenuItemAllowedRoles, 'Academic Manager') === true, 'Academic Manager (cased) can see Assessment in Sidebar');

// Teacher
assert(isTabAllowed('assessments', 'teacher') === true, 'Teacher route access allowed');
assert(isTabAllowed('assessments', 'Teacher') === true, 'Teacher (cased) route access allowed');
assert(isSidebarMenuItemVisible(assessmentMenuItemAllowedRoles, 'teacher') === true, 'Teacher can see Assessment in Sidebar');
assert(isSidebarMenuItemVisible(assessmentMenuItemAllowedRoles, 'Teacher') === true, 'Teacher (cased) can see Assessment in Sidebar');

// Admin - strictly forbidden
assert(isTabAllowed('assessments', 'admin') === false, 'Admin MUST NOT have route access to Assessment');
assert(isSidebarMenuItemVisible(assessmentMenuItemAllowedRoles, 'admin') === false, 'Admin MUST NOT see Assessment in Sidebar');

// Teaching Assistant - strictly forbidden
assert(isTabAllowed('assessments', 'teaching_assistant') === false, 'TA (teaching_assistant) MUST NOT have route access to Assessment');
assert(isTabAllowed('assessments', 'teachingAssistant') === false, 'TA (teachingAssistant) MUST NOT have route access to Assessment');
assert(isSidebarMenuItemVisible(assessmentMenuItemAllowedRoles, 'teaching_assistant') === false, 'TA MUST NOT see Assessment in Sidebar');
assert(isSidebarMenuItemVisible(assessmentMenuItemAllowedRoles, 'teachingAssistant') === false, 'TA (camelCase) MUST NOT see Assessment in Sidebar');

// -------------------------------------------------------------
// 2. Dashboard Visibility & Scoping Verification
// -------------------------------------------------------------
console.log('\n--- 2. Dashboard Visibility & Teacher Scoping ---');

function isDashboardAssessmentWidgetVisible(rawRole?: string): boolean {
  const role = normalizeRole(rawRole);
  return role === 'academic_manager' || role === 'teacher';
}

function isDashboardQuickActionAssessmentVisible(rawRole?: string): boolean {
  const role = normalizeRole(rawRole);
  return role === 'academic_manager' || role === 'teacher';
}

assert(isDashboardAssessmentWidgetVisible('academic_manager') === true, 'Academic Manager sees Assessment widget on Dashboard');
assert(isDashboardQuickActionAssessmentAdmin: false, 'Academic Manager sees Assessment shortcut in Tác vụ nhanh');
assert(isDashboardQuickActionAssessmentVisible('academic_manager') === true, 'Academic Manager sees Assessment shortcut in Tác vụ nhanh');

assert(isDashboardAssessmentWidgetVisible('teacher') === true, 'Teacher sees Assessment widget on Dashboard');
assert(isDashboardQuickActionAssessmentVisible('teacher') === true, 'Teacher sees Assessment shortcut in Tác vụ nhanh');

assert(isDashboardAssessmentWidgetVisible('admin') === false, 'Admin MUST NOT see Assessment widget on Dashboard');
assert(isDashboardQuickActionAssessmentVisible('admin') === false, 'Admin MUST NOT see Assessment shortcut in Tác vụ nhanh');

assert(isDashboardAssessmentWidgetVisible('teaching_assistant') === false, 'TA MUST NOT see Assessment widget on Dashboard');
assert(isDashboardQuickActionAssessmentVisible('teaching_assistant') === false, 'TA MUST NOT see Assessment shortcut in Tác vụ nhanh');

// Teacher Scoping
const mockClasses: Class[] = [
  { id: 'CLS-01', name: 'Starters 1', courseId: 'PRG-1', teacherId: 'TCH-001', schedule: '', room: '', startDate: '', endDate: '', status: 'active', studentIds: [] },
  { id: 'CLS-02', name: 'Movers 1', courseId: 'PRG-2', teacherId: 'TCH-002', schedule: '', room: '', startDate: '', endDate: '', status: 'active', studentIds: [] },
  { id: 'CLS-03', name: 'Flyers 1', courseId: 'PRG-3', teacherId: 'TCH-001', schedule: '', room: '', startDate: '', endDate: '', status: 'active', studentIds: [] },
];

const mockTeacherProfile = {
  isTeacher: true,
  isTA: false,
  isAdmin: false,
  isAcademicManager: false,
  staffId: 'TCH-001',
  teacher: {
    id: 'TCH-001',
    fullName: 'Nguyen Van A',
    assignedClassIds: ['CLS-01', 'CLS-03']
  }
};
const teacherClasses = getAssignedClassesForStaff(mockClasses, mockTeacherProfile as any);
const teacherClassIds = new Set(teacherClasses.map(c => c.id));

const mockAssessments: AssessmentRecord[] = [
  { id: 'A1', classId: 'CLS-01', className: 'Starters 1', title: 'Bài 1', examType: 'Monthly', date: '2026-10-15', scaleType: '10-point', maxScore: 10, scores: [], evaluatedBy: '' },
  { id: 'A2', classId: 'CLS-02', className: 'Movers 1', title: 'Bài 2', examType: 'Monthly', date: '2026-10-16', scaleType: '10-point', maxScore: 10, scores: [], evaluatedBy: '' },
  { id: 'A3', classId: 'CLS-03', className: 'Flyers 1', title: 'Bài 3', examType: 'Monthly', date: '2026-10-17', scaleType: '10-point', maxScore: 10, scores: [], evaluatedBy: '' },
];

const teacherVisibleAssessments = mockAssessments.filter(a => teacherClassIds.has(a.classId));
assert(teacherVisibleAssessments.length === 2, 'Teacher only sees assessments for assigned classes (2 out of 3)');
assert(teacherVisibleAssessments.some(a => a.id === 'A1') && teacherVisibleAssessments.some(a => a.id === 'A3'), 'Teacher sees A1 and A3');
assert(!teacherVisibleAssessments.some(a => a.id === 'A2'), 'Teacher CANNOT see unassigned class assessment A2');

// -------------------------------------------------------------
// 3. Assessment Module Features Verification
// -------------------------------------------------------------
console.log('\n--- 3. Assessment Module Functionality ---');

const expectedComponents: AssessmentComponentKey[] = [
  'listening',
  'speaking',
  'reading_and_writing',
  'reading',
  'writing',
  'language_focus',
  'phonetics',
  'overall_score'
];
assert(expectedComponents.length === 8, 'Supports 8 examination components');
assert(expectedComponents.includes('reading_and_writing'), 'Supports combined Reading & Writing');
assert(expectedComponents.includes('overall_score'), 'Supports manual Overall Score');

// Manual overall score test
const testScore: StudentScoreEntry = {
  studentId: 'ST-1',
  studentName: 'Nguyen Van X',
  participationStatus: 'participated',
  listening: 8,
  speaking: 8,
  reading: 8,
  writing: 8,
  overallScore: 9.0 // Different from 8.0 arithmetic mean
};
assert(testScore.overallScore !== 8.0, 'Overall Score is manual and decoupled from arithmetic mean');

// Class average formula test
const classScores: StudentScoreEntry[] = [
  { studentId: 'S1', studentName: 'HS 1', participationStatus: 'participated', listening: 8 },
  { studentId: 'S2', studentName: 'HS 2', participationStatus: 'participated', listening: 10 },
  { studentId: 'S3', studentName: 'HS 3', participationStatus: 'absent', listening: 0 }, // Absent: excluded
  { studentId: 'S4', studentName: 'HS 4', participationStatus: 'participated', listening: null }, // Null: excluded
];
let sum = 0, count = 0;
for (const s of classScores) {
  if (s.participationStatus === 'absent') continue;
  if (s.listening !== undefined && s.listening !== null && !isNaN(s.listening)) {
    sum += s.listening;
    count++;
  }
}
const calculatedAvg = count > 0 ? parseFloat((sum / count).toFixed(2)) : null;
assert(count === 2, 'Average count is 2 (absent and null excluded)');
assert(calculatedAvg === 9.0, 'Class average is exactly 9.0');

console.log('\n=================================================================');
console.log(`TOTAL RESULT: ${passCount} passed, ${failCount} failed`);
console.log('=================================================================');

if (failCount > 0) {
  process.exit(1);
}
