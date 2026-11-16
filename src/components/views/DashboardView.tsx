import React, { useState, useMemo } from 'react';
import {
  Users,
  BookOpen,
  UserCheck,
  Calendar,
  AlertTriangle,
  UserX,
  Clock,
  ArrowRight,
  ClipboardCheck,
  Award,
  FileCheck,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { resolveStaffProfile, getAssignedClassesForStaff } from '../../services/dataService';
import { NavigationTab } from '../layout/Sidebar';
import { AdminDailyClassOverview } from './AdminDailyClassOverview';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab) => void;
  /** Called when user clicks a class card in the daily overview to deep-link to Attendance. */
  onNavigateToAttendance?: (classId: string, date: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onNavigateToAttendance }) => {
  const { currentUser } = useAuth();
  const { data } = useData();

  // Normalize role
  const rawRole = String(currentUser?.role || '').toLowerCase().trim().replace(/[\s-]/g, '_');
  const role: 'admin' | 'academic_manager' | 'teacher' | 'teaching_assistant' =
    rawRole === 'admin' || rawRole.includes('admin')
      ? 'admin'
      : rawRole === 'academic_manager' || rawRole.includes('academic') || rawRole === 'academicmanager'
      ? 'academic_manager'
      : rawRole === 'teaching_assistant' || rawRole === 'teachingassistant' || rawRole === 'assistant' || rawRole === 'ta'
      ? 'teaching_assistant'
      : 'teacher';

  const isAcademicManager = role === 'academic_manager';
  const isAuthorizedForAssessments = role === 'academic_manager' || role === 'teacher';

  const [overviewDate, setOverviewDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [overviewClassId, setOverviewClassId] = useState<string>('');

  // General counts
  const totalStudents = data.students.length;
  const studyingStudents = data.students.filter(s => s.status === 'studying').length;
  const activeClasses = data.classes.filter(c => c.status === 'ongoing').length;
  const activeTeachers = data.teachers.filter(t => t.status === 'active').length;

  // Classes without assigned teacher
  const unassignedClasses = data.classes.filter(c => !c.teacherId);

  // Today's sessions (let's consider dayOfWeek = today's day)
  const now = new Date();
  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1: Mon ... 7: Sun

  const todaySessions = data.timetable.filter(s => s.dayOfWeek === currentDayOfWeek);

  // Absent students in recent attendance records
  const recentAttendance = data.attendance[0];
  const absentStudentsToday = recentAttendance
    ? recentAttendance.records.filter(r => r.status === 'absent' || r.status === 'excused')
    : [];

  // Staff profile resolution (supports Teachers and Teaching Assistants with stable linking)
  const staff = resolveStaffProfile(currentUser, data.teachers, data.teachingAssistants);
  const isTeacher = staff.isTeacher;
  const isTA = staff.isTA;
  const isStaff = isTeacher || isTA;

  const staffClasses = getAssignedClassesForStaff(data.classes, staff);
  const staffSessions = data.timetable.filter(s => {
    if (!staff.staffId) return false;
    if (s.classId) {
      const cls = data.classes.find(c => String(c.id).trim() === String(s.classId).trim());
      if (!cls || cls.status === 'cancelled') return false;
      const slot = cls.weeklySchedule?.find(slotItem => slotItem.dayOfWeek === s.dayOfWeek);
      if (isTA) {
        // Authoritative session-level assistant assignment (strictly session/slot, never inferring from entire class)
        const effAssistantId = String(slot?.assistantTeacherId ?? s.assistantId ?? '').trim();
        return effAssistantId === staff.staffId;
      }
      const effTeacherId = String(slot?.teacherId || cls.teacherId || s.teacherId || '').trim();
      return effTeacherId === staff.staffId;
    }
    if (isTA) {
      return String(s.assistantId || '').trim() === staff.staffId;
    }
    return String(s.teacherId).trim() === staff.staffId;
  });

  const staffPendingReports = data.lessonPlans.filter(lp => {
    if (!staff.staffId) return false;
    if (isTA) {
      const cls = data.classes.find(c => c.id === lp.classId);
      return (
        cls && (
          String(cls.assistantTeacherId || '').trim() === staff.staffId ||
          (cls.weeklySchedule || []).some(slot => String(slot.assistantTeacherId || '').trim() === staff.staffId)
        )
      );
    }
    return String(lp.teacherId).trim() === staff.staffId && lp.status === 'submitted';
  });

  // Filter assessments visible to current staff
  const teacherClassIds = useMemo(() => new Set(staffClasses.map(c => String(c.id).trim())), [staffClasses]);
  const visibleAssessments = useMemo(() => {
    if (isTeacher) {
      return data.assessments.filter(a => teacherClassIds.has(String(a.classId).trim()));
    }
    return data.assessments;
  }, [data.assessments, isTeacher, teacherClassIds]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hệ thống Quản lý LeeGo English Center</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Xin chào, {staff.staffName || currentUser.name}!
            </h2>
            <p className="text-red-100 text-xs md:text-sm mt-1 max-w-xl">
              {role === 'admin' && 'Chào mừng Quản trị viên. Bạn đang có toàn quyền quản lý học sinh, giáo viên, lớp học và hệ thống LeeGo.'}
              {role === 'academic_manager' && 'Chào mừng Quản lý học thuật. Hãy theo dõi tiến độ giáo án, đánh giá chất lượng và lịch học hôm nay.'}
              {isTeacher && `Chào mừng Thầy/Cô ${staff.staffName}. Chúc một ngày giảng dạy đầy năng lượng!`}
              {isTA && `Chào mừng Trợ Giảng ${staff.staffName}. Chúc một ngày hỗ trợ học tập hiệu quả!`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isTeacher ? (
              <>
                <button
                  onClick={() => onNavigate('attendance')}
                  className="px-3.5 py-2.5 bg-white text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <ClipboardCheck className="w-4 h-4 text-red-600" />
                  <span>Điểm danh lớp</span>
                </button>
                <button
                  onClick={() => onNavigate('assessments')}
                  className="px-3.5 py-2.5 bg-red-900/40 hover:bg-red-900/60 text-white border border-white/20 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>Đánh giá & Nhập điểm</span>
                </button>
              </>
            ) : isTA ? (
              <button
                onClick={() => onNavigate('attendance')}
                className="px-4 py-2.5 bg-white text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <ClipboardCheck className="w-4 h-4 text-red-600" />
                <span>Điểm danh lớp ngay</span>
              </button>
            ) : isAcademicManager ? (
              <>
                <button
                  onClick={() => onNavigate('classes')}
                  className="px-3.5 py-2.5 bg-white text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-red-600" />
                  <span>Quản lý lớp học</span>
                </button>
                <button
                  onClick={() => onNavigate('assessments')}
                  className="px-3.5 py-2.5 bg-red-900/40 hover:bg-red-900/60 text-white border border-white/20 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>Đánh giá học thuật</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate('classes')}
                className="px-4 py-2.5 bg-white text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-red-600" />
                <span>Quản lý {activeClasses} lớp học</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Account Diagnostic Warning if Link is Missing */}
      {staff.diagnosticMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Thông báo liên kết tài khoản</h4>
            <p className="text-xs text-amber-700 mt-0.5">{staff.diagnosticMessage}</p>
          </div>
        </div>
      )}

      {/* KPI Statistic Cards */}
      {isStaff ? (
        // STAFF (TEACHER & TA) DASHBOARD STATS
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{staffClasses.length}</div>
              <div className="text-xs font-medium text-slate-500">
                {isTA ? 'Lớp trợ giảng phụ trách' : 'Lớp đang phụ trách'}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{staffSessions.length}</div>
              <div className="text-xs font-medium text-slate-500">
                {isTA ? 'Ca trợ giảng trong tuần' : 'Ca dạy trong tuần'}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">
                {isTeacher ? `${staff.teacher?.workloadHours || 12}h` : `${Math.round(staffSessions.length * 1.5)}h`}
              </div>
              <div className="text-xs font-medium text-slate-500">
                {isTA ? 'Tổng giờ trợ giảng / tuần' : 'Tổng giờ dạy / tuần'}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">
                {isTA
                  ? (data.lessonReports || []).filter(r => staffClasses.some(c => c.id === r.classId)).length
                  : staffPendingReports.length}
              </div>
              <div className="text-xs font-medium text-slate-500">
                {isTA ? 'Báo cáo buổi học (Reports)' : 'Báo cáo chờ duyệt'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ADMIN & ACADEMIC MANAGER STATS
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('students')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                {studyingStudents} đang học
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-800">{totalStudents}</div>
              <div className="text-xs font-medium text-slate-500">Tổng học sinh trung tâm</div>
            </div>
          </div>

          <div
            onClick={() => onNavigate('classes')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {data.classes.length} tổng số
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-800">{activeClasses}</div>
              <div className="text-xs font-medium text-slate-500">Lớp học đang diễn ra</div>
            </div>
          </div>

          <div
            onClick={() => onNavigate('teachers')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {data.teachers.filter(t => t.isNative).length} bản ngữ
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-800">{activeTeachers}</div>
              <div className="text-xs font-medium text-slate-500">Giáo viên trực tiếp</div>
            </div>
          </div>

          <div
            onClick={() => onNavigate('timetable')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                Hôm nay
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-800">{todaySessions.length} ca học</div>
              <div className="text-xs font-medium text-slate-500">Ca dạy trong ngày</div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Attendance Overview for Admin & Academic Manager */}
      {(role === 'admin' || role === 'academic_manager') && (
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-2">
            <label className="text-xs font-semibold text-slate-600">Chọn ngày kiểm tra điểm danh:</label>
            <input
              type="date"
              value={overviewDate}
              onChange={e => setOverviewDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <AdminDailyClassOverview
            selectedDate={overviewDate}
            selectedClassId={overviewClassId}
            onSelectClass={(classId, date) => {
              setOverviewClassId(classId);
              if (onNavigateToAttendance) {
                onNavigateToAttendance(classId, date);
              } else {
                onNavigate('attendance');
              }
            }}
          />
        </div>
      )}

      {/* Actionable Alerts & Notifications Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unassigned Class Warning */}
        {unassignedClasses.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-900">
                Lưu ý: Có {unassignedClasses.length} lớp chưa có giáo viên phụ trách
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {unassignedClasses.map(c => c.name).join(', ')} cần được phân công giáo viên trước khi mở ca học.
              </p>
              <button
                onClick={() => onNavigate('classes')}
                className="mt-2 text-xs font-bold text-amber-900 hover:underline flex items-center gap-1"
              >
                Phân công giáo viên ngay <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Absent Alert */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <UserX className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-red-900">
              Học sinh vắng gần đây: {absentStudentsToday.length} học sinh
            </h4>
            <p className="text-xs text-red-700 mt-0.5">
              {absentStudentsToday.length > 0
                ? absentStudentsToday.map(s => s.studentName).join(', ')
                : 'Tất cả học sinh đều tham gia đầy đủ các buổi gần nhất.'}
            </p>
            <button
              onClick={() => onNavigate('attendance')}
              className="mt-2 text-xs font-bold text-red-800 hover:underline flex items-center gap-1"
            >
              Kiểm tra điểm danh và liên hệ phụ huynh <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Schedule & Academic Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Schedule & Active Classes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today / Upcoming Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-800 text-sm md:text-base">
                  {isTA ? 'Lịch trợ giảng của tôi' : isTeacher ? 'Lịch dạy của tôi' : 'Lịch học các lớp hôm nay'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('timetable')}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                Xem toàn bộ TKB <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {(isStaff ? staffSessions : todaySessions).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {isStaff
                    ? 'Bạn chưa có ca học nào được xếp lịch hoặc ca học hôm nay không diễn ra.'
                    : 'Không có ca học nào được xếp lịch vào hôm nay.'}
                </div>
              ) : (
                (isStaff ? staffSessions : todaySessions).map(s => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex flex-col items-center justify-center font-bold text-xs shrink-0">
                        <span>{s.dayName.slice(0, 4)}</span>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{s.className}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {s.startTime} - {s.endTime}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {s.classroom}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
                        GV: {s.teacherName}
                      </span>
                      {s.assistantName && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-medium hidden sm:inline-block">
                          TA: {s.assistantName}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Class Overview Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-800 text-sm md:text-base">
                  {isTA ? 'Lớp tôi phụ trách trợ giảng' : isTeacher ? 'Lớp tôi giảng dạy' : 'Danh sách lớp đang hoạt động'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('classes')}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                Quản lý lớp <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tên lớp</th>
                    <th className="py-2.5 px-3">Cấp độ</th>
                    <th className="py-2.5 px-3">Giáo viên</th>
                    <th className="py-2.5 px-3">Lịch học</th>
                    <th className="py-2.5 px-3 text-center">Sĩ số</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(isStaff ? staffClasses : data.classes).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        {isTA ? 'Chưa có lớp nào được phân công trợ giảng.' : 'Chưa có lớp nào được phân công giảng dạy.'}
                      </td>
                    </tr>
                  ) : (
                    (isStaff ? staffClasses : data.classes).map(cls => {
                      const teacher = data.teachers.find(t => t.id === cls.teacherId);
                      return (
                        <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {cls.name}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 font-medium text-slate-700 text-[11px]">
                              {cls.level}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {teacher?.fullName || 'Chưa phân công'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {cls.scheduleDays} ({cls.scheduleTime})
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-bold text-slate-800">
                              {cls.studentIds.length}/{cls.maxCapacity}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Academic Highlights & Quick Actions */}
        <div className="space-y-6">
          {/* Recent Assessments - ONLY visible to Academic Manager and Teacher */}
          {isAuthorizedForAssessments && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Đánh giá & Kết quả</h3>
                    <p className="text-[11px] text-slate-400">
                      {isTeacher ? 'Các bài kiểm tra lớp phụ trách' : 'Bài kiểm tra học thuật trung tâm'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('assessments')}
                  className="px-2.5 py-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>Mở bảng điểm</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {visibleAssessments.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <p>Chưa có bài kiểm tra nào được tạo.</p>
                    <button
                      onClick={() => onNavigate('assessments')}
                      className="mt-2 text-xs font-bold text-red-600 hover:underline"
                    >
                      + Tạo bài đánh giá ngay
                    </button>
                  </div>
                ) : (
                  visibleAssessments.slice(0, 3).map(asm => (
                    <div
                      key={asm.id}
                      onClick={() => onNavigate('assessments')}
                      className="p-3 bg-slate-50 hover:bg-red-50/40 rounded-xl border border-slate-100 hover:border-red-200 transition-all text-xs space-y-1.5 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 group-hover:text-red-700 transition-colors">
                          {asm.title}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100/70 text-red-700">
                          {asm.examType || 'Định kỳ'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Lớp: <span className="font-semibold text-slate-700">{asm.className}</span> • Ngày: {asm.date}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã có điểm: {asm.scores.length} học viên</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Quick Operations shortcuts */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Tác vụ nhanh</h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onNavigate('attendance')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-colors text-xs font-semibold text-left"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardCheck className="w-4 h-4 text-red-600" />
                  <span>Điểm danh ca học hôm nay</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </button>

              {isAuthorizedForAssessments && (
                <button
                  onClick={() => onNavigate('assessments')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-colors text-xs font-semibold text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>Nhập điểm & Đánh giá học tập</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {role !== 'teacher' && role !== 'teaching_assistant' && (
                <button
                  onClick={() => onNavigate('students')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-colors text-xs font-semibold text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Tra cứu & Tiếp nhận học sinh mới</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => onNavigate('lesson_plans')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-colors text-xs font-semibold text-left"
              >
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Nộp / Duyệt báo cáo buổi dạy</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </button>

              {role !== 'teacher' && role !== 'teaching_assistant' && (
                <button
                  onClick={() => onNavigate('reports')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-colors text-xs font-semibold text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span>Xuất báo cáo học thuật Excel</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
