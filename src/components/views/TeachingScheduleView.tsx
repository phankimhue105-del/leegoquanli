import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Calendar,
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  Edit3,
  Copy,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Clock,
  User,
  UserCheck,
  BookOpen,
  Sparkles,
  RefreshCw,
  History,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  Save,
  CheckCircle2,
  Layers,
  MapPin,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import { MonthlyTeachingSchedule, TeachingSession } from '../../types';
import {
  exportTeachingScheduleToWord,
  exportTeachingScheduleToExcel,
  getClassWeeklySchedule,
  formatScheduleTimeSummary
} from '../../services/dataService';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export const TeachingScheduleView: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const {
    data,
    getScheduleByClassAndMonth,
    getSchedulesByClass,
    generateScheduleFromTimetable,
    saveTeachingSchedule,
    deleteTeachingSchedule,
    copyScheduleContent
  } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin';
  const canEdit = hasPermission('teaching_schedule.edit') || hasPermission('teaching_schedule.create');
  const canDelete = hasPermission('teaching_schedule.delete') || isAdmin;
  const canExport = hasPermission('teaching_schedule.export') || isAdmin;

  // Filter classes accessible to current user
  const availableClasses = useMemo(() => {
    const classesList = Array.isArray(data?.classes) ? data.classes : [];
    if (currentUser.role === 'teacher') {
      const teacherId = currentUser.teacherId;
      return classesList.filter(
        c => c.teacherId === teacherId || c.assistantTeacherId === teacherId
      );
    }
    return classesList;
  }, [data?.classes, currentUser]);

  // Selected Class, Month & Year (Default to CLS-STA-01, November 2026 as primary test case)
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return availableClasses[0]?.id || 'CLS-STA-01';
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Active schedule being viewed/edited
  const [currentSchedule, setCurrentSchedule] = useState<MonthlyTeachingSchedule | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Modals & Panels
  const [editingSession, setEditingSession] = useState<TeachingSession | null>(null);
  const [editingSessionIndex, setEditingSessionIndex] = useState<number>(-1);
  const [showCopyModal, setShowCopyModal] = useState<boolean>(false);
  const [copySourceId, setCopySourceId] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState<boolean>(false);
  const [showClassInfoModal, setShowClassInfoModal] = useState<boolean>(false);

  // Class info edit state
  const [headerInfoEdit, setHeaderInfoEdit] = useState({
    teacherName: '',
    teachingAssistantName: '',
    defaultTime: '',
    defaultClassroom: '',
    courseBook: ''
  });

  // New session modal state
  const [newSessionData, setNewSessionData] = useState({
    date: '2026-11-06',
    teacherName: 'Foreign teacher',
    teachingAssistantName: 'Thiên',
    time: '7:30 – 9:00pm',
    classroom: '1A',
    lesson: 'Makeup Session',
    contents: '- Makeup teaching session\n- Additional speaking & review',
    notes: 'Extra session',
    notesHighlight: false
  });

  // Selected class object
  const currentClass = useMemo(() => {
    return data.classes.find(c => c.id === selectedClassId) || availableClasses[0];
  }, [data.classes, selectedClassId, availableClasses]);

  // All historical schedules for this class
  const classSchedules = useMemo(() => {
    if (!selectedClassId) return [];
    return getSchedulesByClass(selectedClassId);
  }, [selectedClassId, data.teachingSchedules, getSchedulesByClass]);

  // Load or generate schedule when selection changes
  useEffect(() => {
    if (!selectedClassId) return;

    const existing = getScheduleByClassAndMonth(selectedClassId, selectedMonth, selectedYear);
    if (existing) {
      setCurrentSchedule(existing);
      setHasUnsavedChanges(false);
      setHeaderInfoEdit({
        teacherName: existing.teacherName,
        teachingAssistantName: existing.teachingAssistantName || '',
        defaultTime: existing.defaultTime,
        defaultClassroom: existing.defaultClassroom,
        courseBook: existing.courseBook
      });
    } else {
      // Auto-generate based on timetable
      const generated = generateScheduleFromTimetable(selectedClassId, selectedMonth, selectedYear);
      setCurrentSchedule(generated);
      setHasUnsavedChanges(true); // mark unsaved so user can save or modify
      setHeaderInfoEdit({
        teacherName: generated.teacherName,
        teachingAssistantName: generated.teachingAssistantName || '',
        defaultTime: generated.defaultTime,
        defaultClassroom: generated.defaultClassroom,
        courseBook: generated.courseBook
      });
    }
  }, [selectedClassId, selectedMonth, selectedYear, data.teachingSchedules]);

  // Warn if leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && canEdit) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, canEdit]);

  // Action: Save Current Schedule
  const handleSaveSchedule = () => {
    if (!currentSchedule) return;
    if (!canEdit) {
      showToast('Bạn không có quyền lưu hoặc chỉnh sửa Lịch giảng dạy.', 'error');
      return;
    }

    const res = saveTeachingSchedule(currentSchedule);
    if (res.success && res.schedule) {
      setCurrentSchedule(res.schedule);
      setHasUnsavedChanges(false);
      showToast(`Đã lưu thành công Lịch giảng dạy Tháng ${currentSchedule.month}/${currentSchedule.year}!`, 'success');
    } else {
      showToast(res.error || 'Lỗi khi lưu lịch giảng dạy.', 'error');
    }
  };

  // Action: Regenerate from Timetable
  const handleRegenerateFromTimetable = () => {
    if (!canEdit) return;
    if (
      window.confirm(
        `Tự động tạo lại lịch Tháng ${selectedMonth}/${selectedYear} từ thời khóa biểu chuẩn của lớp?\n(Nội dung các buổi đã sửa sẽ được làm mới lại theo thời khóa biểu)`
      )
    ) {
      const generated = generateScheduleFromTimetable(selectedClassId, selectedMonth, selectedYear);
      setCurrentSchedule(generated);
      setHasUnsavedChanges(true);
      showToast(`Đã tự động tạo lại ${generated.sessions.length} buổi học từ Thời khóa biểu.`, 'info');
    }
  };

  // Action: Delete Schedule
  const handleDeleteSchedule = () => {
    if (!currentSchedule) return;
    if (!canDelete) {
      showToast('Chỉ Quản trị viên (Admin) hoặc tài khoản được cấp quyền mới có thể xóa Lịch giảng dạy.', 'error');
      return;
    }

    const res = deleteTeachingSchedule(currentSchedule.id);
    if (res.success) {
      showToast(`Đã xóa lịch giảng dạy Tháng ${currentSchedule.month}/${currentSchedule.year}.`, 'info');
      setShowDeleteConfirm(false);

      // Auto load next available or regenerate
      const remaining = classSchedules.filter(s => s.id !== currentSchedule.id);
      if (remaining.length > 0) {
        setSelectedMonth(remaining[0].month);
        setSelectedYear(remaining[0].year);
      } else {
        const fresh = generateScheduleFromTimetable(selectedClassId, selectedMonth, selectedYear);
        setCurrentSchedule(fresh);
        setHasUnsavedChanges(false);
      }
    } else {
      showToast(res.error || 'Lỗi khi xóa lịch.', 'error');
    }
  };

  // Action: Copy previous month
  const handleExecuteCopy = () => {
    if (!copySourceId) {
      showToast('Vui lòng chọn tháng nguồn để sao chép', 'error');
      return;
    }
    const copied = copyScheduleContent(copySourceId, selectedMonth, selectedYear);
    if (copied) {
      setCurrentSchedule(copied);
      setHasUnsavedChanges(true);
      setShowCopyModal(false);
      showToast(
        `Đã sao chép cấu trúc bài giảng vào Tháng ${selectedMonth}/${selectedYear}. Vui lòng kiểm tra và bấm "Lưu lịch"!`,
        'success'
      );
    } else {
      showToast('Không thể sao chép lịch đã chọn.', 'error');
    }
  };

  // Action: Export Word (.docx)
  const handleExportWord = async () => {
    if (!currentSchedule) return;
    try {
      setIsExporting(true);
      await exportTeachingScheduleToWord(currentSchedule);
      showToast('Đã xuất file Word (.docx) khổ ngang thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xuất tài liệu Word.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Action: Export Excel (.xlsx)
  const handleExportExcel = () => {
    if (!currentSchedule) return;
    try {
      setIsExporting(true);
      exportTeachingScheduleToExcel(currentSchedule);
      showToast('Đã xuất file Excel (.xlsx) bảng ngang thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xuất bảng tính Excel.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Action: Print Preview
  const handlePrint = () => {
    window.print();
  };

  // Session Editor Handlers
  const handleOpenEditSession = (session: TeachingSession, index: number) => {
    if (!canEdit) {
      showToast('Chế độ xem giáo viên: Không thể chỉnh sửa nội dung buổi dạy.', 'info');
      return;
    }
    setEditingSession({ ...session });
    setEditingSessionIndex(index);
  };

  const handleSaveSessionEdit = () => {
    if (!currentSchedule || !editingSession || editingSessionIndex < 0) return;

    const nextSessions = [...currentSchedule.sessions];
    nextSessions[editingSessionIndex] = editingSession;

    setCurrentSchedule({
      ...currentSchedule,
      sessions: nextSessions
    });
    setHasUnsavedChanges(true);
    setEditingSession(null);
    setEditingSessionIndex(-1);
    showToast(`Đã cập nhật buổi dạy ${editingSession.dateOrdinal}!`, 'success');
  };

  const handleNextSession = () => {
    if (!currentSchedule || editingSessionIndex < 0) return;
    if (editingSessionIndex < currentSchedule.sessions.length - 1) {
      // Save current before advancing
      const nextSessions = [...currentSchedule.sessions];
      if (editingSession) {
        nextSessions[editingSessionIndex] = editingSession;
        setCurrentSchedule({ ...currentSchedule, sessions: nextSessions });
        setHasUnsavedChanges(true);
      }
      const nextIdx = editingSessionIndex + 1;
      setEditingSessionIndex(nextIdx);
      setEditingSession({ ...nextSessions[nextIdx] });
    }
  };

  const handlePrevSession = () => {
    if (!currentSchedule || editingSessionIndex <= 0) return;
    const nextSessions = [...currentSchedule.sessions];
    if (editingSession) {
      nextSessions[editingSessionIndex] = editingSession;
      setCurrentSchedule({ ...currentSchedule, sessions: nextSessions });
      setHasUnsavedChanges(true);
    }
    const prevIdx = editingSessionIndex - 1;
    setEditingSessionIndex(prevIdx);
    setEditingSession({ ...nextSessions[prevIdx] });
  };

  // Add extra session
  const handleAddCustomSession = () => {
    if (!currentSchedule) return;
    const dateObj = new Date(newSessionData.date);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const jsDay = dateObj.getDay();
    const dayNum = dateObj.getDate();

    const getOrdinal = (n: number) => {
      if (n >= 11 && n <= 13) return `${n}th`;
      switch (n % 10) {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
      }
    };

    const newSession: TeachingSession = {
      sessionId: `SES-CUSTOM-${Date.now()}`,
      date: newSessionData.date,
      weekday: weekdays[jsDay],
      dateOrdinal: `${weekdays[jsDay]} ${getOrdinal(dayNum)}`,
      teacherId: '',
      teacherName: newSessionData.teacherName,
      teachingAssistantId: '',
      teachingAssistantName: newSessionData.teachingAssistantName,
      time: newSessionData.time,
      classroom: newSessionData.classroom,
      courseBook: currentSchedule.courseBook,
      lesson: newSessionData.lesson,
      contents: newSessionData.contents,
      notes: newSessionData.notes,
      notesHighlight: newSessionData.notesHighlight
    };

    // Insert and sort by date
    const updatedSessions = [...currentSchedule.sessions, newSession].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setCurrentSchedule({
      ...currentSchedule,
      sessions: updatedSessions
    });
    setHasUnsavedChanges(true);
    setShowAddSessionModal(false);
    showToast(`Đã thêm buổi học ${newSession.dateOrdinal} vào lịch!`, 'success');
  };

  // Delete a single session from month
  const handleDeleteSession = (index: number) => {
    if (!currentSchedule) return;
    if (window.confirm('Bạn có chắc muốn xóa buổi học này khỏi lịch tháng?')) {
      const updated = currentSchedule.sessions.filter((_, idx) => idx !== index);
      setCurrentSchedule({
        ...currentSchedule,
        sessions: updated
      });
      setHasUnsavedChanges(true);
      showToast('Đã xóa buổi học.', 'info');
    }
  };

  // Save class header info changes
  const handleSaveHeaderInfo = () => {
    if (!currentSchedule) return;
    setCurrentSchedule({
      ...currentSchedule,
      teacherName: headerInfoEdit.teacherName,
      teachingAssistantName: headerInfoEdit.teachingAssistantName,
      defaultTime: headerInfoEdit.defaultTime,
      defaultClassroom: headerInfoEdit.defaultClassroom,
      courseBook: headerInfoEdit.courseBook
    });
    setHasUnsavedChanges(true);
    setShowClassInfoModal(false);
    showToast('Đã cập nhật thông tin lớp học trên đầu lịch.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Workspace Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Class, Month & Year Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Class Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lớp học:</span>
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={e => {
                    if (hasUnsavedChanges) {
                      if (!window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đổi lớp khác?')) return;
                    }
                    setSelectedClassId(e.target.value);
                  }}
                  className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                >
                  {availableClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tháng:</span>
              <select
                value={selectedMonth}
                onChange={e => {
                  if (hasUnsavedChanges) {
                    if (!window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn chuyển tháng?')) return;
                  }
                  setSelectedMonth(Number(e.target.value));
                }}
                className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    Tháng {idx + 1} ({name})
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Năm:</span>
              <select
                value={selectedYear}
                onChange={e => {
                  if (hasUnsavedChanges) {
                    if (!window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn chuyển năm?')) return;
                  }
                  setSelectedYear(Number(e.target.value));
                }}
                className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {[2025, 2026, 2027, 2028].map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Unsaved Badge */}
            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Chưa lưu vào hệ thống
              </span>
            )}
            {!hasUnsavedChanges && currentSchedule && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                Đã lưu
              </span>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* History Selector */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Xem lịch sử các tháng đã lưu của lớp này"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Lịch sử tháng ({classSchedules.length})</span>
            </button>

            {/* Copy from previous month */}
            {canEdit && (
              <button
                onClick={() => {
                  if (classSchedules.length === 0) {
                    showToast('Lớp này chưa có tháng nào trước đó để sao chép', 'info');
                    return;
                  }
                  setCopySourceId(classSchedules[0]?.id || '');
                  setShowCopyModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="Sao chép nội dung bài giảng từ tháng khác"
              >
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Sao chép tháng</span>
              </button>
            )}

            {/* Regenerate from Timetable */}
            {canEdit && (
              <button
                onClick={handleRegenerateFromTimetable}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="Tự động tính toán lại các ngày dạy trong tháng từ thời khóa biểu"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Tạo lại từ TKB</span>
              </button>
            )}

            {/* Save Button */}
            {canEdit && (
              <button
                onClick={handleSaveSchedule}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all shadow-xs ${
                  hasUnsavedChanges
                    ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>Lưu lịch tháng</span>
              </button>
            )}

            {/* Delete Button */}
            {canDelete && currentSchedule && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                title="Xóa lịch tháng này"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span className="hidden sm:inline">Xóa</span>
              </button>
            )}
          </div>
        </div>

        {/* Export & Helper Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-600">
              <Calendar className="w-4 h-4 text-blue-500" />
              Tổng số buổi: <strong className="text-slate-800">{currentSchedule?.sessions?.length || 0} buổi</strong>
            </span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="hidden sm:flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              Giáo viên: <strong className="text-slate-700">{currentSchedule?.teacherName}</strong>
            </span>
            {isTeacher && (
              <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" />
                Quyền: Chỉ xem & Xuất tài liệu
              </span>
            )}
          </div>

          {/* Export Options */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 uppercase text-[11px]">Xuất tài liệu:</span>
            {/* Word Export */}
            <button
              onClick={handleExportWord}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors border border-blue-200"
              title="Xuất file Word (.docx) chuẩn khổ ngang, Times New Roman, border rõ nét"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Word (.docx)</span>
            </button>

            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium transition-colors border border-emerald-200"
              title="Xuất file Excel (.xlsx) bảng ngang tiện theo dõi"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel (.xlsx)</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              title="In trực tiếp"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>In</span>
            </button>

            {/* Add Extra Session button */}
            {canEdit && (
              <button
                onClick={() => setShowAddSessionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors border border-indigo-200"
                title="Thêm buổi học bù / tăng cường vào tháng"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Thêm buổi</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Document-Style Preview Container */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden p-6 md:p-8 print:p-0 print:border-none print:shadow-none">
        {/* Document Header Controls (Edit Class Information Button) */}
        {canEdit && (
          <div className="flex justify-end mb-2 print:hidden">
            <button
              onClick={() => setShowClassInfoModal(true)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Chỉnh sửa thông tin lớp / Sách
            </button>
          </div>
        )}

        {/* Document Header: Centered Red Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-red-600 uppercase font-serif">
            TEACHING SCHEDULE – {MONTH_NAMES[selectedMonth - 1]?.toUpperCase()}, {selectedYear}
          </h2>
        </div>

        {/* Document Class Information Header */}
        <div className="mb-6 font-serif text-slate-800 text-sm md:text-base border-b border-slate-200 pb-4 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div>
              <span className="font-bold">Class: </span>
              <span>{currentSchedule?.className || currentClass?.name}</span>
            </div>
            <div>
              <span className="font-bold">Teacher: </span>
              <span>{currentSchedule?.teacherName || 'Chưa phân công'}</span>
            </div>
            <div>
              <span className="font-bold">T.A: </span>
              <span>{currentSchedule?.teachingAssistantName || 'Không'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div>
              <span className="font-bold">Time: </span>
              <span>
                {currentSchedule?.defaultTime ||
                  (currentClass
                    ? formatScheduleTimeSummary(getClassWeeklySchedule(currentClass)) || currentClass.scheduleTime
                    : '') ||
                  '17:30 – 19:00'}
              </span>
            </div>
            <div>
              <span className="font-bold">Class Room: </span>
              <span>{currentSchedule?.defaultClassroom || currentClass?.classroom || 'Phòng 101'}</span>
            </div>
            <div>
              <span className="font-bold">Course book: </span>
              <span className="font-bold text-blue-700 uppercase">
                {currentSchedule?.courseBook || currentClass?.curriculum || 'GET READY FOR STARTERS'}
              </span>
            </div>
          </div>
        </div>

        {/* Horizontal Schedule Table */}
        {currentSchedule && Array.isArray(currentSchedule.sessions) && currentSchedule.sessions.length > 0 ? (
          <div className="overflow-x-auto pb-4 scrollbar-thin">
            <table className="w-full border-collapse border border-black font-serif text-slate-900 text-xs md:text-sm min-w-[760px]">
              <thead>
                {/* Date Row */}
                <tr className="bg-slate-100">
                  <th className="border border-black p-2.5 w-24 md:w-28 text-left font-bold text-slate-900 uppercase tracking-wider sticky left-0 bg-slate-100 z-1">
                    Date
                  </th>
                  {currentSchedule.sessions.map((session, idx) => (
                    <th
                      key={session.sessionId || idx}
                      className="border border-black p-2.5 text-center font-bold text-slate-900 min-w-[130px] md:min-w-[160px] relative group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{session.dateOrdinal || session.date}</span>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditSession(session, idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:text-blue-800 transition-opacity print:hidden"
                            title="Chỉnh sửa buổi học này"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Teacher Row */}
                <tr>
                  <td className="border border-black p-2.5 font-bold text-slate-900 sticky left-0 bg-white z-1">
                    Teacher
                  </td>
                  {currentSchedule.sessions.map((session, idx) => (
                    <td
                      key={`teacher-${idx}`}
                      onClick={() => canEdit && handleOpenEditSession(session, idx)}
                      className={`border border-black p-2.5 text-center ${
                        canEdit ? 'hover:bg-blue-50/50 cursor-pointer' : ''
                      }`}
                    >
                      {session.teacherName || '—'}
                    </td>
                  ))}
                </tr>

                {/* T.A Row */}
                <tr>
                  <td className="border border-black p-2.5 font-bold text-slate-900 sticky left-0 bg-white z-1">
                    T.A
                  </td>
                  {currentSchedule.sessions.map((session, idx) => (
                    <td
                      key={`ta-${idx}`}
                      onClick={() => canEdit && handleOpenEditSession(session, idx)}
                      className={`border border-black p-2.5 text-center ${
                        canEdit ? 'hover:bg-blue-50/50 cursor-pointer' : ''
                      }`}
                    >
                      {session.teachingAssistantName || ''}
                    </td>
                  ))}
                </tr>

                {/* Lesson Row */}
                <tr className="bg-slate-50/50">
                  <td className="border border-black p-2.5 font-bold text-slate-900 sticky left-0 bg-slate-50 z-1">
                    Lesson
                  </td>
                  {currentSchedule.sessions.map((session, idx) => (
                    <td
                      key={`lesson-${idx}`}
                      onClick={() => canEdit && handleOpenEditSession(session, idx)}
                      className={`border border-black p-2.5 text-center font-bold text-slate-800 whitespace-pre-line leading-relaxed ${
                        canEdit ? 'hover:bg-blue-50/50 cursor-pointer' : ''
                      }`}
                    >
                      {session.lesson || '—'}
                    </td>
                  ))}
                </tr>

                {/* Contents Row */}
                <tr>
                  <td className="border border-black p-2.5 font-bold text-slate-900 sticky left-0 bg-white z-1 align-top">
                    Contents
                  </td>
                  {currentSchedule.sessions.map((session, idx) => (
                    <td
                      key={`contents-${idx}`}
                      onClick={() => canEdit && handleOpenEditSession(session, idx)}
                      className={`border border-black p-2.5 align-top whitespace-pre-line text-slate-700 leading-relaxed text-left text-xs ${
                        canEdit ? 'hover:bg-blue-50/50 cursor-pointer' : ''
                      }`}
                    >
                      {session.contents || ''}
                    </td>
                  ))}
                </tr>

                {/* Notes Row */}
                <tr>
                  <td className="border border-black p-2.5 font-bold text-slate-900 sticky left-0 bg-white z-1 align-top">
                    Notes
                  </td>
                  {currentSchedule.sessions.map((session, idx) => {
                    const isRed =
                      session.notesHighlight ||
                      /test|speaking|important|red|đặc biệt/i.test(session.notes || '');
                    return (
                      <td
                        key={`notes-${idx}`}
                        onClick={() => canEdit && handleOpenEditSession(session, idx)}
                        className={`border border-black p-2.5 align-top whitespace-pre-line leading-relaxed text-left text-xs ${
                          isRed ? 'text-red-600 font-semibold' : 'text-slate-700'
                        } ${canEdit ? 'hover:bg-blue-50/50 cursor-pointer' : ''}`}
                      >
                        {session.notes || ''}
                      </td>
                    );
                  })}
                </tr>

                {/* Action Row for Editor (Hidden during Print) */}
                {canEdit && (
                  <tr className="bg-slate-50 print:hidden text-[11px]">
                    <td className="border border-black p-2 font-semibold text-slate-500 sticky left-0 bg-slate-50 z-1">
                      Thao tác
                    </td>
                    {currentSchedule.sessions.map((session, idx) => (
                      <td key={`action-${idx}`} className="border border-black p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditSession(session, idx)}
                            className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md font-sans text-xs transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteSession(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Xóa buổi này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">Chưa có lịch dạy trong tháng này</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Lớp {currentClass?.name} chưa có lịch giảng dạy cho Tháng {selectedMonth}/{selectedYear}.
            </p>
            {canEdit && (
              <button
                onClick={handleRegenerateFromTimetable}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tự động tạo lịch từ Thời khóa biểu</span>
              </button>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-sans print:mt-12">
          <div>
            <span>LeeGo Center Management &bull; Hệ thống Quản lý Kế hoạch Giảng dạy</span>
          </div>
          <div className="mt-2 sm:mt-0">
            <span>
              Người tạo / cập nhật: <strong className="text-slate-700">{currentSchedule?.updatedBy || currentUser.name}</strong>
              {currentSchedule?.updatedAt ? ` (${currentSchedule.updatedAt})` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL 1: EDIT TEACHING SESSION
         ======================================================== */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 md:p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Chỉnh sửa buổi học: {editingSession.dateOrdinal} ({editingSession.date})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Buổi số {editingSessionIndex + 1} / {currentSchedule?.sessions?.length || 0} trong Tháng {selectedMonth}/{selectedYear}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingSession(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-5 md:p-6 space-y-4">
              {/* Row 1: Teacher & Teaching Assistant */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giáo viên (Teacher) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editingSession.teacherName}
                      onChange={e => setEditingSession({ ...editingSession, teacherName: e.target.value })}
                      list="teacher-suggestions"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập tên giáo viên..."
                    />
                    <datalist id="teacher-suggestions">
                      <option value="Foreign teacher" />
                      <option value="Ms.D.Huyền" />
                      <option value="David Miller (GV Bản ngữ)" />
                      <option value="Sarah Jenkins (GV Bản ngữ)" />
                      <option value="Thầy Nguyễn Văn Minh" />
                      <option value="Cô Lê Thu Trang" />
                      <option value="Substitute teacher (GV Dạy thay)" />
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trợ giảng (T.A)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editingSession.teachingAssistantName || ''}
                      onChange={e =>
                        setEditingSession({ ...editingSession, teachingAssistantName: e.target.value })
                      }
                      list="ta-suggestions"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      placeholder="Tên trợ giảng hoặc để trống..."
                    />
                    <datalist id="ta-suggestions">
                      <option value="Thiên" />
                      <option value="Nguyễn Hoàng Thiên" />
                      <option value="Nguyễn Thảo Linh" />
                      <option value="Đỗ Anh Khoa" />
                      <option value="" />
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Row 2: Time & Classroom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ca học (Time)</label>
                  <input
                    type="text"
                    value={editingSession.time}
                    onChange={e => setEditingSession({ ...editingSession, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="7:30 – 9:00pm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng học (Classroom)</label>
                  <input
                    type="text"
                    value={editingSession.classroom}
                    onChange={e => setEditingSession({ ...editingSession, classroom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="1A"
                  />
                </div>
              </div>

              {/* Row 3: Lesson Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bài học (Lesson Title) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingSession.lesson}
                  onChange={e => setEditingSession({ ...editingSession, lesson: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Unit 1: I love animals, Revision 1, Test No. 1..."
                />
              </div>

              {/* Row 4: Contents */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nội dung giảng dạy (Contents)
                  </label>
                  {/* Quick templates */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">Mẫu nhanh:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingSession({
                          ...editingSession,
                          contents:
                            '- Vocabulary: Key words & Flashcards\n- Structure practice in pairs\n- Game: Interactive Quiz\n- Workbook exercise'
                        })
                      }
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md"
                    >
                      Bài học mới
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingSession({
                          ...editingSession,
                          contents:
                            '- Test No. 1\n- Speaking Test (60\')\n- Written Test (30\')\n- Correction: 20\'\n- New lesson: 60\'',
                          notes: '- Prepare for Speaking Test No. 1\n- Materials needed for speaking test',
                          notesHighlight: true
                        })
                      }
                      className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md font-medium"
                    >
                      Bài kiểm tra
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={editingSession.contents}
                  onChange={e => setEditingSession({ ...editingSession, contents: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="Nhập nội dung giảng dạy chi tiết theo từng gạch đầu dòng..."
                />
              </div>

              {/* Row 5: Notes & Highlight Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Ghi chú (Notes)</label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={editingSession.notesHighlight || false}
                      onChange={e =>
                        setEditingSession({ ...editingSession, notesHighlight: e.target.checked })
                      }
                      className="w-4 h-4 text-red-600 rounded-sm border-slate-300 focus:ring-red-500"
                    />
                    <span className="font-semibold text-red-600">Đánh dấu màu đỏ (Important / Test)</span>
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={editingSession.notes}
                  onChange={e => setEditingSession({ ...editingSession, notes: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                    editingSession.notesHighlight ? 'text-red-600 font-semibold border-red-200 bg-red-50/20' : 'text-slate-800'
                  }`}
                  placeholder="Ghi chú bài tập, chuẩn bị học liệu, phiếu thi Cambridge..."
                />
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevSession}
                  disabled={editingSessionIndex <= 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Buổi trước</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextSession}
                  disabled={!currentSchedule || editingSessionIndex >= (currentSchedule.sessions?.length || 0) - 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <span>Buổi sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveSessionEdit}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  Cập nhật buổi này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: COPY SCHEDULE FROM ANOTHER MONTH
         ======================================================== */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Sao chép cấu trúc lịch giảng dạy</h3>
                  <p className="text-xs text-slate-400">Sao chép nội dung bài học từ tháng đã lưu trước đó</p>
                </div>
              </div>
              <button
                onClick={() => setShowCopyModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-xs text-slate-600">
                Hệ thống sẽ giữ nguyên các ngày học chuẩn trong <strong>Tháng {selectedMonth}/{selectedYear}</strong> từ
                Thời khóa biểu, và điền lần lượt các bài học, nội dung và ghi chú từ tháng nguồn đã chọn.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn tháng nguồn muốn sao chép:
                </label>
                <select
                  value={copySourceId}
                  onChange={e => setCopySourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {classSchedules.map(sch => (
                    <option key={sch.id} value={sch.id}>
                      Tháng {sch.month}/{sch.year} – {sch.className} ({sch.sessions.length} buổi)
                    </option>
                  ))}
                </select>
              </div>

              {copySourceId && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-semibold text-slate-700">Xem trước bài học tháng nguồn:</div>
                  {(data?.teachingSchedules || [])
                    .find(s => s.id === copySourceId)
                    ?.sessions?.slice(0, 4)
                    .map((s, idx) => (
                      <div key={idx} className="text-slate-600 truncate">
                        &bull; {s.lesson || `Buổi ${idx + 1}`}
                      </div>
                    ))}
                  <div className="text-[11px] text-slate-400 italic">...và các buổi tiếp theo</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteCopy}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                Tiến hành sao chép
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: HISTORY OF SAVED MONTHS
         ======================================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Lịch sử các tháng đã lưu – Lớp {currentClass?.name}
                  </h3>
                  <p className="text-xs text-slate-400">Xem và mở lại các tháng giảng dạy trước đó</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {classSchedules.length > 0 ? (
                classSchedules.map(sch => (
                  <div
                    key={sch.id}
                    className="p-3.5 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 rounded-xl flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        Tháng {sch.month}, Năm {sch.year}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {sch.sessions.length} buổi học &bull; GV: {sch.teacherName} &bull; Cập nhật: {sch.updatedAt || sch.createdAt}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedMonth(sch.month);
                          setSelectedYear(sch.year);
                          setCurrentSchedule(sch);
                          setHasUnsavedChanges(false);
                          setShowHistoryModal(false);
                          showToast(`Đã mở Lịch giảng dạy Tháng ${sch.month}/${sch.year}`, 'info');
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        Mở lịch này
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Chưa có tháng nào được lưu cho lớp này.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: CONFIRM DELETE SCHEDULE
         ======================================================== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Xác nhận xóa lịch giảng dạy</h3>
                <p className="text-xs text-slate-500">Thao tác này chỉ dành cho Admin hoặc Quản lý được cấp quyền</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa toàn bộ lịch giảng dạy{' '}
              <strong>
                Tháng {selectedMonth}/{selectedYear} của lớp {currentSchedule?.className}
              </strong>
              ? Dữ liệu các buổi học đã lưu trong tháng này sẽ bị xóa khỏi cơ sở dữ liệu.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteSchedule}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: ADD EXTRA SESSION
         ======================================================== */}
      {showAddSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Thêm buổi học bổ trợ / bù</h3>
                  <p className="text-xs text-slate-400">Thêm một buổi học mới vào tháng này</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSessionModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày học (Date)</label>
                <input
                  type="date"
                  value={newSessionData.date}
                  onChange={e => setNewSessionData({ ...newSessionData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giáo viên</label>
                  <input
                    type="text"
                    value={newSessionData.teacherName}
                    onChange={e => setNewSessionData({ ...newSessionData, teacherName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trợ giảng</label>
                  <input
                    type="text"
                    value={newSessionData.teachingAssistantName}
                    onChange={e =>
                      setNewSessionData({ ...newSessionData, teachingAssistantName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên bài học (Lesson)</label>
                <input
                  type="text"
                  value={newSessionData.lesson}
                  onChange={e => setNewSessionData({ ...newSessionData, lesson: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung (Contents)</label>
                <textarea
                  rows={3}
                  value={newSessionData.contents}
                  onChange={e => setNewSessionData({ ...newSessionData, contents: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú (Notes)</label>
                <textarea
                  rows={2}
                  value={newSessionData.notes}
                  onChange={e => setNewSessionData({ ...newSessionData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddSessionModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAddCustomSession}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                Thêm buổi học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 6: EDIT CLASS HEADER INFORMATION
         ======================================================== */}
      {showClassInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Thông tin hiển thị đầu trang</h3>
                  <p className="text-xs text-slate-400">Cập nhật dòng tiêu đề thông tin lớp học</p>
                </div>
              </div>
              <button
                onClick={() => setShowClassInfoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giáo viên phụ trách chính (Teacher)
                </label>
                <input
                  type="text"
                  value={headerInfoEdit.teacherName}
                  onChange={e => setHeaderInfoEdit({ ...headerInfoEdit, teacherName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  placeholder="Ví dụ: Ms.D.Huyền – GVNN (Foreign teacher)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trợ giảng chính (T.A)
                </label>
                <input
                  type="text"
                  value={headerInfoEdit.teachingAssistantName}
                  onChange={e =>
                    setHeaderInfoEdit({ ...headerInfoEdit, teachingAssistantName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  placeholder="Ví dụ: Thiên"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ca học (Time)
                </label>
                <input
                  type="text"
                  value={headerInfoEdit.defaultTime}
                  onChange={e => setHeaderInfoEdit({ ...headerInfoEdit, defaultTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  placeholder="Ví dụ: 7:30 – 9:00pm, Monday/Thursday"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phòng học (Class Room)
                </label>
                <input
                  type="text"
                  value={headerInfoEdit.defaultClassroom}
                  onChange={e => setHeaderInfoEdit({ ...headerInfoEdit, defaultClassroom: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  placeholder="Ví dụ: 1A"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giáo trình / Sách học (Course book) <span className="text-blue-600 font-bold">(In chữ xanh)</span>
                </label>
                <input
                  type="text"
                  value={headerInfoEdit.courseBook}
                  onChange={e => setHeaderInfoEdit({ ...headerInfoEdit, courseBook: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-blue-700"
                  placeholder="Ví dụ: GET READY FOR STARTERS"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClassInfoModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveHeaderInfo}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                Cập nhật thông tin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
