import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Unlock,
  Clock,
  Search,
  Eye,
  Printer,
  Save,
  Send,
  X,
  Edit3,
  Trash2,
  UserCheck,
  UserPlus,
  Check,
  AlertCircle,
  History,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import {
  LessonReport,
  HomeworkStatus,
  PreviousLessonStatus,
  LessonReportLockAuditEntry
} from '../../types';
import {
  exportLessonReportToWord,
  exportLessonReportToExcel,
  getVietnamTodayISO,
  isReportExpired,
  isStudentReportEntryComplete,
  computeReportDeadlineISO
} from '../../services/dataService';

const STATUS_OPTIONS = [
  'Đạt yêu cầu',
  'Chưa đạt yêu cầu',
  'Chưa hoàn thành',
  'Không áp dụng'
] as const;

export const LessonReportsView: React.FC = () => {
  const { currentUser } = useAuth();
  const context = useData();

  const data = context?.data;
  const getLessonReportsForDate = context?.getLessonReportsForDate;
  const saveLessonReport = context?.saveLessonReport;
  const submitLessonReport = context?.submitLessonReport;
  const toggleReportLock = context?.toggleReportLock;
  const addMakeupClass = context?.addMakeupClass;
  const deleteMakeupClass = context?.deleteMakeupClass;

  const { showToast } = useToast();

  const isTeacher = currentUser?.role === 'teacher';
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'academic_manager' || isAdmin;

  // Sub-tabs: Teachers only see 'daily'; Admin & Academic Manager also see 'history', 'audits', 'incomplete'
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'history' | 'audits' | 'incomplete'>('daily');

  // Default to current date in Vietnam timezone (Asia/Ho_Chi_Minh)
  const [selectedDate, setSelectedDate] = useState<string>(() => getVietnamTodayISO());

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lockFilter, setLockFilter] = useState<string>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');

  // Selected Report for Editing / Viewing
  const [activeReport, setActiveReport] = useState<LessonReport | null>(null);
  const [showParentPreview, setShowParentPreview] = useState<boolean>(false);

  // Make-up Class Modal
  const [showMakeupModal, setShowMakeupModal] = useState<boolean>(false);
  const [makeupForm, setMakeupForm] = useState({
    classId: '',
    date: getVietnamTodayISO(),
    time: '18:00 - 19:30',
    classroom: 'Phòng 101 - Smart Room',
    teacherId: '',
    assistantId: '',
    lessonProgress: 'Buổi học bù',
    notes: 'Lớp học bù'
  });

  // Load daily reports automatically from existing class/timetable/weeklySchedule/makeup data
  const dailyReports = useMemo(() => {
    if (typeof getLessonReportsForDate === 'function') {
      try {
        const res = getLessonReportsForDate(selectedDate);
        if (Array.isArray(res)) return res;
      } catch (err) {
        console.error('Error loading daily lesson reports:', err);
      }
    }
    return [];
  }, [
    selectedDate,
    data?.lessonReports,
    data?.makeupSessions,
    data?.timetable,
    data?.classes,
    data?.students,
    getLessonReportsForDate
  ]);

  useEffect(() => {
    const classesList = data?.classes || [];
    if (classesList.length > 0 && !makeupForm.classId) {
      setMakeupForm(prev => ({
        ...prev,
        classId: classesList[0].id,
        teacherId: classesList[0].teacherId || '',
        assistantId: classesList[0].assistantTeacherId || ''
      }));
    }
  }, [data?.classes]);

  const isReportCompleted = (rep: LessonReport): boolean =>
    (rep.status === 'completed' || rep.status === 'submitted') &&
    rep.totalStudents > 0 &&
    rep.completedStudents === rep.totalStudents;

  const isReportEffectivelyLockedForTeacher = (rep: LessonReport): boolean => {
    if (rep.locked) return true;
    const expired = isReportExpired(rep);
    return expired && !rep.unlockedAfterExpiration;
  };

  // Filtered daily reports (Teacher can access all scheduled classes on the date, including substitute teaching)
  const filteredReports = useMemo(() => {
    return (dailyReports || []).filter(rep => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchClass = rep.className?.toLowerCase().includes(q);
        const matchTeacher = rep.teacherName?.toLowerCase().includes(q);
        const matchEditor = isManager && rep.lastEditedByName?.toLowerCase().includes(q);
        if (!matchClass && !matchTeacher && !matchEditor) return false;
      }

      if (classFilter !== 'all' && rep.classId !== classFilter) return false;

      if (statusFilter === 'reported' && !isReportCompleted(rep)) return false;
      if (statusFilter === 'unreported' && isReportCompleted(rep)) return false;

      if (lockFilter === 'locked' && !rep.locked && !isReportExpired(rep)) return false;
      if (lockFilter === 'open' && (rep.locked || isReportExpired(rep))) return false;

      return true;
    });
  }, [dailyReports, searchQuery, classFilter, statusFilter, lockFilter, isManager]);

  // Historical reports (all stored reports, never deleted)
  const historicalReports = useMemo(() => {
    const all = Array.isArray(data?.lessonReports) ? [...data.lessonReports] : [];
    return all
      .filter(rep => {
        if (historyDateFilter && rep.teachingDate !== historyDateFilter) return false;
        if (classFilter !== 'all' && rep.classId !== classFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchClass = rep.className?.toLowerCase().includes(q);
          const matchTeacher = rep.teacherName?.toLowerCase().includes(q);
          const matchEditor = rep.lastEditedByName?.toLowerCase().includes(q);
          if (!matchClass && !matchTeacher && !matchEditor) return false;
        }
        return true;
      })
      .sort((a, b) => b.teachingDate.localeCompare(a.teachingDate));
  }, [data?.lessonReports, historyDateFilter, classFilter, searchQuery]);

  const lockAuditLogs: LessonReportLockAuditEntry[] = useMemo(() => {
    return Array.isArray(data?.lessonReportLockAudits) ? data.lessonReportLockAudits : [];
  }, [data?.lessonReportLockAudits]);

  const handleShiftDate = (deltaDays: number) => {
    const match = selectedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return;
    const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + deltaDays));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const handleToday = () => {
    setSelectedDate(getVietnamTodayISO());
  };

  const handleOpenReport = (report: LessonReport) => {
    setActiveReport(JSON.parse(JSON.stringify(report)));
    setShowParentPreview(false);
  };

  const handleOpenParentPreview = (report: LessonReport) => {
    setActiveReport(JSON.parse(JSON.stringify(report)));
    setShowParentPreview(true);
  };

  const handleSaveActiveReport = () => {
    if (!activeReport) return;
    if (typeof saveLessonReport === 'function') {
      const res = saveLessonReport(activeReport);
      if (res?.success && res?.report) {
        setActiveReport(res.report);
        showToast(`Đã lưu bản nháp báo cáo lớp ${activeReport.className}!`, 'success');
      } else {
        showToast(res?.error || 'Không thể lưu báo cáo.', 'error');
      }
    }
  };

  const handleSubmitActiveReport = () => {
    if (!activeReport) return;
    if (typeof submitLessonReport === 'function') {
      const res = submitLessonReport(activeReport);
      if (res?.success && res?.report) {
        setActiveReport(res.report);
        showToast(`Đã nộp báo cáo lớp ${activeReport.className} thành công!`, 'success');
      } else {
        showToast(res?.error || 'Vui lòng hoàn thành đầy đủ thông tin trước khi nộp.', 'error');
      }
    }
  };

  const handleToggleLock = (report: LessonReport) => {
    if (!isManager) {
      showToast('Chỉ Quản lý học thuật hoặc Admin mới có quyền khóa/mở khóa báo cáo.', 'error');
      return;
    }

    const nextLock = !report.locked;
    const promptLabel = nextLock
      ? `Nhập lý do khóa báo cáo lớp "${report.className}" ngày ${report.teachingDate} (tùy chọn):`
      : `Nhập lý do mở khóa báo cáo lớp "${report.className}" ngày ${report.teachingDate} (tùy chọn):`;
    const reasonInput = window.prompt(promptLabel, '');
    if (reasonInput === null) return;

    if (typeof toggleReportLock === 'function') {
      const res = toggleReportLock(report.id, nextLock, reasonInput, report);
      if (res?.success !== false) {
        showToast(nextLock ? 'Đã khóa báo cáo thành công!' : 'Đã mở khóa báo cáo!', 'info');
        if (activeReport && activeReport.id === report.id) {
          setActiveReport(prev =>
            prev
              ? {
                  ...prev,
                  locked: nextLock,
                  unlockedAfterExpiration: !nextLock && isReportExpired(prev) ? true : !nextLock ? prev.unlockedAfterExpiration : false
                }
              : null
          );
        }
      } else {
        showToast(res?.error || 'Lỗi khi thay đổi trạng thái khóa.', 'error');
      }
    }
  };

  const handleCreateMakeup = (e: React.FormEvent) => {
    e.preventDefault();
    const classesList = data?.classes || [];
    const cls = classesList.find(c => c.id === makeupForm.classId);
    if (!cls) return;

    const teachersList = data?.teachers || [];
    const assistantsList = data?.teachingAssistants || [];
    const teacher = teachersList.find(t => t.id === makeupForm.teacherId);
    const assistant = assistantsList.find(ta => ta.id === makeupForm.assistantId);

    if (typeof addMakeupClass === 'function') {
      const res = addMakeupClass({
        classId: cls.id,
        className: cls.name,
        date: makeupForm.date,
        time: makeupForm.time,
        classroom: makeupForm.classroom,
        teacherId: teacher?.id || cls.teacherId,
        teacherName: teacher?.fullName || 'Giáo viên',
        assistantId: assistant?.id,
        assistantName: assistant?.fullName,
        lessonProgress: makeupForm.lessonProgress,
        notes: makeupForm.notes
      });

      if (res?.success !== false) {
        showToast(`Đã thêm lớp học bù cho lớp ${cls.name}!`, 'success');
        setShowMakeupModal(false);
      } else {
        showToast(res?.error || 'Lỗi khi thêm lớp học bù.', 'error');
      }
    }
  };

  const handleDeleteMakeup = (makeupId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa lịch học bù này?')) {
      if (typeof deleteMakeupClass === 'function') {
        const res = deleteMakeupClass(makeupId);
        if (res?.success !== false) {
          showToast('Đã xóa lớp học bù.', 'info');
        }
      }
    }
  };

  const handleExportWord = async (report: LessonReport) => {
    try {
      await exportLessonReportToWord(report);
      showToast('Đã xuất file Word (.docx) Bản phụ huynh!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xuất Word.', 'error');
    }
  };

  const handleExportExcel = (report: LessonReport) => {
    try {
      exportLessonReportToExcel(report);
      showToast('Đã xuất file Excel (.xlsx) thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xuất Excel.', 'error');
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const match = (dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return dateStr;
    const dt = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${dayNames[dt.getDay()]}, ${match[3]}/${match[2]}/${match[1]}`;
  };

  const formatDeadlineDisplay = (report: LessonReport) => {
    const deadlineIso = report.deadlineAt || computeReportDeadlineISO(report.teachingDate);
    const match = deadlineIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
    if (!match) return '17:00 ngày hôm sau';
    return `${match[4]} ngày ${match[3]}/${match[2]}/${match[1]}`;
  };

  const activeReportExpired = activeReport ? isReportExpired(activeReport) : false;
  const activeReportReadOnly = activeReport
    ? isTeacher && isReportEffectivelyLockedForTeacher(activeReport)
    : false;

  const reportedCount = filteredReports.filter(isReportCompleted).length;
  const unreportedCount = filteredReports.length - reportedCount;

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-red-50 text-red-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Báo Cáo Tình Hình Học Tập (Lesson Report)
              </h2>
              <p className="text-xs text-slate-500">
                Báo cáo học tập hằng ngày của học viên, theo dõi tiến độ nộp, khóa sổ KPI & xuất Bản phụ huynh
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveSubTab('daily');
                setActiveReport(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'daily'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Báo cáo hằng ngày
            </button>

            {isManager && (
              <>
                <button
                  onClick={() => {
                    setActiveSubTab('history');
                    setActiveReport(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    activeSubTab === 'history'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  <span>Lịch sử & KPI ({(data?.lessonReports || []).length})</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSubTab('audits');
                    setActiveReport(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    activeSubTab === 'audits'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nhật ký Khóa/Mở ({lockAuditLogs.length})</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSubTab('incomplete');
                    setActiveReport(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeSubTab === 'incomplete'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Chưa xong</span>
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                    {(data?.incompleteReports || []).filter(r => r.status === 'pending').length}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Date Selector & Summary Badges */}
        {activeSubTab === 'daily' && !activeReport && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleShiftDate(-1)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Ngày trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="pl-3 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />

              <button
                onClick={() => handleShiftDate(1)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Ngày sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleToday}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hôm nay
              </button>

              <span className="text-xs font-semibold text-slate-600 ml-1">
                {formatDateDisplay(selectedDate)} (Giờ VN)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {reportedCount} Đã báo cáo
              </span>
              <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-bold">
                {unreportedCount} Chưa báo cáo
              </span>

              {isManager && (
                <button
                  onClick={() => setShowMakeupModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all ml-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Bổ sung lớp học bù</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          SUB-TAB 1: DAILY CLASS CARDS
         ======================================================== */}
      {activeSubTab === 'daily' && !activeReport && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên lớp, giáo viên..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500"
                />
              </div>

              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="all">Tất cả lớp học</option>
                {(data?.classes || []).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="reported">Đã báo cáo</option>
                <option value="unreported">Chưa báo cáo</option>
              </select>

              <select
                value={lockFilter}
                onChange={e => setLockFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="all">Tất cả tình trạng khóa</option>
                <option value="open">Đang mở</option>
                <option value="locked">Đã khóa / Hết hạn</option>
              </select>
            </div>

            <div className="text-slate-500 font-medium">
              Hạn chỉnh sửa: <strong>17:00 ngày hôm sau</strong>
            </div>
          </div>

          {/* Class Cards Grid */}
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-12 px-4 text-center text-slate-500 text-xs">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <div className="font-bold text-slate-700 text-sm">
                Không có lớp học nào được lên lịch vào {formatDateDisplay(selectedDate)}
              </div>
              <div className="mt-1">
                Chọn ngày khác hoặc bấm "Bổ sung lớp học bù" (dành cho Quản lý) nếu có buổi học phát sinh.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map(rep => {
                const completed = isReportCompleted(rep);
                const expired = isReportExpired(rep);
                const effectivelyLocked = isReportEffectivelyLockedForTeacher(rep);

                return (
                  <div
                    key={rep.id}
                    className={`rounded-2xl border p-5 transition-all flex flex-col justify-between gap-4 ${
                      completed
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-red-50 border-red-300 text-red-950'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top badges: Completion + Lock/Deadline */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            completed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {completed ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          <span>{completed ? 'Đã báo cáo' : 'Chưa báo cáo'}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {rep.sessionType === 'makeup' && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                              HỌC BÙ
                            </span>
                          )}
                          {rep.locked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                              <Lock className="w-3 h-3" /> Đã khóa
                            </span>
                          ) : expired && !rep.unlockedAfterExpiration ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-700 text-white">
                              <Clock className="w-3 h-3" /> Hết hạn 17:00
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/80 text-slate-700 border border-slate-200">
                              <Unlock className="w-3 h-3" /> Đang mở
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Class Name & Date */}
                      <div>
                        <h3 className="font-extrabold text-base leading-snug">{rep.className}</h3>
                        <div className="text-xs opacity-80 mt-0.5">
                          {formatDateDisplay(rep.teachingDate)} • {rep.scheduledTime}
                        </div>
                      </div>

                      {/* Teacher, TA, Progress */}
                      <div
                        className={`space-y-1.5 pt-2.5 border-t text-xs ${
                          completed ? 'border-emerald-200' : 'border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 shrink-0 opacity-80" />
                          <span>
                            GV: <strong>{rep.teacherName}</strong>
                          </span>
                        </div>
                        {rep.teachingAssistantName && (
                          <div className="flex items-center gap-1.5">
                            <UserPlus className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            <span>
                              TA: <strong>{rep.teachingAssistantName}</strong>
                            </span>
                          </div>
                        )}
                        <div className="text-[11px] opacity-85">
                          Hoàn thành: <strong>{rep.completedStudents}/{rep.totalStudents}</strong> học viên ({rep.completionPercentage}%)
                        </div>

                        {/* Last Editor Audit (Visible ONLY to Admin & Academic Manager) */}
                        {isManager && (
                          <div className="pt-1.5 text-[11px] bg-white/70 rounded-lg px-2.5 py-1.5 border border-slate-200/70 text-slate-700">
                            <div>
                              Người sửa cuối:{' '}
                              <strong>{rep.lastEditedByName || 'Chưa có ai chỉnh sửa'}</strong>
                            </div>
                            {rep.lastEditedAt && (
                              <div className="text-[10px] text-slate-500">
                                Lúc: {rep.lastEditedAt} ({rep.lastEditedByUsername})
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReport(rep)}
                        className="flex-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isTeacher && effectivelyLocked ? 'Xem báo cáo' : 'Mở báo cáo'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenParentPreview(rep)}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                        title="Bản phụ huynh"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Bản PH</span>
                      </button>

                      {isManager && (
                        <button
                          type="button"
                          onClick={() => handleToggleLock(rep)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer ${
                            rep.locked
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-800 hover:bg-slate-900 text-white'
                          }`}
                          title={rep.locked ? 'Mở khóa báo cáo' : 'Khóa báo cáo'}
                        >
                          {rep.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          <span>{rep.locked ? 'Mở khóa' : 'Khóa'}</span>
                        </button>
                      )}

                      {isManager && rep.sessionType === 'makeup' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMakeup(rep.id.replace('LR-MAKEUP-', ''))}
                          className="p-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 rounded-xl cursor-pointer"
                          title="Xóa lớp học bù"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: HISTORICAL REPORTS & KPI (ADMIN / MANAGER ONLY)
         ======================================================== */}
      {isManager && activeSubTab === 'history' && !activeReport && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm lớp, GV, người sửa cuối..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Lọc ngày:</span>
              <input
                type="date"
                value={historyDateFilter}
                onChange={e => setHistoryDateFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
              {historyDateFilter && (
                <button
                  onClick={() => setHistoryDateFilter('')}
                  className="text-red-600 font-semibold hover:underline"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="ml-auto text-slate-500">
              Tổng cộng: <strong>{historicalReports.length}</strong> bản báo cáo đã lưu
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">Ngày học</th>
                    <th className="py-3 px-4">Lớp học</th>
                    <th className="py-3 px-4">GV theo lịch</th>
                    <th className="py-3 px-4">Người sửa cuối (KPI Audit)</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Khóa / Hạn 17:00</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historicalReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Chưa có báo cáo lịch sử nào được lưu.
                      </td>
                    </tr>
                  ) : (
                    historicalReports.map(rep => {
                      const completed = isReportCompleted(rep);
                      const expired = isReportExpired(rep);
                      return (
                        <tr key={rep.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-semibold">{rep.teachingDate}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{rep.className}</td>
                          <td className="py-3 px-4">{rep.teacherName}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">
                              {rep.lastEditedByName || '—'}
                            </div>
                            {rep.lastEditedAt && (
                              <div className="text-[10px] text-slate-400">
                                {rep.lastEditedAt} • {rep.lastEditedByUsername}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                completed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {completed ? 'Đã báo cáo' : 'Chưa báo cáo'} ({rep.completedStudents}/{rep.totalStudents})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="font-semibold">
                              {rep.locked ? 'Đã khóa' : expired ? 'Hết hạn 17:00' : 'Đang mở'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Hạn: {formatDeadlineDisplay(rep)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenReport(rep)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold"
                              >
                                Xem
                              </button>
                              <button
                                onClick={() => handleToggleLock(rep)}
                                className={`px-2.5 py-1 rounded-lg font-semibold ${
                                  rep.locked
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {rep.locked ? 'Mở khóa' : 'Khóa'}
                              </button>
                            </div>
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
      )}

      {/* ========================================================
          SUB-TAB 3: APPEND-ONLY LOCK/UNLOCK AUDIT HISTORY
         ======================================================== */}
      {isManager && activeSubTab === 'audits' && !activeReport && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            <strong>Nhật ký Khóa / Mở khóa báo cáo (Append-only):</strong> Ghi nhận mọi thao tác khóa và mở khóa thủ công của Admin / Quản lý học thuật (không thể chỉnh sửa hoặc xóa).
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Thời gian (Giờ VN)</th>
                  <th className="py-3 px-4">Thao tác</th>
                  <th className="py-3 px-4">Lớp / Ngày học</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lockAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Chưa có lịch sử khóa/mở khóa thủ công nào.
                    </td>
                  </tr>
                ) : (
                  lockAuditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-[11px]">{log.timestamp}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.action === 'LOCK'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{log.className}</div>
                        <div className="text-[10px] text-slate-400">
                          Ngày: {log.teachingDate} • ID: {log.reportId}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">{log.actorName}</div>
                        <div className="text-[10px] text-slate-400">
                          {log.actorUserId} • {log.actorUsername}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{log.reason || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 4: INCOMPLETE REPORTS TRACKING
         ======================================================== */}
      {isManager && activeSubTab === 'incomplete' && !activeReport && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ngày học</th>
                  <th className="py-3 px-4">Lớp học</th>
                  <th className="py-3 px-4">Giáo viên</th>
                  <th className="py-3 px-4 text-center">Tiến độ lúc khóa</th>
                  <th className="py-3 px-4">Thông tin còn thiếu</th>
                  <th className="py-3 px-4">Thời gian khóa</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {(data?.incompleteReports || []).length > 0 ? (
                  (data?.incompleteReports || []).map(inc => (
                    <tr key={inc.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold">{inc.teachingDate}</td>
                      <td className="py-3 px-4 font-bold">{inc.className}</td>
                      <td className="py-3 px-4">{inc.teacherName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                          {inc.completionPercentage}% ({inc.incompleteStudentCount} HS thiếu)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-rose-600 max-w-xs truncate" title={inc.missingFields}>
                        {inc.missingFields}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <div>{inc.lockedAt}</div>
                        <div className="text-[10px] text-slate-400">bởi {inc.lockedBy}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inc.status === 'resolved' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            Đã bổ sung xong
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                            Chưa hoàn thành
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            const rep = (data?.lessonReports || []).find(r => r.id === inc.reportId);
                            if (rep) {
                              setActiveSubTab('daily');
                              setSelectedDate(inc.teachingDate);
                              handleOpenReport(rep);
                            } else {
                              showToast('Không tìm thấy bản báo cáo gốc.', 'error');
                            }
                          }}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold"
                        >
                          Mở báo cáo
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Chưa có ghi nhận báo cáo thiếu nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          DETAIL VIEW: EDITOR OR "BẢN PHỤ HUYNH"
         ======================================================== */}
      {activeReport && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-lg overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveReport(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>

              <div className="text-xs text-slate-300">
                Lớp: <strong className="text-white">{activeReport.className}</strong> • Ngày:{' '}
                <strong className="text-white">{activeReport.teachingDate}</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowParentPreview(!showParentPreview)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  showParentPreview
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showParentPreview ? 'Quay lại nhập liệu' : 'Bản phụ huynh'}</span>
              </button>

              <button
                onClick={() => handleExportWord(activeReport)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Word</span>
              </button>

              <button
                onClick={() => handleExportExcel(activeReport)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In / PDF</span>
              </button>

              {isManager && (
                <button
                  onClick={() => handleToggleLock(activeReport)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    activeReport.locked
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {activeReport.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{activeReport.locked ? 'Mở khóa báo cáo' : 'Khóa báo cáo'}</span>
                </button>
              )}

              {!activeReportReadOnly && !showParentPreview && (
                <>
                  <button
                    onClick={handleSaveActiveReport}
                    className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu nháp</span>
                  </button>
                  <button
                    onClick={handleSubmitActiveReport}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Nộp báo cáo</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Lock / Expiration / Last-Editor Banner (Hidden in Parent Preview & Print) */}
          {!showParentPreview && (
            <div className="print:hidden">
              {(activeReport.locked || activeReportExpired) && (
                <div className="bg-rose-50 border-b border-rose-200 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-800">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      {activeReport.locked
                        ? `Đã khóa báo cáo${activeReport.lockedAt ? ` lúc ${activeReport.lockedAt}` : ''}${activeReport.lockedBy ? ` bởi ${activeReport.lockedBy}` : ''}.`
                        : activeReport.unlockedAfterExpiration
                        ? `Báo cáo đã quá hạn gốc (${formatDeadlineDisplay(activeReport)}) nhưng đã được Quản lý mở khóa để chỉnh sửa bổ sung.`
                        : `Báo cáo đã tự động hết hạn chỉnh sửa lúc ${formatDeadlineDisplay(activeReport)}.`}
                    </span>
                  </div>
                </div>
              )}

              {isManager && activeReport.lastEditedByName && (
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Người chỉnh sửa cuối: <strong className="text-slate-900">{activeReport.lastEditedByName}</strong> ({activeReport.lastEditedByUsername}) • Lúc: <strong>{activeReport.lastEditedAt}</strong>
                  </span>
                  {activeReport.submittedAt && (
                    <span>
                      Nộp lúc: <strong>{activeReport.submittedAt}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              MODE A: BẢN PHỤ HUYNH (CLEAN PARENT-FRIENDLY LAYOUT)
             ======================================================== */}
          {showParentPreview ? (
            <div className="p-8 md:p-12 bg-white text-slate-900 font-serif print:p-0">
              <div className="text-center mb-6 space-y-1">
                <div className="text-xs font-sans font-bold tracking-widest text-red-600 uppercase">
                  LeeGo English Center
                </div>
                <h1 className="text-lg md:text-2xl font-bold tracking-tight text-red-600 uppercase">
                  BÁO CÁO TÌNH HÌNH HỌC TẬP – LỚP {(activeReport.className || '').toUpperCase()}
                </h1>
                <h2 className="text-sm md:text-base font-bold text-slate-800 uppercase">
                  BUỔI HỌC NGÀY {(activeReport.teachingDate || '').split('-').reverse().join('/')}
                </h2>
                {activeReport.lessonProgress && (
                  <div className="text-xs md:text-sm font-semibold text-blue-700 pt-1">
                    NỘI DUNG BÀI HỌC: {activeReport.lessonProgress}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-xs md:text-sm font-serif">
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold text-center">
                      <th className="border border-black p-2.5 w-28">Lớp</th>
                      <th className="border border-black p-2.5 w-40">Học viên</th>
                      <th className="border border-black p-2.5 w-32">Tình hình làm BTVN</th>
                      <th className="border border-black p-2.5 w-32">Tình hình học bài cũ</th>
                      <th className="border border-black p-2.5 min-w-[200px]">Nhận xét</th>
                      <th className="border border-black p-2.5 w-32">Giáo viên</th>
                      <th className="border border-black p-2.5 min-w-[140px]">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeReport.studentReports || []).map((student, idx) => (
                      <tr key={student.studentId || idx} className="align-middle">
                        {idx === 0 ? (
                          <td
                            rowSpan={activeReport.studentReports.length}
                            className="border border-black p-2.5 text-center font-bold text-slate-900 bg-white align-middle"
                          >
                            {activeReport.className}
                          </td>
                        ) : null}

                        <td className="border border-black p-2.5 font-bold text-slate-900">
                          {student.studentName}
                        </td>

                        <td className="border border-black p-2.5 text-center font-medium">
                          {student.homeworkStatus || '—'}
                        </td>

                        <td className="border border-black p-2.5 text-center font-medium">
                          {student.previousLessonStatus || '—'}
                        </td>

                        <td className="border border-black p-2.5 whitespace-pre-line text-left leading-relaxed">
                          {student.comments || '—'}
                        </td>

                        <td className="border border-black p-2.5 text-center font-medium">
                          {activeReport.teacherName || '—'}
                        </td>

                        <td className="border border-black p-2.5 whitespace-pre-line text-left leading-relaxed font-semibold text-red-600">
                          {student.notes || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 pt-4 flex items-center justify-between text-xs text-slate-500 font-sans border-t border-slate-100">
                <div>LeeGo English Center</div>
                <div>Giáo viên phụ trách: {activeReport.teacherName}</div>
              </div>
            </div>
          ) : (
            /* ========================================================
                MODE B: REPORT EDITOR (7 COLUMNS, GHI CHÚ AT THE END)
               ======================================================== */
            <div className="p-6 space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800 text-sm">
                    {activeReport.className} – {formatDateDisplay(activeReport.teachingDate)} ({activeReport.scheduledTime})
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Nội dung bài học:</span>
                    {!activeReportReadOnly ? (
                      <input
                        type="text"
                        value={activeReport.lessonProgress}
                        onChange={e =>
                          setActiveReport({ ...activeReport, lessonProgress: e.target.value })
                        }
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-blue-700 text-xs w-72"
                        placeholder="Ví dụ: Unit 3 – Lesson 2..."
                      />
                    ) : (
                      <span className="font-semibold text-blue-700">{activeReport.lessonProgress || '—'}</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div>
                    Hoàn thành:{' '}
                    <strong className="text-blue-600">
                      {activeReport.studentReports.filter(isStudentReportEntryComplete).length}/{activeReport.studentReports.length}
                    </strong>{' '}
                    học viên
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hạn chỉnh sửa: {formatDeadlineDisplay(activeReport)}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                      <th className="p-3 w-28">Lớp</th>
                      <th className="p-3 w-40">Học viên</th>
                      <th className="p-3 w-40">Tình hình làm BTVN</th>
                      <th className="p-3 w-40">Tình hình học bài cũ</th>
                      <th className="p-3 min-w-[220px]">Nhận xét</th>
                      <th className="p-3 w-36">Giáo viên</th>
                      <th className="p-3 min-w-[160px]">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {(activeReport.studentReports || []).map((student, idx) => {
                      const isComplete = isStudentReportEntryComplete(student);
                      const hwOptions = Array.from(
                        new Set([...STATUS_OPTIONS, student.homeworkStatus].filter(Boolean))
                      );
                      const prevOptions = Array.from(
                        new Set([...STATUS_OPTIONS, student.previousLessonStatus].filter(Boolean))
                      );

                      return (
                        <tr
                          key={student.studentId || idx}
                          className={!isComplete ? 'bg-red-50/30' : 'hover:bg-slate-50'}
                        >
                          <td className="p-3 font-semibold text-slate-700">{activeReport.className}</td>

                          <td className="p-3 font-bold text-slate-900">
                            <div>{student.studentName}</div>
                            {!isTeacher && (
                              <div className="text-[10px] text-slate-400 font-normal">{student.studentId}</div>
                            )}
                          </td>

                          <td className="p-3">
                            <select
                              disabled={activeReportReadOnly}
                              value={student.homeworkStatus || 'Đạt yêu cầu'}
                              onChange={e => {
                                const next = [...activeReport.studentReports];
                                next[idx] = {
                                  ...next[idx],
                                  homeworkStatus: e.target.value as HomeworkStatus
                                };
                                next[idx].completed = isStudentReportEntryComplete(next[idx]);
                                setActiveReport({ ...activeReport, studentReports: next });
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold disabled:bg-slate-100"
                            >
                              {hwOptions.map(opt => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="p-3">
                            <select
                              disabled={activeReportReadOnly}
                              value={student.previousLessonStatus || 'Đạt yêu cầu'}
                              onChange={e => {
                                const next = [...activeReport.studentReports];
                                next[idx] = {
                                  ...next[idx],
                                  previousLessonStatus: e.target.value as PreviousLessonStatus
                                };
                                next[idx].completed = isStudentReportEntryComplete(next[idx]);
                                setActiveReport({ ...activeReport, studentReports: next });
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold disabled:bg-slate-100"
                            >
                              {prevOptions.map(opt => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="p-3">
                            <textarea
                              disabled={activeReportReadOnly}
                              rows={2}
                              value={student.comments || ''}
                              onChange={e => {
                                const next = [...activeReport.studentReports];
                                next[idx] = { ...next[idx], comments: e.target.value };
                                next[idx].completed = isStudentReportEntryComplete(next[idx]);
                                setActiveReport({ ...activeReport, studentReports: next });
                              }}
                              placeholder="Nhập nhận xét tiến độ học tập..."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs disabled:bg-slate-100"
                            />
                          </td>

                          <td className="p-3 text-slate-700 font-medium">{activeReport.teacherName}</td>

                          <td className="p-3">
                            <textarea
                              disabled={activeReportReadOnly}
                              rows={2}
                              value={student.notes || ''}
                              onChange={e => {
                                const next = [...activeReport.studentReports];
                                next[idx] = { ...next[idx], notes: e.target.value };
                                setActiveReport({ ...activeReport, studentReports: next });
                              }}
                              placeholder="Ghi chú thêm..."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-red-600 disabled:bg-slate-100"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!activeReportReadOnly && (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    onClick={handleSaveActiveReport}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu bản nháp</span>
                  </button>
                  <button
                    onClick={handleSubmitActiveReport}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Nộp báo cáo</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: ADD MAKE-UP CLASS
         ======================================================== */}
      {showMakeupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Bổ sung lớp học bù</h3>
              <button
                onClick={() => setShowMakeupModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMakeup} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn lớp</label>
                <select
                  value={makeupForm.classId}
                  onChange={e => {
                    const c = (data?.classes || []).find(cls => cls.id === e.target.value);
                    setMakeupForm({
                      ...makeupForm,
                      classId: e.target.value,
                      teacherId: c?.teacherId || '',
                      assistantId: c?.assistantTeacherId || ''
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  required
                >
                  {(data?.classes || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày học bù</label>
                  <input
                    type="date"
                    value={makeupForm.date}
                    onChange={e => setMakeupForm({ ...makeupForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ca học</label>
                  <input
                    type="text"
                    value={makeupForm.time}
                    onChange={e => setMakeupForm({ ...makeupForm, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giáo viên</label>
                  <select
                    value={makeupForm.teacherId}
                    onChange={e => setMakeupForm({ ...makeupForm, teacherId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {(data?.teachers || []).map(t => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trợ giảng</label>
                  <select
                    value={makeupForm.assistantId}
                    onChange={e => setMakeupForm({ ...makeupForm, assistantId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Không có</option>
                    {(data?.teachingAssistants || []).map(ta => (
                      <option key={ta.id} value={ta.id}>
                        {ta.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMakeupModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                >
                  Tạo lớp học bù
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
