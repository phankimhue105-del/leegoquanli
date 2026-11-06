import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Printer,
  Download,
  Share2,
  Save,
  Send,
  X,
  Edit3,
  Trash2,
  UserCheck,
  Award,
  BookOpen,
  Sparkles,
  Maximize2,
  Minimize2,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import {
  LessonReport,
  StudentLessonReportEntry,
  IncompleteReportRecord,
  MakeupClassSession,
  HomeworkStatus,
  PreviousLessonStatus
} from '../../types';
import {
  exportLessonReportToWord,
  exportLessonReportToExcel
} from '../../services/dataService';

export const LessonReportsView: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const {
    data,
    getLessonReportsForDate,
    saveLessonReport,
    submitLessonReport,
    toggleReportLock,
    addMakeupClass,
    deleteMakeupClass,
    resolveIncompleteReport
  } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'academic_manager' || isAdmin;

  // View Mode: 'daily_management' | 'incomplete_tracking'
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'incomplete'>('daily');

  // Selected Date: Default to today/current local time (2026-11-06)
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-06');

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lockFilter, setLockFilter] = useState<string>('all');

  // Selected Report for Editing
  const [activeReport, setActiveReport] = useState<LessonReport | null>(null);

  // Parent Preview Mode (Screenshot Mode)
  const [showParentPreview, setShowParentPreview] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Make-up Class Modal
  const [showMakeupModal, setShowMakeupModal] = useState<boolean>(false);
  const [makeupForm, setMakeupForm] = useState({
    classId: '',
    date: '2026-11-06',
    time: '18:00 - 19:30',
    classroom: 'Phòng 101 - Smart Room',
    teacherId: '',
    assistantId: '',
    lessonProgress: 'Unit 2 – Lesson 2 (Học bù)',
    notes: 'Lớp học bù buổi nghỉ lễ'
  });

  // Load Daily Reports for Date
  const dailyReports = useMemo(() => {
    return getLessonReportsForDate(selectedDate);
  }, [selectedDate, data.lessonReports, data.makeupSessions, data.timetable, data.classes]);

  // Set default classId for makeup modal
  useEffect(() => {
    if (data.classes.length > 0 && !makeupForm.classId) {
      setMakeupForm(prev => ({
        ...prev,
        classId: data.classes[0].id,
        teacherId: data.classes[0].teacherId || '',
        assistantId: data.classes[0].assistantTeacherId || ''
      }));
    }
  }, [data.classes]);

  // Filtered Daily Reports List
  const filteredReports = useMemo(() => {
    return dailyReports.filter(rep => {
      // Teacher filter: Only see assigned classes
      if (isTeacher && currentUser.teacherId) {
        if (rep.teacherId !== currentUser.teacherId) return false;
      }

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchClass = rep.className.toLowerCase().includes(q);
        const matchTeacher = rep.teacherName.toLowerCase().includes(q);
        if (!matchClass && !matchTeacher) return false;
      }

      // Class filter
      if (classFilter !== 'all' && rep.classId !== classFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && rep.status !== statusFilter) return false;

      // Lock filter
      if (lockFilter === 'locked' && !rep.locked) return false;
      if (lockFilter === 'open' && rep.locked) return false;

      return true;
    });
  }, [dailyReports, searchQuery, classFilter, statusFilter, lockFilter, isTeacher, currentUser]);

  // Date Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate('2026-11-06');
  };

  // Open Report Editor
  const handleOpenReport = (report: LessonReport) => {
    setActiveReport(JSON.parse(JSON.stringify(report)));
    setShowParentPreview(false);
  };

  // Open Parent Preview
  const handleOpenParentPreview = (report: LessonReport) => {
    setActiveReport(JSON.parse(JSON.stringify(report)));
    setShowParentPreview(true);
  };

  // Save Report Changes
  const handleSaveActiveReport = () => {
    if (!activeReport) return;
    const res = saveLessonReport(activeReport);
    if (res.success && res.report) {
      setActiveReport(res.report);
      showToast(`Đã lưu báo cáo học tập lớp ${activeReport.className}!`, 'success');
    } else {
      showToast(res.error || 'Lỗi khi lưu báo cáo.', 'error');
    }
  };

  // Submit Report
  const handleSubmitActiveReport = () => {
    if (!activeReport) return;
    const res = submitLessonReport(activeReport.id);
    if (res.success && res.report) {
      setActiveReport(res.report);
      showToast(`Đã nộp báo cáo lớp ${activeReport.className} cho Quản lý học thuật kiểm tra!`, 'success');
    } else {
      showToast(res.error || 'Lỗi khi nộp báo cáo.', 'error');
    }
  };

  // Lock / Unlock Toggle
  const handleToggleLock = (report: LessonReport) => {
    if (!isManager) {
      showToast('Chỉ Quản lý học thuật hoặc Admin mới có quyền khóa/mở khóa báo cáo.', 'error');
      return;
    }

    const nextLock = !report.locked;
    const confirmMsg = nextLock
      ? `Khóa sổ báo cáo lớp "${report.className}" ngày ${report.teachingDate}?\n(Sau khi khóa, giáo viên sẽ không thể chỉnh sửa. Nếu báo cáo chưa đầy đủ, hệ thống sẽ tự động ghi nhận vào sổ theo dõi báo cáo thiếu)`
      : `Mở khóa báo cáo lớp "${report.className}" ngày ${report.teachingDate}?\n(Giáo viên sẽ có thể tiếp tục chỉnh sửa)`;

    if (window.confirm(confirmMsg)) {
      const res = toggleReportLock(report.id, nextLock);
      if (res.success) {
        showToast(nextLock ? 'Đã khóa sổ báo cáo thành công!' : 'Đã mở khóa báo cáo!', 'info');
        if (activeReport && activeReport.id === report.id) {
          setActiveReport(prev => prev ? { ...prev, locked: nextLock } : null);
        }
      } else {
        showToast(res.error || 'Lỗi khi thay đổi trạng thái khóa.', 'error');
      }
    }
  };

  // Add Make-up Class
  const handleCreateMakeup = (e: React.FormEvent) => {
    e.preventDefault();
    const cls = data.classes.find(c => c.id === makeupForm.classId);
    if (!cls) return;

    const teacher = data.teachers.find(t => t.id === makeupForm.teacherId);
    const assistant = data.teachingAssistants.find(ta => ta.id === makeupForm.assistantId);

    const res = addMakeupClass({
      classId: cls.id,
      className: cls.name,
      date: makeupForm.date,
      time: makeupForm.time,
      classroom: makeupForm.classroom,
      teacherId: teacher?.id || cls.teacherId,
      teacherName: teacher?.vietnameseName || teacher?.fullName || 'Giáo viên',
      assistantId: assistant?.id,
      assistantName: assistant?.fullName,
      lessonProgress: makeupForm.lessonProgress,
      notes: makeupForm.notes
    });

    if (res.success) {
      showToast(`Đã thêm lớp học bù cho lớp ${cls.name}!`, 'success');
      setShowMakeupModal(false);
    } else {
      showToast(res.error || 'Lỗi khi thêm lớp học bù.', 'error');
    }
  };

  // Delete Make-up Class
  const handleDeleteMakeup = (makeupId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa lịch học bù này?')) {
      const res = deleteMakeupClass(makeupId);
      if (res.success) {
        showToast('Đã xóa lớp học bù.', 'info');
      }
    }
  };

  // Export Word (.docx)
  const handleExportWord = async (report: LessonReport) => {
    try {
      await exportLessonReportToWord(report);
      showToast('Đã xuất file Word (.docx) chuẩn báo cáo phụ huynh!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xuất Word.', 'error');
    }
  };

  // Export Excel (.xlsx)
  const handleExportExcel = (report: LessonReport) => {
    try {
      exportLessonReportToExcel(report);
      showToast('Đã xuất file Excel (.xlsx) thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xuất Excel.', 'error');
    }
  };

  // Format Date Helper
  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const dt = new Date(dateStr);
    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${dayNames[dt.getDay()]}, Ngày ${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Sub-Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-red-50 text-red-600 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Báo Cáo Tình Hình Học Tập (Lesson Report)</h2>
                <p className="text-xs text-slate-400">
                  Quản lý báo cáo sau buổi học, đánh giá học viên, khóa sổ và xuất báo cáo gửi phụ huynh
                </p>
              </div>
            </div>
          </div>

          {/* Sub-Tabs Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
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
              Lịch học hàng ngày
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
              <span>Báo cáo chưa xong</span>
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                {(data.incompleteReports || []).filter(r => r.status === 'pending').length}
              </span>
            </button>
          </div>
        </div>

        {/* Date Selector & Action Toolbar */}
        {activeSubTab === 'daily' && !activeReport && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            {/* Date Navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Ngày trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="pl-3 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                onClick={handleNextDay}
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

              <span className="text-xs font-semibold text-slate-600 ml-2 hidden sm:inline">
                {formatDateDisplay(selectedDate)}
              </span>
            </div>

            {/* Right Buttons: Add Make-up Class */}
            {isManager && (
              <button
                onClick={() => setShowMakeupModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Bổ sung lớp học bù</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          SUB-TAB 1: DAILY MANAGEMENT INTERFACE
         ======================================================== */}
      {activeSubTab === 'daily' && !activeReport && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
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

              {/* Class Filter */}
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="all">Tất cả lớp học</option>
                {data.classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="not_started">Chưa bắt đầu</option>
                <option value="in_progress">Đang thực hiện</option>
                <option value="submitted">Đã nộp</option>
                <option value="completed">Đã hoàn thành</option>
              </select>

              {/* Lock Filter */}
              <select
                value={lockFilter}
                onChange={e => setLockFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="all">Tất cả tình trạng khóa</option>
                <option value="open">Đang mở (Open)</option>
                <option value="locked">Đã khóa sổ (Locked)</option>
              </select>
            </div>

            <div className="text-slate-500 font-medium">
              Tìm thấy: <strong>{filteredReports.length}</strong> lớp học trong ngày
            </div>
          </div>

          {/* Table of Daily Classes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Lớp học (Class)</th>
                    <th className="py-3 px-4">Ca học & Phòng</th>
                    <th className="py-3 px-4">Giáo viên phụ trách</th>
                    <th className="py-3 px-4">Tiến độ bài học</th>
                    <th className="py-3 px-4 text-center">Tiến độ nhập báo cáo</th>
                    <th className="py-3 px-4 text-center">Tình trạng khóa</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredReports.length > 0 ? (
                    filteredReports.map(rep => {
                      const isComplete = rep.status === 'completed';
                      const isMakeup = rep.sessionType === 'makeup';

                      return (
                        <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Class Name */}
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{rep.className}</span>
                              {isMakeup && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold tracking-wider">
                                  HỌC BÙ
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Time & Room */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>{rep.scheduledTime}</div>
                            <div className="text-[11px] text-slate-400">{rep.classroom}</div>
                          </td>

                          {/* Teacher & TA */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800">{rep.teacherName}</div>
                            {rep.teachingAssistantName && (
                              <div className="text-[11px] text-slate-400">T.A: {rep.teachingAssistantName}</div>
                            )}
                          </td>

                          {/* Lesson Progress */}
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                              {rep.lessonProgress || 'Chưa cập nhật'}
                            </span>
                          </td>

                          {/* Report Status & Progress */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                  rep.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : rep.status === 'submitted'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : rep.status === 'in_progress'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {rep.status === 'completed' && 'Đã hoàn thành'}
                                {rep.status === 'submitted' && 'Đã nộp báo cáo'}
                                {rep.status === 'in_progress' && `Đang nhập (${rep.completedStudents}/${rep.totalStudents})`}
                                {rep.status === 'not_started' && 'Chưa bắt đầu'}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {rep.completedStudents}/{rep.totalStudents} học sinh ({rep.completionPercentage}%)
                              </div>
                            </div>
                          </td>

                          {/* Lock Status */}
                          <td className="py-3.5 px-4 text-center">
                            {rep.locked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <Lock className="w-3 h-3 text-rose-600" />
                                Đã khóa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Unlock className="w-3 h-3 text-emerald-600" />
                                Đang mở
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open Report */}
                              <button
                                onClick={() => handleOpenReport(rep)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold transition-colors flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Nhập/Sửa</span>
                              </button>

                              {/* Parent Preview */}
                              <button
                                onClick={() => handleOpenParentPreview(rep)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-1"
                                title="Xem bản báo cáo phụ huynh"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Bản PH</span>
                              </button>

                              {/* Lock Toggle (Manager only) */}
                              {isManager && (
                                <button
                                  onClick={() => handleToggleLock(rep)}
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    rep.locked
                                      ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                                      : 'text-slate-600 hover:bg-slate-100 border-slate-200'
                                  }`}
                                  title={rep.locked ? 'Bấm để mở khóa sổ' : 'Bấm để khóa sổ báo cáo'}
                                >
                                  {rep.locked ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4 text-slate-500" />}
                                </button>
                              )}

                              {/* Delete Makeup */}
                              {isManager && isMakeup && (
                                <button
                                  onClick={() => handleDeleteMakeup(rep.id.replace('LR-MAKEUP-', ''))}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                  title="Xóa lớp học bù"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <div className="font-semibold text-slate-600">Không có lịch học nào trong ngày này</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Chọn ngày khác hoặc bấm "+ Bổ sung lớp học bù" nếu có lịch học phát sinh.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: INCOMPLETE REPORTS TRACKING (CRITICAL FEATURE)
         ======================================================== */}
      {activeSubTab === 'incomplete' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-amber-800">Sổ Theo Dõi Báo Cáo Chưa Hoàn Thành</div>
              <p className="mt-0.5 text-amber-700 leading-relaxed">
                Hệ thống tự động ghi nhận vĩnh viễn các lớp chưa hoàn thành đủ nhận xét/bài tập ngay khi Quản lý học thuật thực hiện thao tác Khóa sổ. Dữ liệu này giúp Ban giám đốc và Quản lý học thuật theo dõi KPI và đôn đốc giáo viên hoàn thiện báo cáo phụ huynh.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Ngày học</th>
                    <th className="py-3 px-4">Lớp học</th>
                    <th className="py-3 px-4">Giáo viên phụ trách</th>
                    <th className="py-3 px-4 text-center">Tiến độ lúc khóa</th>
                    <th className="py-3 px-4">Thông tin còn thiếu</th>
                    <th className="py-3 px-4">Thời gian khóa</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {(data.incompleteReports || []).length > 0 ? (
                    (data.incompleteReports || []).map(inc => (
                      <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{inc.teachingDate}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{inc.className}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{inc.teacherName}</td>
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" /> Đã bổ sung xong
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3" /> Chưa hoàn thành
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              const rep = (data.lessonReports || []).find(r => r.id === inc.reportId);
                              if (rep) {
                                setActiveSubTab('daily');
                                setSelectedDate(inc.teachingDate);
                                handleOpenReport(rep);
                              } else {
                                showToast('Không tìm thấy bản báo cáo gốc.', 'error');
                              }
                            }}
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold transition-colors"
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
        </div>
      )}

      {/* ========================================================
          CLASS REPORT EDITOR OR PARENT PREVIEW
         ======================================================== */}
      {activeReport && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-lg overflow-hidden">
          {/* Top Controls Toolbar */}
          <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveReport(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại danh sách</span>
              </button>

              <div className="text-xs text-slate-300">
                Lớp: <strong className="text-white">{activeReport.className}</strong> &bull; Ngày: <strong className="text-white">{activeReport.teachingDate}</strong>
              </div>
            </div>

            {/* Right action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle Preview / Edit */}
              <button
                onClick={() => setShowParentPreview(!showParentPreview)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  showParentPreview
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showParentPreview ? 'Quay lại chỉnh sửa' : 'Xem bản Phụ huynh (Chụp ảnh)'}</span>
              </button>

              {/* Export Word */}
              <button
                onClick={() => handleExportWord(activeReport)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Xuất file Word (.docx)"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Word</span>
              </button>

              {/* Export Excel */}
              <button
                onClick={() => handleExportExcel(activeReport)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Xuất file Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel</span>
              </button>

              {/* Print */}
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In</span>
              </button>

              {/* Lock Toggle (Manager only) */}
              {isManager && (
                <button
                  onClick={() => handleToggleLock(activeReport)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    activeReport.locked
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {activeReport.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{activeReport.locked ? 'Mở khóa' : 'Khóa sổ'}</span>
                </button>
              )}

              {/* Save Button */}
              {!activeReport.locked && (
                <button
                  onClick={handleSaveActiveReport}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu báo cáo</span>
                </button>
              )}

              {/* Submit Button */}
              {!activeReport.locked && isTeacher && (
                <button
                  onClick={handleSubmitActiveReport}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Nộp báo cáo</span>
                </button>
              )}
            </div>
          </div>

          {/* Locked Alert Banner */}
          {activeReport.locked && (
            <div className="bg-rose-50 border-b border-rose-200 p-4 flex items-center justify-between text-xs text-rose-800 print:hidden">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>REPORT LOCKED:</strong> Báo cáo này đã được Quản lý học thuật khóa sổ vào {activeReport.lockedAt} bởi {activeReport.lockedBy}. Vui lòng liên hệ Quản lý học thuật nếu cần mở khóa chỉnh sửa.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================
              MODE A: PARENT REPORT PREVIEW (SCREENSHOT-FRIENDLY LAYOUT)
             ======================================================== */}
          {showParentPreview ? (
            <div className="p-8 md:p-12 bg-white text-slate-900 font-serif print:p-0">
              {/* Document Header */}
              <div className="text-center mb-6 space-y-1">
                <h1 className="text-lg md:text-2xl font-bold tracking-tight text-red-600 uppercase font-serif">
                  BÁO CÁO TÌNH HÌNH HỌC TẬP CỦA LỚP {activeReport.className.toUpperCase()}
                </h1>
                <h2 className="text-base md:text-lg font-bold text-slate-800 uppercase font-serif">
                  BUỔI HỌC NGÀY {activeReport.teachingDate.split('-').reverse().join('/')}
                </h2>
                <div className="text-sm md:text-base font-semibold text-blue-700 pt-1">
                  TIẾN ĐỘ BÀI HỌC: {activeReport.lessonProgress || 'Chưa cập nhật'}
                </div>
              </div>

              {/* 7-Column Parent Report Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-xs md:text-sm font-serif">
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold text-center">
                      <th className="border border-black p-2.5 w-24">Lớp</th>
                      <th className="border border-black p-2.5 w-44">Học viên</th>
                      <th className="border border-black p-2.5 w-32">Tình hình làm BVN</th>
                      <th className="border border-black p-2.5 w-32">Tình hình học bài cũ</th>
                      <th className="border border-black p-2.5 min-w-[200px]">Nhận xét</th>
                      <th className="border border-black p-2.5 min-w-[160px]">Giao BVN</th>
                      <th className="border border-black p-2.5 min-w-[140px]">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReport.studentReports.map((student, idx) => (
                      <tr key={student.studentId} className="align-middle">
                        {/* Class Column: Merged appearance */}
                        {idx === 0 ? (
                          <td
                            rowSpan={activeReport.studentReports.length}
                            className="border border-black p-2.5 text-center font-bold text-slate-900 bg-white align-middle"
                          >
                            {activeReport.className}
                          </td>
                        ) : null}

                        {/* Student Name */}
                        <td className="border border-black p-2.5 font-bold text-slate-900">
                          {student.studentName}
                        </td>

                        {/* Homework Status */}
                        <td className="border border-black p-2.5 text-center font-medium">
                          {student.homeworkStatus || '—'}
                        </td>

                        {/* Previous Lesson Status */}
                        <td className="border border-black p-2.5 text-center font-medium">
                          {student.previousLessonStatus || '—'}
                        </td>

                        {/* Comments */}
                        <td className="border border-black p-2.5 whitespace-pre-line text-left leading-relaxed">
                          {student.comments || '—'}
                        </td>

                        {/* Assigned Homework */}
                        <td className="border border-black p-2.5 whitespace-pre-line text-left leading-relaxed">
                          {student.assignedHomework || '—'}
                        </td>

                        {/* Notes (Test Scores, etc.) */}
                        <td className="border border-black p-2.5 whitespace-pre-line text-left leading-relaxed font-semibold text-red-600">
                          {student.notes || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Document Footer Signature */}
              <div className="mt-8 pt-4 flex items-center justify-between text-xs text-slate-500 font-sans border-t border-slate-100">
                <div>Trung tâm Anh ngữ LeeGo Center &bull; www.leego.edu.vn</div>
                <div>Giáo viên phụ trách: {activeReport.teacherName}</div>
              </div>
            </div>
          ) : (
            /* ========================================================
                MODE B: TEACHER INPUT & EDITOR FORM
               ======================================================== */
            <div className="p-6 space-y-6">
              {/* Header Info & Progress */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {activeReport.className} – Buổi học ngày {activeReport.teachingDate.split('-').reverse().join('/')}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">GV: {activeReport.teacherName}</span>
                    {activeReport.teachingAssistantName && (
                      <span className="text-slate-500">(TA: {activeReport.teachingAssistantName})</span>
                    )}
                  </div>

                  {/* Editable Lesson Progress Line */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="font-bold text-slate-700">TIẾN ĐỘ BÀI HỌC:</span>
                    {!activeReport.locked ? (
                      <input
                        type="text"
                        value={activeReport.lessonProgress}
                        onChange={e =>
                          setActiveReport({ ...activeReport, lessonProgress: e.target.value })
                        }
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-blue-700 text-xs focus:ring-2 focus:ring-blue-500 w-72"
                        placeholder="Ví dụ: Unit 3 – Lesson 2, Revision 1..."
                      />
                    ) : (
                      <span className="font-bold text-blue-700 text-sm">{activeReport.lessonProgress}</span>
                    )}
                  </div>
                </div>

                {/* Completion Progress Metric */}
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-700">
                    Tiến độ hoàn thành: <strong className="text-blue-600">{activeReport.completedStudents}/{activeReport.totalStudents}</strong> học sinh
                  </div>
                  <div className="w-48 h-2 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        activeReport.completionPercentage === 100
                          ? 'bg-emerald-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${activeReport.completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 7-Column Input Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                      <th className="p-3 w-12 text-center">STT</th>
                      <th className="p-3 w-40">Học viên</th>
                      <th className="p-3 w-36">Tình hình làm BVN</th>
                      <th className="p-3 w-36">Học bài cũ</th>
                      <th className="p-3 min-w-[220px]">Nhận xét của giáo viên</th>
                      <th className="p-3 min-w-[180px]">Giao BVN</th>
                      <th className="p-3 min-w-[150px]">Ghi chú (Điểm thi)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {activeReport.studentReports.map((student, idx) => {
                      const isComplete = Boolean(
                        student.homeworkStatus &&
                        student.previousLessonStatus &&
                        student.comments.trim().length > 0
                      );

                      return (
                        <tr
                          key={student.studentId}
                          className={`hover:bg-slate-50 transition-colors ${
                            !isComplete ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* STT */}
                          <td className="p-3 text-center text-slate-400 font-semibold">{idx + 1}</td>

                          {/* Student Name */}
                          <td className="p-3 font-bold text-slate-900">
                            <div>{student.studentName}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{student.studentId}</div>
                          </td>

                          {/* Homework Status */}
                          <td className="p-3">
                            <select
                              disabled={activeReport.locked}
                              value={student.homeworkStatus}
                              onChange={e => {
                                const next = [...activeReport.studentReports];
                                next[idx].homeworkStatus = e.target.value as HomeworkStatus;
                                next[idx].completed = Boolean(
                                  next[idx].homeworkStatus &&
                                  next[idx].previousLessonStatus &&
                                  next[idx].comments.trim()
                                );
                                setActiveReport({ ...activeReport, studentReports: next });
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                            >
                              <option value="Đạt">Đạt</option>
                              <option value="Chưa đạt">Chưa đạt</option>
                              <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                              <option value="Không giao BVN">Không giao BVN</option>
                            </select>
                          </td>

                          {/* Previous Lesson Status */}
                          <td className="p-3">
                            <select
                              disabled={activeReport.locked}
                              value={student.previousLessonStatus}
                              onChange={e => {
                                const next = [...activeReport.studentReports];
                                next[idx].previousLessonStatus = e.target.value as PreviousLessonStatus;
                                next[idx].completed = Boolean(
                                  next[idx].homeworkStatus &&
                                  next[idx].previousLessonStatus &&
                                  next[idx].comments.trim()
                                );
                                setActiveReport({ ...activeReport, studentReports: next });
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                            >
                              <option value="Đạt">Đạt</option>
                              <option value="Chưa đạt">Chưa đạt</option>
                              <option value="Chưa thuộc bài">Chưa thuộc bài</option>
                              <option value="Chưa chuẩn bị">Chưa chuẩn bị</option>
                            </select>
                          </td>

                          {/* Comments */}
                          <td className="p-3">
                            <textarea
                              disabled={activeReport.locked}
                              rows={2}
                              value={student.comments}
                              onChange={e => {
                                const next = [...activeReport.studentReports];
                                next[idx].comments = e.target.value;
                                next[idx].completed = Boolean(
                                  next[idx].homeworkStatus &&
                                  next[idx].previousLessonStatus &&
                                  next[idx].comments.trim()
                                );
                                setActiveReport({ ...activeReport, studentReports: next });
                              }}
                              placeholder="Nhập nhận xét chi tiết cho học viên..."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                            />
                          </td>

                          {/* Assigned Homework */}
                          <td className="p-3">
                            <textarea
                              disabled={activeReport.locked}
                              rows={2}
                              value={student.assignedHomework}
                              onChange={e => {
                                const next = [...activeReport.studentReports];
                                next[idx].assignedHomework = e.target.value;
                                setActiveReport({ ...activeReport, studentReports: next });
                              }}
                              placeholder="Bài tập về nhà..."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                            />
                          </td>

                          {/* Notes (Test Scores, etc.) */}
                          <td className="p-3">
                            <textarea
                              disabled={activeReport.locked}
                              rows={2}
                              value={student.notes}
                              onChange={e => {
                                const next = [...activeReport.studentReports];
                                next[idx].notes = e.target.value;
                                setActiveReport({ ...activeReport, studentReports: next });
                              }}
                              placeholder="Điểm thi Speaking, Written..."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-red-600 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Submit/Save Actions */}
              {!activeReport.locked && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={handleSaveActiveReport}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu bản nháp</span>
                  </button>

                  <button
                    onClick={handleSubmitActiveReport}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Nộp báo cáo chính thức</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: ADD MAKE-UP CLASS (BỔ SUNG LỚP HỌC BÙ)
         ======================================================== */}
      {showMakeupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bổ sung lớp học bù (Make-up Class)</h3>
                  <p className="text-xs text-slate-400">Tạo buổi học bù ngoài thời khóa biểu cố định</p>
                </div>
              </div>
              <button
                onClick={() => setShowMakeupModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMakeup} className="space-y-3.5 text-xs">
              {/* Select Class */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chọn lớp học bù <span className="text-red-500">*</span>
                </label>
                <select
                  value={makeupForm.classId}
                  onChange={e => {
                    const c = data.classes.find(cls => cls.id === e.target.value);
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
                  {data.classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày học bù <span className="text-red-500">*</span>
                  </label>
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
                    placeholder="18:00 - 19:30"
                  />
                </div>
              </div>

              {/* Classroom */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phòng học</label>
                <input
                  type="text"
                  value={makeupForm.classroom}
                  onChange={e => setMakeupForm({ ...makeupForm, classroom: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Phòng 101 - Smart Room"
                />
              </div>

              {/* Teacher & TA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giáo viên phụ trách</label>
                  <select
                    value={makeupForm.teacherId}
                    onChange={e => setMakeupForm({ ...makeupForm, teacherId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {data.teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.vietnameseName || t.fullName}
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
                    {data.teachingAssistants.map(ta => (
                      <option key={ta.id} value={ta.id}>
                        {ta.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lesson Progress */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiến độ bài học dự kiến</label>
                <input
                  type="text"
                  value={makeupForm.lessonProgress}
                  onChange={e => setMakeupForm({ ...makeupForm, lessonProgress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-blue-700"
                  placeholder="Unit 2 – Lesson 2"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú lý do học bù</label>
                <input
                  type="text"
                  value={makeupForm.notes}
                  onChange={e => setMakeupForm({ ...makeupForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Lớp học bù buổi nghỉ lễ, thời tiết..."
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMakeupModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs"
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
