# `src/types/index.ts` (Complete Modified File)

```ts
export type UserRole = 'admin' | 'academic_manager' | 'teacher';

export interface User {
  id: string;
  username?: string;
  name: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  teacherId?: string; // Links to teacher record if role is teacher
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
}

export type StudentStatus = 'studying' | 'reserved' | 'graduated' | 'dropped';

export interface Student {
  id: string; // e.g. LG-STU-001
  fullName: string;
  vietnameseName: string;
  dob: string;
  gender: 'male' | 'female';
  school: string;
  grade: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  enrollmentDate: string;
  currentLevel: string; // Pre A1 Starters, A1 Movers, A2 Flyers, A2 KET, B1 PET, IELTS Foundation
  classIds: string[];
  status: StudentStatus;
  notes: string;
  avatar?: string;
}

export interface Parent {
  id: string;
  parentName: string;
  phone: string;
  email: string;
  address: string;
  relationship: 'Father' | 'Mother' | 'Guardian';
  studentIds: string[];
  occupation?: string;
  notes?: string;
}

export type ClassStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface ClassItem {
  id: string; // e.g. CLS-STA-01
  name: string;
  code: string;
  level: string; // Pre A1 Starters, A1 Movers, etc.
  courseId: string;
  curriculum: string;
  teacherId: string;
  assistantTeacherId?: string;
  classroom: string;
  scheduleDays: string; // e.g., "Thứ 2, Thứ 4"
  scheduleTime: string; // e.g., "17:30 - 19:00"
  startDate: string;
  endDate: string;
  maxCapacity: number;
  studentIds: string[];
  status: ClassStatus;
  tuitionFee?: number;
}

export interface Teacher {
  id: string;
  fullName: string;
  vietnameseName?: string;
  email: string;
  phone: string;
  nationality: string;
  isNative: boolean;
  qualifications: string; // CELTA, TESOL, DELTA, Bachelor of Arts
  experienceYears: number;
  teachingLevels: string[];
  status: 'active' | 'leave';
  assignedClassIds: string[];
  workloadHours: number; // calculated hours/week
  hourlyRate?: number;
  avatar?: string;
}

export interface TeachingAssistant {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  university: string;
  englishCertificate: string; // IELTS 7.5, TOEIC 900
  assignedClassIds: string[];
  status: 'active' | 'leave';
  notes?: string;
}

export interface LessonPlanOutline {
  lessonNumber: number;
  title: string;
  grammarFocus: string;
  vocabFocus: string;
  homework: string;
}

export interface AcademicProgram {
  id: string;
  name: string;
  code: string;
  level: string;
  curriculum: string; // Cambridge Young Learners, Cambridge Main Suite, etc.
  textbook: string;
  totalLessons: number;
  lessonsPerWeek: number;
  durationMinutes: number;
  learningObjectives: string[];
  skills: string[];
  lessonSequence: LessonPlanOutline[];
  assessmentCriteria: string[];
}

export interface TimetableSession {
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  assistantId?: string;
  assistantName?: string;
  classroom: string;
  dayOfWeek: number; // 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7, 7: CN
  dayName: string; // "Thứ 2", "Thứ 3", etc.
  startTime: string; // "17:30"
  endTime: string; // "19:00"
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  date?: string; // Optional specific date
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface StudentAttendanceEntry {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  className: string;
  date: string;
  sessionTime: string;
  teacherId: string;
  teacherName: string;
  records: StudentAttendanceEntry[];
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  takenAt: string;
  takenBy: string;
}

export interface StudentScoreEntry {
  studentId: string;
  studentName: string;
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
  grammar: number;
  totalScore: number;
  shields?: number; // 1-5 shields for Cambridge Young Learners
  teacherFeedback: string;
  status: 'excellent' | 'good' | 'pass' | 'needs_improvement';
}

export interface AssessmentRecord {
  id: string;
  classId: string;
  className: string;
  title: string;
  examType: 'Midterm' | 'Final' | 'Monthly' | 'Speaking Check';
  date: string;
  scaleType: '10-point' | 'cambridge-shields' | 'percentage';
  maxScore: number;
  scores: StudentScoreEntry[];
  evaluatedBy: string;
  reviewedBy?: string;
}

export interface LessonPlanReport {
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  date: string;
  lessonNumber: number;
  textbook: string;
  lessonContent: string;
  learningObjectives: string;
  activitiesCompleted: string;
  homeworkAssigned: string;
  studentsAttention: string;
  teachingNotes: string;
  status: 'submitted' | 'reviewed' | 'approved';
  managerFeedback?: string;
  submittedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  ipAddress?: string;
}

export interface CenterSettings {
  centerName: string;
  subtitle: string;
  hotline: string;
  email: string;
  address: string;
  taxId: string;
  academicYear: string;
  currentTerm: string;
  classrooms: string[];
  maxClassCapacityDefault: number;
  firebaseConnected: boolean;
  demoMode: boolean;
}

export interface TeachingSession {
  sessionId: string;
  date: string; // "YYYY-MM-DD"
  weekday: string; // "Mon", "Thu", "Thứ 2", etc.
  dateOrdinal: string; // "Mon 2nd", "Thu 5th"
  teacherId: string;
  teacherName: string;
  teachingAssistantId?: string;
  teachingAssistantName?: string;
  time: string; // "19:30 - 21:00" or "7:30 – 9:00pm"
  classroom: string; // "Phòng 1A", "101"
  courseBook: string; // Textbook name
  lesson: string; // "Unit 1: I love animals"
  contents: string; // multiline details
  notes: string; // multiline notes
  notesHighlight?: boolean; // red text styling for test/important activity
}

export interface MonthlyTeachingSchedule {
  id: string; // e.g. "SCH-CLS-STA-01-2026-11"
  classId: string;
  className: string;
  month: number; // 1 - 12
  year: number; // e.g. 2026
  teacherId: string;
  teacherName: string;
  teachingAssistantId?: string;
  teachingAssistantName?: string;
  defaultTime: string;
  defaultClassroom: string;
  courseBook: string;
  generatedFromTimetable: boolean;
  sessions: TeachingSession[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}
```
