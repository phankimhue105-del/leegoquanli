import {
  mergeCenterData,
  canUserViewParentPhone,
  formatParentPhoneForRole,
  recordLocalDeletedClassId,
  getLocalDeletedClassIds,
  registerPendingCreatedClassId,
  unregisterPendingCreatedClassId,
  isClassPendingCreation,
  AppDataStore
} from './src/services/dataService';
import { initialClasses, initialStudents, initialSettings } from './src/data/initialData';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

const mockStore: AppDataStore = {
  students: [...initialStudents],
  classes: [...initialClasses],
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
  settings: { ...initialSettings },
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

console.log('=== TEST SUITE: DELETION SYNC & PARENT PHONE PRIVACY ===\n');

// --- 1. Parent Phone Privacy Functionality ---
console.log('--- 1. Testing Parent Phone Privacy Logic ---');
assert(canUserViewParentPhone('admin') === true, 'Admin can view parent phone');
assert(canUserViewParentPhone('academic_manager') === true, 'Academic Manager can view parent phone');
assert(canUserViewParentPhone('teacher') === false, 'Teacher CANNOT view parent phone');
assert(canUserViewParentPhone('teaching_assistant') === false, 'Teaching Assistant CANNOT view parent phone');
assert(canUserViewParentPhone('teachingAssistant') === false, 'Teaching Assistant (camelCase) CANNOT view parent phone');
assert(canUserViewParentPhone(undefined) === false, 'Undefined role CANNOT view parent phone');

assert(formatParentPhoneForRole('0987654321', 'admin') === '0987654321', 'Format phone for admin returns number');
assert(formatParentPhoneForRole('0987654321', 'teacher') === '', 'Format phone for teacher returns empty');
assert(formatParentPhoneForRole('0987654321', 'teaching_assistant') === '', 'Format phone for TA returns empty');

// --- 2. Class Deletion Synchronization ---
console.log('\n--- 2. Testing Class Deletion Synchronization ---');
const baseClassId = 'CLS-TEST-DEL';
const sampleClass = {
  id: baseClassId,
  code: 'TEST-01',
  name: 'Lớp Thử Nghiệm Xóa',
  programId: 'PROG-01',
  level: 'Flyers',
  room: 'Room 101',
  teacherId: 'TCH-001',
  assistantTeacherId: 'TA-001',
  studentIds: ['LG-STU-001', 'LG-STU-002'],
  status: 'ongoing' as const,
  maxCapacity: 15,
  tuitionFee: 5000000
};

// Teacher has the class in local cache
const teacherLocalData: AppDataStore = {
  ...mockStore,
  classes: [sampleClass, ...mockStore.classes],
  students: mockStore.students.map(s => (s.id === 'LG-STU-001' ? { ...s, classIds: [...(s.classIds || []), baseClassId] } : s))
};

// Admin deleted the class from Cloud and updated settings.deletedClassIds
const cloudDataAfterAdminDelete: Partial<AppDataStore> = {
  classes: mockStore.classes.filter(c => c.id !== baseClassId),
  settings: {
    ...mockStore.settings,
    deletedClassIds: [baseClassId]
  }
};

// Teacher syncs/merges from Cloud
const mergeResult = mergeCenterData(teacherLocalData, cloudDataAfterAdminDelete);

const classStillExists = mergeResult.merged.classes.some(c => c.id === baseClassId);
assert(!classStillExists, 'Deleted class was successfully removed from Teacher local data');
assert(!mergeResult.needsUpload, 'Teacher does NOT re-upload the deleted class to Cloud');

// Check that student.classIds no longer contains deleted class
const studentAfterMerge = mergeResult.merged.students.find(s => s.id === 'LG-STU-001');
assert(!studentAfterMerge?.classIds.includes(baseClassId), 'Student classIds sanitized of deleted class');

// --- 3. Student Removal from Class Synchronization ---
console.log('\n--- 3. Testing Student Removal from Class Synchronization ---');
const targetClassId = mockStore.classes[0].id;
const removedStudentId = mockStore.students[0].id;

// Teacher has removedStudentId in targetClass in local cache
const teacherLocalWithStudent: AppDataStore = {
  ...mockStore,
  classes: mockStore.classes.map(c => (c.id === targetClassId ? { ...c, studentIds: [removedStudentId, 'LG-STU-002'] } : c)),
  students: mockStore.students.map(s => (s.id === removedStudentId ? { ...s, classIds: [targetClassId] } : s))
};

// Admin removes removedStudentId from targetClass in Cloud
const cloudDataAfterAdminRemoveStudent: Partial<AppDataStore> = {
  classes: mockStore.classes.map(c => (c.id === targetClassId ? { ...c, studentIds: ['LG-STU-002'] } : c)),
  students: mockStore.students.map(s => (s.id === removedStudentId ? { ...s, classIds: [] } : s))
};

// Teacher merges from Cloud
const mergeStudentRemoval = mergeCenterData(teacherLocalWithStudent, cloudDataAfterAdminRemoveStudent);
const updatedTargetClass = mergeStudentRemoval.merged.classes.find(c => c.id === targetClassId);
assert(!updatedTargetClass?.studentIds.includes(removedStudentId), 'Removed student is NOT resurrected in class.studentIds');

const updatedStudent = mergeStudentRemoval.merged.students.find(s => s.id === removedStudentId);
assert(!updatedStudent?.classIds.includes(targetClassId), 'Removed class is NOT resurrected in student.classIds');
assert(mergeStudentRemoval.merged.students.some(s => s.id === removedStudentId), 'Student is NOT deleted from global student database');

// --- 4. Addition Synchronization (Ensure Additions Still Work) ---
console.log('\n--- 4. Testing Addition Synchronization ---');
const newAddedClassId = 'CLS-NEW-ADD';
const newClassObj = {
  ...sampleClass,
  id: newAddedClassId,
  name: 'Lớp Mới Thêm'
};

const cloudDataWithNewClass: Partial<AppDataStore> = {
  classes: [newClassObj, ...mockStore.classes]
};

const mergeAddition = mergeCenterData(mockStore, cloudDataWithNewClass);
assert(mergeAddition.merged.classes.some(c => c.id === newAddedClassId), 'New class from Cloud successfully received by Teacher');

// --- 5. Pending Creation Tracking ---
console.log('\n--- 5. Testing Pending Creation Tracking ---');
const pendingId = 'CLS-PENDING-001';
registerPendingCreatedClassId(pendingId);
assert(isClassPendingCreation(pendingId) === true, 'Class registered as pending creation');
unregisterPendingCreatedClassId(pendingId);
assert(isClassPendingCreation(pendingId) === false, 'Class unregistered from pending creation');

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
