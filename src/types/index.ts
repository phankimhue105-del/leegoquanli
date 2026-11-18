export type UserRole = 'admin' | 'academic_manager' | 'teacher' | 'teaching_assistant';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  phone?: string;
  teacherId?: string; // Links to teacher record if role is teacher
  academicManagerId?: string; // Links to academic manager record if role is academic_manager
  teachingAssistantId?: string; // Links to teaching assistant record if role is teaching_assistant
  assistantId?: string; // Alias for teachingAssistantId
  assignedClasses?: string[]; // Optional assigned classes IDs for teacher or assistant
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

export interface WeeklyScheduleSlot {
  dayOfWeek: number; // 1: Thứ 2 ... 7: Chủ Nhật
  dayName: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  teacherId: string;
  assistantTeacherId?: string;
}

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
  weeklySchedule?: WeeklyScheduleSlot[];
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

export interface AcademicManager {
  id: string; // e.g. AM-001
  fullName: string;
  vietnameseName?: string;
  email: string;
  phone: string;
  title?: string; // e.g. Quản lý học thuật / Giám đốc học thuật
  qualifications?: string; // e.g. Thạc sĩ Quản lý Giáo dục, TESOL, IELTS 8.5
  experienceYears?: number;
  department?: string; // e.g. Ban Học Thuật & Đào Tạo
  status: 'active' | 'leave';
  avatar?: string;
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

export type AssessmentComponentKey =
  | 'listening'
  | 'speaking'
  | 'reading_and_writing'
  | 'reading'
  | 'writing'
  | 'language_focus'
  | 'phonetics'
  | 'overall_score';

export type AssessmentType =
  | 'Monthly'
  | 'Midterm'
  | 'Final'
  | 'Periodic'
  | 'Speaking Check'
  | 'Other';

export type ParticipationStatus = 'participated' | 'absent';

export interface StudentScoreEntry {
  studentId: string;
  studentName: string;
  participationStatus?: ParticipationStatus; // 'participated' (default) | 'absent'
  listening?: number | null;
  speaking?: number | null;
  readingAndWriting?: number | null;
  reading?: number | null;
  writing?: number | null;
  languageFocus?: number | null;
  phonetics?: number | null;
  overallScore?: number | null; // MANUALLY ENTERED, never auto-calculated
  grammar?: number; // Legacy alias for language_focus
  totalScore?: number; // Legacy alias for overallScore
  shields?: number; // 1-5 shields for Cambridge Young Learners
  teacherFeedback?: string;
  status?: 'excellent' | 'good' | 'pass' | 'needs_improvement';
}

export interface AssessmentRecord {
  id: string;
  classId: string;
  className: string;
  title: string;
  examType: AssessmentType | string;
  date: string;
  month?: number; // 1 - 12
  year?: number; // e.g. 2026
  scaleType: '10-point' | 'cambridge-shields' | 'percentage';
  maxScore: number;
  selectedComponents?: AssessmentComponentKey[];
  notes?: string;
  scores: StudentScoreEntry[];
  classAverages?: Record<string, number | null>;
  evaluatedBy: string;
  reviewedBy?: string;
  createdAt?: string;
  updatedAt?: string;
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
  deletedClassIds?: string[];
  deletedMakeupSessionIds?: string[];
  deletedLessonReportIds?: string[];
  deletedCourseDurationIds?: string[];
  deletedCourseHolidayIds?: string[];
  deletedCourseMakeupIds?: string[];
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

export type HomeworkStatus =
  | 'Đạt yêu cầu'
  | 'Chưa đạt yêu cầu'
  | 'Chưa hoàn thành'
  | 'Không áp dụng'
  | 'Đạt'
  | 'Chưa đạt'
  | 'Không giao BVN';

export type PreviousLessonStatus =
  | 'Đạt yêu cầu'
  | 'Chưa đạt yêu cầu'
  | 'Chưa hoàn thành'
  | 'Không áp dụng'
  | 'Đạt'
  | 'Chưa đạt'
  | 'Chưa thuộc bài'
  | 'Chưa chuẩn bị';

export interface StudentLessonReportEntry {
  studentId: string;
  studentName: string;
  homeworkStatus: HomeworkStatus;
  previousLessonStatus: PreviousLessonStatus;
  comments: string;
  assignedHomework: string;
  notes: string;
  completed: boolean;
}

export interface LessonReportLockAuditEntry {
  id: string;
  reportId: string;
  classId: string;
  className: string;
  teachingDate: string;
  action: 'LOCK' | 'UNLOCK';
  actorUserId: string;
  actorUsername: string;
  actorName: string;
  timestamp: string;
  timestampIso: string;
  reason?: string;
  originalDeadlineAt?: string;
}

export interface LessonReport {
  id: string;
  classId: string;
  className: string;
  teachingDate: string;
  scheduledTime: string;
  classroom: string;
  teacherId: string;
  teacherName: string;
  teachingAssistantName?: string;
  lessonProgress: string;
  sessionType: 'regular' | 'makeup';
  status: 'not_started' | 'in_progress' | 'submitted' | 'completed';
  totalStudents: number;
  completedStudents: number;
  completionPercentage: number;
  locked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  deadlineAt?: string; // ISO string with +07:00 for 17:00 next day Vietnam time
  unlockedAfterExpiration?: boolean;
  submittedAt?: string;
  submittedBy?: string;
  lastEditedById?: string;
  lastEditedByUsername?: string;
  lastEditedByName?: string;
  lastEditedAt?: string;
  studentReports: StudentLessonReportEntry[];
}

export interface IncompleteReportRecord {
  id: string;
  reportId: string;
  classId: string;
  className: string;
  teachingDate: string;
  teacherName: string;
  completionPercentage: number;
  incompleteStudentCount: number;
  missingFields: string;
  lockedAt: string;
  lockedBy: string;
  status: 'pending' | 'resolved';
}

export interface MakeupClassSession {
  id: string;
  classId: string;
  className: string;
  date: string;
  time: string;
  classroom: string;
  teacherId: string;
  teacherName: string;
  assistantId?: string;
  assistantName?: string;
  lessonProgress: string;
  notes?: string;
}

// ==========================================
// COURSE DURATION MODULE TYPES
// ==========================================

export type DurationMode = 'months' | 'calendar_days' | 'learning_days' | 'learning_sessions';

export type CourseStatus = 'not_started' | 'in_progress' | 'near_completion' | 'completed' | 'extended' | 'on_hold';

export type ExtensionPolicy = 'none' | 'scheduled_holidays' | 'all_non_study_days' | 'missed_scheduled_lessons' | 'custom';

export type HolidayType = 'tet' | 'national' | 'center' | 'suspension' | 'teacher_absence' | 'other';

export interface CourseHoliday {
  id: string;
  holidayName: string;
  startDate: string;
  endDate: string;
  holidayType: HolidayType;
  reason?: string;
  affectsScheduledLessons: boolean;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface CourseMakeupSession {
  id: string;
  classId: string;
  className?: string;
  courseDurationId?: string;
  originalMissedDate?: string;
  makeupDate: string;
  time?: string;
  classroom?: string;
  teacherId?: string;
  teacherName?: string;
  reason?: string;
  countsTowardCourseProgress: boolean;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface CourseDurationHistory {
  id: string;
  courseDurationId: string;
  previousExpectedCompletionDate: string;
  newExpectedCompletionDate: string;
  reason: string;
  changedBy: string;
  changedAt: string;
  originalStartDate?: string;
}

export interface CourseDurationRecord {
  id: string;
  courseName: string;
  classId?: string;
  className?: string;
  courseBook?: string;
  teacherId?: string;
  teacherName?: string;
  academicProgramId?: string;
  durationMode: DurationMode;
  durationValue: number;
  courseStartDate: string;
  originalExpectedCompletionDate: string;
  currentExpectedCompletionDate: string;
  extensionPolicy: ExtensionPolicy;
  requiredSessions: number;
  completedSessions: number;
  remainingSessions?: number;
  progressPercentage: number;
  status: CourseStatus;
  notes?: string;
  calculationExplanation?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface CourseCalculationResult {
  expectedCompletionDate: string;
  totalDaysSpan: number;
  explanation: string;
  scheduledSessionsCount: number;
  holidaysEncounteredCount: number;
  makeupsCount: number;
  breakdownDates: { date: string; type: string; note: string }[];
  hasScheduleWarning?: boolean;
  warningMessage?: string;
}



