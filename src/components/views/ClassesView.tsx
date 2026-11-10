import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Users,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  UserCheck,
  UserPlus,
  X,
  Eye,
  GraduationCap
} from 'lucide-react';
import { ClassItem, ClassScheduleSlot, ClassStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import {
  WEEKDAY_OPTIONS,
  getClassWeeklySchedule,
  formatScheduleDaysLabel,
  formatScheduleTimeSummary,
  getWeekdayLabel,
  isValidTimeRange,
  doWeeklySchedulesOverlap
} from '../../services/dataService';

const DEFAULT_WEEKLY_SLOTS: ClassScheduleSlot[] = [
  { dayOfWeek: 1, startTime: '17:30', endTime: '19:00' },
  { dayOfWeek: 3, startTime: '17:30', endTime: '19:00' }
];

export const ClassesView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, addClass, updateClass, deleteClass, assignStudentsToClass } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const teacherObj = isTeacher ? data.teachers.find(t => t.id === currentUser.teacherId || t.email === currentUser.email) : null;
  const teacherClassIds = teacherObj ? teacherObj.assignedClassIds : [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [managingRosterClass, setManagingRosterClass] = useState<ClassItem | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<ClassItem, 'id'>>({
    name: '',
    code: '',
    level: 'Pre A1 Starters',
    courseId: 'PROG-STA',
    curriculum: 'Cambridge YLE Starters',
    teacherId: 'TCH-001',
    assistantTeacherId: 'TA-001',
    classroom: 'Phòng 101 - Smart Room',
    scheduleDays: formatScheduleDaysLabel(DEFAULT_WEEKLY_SLOTS),
    scheduleTime: formatScheduleTimeSummary(DEFAULT_WEEKLY_SLOTS),
    weeklySchedule: DEFAULT_WEEKLY_SLOTS,
    startDate: '2025-03-01',
    endDate: '2025-08-30',
    maxCapacity: 14,
    studentIds: [],
    status: 'ongoing',
    tuitionFee: 6500000
  });

  const [cachedDaySlots, setCachedDaySlots] = useState<Record<number, { startTime: string; endTime: string }>>({
    1: { startTime: '17:30', endTime: '19:00' },
    3: { startTime: '17:30', endTime: '19:00' }
  });
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Schedule conflict warning inside modal
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const displayedClasses = data.classes.filter(cls => {
    if (isTeacher) {
      return teacherClassIds.includes(cls.id);
    }
    return true;
  });

  const openAddModal = () => {
    const initialSlots = DEFAULT_WEEKLY_SLOTS.map(s => ({ ...s }));
    setFormData({
      name: '',
      code: '',
      level: 'Pre A1 Starters',
      courseId: data.programs[0]?.id || 'PROG-STA',
      curriculum: 'Cambridge YLE Starters',
      teacherId: data.teachers[0]?.id || '',
      assistantTeacherId: data.teachingAssistants[0]?.id || '',
      classroom: data.settings.classrooms[0] || 'Phòng 101 - Smart Room',
      scheduleDays: formatScheduleDaysLabel(initialSlots),
      scheduleTime: formatScheduleTimeSummary(initialSlots),
      weeklySchedule: initialSlots,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '2025-08-31',
      maxCapacity: 14,
      studentIds: [],
      status: 'ongoing',
      tuitionFee: 6500000
    });
    setCachedDaySlots({
      1: { startTime: '17:30', endTime: '19:00' },
      3: { startTime: '17:30', endTime: '19:00' }
    });
    setScheduleError(null);
    setEditingClass(null);
    setConflictWarning(null);
    setShowAddModal(true);
  };

  const openEditModal = (cls: ClassItem) => {
    const restoredSlots = getClassWeeklySchedule(cls);
    const cacheMap: Record<number, { startTime: string; endTime: string }> = {};
    restoredSlots.forEach(s => {
      cacheMap[s.dayOfWeek] = { startTime: s.startTime, endTime: s.endTime };
    });

    setEditingClass(cls);
    setFormData({
      name: cls.name,
      code: cls.code,
      level: cls.level,
      courseId: cls.courseId,
      curriculum: cls.curriculum,
      teacherId: cls.teacherId,
      assistantTeacherId: cls.assistantTeacherId,
      classroom: cls.classroom,
      scheduleDays: restoredSlots.length > 0 ? formatScheduleDaysLabel(restoredSlots) : cls.scheduleDays,
      scheduleTime: restoredSlots.length > 0 ? formatScheduleTimeSummary(restoredSlots) : cls.scheduleTime,
      weeklySchedule: restoredSlots,
      startDate: cls.startDate,
      endDate: cls.endDate,
      maxCapacity: cls.maxCapacity,
      studentIds: [...cls.studentIds],
      status: cls.status,
      tuitionFee: cls.tuitionFee
    });
    setCachedDaySlots(cacheMap);
    setScheduleError(null);
    setConflictWarning(null);
    setShowAddModal(true);
  };

  const handleToggleWeekday = (dayOfWeek: number) => {
    setScheduleError(null);
    setFormData(prev => {
      const currentSlots = prev.weeklySchedule || [];
      const exists = currentSlots.some(s => s.dayOfWeek === dayOfWeek);

      let nextSlots: ClassScheduleSlot[];
      if (exists) {
        nextSlots = currentSlots.filter(s => s.dayOfWeek !== dayOfWeek);
      } else {
        const cached = cachedDaySlots[dayOfWeek] || { startTime: '17:30', endTime: '19:00' };
        nextSlots = [
          ...currentSlots,
          { dayOfWeek, startTime: cached.startTime, endTime: cached.endTime }
        ].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      }

      return {
        ...prev,
        weeklySchedule: nextSlots,
        scheduleDays: formatScheduleDaysLabel(nextSlots),
        scheduleTime: formatScheduleTimeSummary(nextSlots)
      };
    });
  };

  const handleSlotTimeChange = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setScheduleError(null);
    setCachedDaySlots(prev => ({
      ...prev,
      [dayOfWeek]: {
        startTime: field === 'startTime' ? value : (prev[dayOfWeek]?.startTime || '17:30'),
        endTime: field === 'endTime' ? value : (prev[dayOfWeek]?.endTime || '19:00')
      }
    }));

    setFormData(prev => {
      const nextSlots = (prev.weeklySchedule || []).map(slot =>
        slot.dayOfWeek === dayOfWeek ? { ...slot, [field]: value } : slot
      );
      return {
        ...prev,
        weeklySchedule: nextSlots,
        scheduleDays: formatScheduleDaysLabel(nextSlots),
        scheduleTime: formatScheduleTimeSummary(nextSlots)
      };
    });
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('Vui lòng nhập tên lớp và mã lớp', 'error');
      return;
    }

    const activeSlots = [...(formData.weeklySchedule || [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    if (activeSlots.length === 0) {
      const msg = 'Vui lòng chọn ít nhất một ngày học trong tuần.';
      setScheduleError(msg);
      showToast(msg, 'error');
      return;
    }

    for (const slot of activeSlots) {
      if (!slot.startTime || !slot.endTime) {
        const msg = `Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc cho ${getWeekdayLabel(slot.dayOfWeek)}.`;
        setScheduleError(msg);
        showToast(msg, 'error');
        return;
      }
      if (!isValidTimeRange(slot.startTime, slot.endTime)) {
        const msg = `Giờ kết thúc của ${getWeekdayLabel(slot.dayOfWeek)} phải sau giờ bắt đầu.`;
        setScheduleError(msg);
        showToast(msg, 'error');
        return;
      }
    }

    // Check if another class is using same room and overlapping weekday + time
    let overlappingSlot: ClassScheduleSlot | null = null;
    const roomConflict = data.classes.find(c => {
      if (editingClass && c.id === editingClass.id) return false;
      if (c.classroom !== formData.classroom) return false;
      const overlap = doWeeklySchedulesOverlap(getClassWeeklySchedule(c), activeSlots);
      if (overlap) {
        overlappingSlot = overlap;
        return true;
      }
      return false;
    });

    if (roomConflict && overlappingSlot) {
      const conflictSlot = overlappingSlot as ClassScheduleSlot;
      if (
        !window.confirm(
          `Cảnh báo: ${formData.classroom} có thể trùng lịch ${getWeekdayLabel(conflictSlot.dayOfWeek)} (${conflictSlot.startTime} - ${conflictSlot.endTime}) với lớp "${roomConflict.name}". Bạn vẫn muốn tiếp tục?`
        )
      ) {
        return;
      }
    }

    const payload: Omit<ClassItem, 'id'> = {
      ...formData,
      weeklySchedule: activeSlots,
      scheduleDays: formatScheduleDaysLabel(activeSlots),
      scheduleTime: formatScheduleTimeSummary(activeSlots)
    };

    if (editingClass) {
      updateClass(editingClass.id, payload);
      showToast(`Đã cập nhật lớp học "${payload.name}"`, 'success');
    } else {
      const created = addClass(payload);
      showToast(`Đã tạo thành công lớp học "${created.name}"`, 'success');
    }
    setShowAddModal(false);
  };

  const handleDeleteClass = (cls: ClassItem) => {
    if (window.confirm(`Bạn có chắc muốn xóa lớp học "${cls.name}"? Dữ liệu thời khóa biểu liên quan sẽ bị gỡ bỏ.`)) {
      deleteClass(cls.id);
      showToast(`Đã xóa lớp "${cls.name}"`, 'info');
    }
  };

  // Student roster selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const openRosterManager = (cls: ClassItem) => {
    setManagingRosterClass(cls);
    setSelectedStudentIds([...cls.studentIds]);
  };

  const toggleStudentInRoster = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
    } else {
      if (managingRosterClass && selectedStudentIds.length >= managingRosterClass.maxCapacity) {
        showToast(`Lớp đã đạt sĩ số tối đa (${managingRosterClass.maxCapacity} học sinh)`, 'warning');
        return;
      }
      setSelectedStudentIds(prev => [...prev, studentId]);
    }
  };

  const handleSaveRoster = () => {
    if (!managingRosterClass) return;
    assignStudentsToClass(managingRosterClass.id, selectedStudentIds);
    showToast(`Đã cập nhật sĩ số lớp: ${selectedStudentIds.length} học sinh`, 'success');
    setManagingRosterClass(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-600" />
            Quản Lý Lớp Học ({displayedClasses.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isTeacher
              ? 'Các lớp học do Thầy/Cô trực tiếp đứng lớp và giảng dạy.'
              : 'Theo dõi chỉ số sĩ số, phân công giáo viên - trợ giảng, phòng học và thời khóa biểu.'}
          </p>
        </div>

        {!isTeacher && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-red-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Mở lớp học mới</span>
          </button>
        )}
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedClasses.map(cls => {
          const teacher = data.teachers.find(t => t.id === cls.teacherId);
          const assistant = data.teachingAssistants.find(ta => ta.id === cls.assistantTeacherId);
          const studentCount = cls.studentIds.length;
          const capacityPercent = Math.min(100, Math.round((studentCount / cls.maxCapacity) * 100));

          return (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5">
                {/* Status & Code */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {cls.code}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cls.status === 'ongoing'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : cls.status === 'upcoming'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cls.status === 'ongoing' && 'Đang học'}
                    {cls.status === 'upcoming' && 'Sắp khai giảng'}
                    {cls.status === 'completed' && 'Đã kết thúc'}
                  </span>
                </div>

                {/* Name & Level */}
                <h3 className="font-extrabold text-slate-900 text-base">{cls.name}</h3>
                <div className="text-xs text-red-600 font-semibold mt-0.5">{cls.level}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{cls.curriculum}</div>

                {/* Teacher & TA */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-red-500" /> Giáo viên:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {teacher ? teacher.fullName : <span className="text-amber-600">Chưa xếp GV</span>}
                    </span>
                  </div>

                  {assistant && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-blue-500" /> Trợ giảng:
                      </span>
                      <span className="font-semibold text-slate-700">{assistant.fullName}</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" /> Lịch học:
                    </span>
                    <span className="font-medium text-slate-700 text-right">{cls.scheduleDays}</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Ca học:
                    </span>
                    <div className="font-medium text-slate-700 text-right">
                      {(() => {
                        const slots = getClassWeeklySchedule(cls);
                        const hasDistinctTimes =
                          slots.length > 1 &&
                          slots.some(
                            s => s.startTime !== slots[0].startTime || s.endTime !== slots[0].endTime
                          );
                        if (!hasDistinctTimes) {
                          return <span>{cls.scheduleTime}</span>;
                        }
                        return (
                          <div className="space-y-0.5">
                            {slots.map(s => (
                              <div key={s.dayOfWeek} className="text-[11px]">
                                <span className="font-semibold text-slate-800">
                                  {getWeekdayLabel(s.dayOfWeek)}:
                                </span>{' '}
                                {s.startTime} - {s.endTime}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Phòng:
                    </span>
                    <span className="font-medium text-slate-700">{cls.classroom}</span>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium">Sĩ số lớp:</span>
                    <span className="font-bold text-slate-800">
                      {studentCount} / {cls.maxCapacity} học sinh ({capacityPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        capacityPercent >= 90 ? 'bg-red-500' : capacityPercent >= 60 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setViewingClass(cls)}
                  className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Chi tiết
                </button>

                {!isTeacher ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openRosterManager(cls)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold flex items-center gap-1"
                      title="Quản lý danh sách học sinh"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600" /> Xếp học sinh
                    </button>

                    <button
                      onClick={() => openEditModal(cls)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-white rounded-lg"
                      title="Sửa lớp"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteClass(cls)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg"
                        title="Xóa lớp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Đang phụ trách</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ROSTER MANAGER MODAL */}
      {managingRosterClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setManagingRosterClass(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl z-10 border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Xếp học sinh vào lớp: {managingRosterClass.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đã chọn: <span className="font-bold text-red-600">{selectedStudentIds.length}</span> / {managingRosterClass.maxCapacity} học sinh
                </p>
              </div>
              <button
                onClick={() => setManagingRosterClass(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
              <p className="text-slate-500 mb-2">
                Chọn học sinh để thêm hoặc bớt khỏi danh sách lớp. Hệ thống sẽ tự động cập nhật lịch học của học sinh.
              </p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {data.students.map(student => {
                  const isChecked = selectedStudentIds.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isChecked ? 'bg-red-50/70 text-slate-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudentInRoster(student.id)}
                          className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{student.fullName} ({student.id})</div>
                          <div className="text-[11px] text-slate-400">
                            {student.currentLevel} • {student.school} • PH: {student.parentPhone}
                          </div>
                        </div>
                      </div>

                      {isChecked && <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setManagingRosterClass(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveRoster}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs"
              >
                Lưu danh sách học sinh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CLASS MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl z-10 border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingClass ? `Sửa thông tin: ${editingClass.name}` : 'Mở lớp học mới'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tên lớp học <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Starters Explorer 02"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Mã lớp (Code) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VD: STA-E02"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cấp độ học thuật</label>
                  <select
                    value={formData.level}
                    onChange={e => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Pre A1 Starters">Pre A1 Starters</option>
                    <option value="A1 Movers">A1 Movers</option>
                    <option value="A2 Flyers">A2 Flyers</option>
                    <option value="A2 Key for Schools (KET)">A2 Key for Schools (KET)</option>
                    <option value="B1 Preliminary (PET)">B1 Preliminary (PET)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chương trình học</label>
                  <select
                    value={formData.courseId}
                    onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    {data.programs.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Giáo viên đứng lớp <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.teacherId}
                    onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {data.teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.isNative ? 'GV Bản ngữ' : 'GV Việt Nam'} • {t.workloadHours}h/tuần)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trợ giảng (TA)</label>
                  <select
                    value={formData.assistantTeacherId || ''}
                    onChange={e => setFormData({ ...formData, assistantTeacherId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Không có trợ giảng --</option>
                    {data.teachingAssistants.map(ta => (
                      <option key={ta.id} value={ta.id}>
                        {ta.fullName} ({ta.englishCertificate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phòng học</label>
                  <select
                    value={formData.classroom}
                    onChange={e => setFormData({ ...formData, classroom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    {data.settings.classrooms.map(rm => (
                      <option key={rm} value={rm}>
                        {rm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sĩ số tối đa</label>
                  <input
                    type="number"
                    min={6}
                    max={25}
                    value={formData.maxCapacity}
                    onChange={e => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-slate-700">
                        Lịch học trong tuần <span className="text-red-600">*</span>
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Đã chọn:{' '}
                        <strong className="text-red-600">{(formData.weeklySchedule || []).length}</strong> ngày
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      {WEEKDAY_OPTIONS.map(day => {
                        const isChecked = (formData.weeklySchedule || []).some(
                          s => s.dayOfWeek === day.dayOfWeek
                        );
                        return (
                          <label
                            key={day.dayOfWeek}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors select-none ${
                              isChecked
                                ? 'bg-red-50 border-red-300 text-red-800 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleWeekday(day.dayOfWeek)}
                              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 accent-red-600"
                            />
                            <span className="text-xs">{day.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1.5">
                      Khung giờ học theo từng ngày <span className="text-red-600">*</span>
                    </label>

                    {(formData.weeklySchedule || []).length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">Ngày</th>
                              <th className="py-2 px-3">Giờ bắt đầu</th>
                              <th className="py-2 px-3">Giờ kết thúc</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(formData.weeklySchedule || []).map(slot => {
                              const invalidRange =
                                Boolean(slot.startTime && slot.endTime) &&
                                !isValidTimeRange(slot.startTime, slot.endTime);
                              return (
                                <tr
                                  key={slot.dayOfWeek}
                                  className={invalidRange ? 'bg-red-50/50' : 'hover:bg-slate-50/70'}
                                >
                                  <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                                    {getWeekdayLabel(slot.dayOfWeek)}
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="time"
                                      required
                                      value={slot.startTime}
                                      onChange={e =>
                                        handleSlotTimeChange(slot.dayOfWeek, 'startTime', e.target.value)
                                      }
                                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="time"
                                      required
                                      value={slot.endTime}
                                      onChange={e =>
                                        handleSlotTimeChange(slot.dayOfWeek, 'endTime', e.target.value)
                                      }
                                      className={`w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                        invalidRange ? 'border-red-400' : 'border-slate-200'
                                      }`}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 text-center">
                        Chưa chọn ngày học nào. Hãy tích chọn ít nhất một ngày ở trên để thiết lập giờ học.
                      </div>
                    )}

                    {scheduleError && (
                      <p className="mt-1.5 text-[11px] font-medium text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{scheduleError}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-950/20"
                >
                  {editingClass ? 'Lưu cập nhật' : 'Tạo lớp học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLASS DETAILS MODAL */}
      {viewingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setViewingClass(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl z-10 border border-slate-200 max-h-[85vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {viewingClass.code}
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg mt-1">{viewingClass.name}</h3>
                <p className="text-slate-500">{viewingClass.level} • {viewingClass.curriculum}</p>
              </div>
              <button onClick={() => setViewingClass(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block mb-0.5">Lịch & Giờ học:</span>
                  {(() => {
                    const slots = getClassWeeklySchedule(viewingClass);
                    if (slots.length === 0) {
                      return (
                        <span className="font-semibold text-slate-800">
                          {viewingClass.scheduleDays} ({viewingClass.scheduleTime})
                        </span>
                      );
                    }
                    return (
                      <div className="space-y-0.5">
                        {slots.map(s => (
                          <div key={s.dayOfWeek} className="font-semibold text-slate-800">
                            {getWeekdayLabel(s.dayOfWeek)}: {s.startTime} - {s.endTime}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <span className="text-slate-400 block">Phòng học:</span>
                  <span className="font-semibold text-slate-800">{viewingClass.classroom}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Giáo viên phụ trách:</span>
                  <span className="font-semibold text-slate-800">
                    {data.teachers.find(t => t.id === viewingClass.teacherId)?.fullName || 'Chưa xếp'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Trợ giảng:</span>
                  <span className="font-semibold text-slate-800">
                    {data.teachingAssistants.find(ta => ta.id === viewingClass.assistantTeacherId)?.fullName || 'Không có'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">
                  Danh sách học sinh ({viewingClass.studentIds.length}/{viewingClass.maxCapacity})
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {viewingClass.studentIds.map((sid, idx) => {
                    const st = data.students.find(s => s.id === sid);
                    if (!st) return null;
                    return (
                      <div key={sid} className="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800">{st.fullName}</span>
                          <span className="text-slate-400">({st.id})</span>
                        </div>
                        <span className="text-slate-500 font-medium">PH: {st.parentPhone}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingClass(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
