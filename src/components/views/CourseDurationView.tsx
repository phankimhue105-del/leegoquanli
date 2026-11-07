import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Clock,
  Calendar,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RotateCcw,
  FileDown,
  BookOpen,
  UserCheck,
  ChevronRight,
  Info,
  X,
  Layers,
  History,
  CalendarCheck,
  ArrowRight,
  Calculator,
  ShieldAlert,
  HelpCircle,
  CalendarX,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import { exportCourseDurationsToExcel } from '../../services/dataService';
import {
  CourseDurationRecord,
  DurationMode,
  CourseStatus,
  ExtensionPolicy,
  CourseHoliday,
  CourseMakeupSession,
  HolidayType
} from '../../types';

export const CourseDurationView: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const {
    data,
    calculateCourseCompletionDate,
    addCourseDuration,
    updateCourseDuration,
    deleteCourseDuration,
    recalculateCourseDates,
    recalculateAllCourses,
    addCourseHoliday,
    updateCourseHoliday,
    deleteCourseHoliday,
    addCourseMakeup,
    updateCourseMakeup,
    deleteCourseMakeup,
    getCourseHistory
  } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const canManage = hasPermission('course_duration.create') || currentUser.role === 'admin' || currentUser.role === 'academic_manager';
  const canRecalculate = hasPermission('course_duration.recalculate') || currentUser.role === 'admin' || currentUser.role === 'academic_manager';
  const canManageHolidays = hasPermission('course_duration.manage_holidays') || currentUser.role === 'admin' || currentUser.role === 'academic_manager';
  const canManageMakeup = hasPermission('course_duration.manage_makeup') || currentUser.role === 'admin' || currentUser.role === 'academic_manager';

  // Navigation tab inside module
  const [activeTab, setActiveTab] = useState<'list' | 'simulator' | 'holidays' | 'makeups' | 'history'>('list');

  // Search & Filters for Course List
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAlert, setFilterAlert] = useState<'all' | '7days' | '30days' | 'overdue'>('all');

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDurationRecord | null>(null);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseDurationRecord | null>(null);

  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CourseHoliday | null>(null);

  const [showMakeupModal, setShowMakeupModal] = useState(false);
  const [editingMakeup, setEditingMakeup] = useState<CourseMakeupSession | null>(null);

  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [recalcCourseId, setRecalcCourseId] = useState<string | null>(null);
  const [recalcReason, setRecalcReason] = useState('');

  // Course Form State
  const [formCourseName, setFormCourseName] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formCourseBook, setFormCourseBook] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formDurationMode, setFormDurationMode] = useState<DurationMode>('months');
  const [formDurationValue, setFormDurationValue] = useState<number>(6);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [formExtensionPolicy, setFormExtensionPolicy] = useState<ExtensionPolicy>('scheduled_holidays');
  const [formRequiredSessions, setFormRequiredSessions] = useState<number>(72);
  const [formCompletedSessions, setFormCompletedSessions] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<CourseStatus>('in_progress');
  const [formNotes, setFormNotes] = useState('');
  const [previewCompletionDate, setPreviewCompletionDate] = useState('');
  const [previewExplanation, setPreviewExplanation] = useState('');

  // Simulator State
  const [simStartDate, setSimStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [simDurationMode, setSimDurationMode] = useState<DurationMode>('learning_sessions');
  const [simDurationValue, setSimDurationValue] = useState<number>(48);
  const [simClassId, setSimClassId] = useState<string>(data.classes[0]?.id || '');
  const [simExtensionPolicy, setSimExtensionPolicy] = useState<ExtensionPolicy>('scheduled_holidays');

  // Holiday Form State
  const [holidayName, setHolidayName] = useState('');
  const [holidayStartDate, setHolidayStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [holidayEndDate, setHolidayEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [holidayType, setHolidayType] = useState<HolidayType>('national');
  const [holidayReason, setHolidayReason] = useState('');
  const [holidayAffects, setHolidayAffects] = useState(true);
  const [holidayNotes, setHolidayNotes] = useState('');

  // Make-up Form State
  const [makeupClassId, setMakeupClassId] = useState(data.classes[0]?.id || '');
  const [makeupCourseDurationId, setMakeupCourseDurationId] = useState('');
  const [makeupOriginalDate, setMakeupOriginalDate] = useState('');
  const [makeupDate, setMakeupDate] = useState(new Date().toISOString().slice(0, 10));
  const [makeupTime, setMakeupTime] = useState('18:00 - 19:30');
  const [makeupClassroom, setMakeupClassroom] = useState('1A');
  const [makeupTeacherId, setMakeupTeacherId] = useState('');
  const [makeupReason, setMakeupReason] = useState('');
  const [makeupCountsProgress, setMakeupCountsProgress] = useState(true);
  const [makeupStatus, setMakeupStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');

  // Today reference
  const todayIso = new Date().toISOString().slice(0, 10);

  // Helper: calculate days remaining until a date
  const getDaysDiffFromToday = (targetDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
  };

  // Helper: format DD/MM/YYYY
  const formatVietnameseDate = (isoStr?: string): string => {
    if (!isoStr) return '--/--/----';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    let list = data.courseDurations || [];

    // Teacher visibility scoping
    if (isTeacher && currentUser.teacherId) {
      list = list.filter(c => c.teacherId === currentUser.teacherId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        c =>
          c.courseName.toLowerCase().includes(q) ||
          (c.className && c.className.toLowerCase().includes(q)) ||
          (c.courseBook && c.courseBook.toLowerCase().includes(q)) ||
          (c.teacherName && c.teacherName.toLowerCase().includes(q))
      );
    }

    if (filterClass !== 'all') {
      list = list.filter(c => c.classId === filterClass);
    }

    if (filterStatus !== 'all') {
      list = list.filter(c => c.status === filterStatus);
    }

    if (filterAlert === '7days') {
      list = list.filter(c => {
        const diff = getDaysDiffFromToday(c.currentExpectedCompletionDate);
        return diff >= 0 && diff <= 7 && c.status !== 'completed';
      });
    } else if (filterAlert === '30days') {
      list = list.filter(c => {
        const diff = getDaysDiffFromToday(c.currentExpectedCompletionDate);
        return diff >= 0 && diff <= 30 && c.status !== 'completed';
      });
    } else if (filterAlert === 'overdue') {
      list = list.filter(c => {
        const diff = getDaysDiffFromToday(c.currentExpectedCompletionDate);
        return diff < 0 && c.status !== 'completed';
      });
    }

    return list;
  }, [data.courseDurations, searchQuery, filterClass, filterStatus, filterAlert, isTeacher, currentUser]);

  // Statistics
  const stats = useMemo(() => {
    const list = data.courseDurations || [];
    const total = list.length;
    let nearComp = 0;
    let urgent7 = 0;
    let overdue = 0;
    let totalProgress = 0;

    list.forEach(c => {
      totalProgress += c.progressPercentage || 0;
      if (c.status !== 'completed') {
        const diff = getDaysDiffFromToday(c.currentExpectedCompletionDate);
        if (diff < 0) overdue++;
        else if (diff <= 7) urgent7++;
        else if (diff <= 30) nearComp++;
      }
    });

    const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0;
    return { total, nearComp, urgent7, overdue, avgProgress };
  }, [data.courseDurations]);

  // Handle Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setFormCourseName('');
    const firstClass = data.classes[0];
    setFormClassId(firstClass?.id || '');
    setFormCourseBook(firstClass?.curriculum || "Kid's Box");
    setFormTeacherId(firstClass?.teacherId || '');
    setFormDurationMode('months');
    setFormDurationValue(6);
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormExtensionPolicy('scheduled_holidays');
    setFormRequiredSessions(72);
    setFormCompletedSessions(0);
    setFormStatus('in_progress');
    setFormNotes('');

    // Precalculate initial preview
    const res = calculateCourseCompletionDate({
      startDate: new Date().toISOString().slice(0, 10),
      durationMode: 'months',
      durationValue: 6,
      classId: firstClass?.id,
      extensionPolicy: 'scheduled_holidays'
    });
    setPreviewCompletionDate(res.expectedCompletionDate);
    setPreviewExplanation(res.explanation);
    setShowCourseModal(true);
  };

  // Handle Open Edit Modal
  const handleOpenEditModal = (course: CourseDurationRecord) => {
    setEditingCourse(course);
    setFormCourseName(course.courseName);
    setFormClassId(course.classId || '');
    setFormCourseBook(course.courseBook || '');
    setFormTeacherId(course.teacherId || '');
    setFormDurationMode(course.durationMode);
    setFormDurationValue(course.durationValue);
    setFormStartDate(course.courseStartDate);
    setFormExtensionPolicy(course.extensionPolicy);
    setFormRequiredSessions(course.requiredSessions);
    setFormCompletedSessions(course.completedSessions);
    setFormStatus(course.status);
    setFormNotes(course.notes || '');
    setPreviewCompletionDate(course.currentExpectedCompletionDate);
    setPreviewExplanation(course.calculationExplanation || '');
    setShowCourseModal(true);
  };

  // Handle Live Auto-Calculate inside Form
  const handleRunFormCalculation = () => {
    const res = calculateCourseCompletionDate({
      startDate: formStartDate,
      durationMode: formDurationMode,
      durationValue: formDurationValue,
      classId: formClassId,
      extensionPolicy: formExtensionPolicy
    });
    setPreviewCompletionDate(res.expectedCompletionDate);
    setPreviewExplanation(res.explanation);
    if (formDurationMode === 'learning_sessions') {
      setFormRequiredSessions(formDurationValue);
    }
    showToast(`Đã tự động tính: Ngày kết thúc dự kiến ${formatVietnameseDate(res.expectedCompletionDate)}`, 'info');
  };

  // Save Course Modal
  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourseName.trim()) {
      showToast('Vui lòng nhập tên khóa học.', 'error');
      return;
    }

    const selectedCls = data.classes.find(c => c.id === formClassId);
    const selectedTeacher = data.teachers.find(t => t.id === formTeacherId);

    // Auto-calculate final date if not calculated yet
    let finalDate = previewCompletionDate;
    let finalExplanation = previewExplanation;
    if (!finalDate) {
      const res = calculateCourseCompletionDate({
        startDate: formStartDate,
        durationMode: formDurationMode,
        durationValue: formDurationValue,
        classId: formClassId,
        extensionPolicy: formExtensionPolicy
      });
      finalDate = res.expectedCompletionDate;
      finalExplanation = res.explanation;
    }

    const progressPercentage = formRequiredSessions > 0
      ? Math.min(100, Math.round((formCompletedSessions / formRequiredSessions) * 100))
      : 0;

    if (editingCourse) {
      const res = updateCourseDuration(
        editingCourse.id,
        {
          courseName: formCourseName,
          classId: formClassId,
          className: selectedCls?.name || editingCourse.className,
          courseBook: formCourseBook,
          teacherId: formTeacherId,
          teacherName: selectedTeacher?.fullName || editingCourse.teacherName,
          durationMode: formDurationMode,
          durationValue: Number(formDurationValue),
          courseStartDate: formStartDate,
          currentExpectedCompletionDate: finalDate,
          extensionPolicy: formExtensionPolicy,
          requiredSessions: Number(formRequiredSessions),
          completedSessions: Number(formCompletedSessions),
          progressPercentage,
          status: formStatus,
          notes: formNotes,
          calculationExplanation: finalExplanation
        },
        'Chỉnh sửa thông số khóa học và lịch học'
      );

      if (res.success) {
        showToast('Cập nhật khóa học thành công!', 'success');
        setShowCourseModal(false);
      } else {
        showToast(res.error || 'Có lỗi xảy ra', 'error');
      }
    } else {
      const res = addCourseDuration({
        courseName: formCourseName,
        classId: formClassId,
        className: selectedCls?.name || '',
        courseBook: formCourseBook,
        teacherId: formTeacherId,
        teacherName: selectedTeacher?.fullName || '',
        durationMode: formDurationMode,
        durationValue: Number(formDurationValue),
        courseStartDate: formStartDate,
        originalExpectedCompletionDate: finalDate,
        currentExpectedCompletionDate: finalDate,
        extensionPolicy: formExtensionPolicy,
        requiredSessions: Number(formRequiredSessions),
        completedSessions: Number(formCompletedSessions),
        progressPercentage,
        status: formStatus,
        notes: formNotes,
        calculationExplanation: finalExplanation
      });

      if (res.success) {
        showToast('Tạo khóa học mới thành công!', 'success');
        setShowCourseModal(false);
      } else {
        showToast(res.error || 'Có lỗi xảy ra', 'error');
      }
    }
  };

  // Handle Recalculate Course
  const handleTriggerRecalculate = (courseId: string) => {
    setRecalcCourseId(courseId);
    setRecalcReason('Tự động tính toán lại dựa trên thời khóa biểu và lịch nghỉ lễ cập nhật');
    setShowRecalcModal(true);
  };

  const handleConfirmRecalculate = () => {
    if (!recalcCourseId) return;
    const res = recalculateCourseDates(recalcCourseId, recalcReason);
    if (res.success) {
      showToast(`Đã tính toán lại thành công! Ngày hoàn thành mới: ${formatVietnameseDate(res.updatedDate)}`, 'success');
      setShowRecalcModal(false);
    } else {
      showToast(res.error || 'Có lỗi xảy ra', 'error');
    }
  };

  // Recalculate All
  const handleRecalculateAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn tính toán lại ngày kết thúc cho toàn bộ các khóa học đang theo dõi dựa trên thời khóa biểu và các ngày nghỉ lễ hiện tại?')) {
      const res = recalculateAllCourses();
      showToast(`Đã đồng bộ và tính toán lại cho ${res.updatedCount} khóa học!`, 'success');
    }
  };

  // Delete Course
  const handleDeleteCourse = (course: CourseDurationRecord) => {
    if (window.confirm(`Bạn có chắc muốn xóa bản ghi thời gian khóa học "${course.courseName}"? Lịch sử điều chỉnh cũng sẽ được dọn dẹp.`)) {
      const res = deleteCourseDuration(course.id);
      if (res.success) {
        showToast('Đã xóa khóa học thành công', 'info');
      } else {
        showToast(res.error || 'Có lỗi xảy ra', 'error');
      }
    }
  };

  // Simulator Calculation Live Result
  const simulatorResult = useMemo(() => {
    return calculateCourseCompletionDate({
      startDate: simStartDate,
      durationMode: simDurationMode,
      durationValue: simDurationValue,
      classId: simClassId,
      extensionPolicy: simExtensionPolicy
    });
  }, [simStartDate, simDurationMode, simDurationValue, simClassId, simExtensionPolicy, calculateCourseCompletionDate]);

  // Convert Simulator Result directly into a new Course Duration Record
  const handleConvertSimToCourse = () => {
    const selectedCls = data.classes.find(c => c.id === simClassId);
    setEditingCourse(null);
    setFormCourseName(`Khóa học ${selectedCls?.name || 'Mới'}`);
    setFormClassId(simClassId);
    setFormCourseBook(selectedCls?.curriculum || '');
    setFormTeacherId(selectedCls?.teacherId || '');
    setFormDurationMode(simDurationMode);
    setFormDurationValue(simDurationValue);
    setFormStartDate(simStartDate);
    setFormExtensionPolicy(simExtensionPolicy);
    setFormRequiredSessions(simDurationMode === 'learning_sessions' ? simDurationValue : 72);
    setFormCompletedSessions(0);
    setFormStatus('in_progress');
    setFormNotes(`Tạo từ công cụ mô phỏng tính toán ngày ${new Date().toLocaleDateString('vi-VN')}`);
    setPreviewCompletionDate(simulatorResult.expectedCompletionDate);
    setPreviewExplanation(simulatorResult.explanation);
    setShowCourseModal(true);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: CourseStatus) => {
    switch (status) {
      case 'not_started':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">Chưa bắt đầu</span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Đang học</span>;
      case 'near_completion':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">Sắp hoàn thành</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Đã hoàn thành</span>;
      case 'extended':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">Đã gia hạn</span>;
      case 'on_hold':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Tạm hoãn</span>;
      default:
        return null;
    }
  };

  // Policy Label Helper
  const getPolicyLabel = (p: ExtensionPolicy) => {
    switch (p) {
      case 'none': return 'Không gia hạn';
      case 'scheduled_holidays': return 'Gia hạn theo ngày lễ trung tâm';
      case 'all_non_study_days': return 'Gia hạn mọi ngày nghỉ';
      case 'missed_scheduled_lessons': return 'Gia hạn buổi nghỉ có phép';
      case 'custom': return 'Tùy chỉnh';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Actions */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-900/20 shrink-0">
              <CalendarRange className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  Quản Lý Thời Gian Khóa Học
                </h2>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                  Course Duration Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Tự động tính toán ngày hoàn thành khóa học dựa trên tháng lịch, ngày thực tế, thời khóa biểu và các kỳ nghỉ lễ. Quản lý lịch học bù không bị trùng lặp thời gian.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
            {canRecalculate && (
              <button
                onClick={handleRecalculateAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 text-xs font-semibold transition-colors"
                title="Tính toán và đồng bộ lại ngày hoàn thành cho tất cả các lớp"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Tính lại toàn bộ</span>
              </button>
            )}

            <button
              onClick={() => exportCourseDurationsToExcel(data.courseDurations || [])}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold transition-colors"
              title="Xuất bảng tổng hợp thời gian khóa học sang Microsoft Excel"
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            {canManage && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-700/30"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm khóa học</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Tổng số khóa học</span>
              <BookOpen className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-slate-800">
              {stats.total}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Lớp học đang quản lý</p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <div className="flex items-center justify-between text-amber-700 text-xs mb-1">
              <span>Sắp kết thúc (&lt; 30 ngày)</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-amber-900">
              {stats.nearComp}
            </div>
            <p className="text-[11px] text-amber-600 mt-0.5">Cần chuẩn bị thi / tái tuyển</p>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
            <div className="flex items-center justify-between text-rose-700 text-xs mb-1">
              <span>Cần gấp (&lt; 7 ngày / Quá hạn)</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-rose-900">
              {stats.urgent7 + stats.overdue}
            </div>
            <p className="text-[11px] text-rose-600 mt-0.5">
              {stats.overdue > 0 ? `${stats.overdue} khóa quá hạn` : 'Tiến độ bình thường'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="flex items-center justify-between text-emerald-700 text-xs mb-1">
              <span>Tiến độ trung bình</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-emerald-900">
              {stats.avgProgress}%
            </div>
            <p className="text-[11px] text-emerald-600 mt-0.5">Thời lượng chương trình</p>
          </div>
        </div>

        {/* 3. Alert Ribbon if any course finishes soon */}
        {(stats.urgent7 > 0 || stats.overdue > 0) && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Cảnh báo thời gian:</strong> Có {stats.urgent7 + stats.overdue} khóa học dự kiến hoàn thành trong vòng 7 ngày tới hoặc đã quá ngày dự kiến mà chưa hoàn tất thủ tục kết khóa.
              </span>
            </div>
            <button
              onClick={() => {
                setActiveTab('list');
                setFilterAlert('7days');
              }}
              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors shrink-0 text-[11px]"
            >
              Xem ngay
            </button>
          </div>
        )}
      </div>

      {/* 4. Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'list'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Danh Sách Khóa Học ({data.courseDurations?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'simulator'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Công Cụ Mô Phỏng &amp; Tính Toán</span>
        </button>

        <button
          onClick={() => setActiveTab('holidays')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'holidays'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CalendarX className="w-4 h-4" />
          <span>Quản Lý Ngày Nghỉ &amp; Lễ ({data.courseHolidays?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('makeups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'makeups'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Quản Lý Học Bù ({data.courseMakeups?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch Sử Điều Chỉnh ({data.courseDurationHistory?.length || 0})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DANH SÁCH KHÓA HỌC & TIẾN ĐỘ                                       */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm khóa học, giáo trình, lớp, GV..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto scrollbar-thin">
              {/* Filter Class */}
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tất cả lớp học</option>
                {data.classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="not_started">Chưa khai giảng</option>
                <option value="in_progress">Đang học</option>
                <option value="near_completion">Sắp hoàn thành</option>
                <option value="completed">Đã kết thúc</option>
                <option value="extended">Đã gia hạn</option>
                <option value="on_hold">Tạm dừng</option>
              </select>

              {/* Filter Alert */}
              <select
                value={filterAlert}
                onChange={e => setFilterAlert(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Mọi hạn hoàn thành</option>
                <option value="7days">Kết thúc trong 7 ngày</option>
                <option value="30days">Kết thúc trong 30 ngày</option>
                <option value="overdue">Đã quá ngày dự kiến</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Khóa Học &amp; Giáo Trình</th>
                    <th className="py-3 px-4">Lớp Học &amp; GV</th>
                    <th className="py-3 px-4">Ngày Bắt Đầu</th>
                    <th className="py-3 px-4">Thời Lượng</th>
                    <th className="py-3 px-4">Dự Kiến Hoàn Thành</th>
                    <th className="py-3 px-4 w-48">Tiến Độ Học Tập</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <CalendarRange className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <p className="font-medium text-slate-600">Không tìm thấy khóa học nào phù hợp</p>
                        <p className="text-[11px] text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc thêm khóa học mới</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map(course => {
                      const daysLeft = getDaysDiffFromToday(course.currentExpectedCompletionDate);
                      const isOverdue = daysLeft < 0 && course.status !== 'completed';
                      const isUrgent = daysLeft >= 0 && daysLeft <= 7 && course.status !== 'completed';
                      const isNear = daysLeft > 7 && daysLeft <= 30 && course.status !== 'completed';
                      const isExtended = course.currentExpectedCompletionDate !== course.originalExpectedCompletionDate;

                      return (
                        <tr key={course.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Course Name & Book */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span>{course.courseName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{course.courseBook || 'Giáo trình chuẩn'}</span>
                            </div>
                          </td>

                          {/* Class & Teacher */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">
                              {course.className || 'Chưa gán lớp'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{course.teacherName || 'Chưa phân công'}</span>
                            </div>
                          </td>

                          {/* Start Date */}
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {formatVietnameseDate(course.courseStartDate)}
                          </td>

                          {/* Duration Mode & Value */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">
                              {course.durationValue}{' '}
                              {course.durationMode === 'months' && 'tháng'}
                              {course.durationMode === 'calendar_days' && 'ngày lịch'}
                              {course.durationMode === 'learning_days' && 'ngày học'}
                              {course.durationMode === 'learning_sessions' && 'buổi học'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {getPolicyLabel(course.extensionPolicy)}
                            </div>
                          </td>

                          {/* Expected Completion Date */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono font-bold ${
                                isOverdue ? 'text-rose-600' : isUrgent ? 'text-amber-600' : 'text-slate-800'
                              }`}>
                                {formatVietnameseDate(course.currentExpectedCompletionDate)}
                              </span>

                              {isExtended && (
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded font-medium" title={`Ban đầu: ${formatVietnameseDate(course.originalExpectedCompletionDate)}`}>
                                  +Gia hạn
                                </span>
                              )}
                            </div>

                            {/* Relative countdown */}
                            <div className="text-[10px] mt-0.5">
                              {course.status === 'completed' ? (
                                <span className="text-emerald-600">Đã hoàn thành</span>
                              ) : isOverdue ? (
                                <span className="text-rose-600 font-semibold">Quá hạn {-daysLeft} ngày</span>
                              ) : isUrgent ? (
                                <span className="text-amber-600 font-semibold">Còn {daysLeft} ngày</span>
                              ) : isNear ? (
                                <span className="text-amber-600">Còn {daysLeft} ngày</span>
                              ) : (
                                <span className="text-slate-400">Còn {daysLeft} ngày</span>
                              )}
                            </div>
                          </td>

                          {/* Progress Bar & Sessions */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
                              <span className="text-slate-700">{course.completedSessions}/{course.requiredSessions} buổi</span>
                              <span className="text-indigo-600 font-bold">{course.progressPercentage}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  course.progressPercentage >= 100
                                    ? 'bg-emerald-500'
                                    : course.progressPercentage >= 75
                                    ? 'bg-indigo-600'
                                    : course.progressPercentage >= 40
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, course.progressPercentage)}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                              <span>Còn {course.remainingSessions} buổi</span>
                              {course.calculationExplanation && (
                                <span
                                  className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                                  title={course.calculationExplanation}
                                >
                                  Chi tiết
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            {renderStatusBadge(course.status)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setShowDetailsModal(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Xem chi tiết khóa học"
                              >
                                <Info className="w-4 h-4" />
                              </button>

                              {canRecalculate && (
                                <button
                                  onClick={() => handleTriggerRecalculate(course.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Tính lại ngày hoàn thành theo thời khóa biểu"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}

                              {canManage && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditModal(course)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="Chỉnh sửa khóa học"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteCourse(course)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Xóa khóa học"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
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

      {/* ========================================================================= */}
      {/* TAB 2: CÔNG CỤ MÔ PHỎNG & TÍNH TOÁN DỰ KIẾN (SIMULATOR)                   */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-5 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-base pb-3 border-b border-slate-100">
              <Calculator className="w-5 h-5 text-indigo-600" />
              <span>Thiết Lập Thông Số Tính Toán</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Mô phỏng tức thì ngày kết thúc khóa học khi thay đổi ngày bắt đầu, thời lượng hoặc thời khóa biểu của lớp mà không làm thay đổi dữ liệu hiện tại.
            </p>

            {/* Select Class */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Chọn Lớp Học (Thời khóa biểu nguồn)
              </label>
              <select
                value={simClassId}
                onChange={e => setSimClassId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {data.classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.scheduleDays || 'Chưa xếp TKB'})
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ngày Bắt Đầu Khóa Học
              </label>
              <input
                type="date"
                value={simStartDate}
                onChange={e => setSimStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Calculation Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phương Thức Thời Lượng (Duration Mode)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSimDurationMode('months');
                    setSimDurationValue(6);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    simDurationMode === 'months'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>Tháng Lịch (Months)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Quy tắc cuối tháng chuẩn</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimDurationMode('learning_sessions');
                    setSimDurationValue(48);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    simDurationMode === 'learning_sessions'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>Số Buổi Học (Sessions)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Dựa trên lịch học thực tế</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimDurationMode('learning_days');
                    setSimDurationValue(60);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    simDurationMode === 'learning_days'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>Ngày Học (Learning Days)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Chỉ tính ngày có buổi học</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimDurationMode('calendar_days');
                    setSimDurationValue(90);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    simDurationMode === 'calendar_days'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>Ngày Lịch (Calendar Days)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Tính liên tục theo ngày</div>
                </button>
              </div>
            </div>

            {/* Duration Value Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Thời Lượng Cần Đạt (
                {simDurationMode === 'months' && 'Số tháng: ví dụ 3, 6, 9, 12'}
                {simDurationMode === 'learning_sessions' && 'Số buổi học: ví dụ 36, 48, 72, 96'}
                {simDurationMode === 'learning_days' && 'Số ngày học thực tế'}
                {simDurationMode === 'calendar_days' && 'Số ngày lịch liên tục'}
                )
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={simDurationValue}
                onChange={e => setSimDurationValue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Extension Policy */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Chính Sách Gia Hạn (Extension Policy)
              </label>
              <select
                value={simExtensionPolicy}
                onChange={e => setSimExtensionPolicy(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="scheduled_holidays">Tự động kéo dài theo ngày nghỉ lễ trung tâm</option>
                <option value="all_non_study_days">Kéo dài theo mọi ngày nghỉ học</option>
                <option value="none">Không tự động kéo dài (Giữ nguyên ngày kết thúc)</option>
              </select>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={handleConvertSimToCourse}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Lưu kết quả này thành khóa học mới</span>
              </button>
            )}
          </div>

          {/* Results Display Panel */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">
                  Kết Quả Tính Toán Tự Động
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[11px] border border-indigo-400/30">
                  AI &amp; Timetable Synchronized
                </span>
              </div>

              <div>
                <p className="text-xs text-indigo-200 mb-1">Ngày Hoàn Thành Dự Kiến (Expected Completion Date):</p>
                <div className="text-3xl md:text-4xl font-extrabold text-white font-mono tracking-tight flex items-baseline gap-3">
                  <span>{formatVietnameseDate(simulatorResult.expectedCompletionDate)}</span>
                  <span className="text-xs font-normal text-indigo-200">
                    ({simulatorResult.totalDaysSpan} ngày lịch)
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-xs text-indigo-100 leading-relaxed">
                <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <span>Giải Thích Cách Tính:</span>
                </p>
                <p>{simulatorResult.explanation}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-indigo-300">Số buổi đạt</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {simulatorResult.scheduledSessionsCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-indigo-300">Trùng ngày nghỉ lễ</div>
                  <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                    {simulatorResult.holidaysEncounteredCount} buổi
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-indigo-300">Đã bù trừ</div>
                  <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                    {simulatorResult.makeupsCount} buổi
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown Calendar Sequence */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <span>Chi Tiết Phân Bổ Lịch Trình (Mẫu các buổi học gần đây &amp; ngày lễ)</span>
              </h3>

              <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                {simulatorResult.breakdownDates.slice(0, 30).map((b, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                      b.type === 'holiday_skipped'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : b.type === 'compensated_holiday'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : b.type === 'makeup'
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="font-mono font-semibold">{formatVietnameseDate(b.date)}</span>
                    <span className="text-[11px]">{b.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUẢN LÝ NGÀY NGHỈ & NGHỈ LỄ (HOLIDAYS)                            */}
      {/* ========================================================================= */}
      {activeTab === 'holidays' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Danh Mục Ngày Nghỉ Lễ &amp; Tạm Dừng Lớp</h3>
              <p className="text-xs text-slate-500">
                Các ngày nghỉ được kích hoạt sẽ tự động loại trừ khỏi thời khóa biểu của các lớp học trùng lịch.
              </p>
            </div>

            {canManageHolidays && (
              <button
                onClick={() => {
                  setEditingHoliday(null);
                  setHolidayName('');
                  setHolidayStartDate(new Date().toISOString().slice(0, 10));
                  setHolidayEndDate(new Date().toISOString().slice(0, 10));
                  setHolidayType('national');
                  setHolidayReason('');
                  setHolidayAffects(true);
                  setHolidayNotes('');
                  setShowHolidayModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm ngày nghỉ mới</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data.courseHolidays || []).map(h => (
              <div key={h.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 relative hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      h.holidayType === 'tet'
                        ? 'bg-red-100 text-red-700'
                        : h.holidayType === 'national'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {h.holidayType === 'tet' ? 'Tết Nguyên Đán' : h.holidayType === 'national' ? 'Lễ Quốc Gia' : 'Lễ Nội Bộ'}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm mt-1.5">{h.holidayName}</h4>
                  </div>

                  {canManageHolidays && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingHoliday(h);
                          setHolidayName(h.holidayName);
                          setHolidayStartDate(h.startDate);
                          setHolidayEndDate(h.endDate);
                          setHolidayType(h.holidayType);
                          setHolidayReason(h.reason || '');
                          setHolidayAffects(h.affectsScheduledLessons);
                          setHolidayNotes(h.notes || '');
                          setShowHolidayModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Sửa ngày nghỉ"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn xóa ngày nghỉ "${h.holidayName}"?`)) {
                            deleteCourseHoliday(h.id);
                            showToast('Đã xóa ngày nghỉ', 'info');
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Xóa ngày nghỉ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Từ ngày:</span>
                    <span className="font-semibold text-slate-800">{formatVietnameseDate(h.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Đến ngày:</span>
                    <span className="font-semibold text-slate-800">{formatVietnameseDate(h.endDate)}</span>
                  </div>
                </div>

                {h.reason && (
                  <p className="text-xs text-slate-600 leading-normal">
                    {h.reason}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Ảnh hưởng lịch học:</span>
                  <span className={`font-semibold ${h.affectsScheduledLessons ? 'text-rose-600' : 'text-slate-500'}`}>
                    {h.affectsScheduledLessons ? 'Có hoãn buổi học' : 'Không ảnh hưởng'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: QUẢN LÝ HỌC BÙ (MAKE-UP LESSONS)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'makeups' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Quản Lý Lớp Học Bù</h3>
              <p className="text-xs text-slate-500">
                Ghi nhận các buổi học bù để bù đắp cho buổi nghỉ, đảm bảo hệ thống không tính trùng lặp buổi học.
              </p>
            </div>

            {canManageMakeup && (
              <button
                onClick={() => {
                  setEditingMakeup(null);
                  setMakeupClassId(data.classes[0]?.id || '');
                  setMakeupOriginalDate('');
                  setMakeupDate(new Date().toISOString().slice(0, 10));
                  setMakeupTime('18:00 - 19:30');
                  setMakeupClassroom('1A');
                  setMakeupTeacherId('');
                  setMakeupReason('');
                  setMakeupCountsProgress(true);
                  setMakeupStatus('scheduled');
                  setShowMakeupModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm lịch học bù</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Lớp Học</th>
                  <th className="py-3 px-4">Ngày Nghỉ Được Bù</th>
                  <th className="py-3 px-4">Ngày Học Bù &amp; Ca</th>
                  <th className="py-3 px-4">Phòng &amp; GV</th>
                  <th className="py-3 px-4">Lý Do Học Bù</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(data.courseMakeups || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Chưa có buổi học bù nào được thiết lập
                    </td>
                  </tr>
                ) : (
                  (data.courseMakeups || []).map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {m.className || m.classId}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {m.originalMissedDate ? formatVietnameseDate(m.originalMissedDate) : <span className="text-slate-400">Buổi bổ sung độc lập</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-indigo-700">
                          {formatVietnameseDate(m.makeupDate)}
                        </div>
                        <div className="text-[11px] text-slate-500">{m.time || '18:00 - 19:30'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div>Phòng: {m.classroom || '1A'}</div>
                        <div className="text-[11px] text-slate-500">{m.teacherName || 'Chưa gán GV'}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {m.reason || 'Học bù bài giảng'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : m.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {m.status === 'completed' ? 'Đã hoàn thành' : m.status === 'cancelled' ? 'Đã hủy' : 'Đã lên lịch'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canManageMakeup && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingMakeup(m);
                                setMakeupClassId(m.classId);
                                setMakeupOriginalDate(m.originalMissedDate || '');
                                setMakeupDate(m.makeupDate);
                                setMakeupTime(m.time || '18:00 - 19:30');
                                setMakeupClassroom(m.classroom || '1A');
                                setMakeupTeacherId(m.teacherId || '');
                                setMakeupReason(m.reason || '');
                                setMakeupCountsProgress(m.countsTowardCourseProgress);
                                setMakeupStatus(m.status);
                                setShowMakeupModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Sửa lịch học bù"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Bạn có chắc muốn xóa buổi học bù này?')) {
                                  deleteCourseMakeup(m.id);
                                  showToast('Đã xóa buổi học bù', 'info');
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Xóa lịch học bù"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LỊCH SỬ ĐIỀU CHỈNH THỜI GIAN (AUDIT TRAIL)                         */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Nhật Ký Điều Chỉnh Ngày Hoàn Thành Khóa Học</h3>
              <p className="text-xs text-slate-500">
                Toàn bộ lịch sử cập nhật ngày kết thúc được ghi nhận vĩnh viễn nhằm đảm bảo tính minh bạch học thuật.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Thời Điểm</th>
                  <th className="py-3 px-4">Khóa Học</th>
                  <th className="py-3 px-4">Ngày Hoàn Thành Cũ</th>
                  <th className="py-3 px-4">Ngày Hoàn Thành Mới</th>
                  <th className="py-3 px-4">Lý Do Điều Chỉnh</th>
                  <th className="py-3 px-4 text-right">Người Thực Hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(data.courseDurationHistory || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Chưa có lịch sử điều chỉnh ngày nào
                    </td>
                  </tr>
                ) : (
                  (data.courseDurationHistory || []).map(hist => {
                    const matchedCourse = (data.courseDurations || []).find(c => c.id === hist.courseDurationId);
                    return (
                      <tr key={hist.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {hist.changedAt}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {matchedCourse?.courseName || hist.courseDurationId}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {formatVietnameseDate(hist.previousExpectedCompletionDate)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {formatVietnameseDate(hist.newExpectedCompletionDate)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-md">
                          {hist.reason}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800 whitespace-nowrap">
                          {hist.changedBy}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT COURSE DURATION                                       */}
      {/* ========================================================================= */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowCourseModal(false)} />
          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-indigo-600" />
                <span>{editingCourse ? 'Chỉnh Sửa Khóa Học' : 'Thêm Khóa Học Mới'}</span>
              </h3>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              {/* Row 1: Course Name & Class */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Khóa Học *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCourseName}
                    onChange={e => setFormCourseName(e.target.value)}
                    placeholder="VD: Cambridge Movers Adventurer 01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lớp Học Liên Kết (Class)
                  </label>
                  <select
                    value={formClassId}
                    onChange={e => {
                      const cid = e.target.value;
                      setFormClassId(cid);
                      const cls = data.classes.find(c => c.id === cid);
                      if (cls) {
                        setFormTeacherId(cls.teacherId || '');
                        if (cls.curriculum) setFormCourseBook(cls.curriculum);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Không gán lớp học cụ thể --</option>
                    {data.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Course Book & Teacher */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giáo Trình (Course Book)
                  </label>
                  <input
                    type="text"
                    value={formCourseBook}
                    onChange={e => setFormCourseBook(e.target.value)}
                    placeholder="VD: Kid's Box 3"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giáo Viên Phụ Trách
                  </label>
                  <select
                    value={formTeacherId}
                    onChange={e => setFormTeacherId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Chưa phân công --</option>
                    {data.teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Duration Mode, Value & Start Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chế Độ Thời Lượng *
                  </label>
                  <select
                    value={formDurationMode}
                    onChange={e => setFormDurationMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="months">Tháng Lịch (Calendar Months)</option>
                    <option value="learning_sessions">Số Buổi Học (Learning Sessions)</option>
                    <option value="learning_days">Ngày Học Thực Tế (Learning Days)</option>
                    <option value="calendar_days">Ngày Lịch (Calendar Days)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời Lượng *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formDurationValue}
                    onChange={e => setFormDurationValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày Bắt Đầu *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 4: Extension Policy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chính Sách Gia Hạn (Extension Policy)
                </label>
                <select
                  value={formExtensionPolicy}
                  onChange={e => setFormExtensionPolicy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="scheduled_holidays">Kéo dài theo các ngày nghỉ lễ trùng buổi học (Khuyên dùng)</option>
                  <option value="all_non_study_days">Kéo dài theo toàn bộ các ngày trung tâm nghỉ</option>
                  <option value="none">Không tự động gia hạn (Ngày kết thúc cố định)</option>
                </select>
              </div>

              {/* Automatic Calculation Preview Card */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Dự Tính Ngày Hoàn Thành Tự Động</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunFormCalculation}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Tính toán lại
                  </button>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-600">Ngày hoàn thành dự kiến:</span>
                  <span className="text-lg font-bold font-mono text-indigo-700">
                    {formatVietnameseDate(previewCompletionDate) || 'Nhấn nút tính toán'}
                  </span>
                </div>

                {previewExplanation && (
                  <p className="text-[11px] text-slate-600 leading-normal">
                    {previewExplanation}
                  </p>
                )}
              </div>

              {/* Row 5: Sessions & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tổng Buổi Yêu Cầu
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formRequiredSessions}
                    onChange={e => setFormRequiredSessions(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số Buổi Đã Hoàn Thành
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formCompletedSessions}
                    onChange={e => setFormCompletedSessions(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạng Thái
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="not_started">Chưa khai giảng</option>
                    <option value="in_progress">Đang diễn ra</option>
                    <option value="near_completion">Sắp hoàn thành</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="extended">Đã gia hạn</option>
                    <option value="on_hold">Tạm dừng</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi Chú Khóa Học &amp; Điều Chỉnh (Notes)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Ghi chú về lịch học, thỏa thuận phụ huynh, sự cố nghỉ bù..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  {editingCourse ? 'Lưu Thay Đổi' : 'Tạo Khóa Học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COURSE DETAILS BREAKDOWN                                         */}
      {/* ========================================================================= */}
      {showDetailsModal && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowDetailsModal(false)} />
          <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">{selectedCourse.courseName}</h3>
                <p className="text-xs text-slate-500">{selectedCourse.className || 'Chưa gán lớp'}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Progress Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Tiến độ bài học:</span>
                  <span className="font-bold text-indigo-700 text-sm">{selectedCourse.progressPercentage}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${selectedCourse.progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>Đã học: {selectedCourse.completedSessions} buổi</span>
                  <span>Tổng cần: {selectedCourse.requiredSessions} buổi</span>
                  <span>Còn lại: {selectedCourse.remainingSessions} buổi</span>
                </div>
              </div>

              {/* Dates Information Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Ngày Bắt Đầu:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {formatVietnameseDate(selectedCourse.courseStartDate)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Ngày Hoàn Thành Ban Đầu:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {formatVietnameseDate(selectedCourse.originalExpectedCompletionDate)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                  <span className="text-indigo-600 block mb-0.5 font-medium">Dự Kiến Hoàn Thành Hiện Tại:</span>
                  <span className="font-mono font-bold text-indigo-900 text-sm">
                    {formatVietnameseDate(selectedCourse.currentExpectedCompletionDate)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Chính Sách Gia Hạn:</span>
                  <span className="font-semibold text-slate-800">
                    {getPolicyLabel(selectedCourse.extensionPolicy)}
                  </span>
                </div>
              </div>

              {/* Explanation Note */}
              {selectedCourse.calculationExplanation && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 leading-relaxed">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Giải thích cách tính toán:</span>
                  </div>
                  <p>{selectedCourse.calculationExplanation}</p>
                </div>
              )}

              {/* Course History for this record */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Lịch Sử Điều Chỉnh Thời Gian:</h4>
                <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {getCourseHistory(selectedCourse.id).length === 0 ? (
                    <p className="text-slate-400 text-xs italic">Chưa có lần điều chỉnh ngày nào</p>
                  ) : (
                    getCourseHistory(selectedCourse.id).map(h => (
                      <div key={h.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-mono font-bold text-indigo-700">
                            {formatVietnameseDate(h.previousExpectedCompletionDate)} &rarr; {formatVietnameseDate(h.newExpectedCompletionDate)}
                          </span>
                          <p className="text-slate-500 mt-0.5">{h.reason}</p>
                        </div>
                        <div className="text-right text-slate-400 whitespace-nowrap">
                          <div>{h.changedBy}</div>
                          <div>{h.changedAt}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECALCULATE PROMPT                                               */}
      {/* ========================================================================= */}
      {showRecalcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowRecalcModal(false)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Tính Lại Ngày Hoàn Thành</h3>
                <p className="text-xs text-slate-500">Đồng bộ lịch theo thời khóa biểu &amp; ngày nghỉ mới</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống sẽ duyệt lại toàn bộ các buổi học trong thời khóa biểu, đối chiếu với danh sách ngày nghỉ lễ và các buổi học bù để xác định lại ngày kết thúc chính xác nhất.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý Do Tính Lại / Ghi Chú Lịch Sử:
              </label>
              <input
                type="text"
                value={recalcReason}
                onChange={e => setRecalcReason(e.target.value)}
                placeholder="VD: Cập nhật sau kỳ nghỉ Tết Nguyên Đán"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRecalcModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmRecalculate}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                Xác Nhận Tính Lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: HOLIDAY CREATE / EDIT                                            */}
      {/* ========================================================================= */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowHolidayModal(false)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                {editingHoliday ? 'Sửa Ngày Nghỉ Lễ' : 'Thêm Ngày Nghỉ Lễ Mới'}
              </h3>
              <button onClick={() => setShowHolidayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Ngày Nghỉ *</label>
                <input
                  type="text"
                  required
                  value={holidayName}
                  onChange={e => setHolidayName(e.target.value)}
                  placeholder="VD: Nghỉ Tết Dương Lịch 2027"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Từ Ngày *</label>
                  <input
                    type="date"
                    required
                    value={holidayStartDate}
                    onChange={e => setHolidayStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đến Ngày *</label>
                  <input
                    type="date"
                    required
                    value={holidayEndDate}
                    onChange={e => setHolidayEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phân Loại Nghỉ</label>
                <select
                  value={holidayType}
                  onChange={e => setHolidayType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="tet">Tết Nguyên Đán</option>
                  <option value="national">Lễ Quốc Gia (30/4, 2/9, Giỗ Tổ...)</option>
                  <option value="center">Nghỉ Sự Kiện Trung Tâm (Noel, 20/11...)</option>
                  <option value="suspension">Tạm Dừng Khẩn Cấp (Thời tiết, Mất điện)</option>
                  <option value="teacher_absence">Giáo Viên Nghỉ Phép</option>
                  <option value="other">Lý Do Khác</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lý Do / Căn Cứ</label>
                <input
                  type="text"
                  value={holidayReason}
                  onChange={e => setHolidayReason(e.target.value)}
                  placeholder="VD: Theo lịch nghỉ của Bộ LĐTBXH"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="affectsLessons"
                  checked={holidayAffects}
                  onChange={e => setHolidayAffects(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="affectsLessons" className="font-semibold text-slate-700">
                  Tự động loại trừ buổi học trùng lịch &amp; kéo dài khóa học
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowHolidayModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (!holidayName.trim()) {
                    showToast('Vui lòng nhập tên ngày nghỉ', 'error');
                    return;
                  }
                  if (editingHoliday) {
                    updateCourseHoliday(editingHoliday.id, {
                      holidayName,
                      startDate: holidayStartDate,
                      endDate: holidayEndDate,
                      holidayType,
                      reason: holidayReason,
                      affectsScheduledLessons: holidayAffects,
                      notes: holidayNotes
                    });
                    showToast('Cập nhật ngày nghỉ thành công!', 'success');
                  } else {
                    addCourseHoliday({
                      holidayName,
                      startDate: holidayStartDate,
                      endDate: holidayEndDate,
                      holidayType,
                      reason: holidayReason,
                      affectsScheduledLessons: holidayAffects,
                      notes: holidayNotes
                    });
                    showToast('Đã thêm ngày nghỉ mới!', 'success');
                  }
                  setShowHolidayModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs"
              >
                Lưu Ngày Nghỉ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: MAKEUP LESSON CREATE / EDIT                                      */}
      {/* ========================================================================= */}
      {showMakeupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowMakeupModal(false)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                {editingMakeup ? 'Sửa Buổi Học Bù' : 'Thêm Buổi Học Bù Mới'}
              </h3>
              <button onClick={() => setShowMakeupModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lớp Học Bù *</label>
                <select
                  value={makeupClassId}
                  onChange={e => setMakeupClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {data.classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ngày Nghỉ Được Bù Đắp (Tùy chọn)
                </label>
                <input
                  type="date"
                  value={makeupOriginalDate}
                  onChange={e => setMakeupOriginalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Điền ngày nghỉ để hệ thống đánh dấu đã bù, không kéo dài ngày kết thúc nữa.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày Tổ Chức Bù *</label>
                  <input
                    type="date"
                    required
                    value={makeupDate}
                    onChange={e => setMakeupDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Khung Giờ *</label>
                  <input
                    type="text"
                    value={makeupTime}
                    onChange={e => setMakeupTime(e.target.value)}
                    placeholder="VD: 18:00 - 19:30"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng Học</label>
                  <input
                    type="text"
                    value={makeupClassroom}
                    onChange={e => setMakeupClassroom(e.target.value)}
                    placeholder="VD: Phòng 101"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giáo Viên Dạy Bù</label>
                  <select
                    value={makeupTeacherId}
                    onChange={e => setMakeupTeacherId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Mặc định theo lớp --</option>
                    {data.teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lý Do Học Bù</label>
                <input
                  type="text"
                  value={makeupReason}
                  onChange={e => setMakeupReason(e.target.value)}
                  placeholder="VD: Bù buổi mất điện ngày 19/10"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="countsProgress"
                  checked={makeupCountsProgress}
                  onChange={e => setMakeupCountsProgress(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="countsProgress" className="font-semibold text-slate-700">
                  Tính vào tiến độ hoàn thành khóa học (Không tính đúp)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowMakeupModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  const targetCls = data.classes.find(c => c.id === makeupClassId);
                  const targetTeacher = data.teachers.find(t => t.id === makeupTeacherId);

                  if (editingMakeup) {
                    updateCourseMakeup(editingMakeup.id, {
                      classId: makeupClassId,
                      className: targetCls?.name || editingMakeup.className,
                      originalMissedDate: makeupOriginalDate || undefined,
                      makeupDate,
                      time: makeupTime,
                      classroom: makeupClassroom,
                      teacherId: makeupTeacherId,
                      teacherName: targetTeacher?.fullName || targetCls?.teacherId,
                      reason: makeupReason,
                      countsTowardCourseProgress: makeupCountsProgress,
                      status: makeupStatus
                    });
                    showToast('Đã cập nhật buổi học bù!', 'success');
                  } else {
                    addCourseMakeup({
                      classId: makeupClassId,
                      className: targetCls?.name || '',
                      originalMissedDate: makeupOriginalDate || undefined,
                      makeupDate,
                      time: makeupTime,
                      classroom: makeupClassroom,
                      teacherId: makeupTeacherId,
                      teacherName: targetTeacher?.fullName || '',
                      reason: makeupReason,
                      countsTowardCourseProgress: makeupCountsProgress,
                      status: makeupStatus
                    });
                    showToast('Đã thêm lịch học bù mới!', 'success');
                  }
                  setShowMakeupModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs"
              >
                Lưu Buổi Học Bù
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
