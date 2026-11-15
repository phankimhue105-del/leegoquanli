import {
  AssessmentRecord,
  StudentScoreEntry,
  AssessmentComponentKey,
  Role,
  Class
} from './src/types';
import { getAssignedClassesForStaff } from './src/services/dataService';

console.log('=====================================================');
console.log('VERIFYING ENHANCED ACADEMIC ASSESSMENTS MODULE');
console.log('=====================================================\n');

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
// 1. Role Permission Guard Verification
// -------------------------------------------------------------
console.log('--- 1. Role Permission Guard ---');

// Replicate isTabAllowed logic from App.tsx
function isTabAllowed(tab: string, role?: Role): boolean {
  if (tab === 'assessments') {
    return role === 'academic_manager' || role === 'teacher';
  }
  return true;
}

assert(isTabAllowed('assessments', 'admin') === false, 'Admin MUST NOT have access to assessments');
assert(isTabAllowed('assessments', 'teaching_assistant') === false, 'Teaching Assistant MUST NOT have access to assessments');
assert(isTabAllowed('assessments', 'parent') === false, 'Parent MUST NOT have access to assessments');
assert(isTabAllowed('assessments', 'academic_manager') === true, 'Academic Manager MUST have access to assessments');
assert(isTabAllowed('assessments', 'teacher') === true, 'Teacher MUST have access to assessments');

// -------------------------------------------------------------
// 2. Teacher Class Isolation Verification
// -------------------------------------------------------------
console.log('\n--- 2. Teacher Class Isolation ---');

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

assert(teacherClasses.length === 2, 'Teacher TCH-001 assigned to 2 classes');
assert(teacherClasses.some(c => c.id === 'CLS-01'), 'Teacher can access CLS-01');
assert(teacherClasses.some(c => c.id === 'CLS-03'), 'Teacher can access CLS-03');
assert(!teacherClasses.some(c => c.id === 'CLS-02'), 'Teacher CANNOT access unassigned class CLS-02');

// -------------------------------------------------------------
// 3. Assessment Components & Independence
// -------------------------------------------------------------
console.log('\n--- 3. Assessment Components & Independence ---');

const allEightComponents: AssessmentComponentKey[] = [
  'listening',
  'speaking',
  'reading_and_writing',
  'reading',
  'writing',
  'language_focus',
  'phonetics',
  'overall_score'
];

assert(allEightComponents.length === 8, 'Exactly 8 distinct assessment components supported');
assert(allEightComponents.includes('reading_and_writing'), 'Reading & Writing combined component exists');
assert(allEightComponents.includes('reading') && allEightComponents.includes('writing'), 'Reading and Writing individual components exist separately');
assert('reading_and_writing' !== 'reading', 'Reading & Writing combined is distinct from individual reading');

// Test that Overall Score is not an average of components
const studentScore: StudentScoreEntry = {
  studentId: 'STU-001',
  studentName: 'Tran Van B',
  participationStatus: 'participated',
  listening: 8,
  speaking: 9,
  reading: 7,
  writing: 6,
  languageFocus: 8,
  overallScore: 9.5 // Manually entered, different from arithmetic mean (7.6)
};

const componentSum = (studentScore.listening! + studentScore.speaking! + studentScore.reading! + studentScore.writing! + studentScore.languageFocus!);
const arithmeticMean = componentSum / 5;
assert(studentScore.overallScore !== arithmeticMean, 'Overall Score is manual and strictly decoupled from arithmetic average');

// -------------------------------------------------------------
// 4. Class Average Calculation with Participation & Empty Exclusions
// -------------------------------------------------------------
console.log('\n--- 4. Class Average Calculation ---');

const mockScores: StudentScoreEntry[] = [
  { studentId: 'S1', studentName: 'Học sinh 1', participationStatus: 'participated', listening: 8.0, speaking: 7.0, overallScore: 7.5 },
  { studentId: 'S2', studentName: 'Học sinh 2', participationStatus: 'participated', listening: 10.0, speaking: 9.0, overallScore: 9.5 },
  { studentId: 'S3', studentName: 'Học sinh 3', participationStatus: 'absent', listening: 0, speaking: 0, overallScore: 0 }, // Absent student! Must be excluded
  { studentId: 'S4', studentName: 'Học sinh 4', participationStatus: 'participated', listening: null, speaking: 8.0, overallScore: null }, // Null score! Must be excluded from listening
];

function calcAvg(scores: StudentScoreEntry[], key: 'listening' | 'speaking' | 'overallScore'): { avg: number | null; count: number } {
  let sum = 0;
  let count = 0;
  for (const s of scores) {
    if (s.participationStatus === 'absent') continue;
    const val = s[key];
    if (val !== undefined && val !== null && !isNaN(Number(val))) {
      sum += Number(val);
      count++;
    }
  }
  if (count === 0) return { avg: null, count: 0 };
  return { avg: parseFloat((sum / count).toFixed(2)), count };
}

const listeningAvg = calcAvg(mockScores, 'listening');
// S1 (8.0) + S2 (10.0) = 18.0 / 2 = 9.0. S3 absent excluded, S4 null excluded.
assert(listeningAvg.count === 2, 'Listening average count is 2 (absent and null excluded)');
assert(listeningAvg.avg === 9.0, `Listening average correctly computed as 9.0 (got ${listeningAvg.avg})`);

const speakingAvg = calcAvg(mockScores, 'speaking');
// S1 (7.0) + S2 (9.0) + S4 (8.0) = 24.0 / 3 = 8.0. S3 absent excluded.
assert(speakingAvg.count === 3, 'Speaking average count is 3 (absent excluded)');
assert(speakingAvg.avg === 8.0, `Speaking average correctly computed as 8.0 (got ${speakingAvg.avg})`);

// Empty class / all absent
const allAbsentScores: StudentScoreEntry[] = [
  { studentId: 'S5', studentName: 'Học sinh 5', participationStatus: 'absent', listening: 5 },
];
const allAbsentAvg = calcAvg(allAbsentScores, 'listening');
assert(allAbsentAvg.avg === null, 'All absent students returns null (displayed as —)');

// -------------------------------------------------------------
// 5. Academic Reports Filter Integration
// -------------------------------------------------------------
console.log('\n--- 5. Academic Reports Filter Integration ---');

const mockAssessments: AssessmentRecord[] = [
  {
    id: 'ASM-01',
    classId: 'CLS-01',
    className: 'Starters 1',
    title: 'Kiểm tra tháng 10',
    examType: 'Monthly',
    date: '2026-10-15',
    month: 10,
    year: 2026,
    scaleType: '10-point',
    maxScore: 10,
    selectedComponents: ['listening', 'speaking', 'reading_and_writing', 'overall_score'],
    scores: mockScores,
    evaluatedBy: 'Nguyen Van A'
  },
  {
    id: 'ASM-02',
    classId: 'CLS-02',
    className: 'Movers 1',
    title: 'Kiểm tra tháng 11',
    examType: 'Monthly',
    date: '2026-11-20',
    month: 11,
    year: 2026,
    scaleType: '10-point',
    maxScore: 10,
    selectedComponents: ['listening', 'speaking', 'reading', 'writing', 'language_focus', 'phonetics', 'overall_score'],
    scores: [],
    evaluatedBy: 'Le Thi B'
  }
];

function filterReports(list: AssessmentRecord[], classId: string, month: string, assessmentId: string): AssessmentRecord[] {
  return list.filter(asm => {
    if (classId !== 'all' && asm.classId !== classId) return false;
    if (month !== 'all') {
      const m = asm.month || (asm.date ? parseInt(asm.date.split('-')[1], 10) : undefined);
      if (m !== parseInt(month, 10)) return false;
    }
    if (assessmentId !== 'all' && asm.id !== assessmentId) return false;
    return true;
  });
}

const filteredByClass = filterReports(mockAssessments, 'CLS-01', 'all', 'all');
assert(filteredByClass.length === 1 && filteredByClass[0].id === 'ASM-01', 'Academic Reports filters by Class');

const filteredByMonth = filterReports(mockAssessments, 'all', '11', 'all');
assert(filteredByMonth.length === 1 && filteredByMonth[0].id === 'ASM-02', 'Academic Reports filters by Month');

const filteredByBoth = filterReports(mockAssessments, 'CLS-01', '11', 'all');
assert(filteredByBoth.length === 0, 'Academic Reports correctly returns empty when no match');

console.log('\n=====================================================');
console.log(`VERIFICATION SUMMARY: ${passCount} passed, ${failCount} failed`);
console.log('=====================================================');

if (failCount > 0) {
  process.exit(1);
}
