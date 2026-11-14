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
import { ClassItem, ClassStatus, WeeklyScheduleSlot } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import { getClassWeeklySchedule, formatScheduleTimeSummary } from '../../services/dataService';

const WEEKDAY_OPTIONS: { dayOfWeek: number; dayName: string }[] = [
  { dayOfWeek: 1, dayName: 'Thứ 2' },
  { dayOfWeek: 2, dayName: 'Thứ 3' },
  { dayOfWeek: 3, dayName: 'Thứ 4' },
  { dayOfWeek: 4, dayName: 'Thứ 5' },
  { dayOfWeek: 5, dayName: 'Thứ 6' },
  { dayOfWeek: 6, dayName: 'Thứ 7' },
  { dayOfWeek: 7, dayName: 'Chủ Nhật' }
];

function normalizeTimeForInput(raw: string, fallback: string): string {
  const match = (raw || '').trim().match(/^(\d{1,2})\s*[:h]\s*(\d{2})/i);
  if (!match) return fallback;
  const hh = String(Math.min(23, Math.max(0, Number(match[1])))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, Number(match[2])))).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseTimeToMinutes(timeStr: string): number | null {
  const match = (timeStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }
  return hh * 60 + mm;
}

export const ClassesView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, addClass, updateClass, deleteClass, assignStudentsToClass } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const teacherObj = isTeacher
    ? data.teachers.find(
        t =>
          String(t.id).trim() === String(currentUser.teacherId).trim() ||
          (Boolean(currentUser.email) && t.email.toLowerCase() === currentUser.email.toLowerCase())
      )
    : null;
  const currentTeacherId = teacherObj ? String(teacherObj.id).trim() : (currentUser.teacherId ? String(currentUser.teacherId).trim() : '');

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
    scheduleDays: 'Thứ 2, Thứ 4',
    scheduleTime: '17:30 - 19:00',
    startDate: '2025-03-01',
    endDate: '2025-08-30',
    maxCapacity: 14,
    studentIds: [],
    status: 'ongoing',
    tuitionFee: 6500000
  });
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleSlot[]>([]);

  // Schedule conflict warning inside modal
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Filter classes accessible to user: teacherId ONLY, excluding TA-only assignments
  const displayedClasses = data.classes.filter(cls => {
    if (isTeacher) {
      return Boolean(currentTeacherId) && String(cls.teacherId).trim() === currentTeacherId;
    }
    return true;
  });

  const openAddModal = () => {
    setFormData({
      name: '',
      code: '',
      level: 'Pre A1 Starters',
      courseId: data.programs[0]?.id || 'PROG-STA',
      curriculum: data.programs[0]?.name || 'Cambridge YLE Starters',
      teacherId: data.teachers[0]?.id || '',
      assistantTeacherId: '',
      classroom: data.settings.classrooms[0] || 'Phòng 101 - Smart Room',
      scheduleDays: '',
      scheduleTime: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '2025-08-31',
      maxCapacity: data.settings.maxClassCapacityDefault || 14,
      studentIds: [],
      status: 'ongoing',
      tuitionFee: 6500000
    });
    setWeeklySchedule([]);
    setEditingClass(null);
    setConflictWarning(null);
    setShowAddModal(true);
  };

  const openEditModal = (cls: ClassItem) => {
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
      scheduleDays: cls.scheduleDays,
      scheduleTime: cls.scheduleTime,
      weeklySchedule: cls.weeklySchedule,
      startDate: cls.startDate,
      endDate: cls.endDate,
      maxCapacity: cls.maxCapacity,
      studentIds: [...cls.studentIds],
      status: cls.status,
      tuitionFee: cls.tuitionFee
    });

    if (cls.weeklySchedule && cls.weeklySchedule.length > 0) {
      setWeeklySchedule(
        [...cls.weeklySchedule]
          .map(slot => ({ ...slot }))
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      );
    } else {
      const parsedSlots = getClassWeeklySchedule(cls);
      setWeeklySchedule(
        parsedSlots.map(slot => ({
          dayOfWeek: slot.dayOfWeek,
          dayName: slot.dayName,
          startTime: normalizeTimeForInput(slot.startTime, '17:30'),
          endTime: normalizeTimeForInput(slot.endTime, '19:00'),
          teacherId: cls.teacherId || '',
          assistantTeacherId: cls.assistantTeacherId || ''
        }))
      );
    }

    setConflictWarning(null);
    setShowAddModal(true);
  };

  const handleToggleWeekday = (dayOfWeek: number, dayName: string) => {
    setWeeklySchedule(prev => {
      const exists = prev.some(item => item.dayOfWeek === dayOfWeek);
      if (exists) {
        return prev.filter(item => item.dayOfWeek !== dayOfWeek);
      }
      return [
        ...prev,
        {
          dayOfWeek,
          dayName,
          startTime: '17:30',
          endTime: '19:00',
          teacherId: data.teachers[0]?.id || '',
          assistantTeacherId: ''
        }
      ].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    });
  };

  const handleUpdateWeekdaySlot = (
    dayOfWeek: number,
    updates: Partial<WeeklyScheduleSlot>
  ) => {
    setWeeklySchedule(prev =>
      prev.map(item => (item.dayOfWeek === dayOfWeek ? { ...item, ...updates } : item))
    );
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên lớp học', 'error');
      return;
    }

    if (weeklySchedule.length === 0) {
      showToast('Vui lòng chọn ít nhất một ngày học trong tuần', 'error');
      return;
    }

    const sortedSchedule = [...weeklySchedule].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    for (const slot of sortedSchedule) {
      if (!slot.startTime || !slot.endTime) {
        showToast(`Vui lòng nhập đầy đủ giờ bắt đầu và kết thúc cho ${slot.dayName}`, 'error');
        return;
      }
      const startMin = parseTimeToMinutes(slot.startTime);
      const endMin = parseTimeToMinutes(slot.endTime);
      if (startMin === null || endMin === null || endMin <= startMin) {
        showToast(`Giờ kết thúc phải sau giờ bắt đầu cho ${slot.dayName}`, 'error');
        return;
      }
    }

    const computedDays = sortedSchedule.map(s => s.dayName).join(', ');
    const computedTime =
      formatScheduleTimeSummary(
        sortedSchedule.map(s => ({
          dayOfWeek: s.dayOfWeek,
          dayName: s.dayName,
          startTime: s.startTime,
          endTime: s.endTime,
          timeRange: `${s.startTime} - ${s.endTime}`
        }))
      ) || `${sortedSchedule[0].startTime} - ${sortedSchedule[0].endTime}`;

    const primaryTeacherId = sortedSchedule[0]?.teacherId || formData.teacherId;
    const primaryTaId = sortedSchedule[0]?.assistantTeacherId || '';
    const generatedCode =
      editingClass?.code ||
      formData.code.trim() ||
      `CLS-${Date.now().toString().slice(-4)}`;

    const payload: Omit<ClassItem, 'id'> = {
      ...formData,
      code: generatedCode,
      courseId: editingClass?.courseId || formData.courseId,
      curriculum: editingClass?.curriculum || formData.curriculum,
      maxCapacity: editingClass?.maxCapacity ?? formData.maxCapacity,
      teacherId: primaryTeacherId,
      assistantTeacherId: primaryTaId || undefined,
      scheduleDays: computedDays,
      scheduleTime: computedTime,
      weeklySchedule: sortedSchedule
    };

    // Check if another class is using same room and schedule
    const roomConflict = data.classes.find(
      c =>
        (!editingClass || c.id !== editingClass.id) &&
        c.classroom === payload.classroom &&
        c.scheduleDays === payload.scheduleDays &&
        c.scheduleTime === payload.scheduleTime
    );

    if (roomConflict) {
      if (
        !window.confirm(
          `Cảnh báo: ${payload.classroom} có thể trùng lịch với lớp "${roomConflict.name}". Bạn vẫn muốn tiếp tục?`
        )
      ) {
        return;
      }
    }

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
    setSelectedStudentIds(Array.from(new Set((cls.studentIds || []).map(id => String(id).trim()).filter(Boolean))));
  };

  const toggleStudentInRoster = (studentId: string | number) => {
    const sId = String(studentId).trim();
    if (selectedStudentIds.includes(sId)) {
      setSelectedStudentIds(prev => prev.filter(id => id !== sId));
    } else {
      if (managingRosterClass && selectedStudentIds.length >= managingRosterClass.maxCapacity) {
        showToast(`Lớp đã đạt sĩ số tối đa (${managingRosterClass.maxCapacity} học sinh)`, 'warning');
        return;
      }
      setSelectedStudentIds(prev => Array.from(new Set([...prev, sId])));
    }
  };

  const handleSaveRoster = () => {
    if (!managingRosterClass) return;
    const cleanRoster = Array.from(new Set(selectedStudentIds.map(id => String(id).trim()).filter(Boolean)));
    assignStudentsToClass(managingRosterClass.id, cleanRoster);
    showToast(`Đã cập nhật sĩ số lớp: ${cleanRoster.length} học sinh`, 'success');
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

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" /> Lịch học:
                    </span>
                    <span className="font-medium text-slate-700">{cls.scheduleDays}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Ca học:
                    </span>
                    <span className="font-medium text-slate-700">{cls.scheduleTime}</span>
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
                  const sId = String(student.id).trim();
                  const isChecked = selectedStudentIds.includes(sId);
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
                          onChange={() => toggleStudentInRoster(sId)}
                          className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                        />
                        <div>
                          <div className="font-bold text-slate-900">
                            {isTeacher ? (student.vietnameseName?.trim() || student.fullName) : student.fullName} ({student.id})
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {student.currentLevel} • {student.school}{!isTeacher && ` • PH: ${student.parentPhone}`}
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
                <div className="sm:col-span-2">
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
                    <option value="B2 First (FCE)">B2 First (FCE)</option>
                    <option value="Cơ bản">Cơ bản</option>
                    <option value="Nâng cao">Nâng cao</option>
                    <option value="Khác">Khác</option>
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
              </div>

              {/* Per-weekday independent schedule */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-800 block">
                      Lịch học trong tuần (cấu hình riêng từng ngày) <span className="text-red-600">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Chọn các thứ học để thiết lập giờ học, giáo viên và trợ giảng độc lập cho từng ngày.
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold text-[11px] shrink-0">
                    Đã chọn: {weeklySchedule.length} ngày
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {WEEKDAY_OPTIONS.map(day => {
                    const isChecked = weeklySchedule.some(s => s.dayOfWeek === day.dayOfWeek);
                    return (
                      <label
                        key={day.dayOfWeek}
                        className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-red-50 border-red-400 text-red-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleWeekday(day.dayOfWeek, day.dayName)}
                          className="w-3.5 h-3.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
                        />
                        <span>{day.dayName}</span>
                      </label>
                    );
                  })}
                </div>

                {weeklySchedule.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-500">
                    Chưa chọn ngày học nào. Hãy tích chọn ít nhất 1 thứ ở trên.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {weeklySchedule.map(slot => (
                      <div
                        key={slot.dayOfWeek}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-red-600" />
                            {slot.dayName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleWeekday(slot.dayOfWeek, slot.dayName)}
                            className="text-[11px] text-slate-400 hover:text-red-600 font-semibold"
                          >
                            Bỏ chọn
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                              Giờ bắt đầu <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="time"
                              required
                              value={slot.startTime}
                              onChange={e =>
                                handleUpdateWeekdaySlot(slot.dayOfWeek, { startTime: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                              Giờ kết thúc <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="time"
                              required
                              value={slot.endTime}
                              onChange={e =>
                                handleUpdateWeekdaySlot(slot.dayOfWeek, { endTime: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                              Giáo viên
                            </label>
                            <select
                              value={slot.teacherId}
                              onChange={e =>
                                handleUpdateWeekdaySlot(slot.dayOfWeek, { teacherId: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <option value="">-- Chọn giáo viên --</option>
                              {data.teachers.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.fullName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                              Trợ giảng (TA)
                            </label>
                            <select
                              value={slot.assistantTeacherId || ''}
                              onChange={e =>
                                handleUpdateWeekdaySlot(slot.dayOfWeek, {
                                  assistantTeacherId: e.target.value
                                })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <option value="">-- Không có TA --</option>
                              {data.teachingAssistants.map(ta => (
                                <option key={ta.id} value={ta.id}>
                                  {ta.fullName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <span className="text-slate-400 block">Lịch & Giờ học:</span>
                  <span className="font-semibold text-slate-800">{viewingClass.scheduleDays} ({viewingClass.scheduleTime})</span>
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
                {(() => {
                  const dedupStudentIds = Array.from(new Set((viewingClass.studentIds || []).map(sid => String(sid).trim()).filter(Boolean)));
                  return (
                    <>
                      <h4 className="font-bold text-slate-800 text-sm mb-2">
                        Danh sách học sinh ({dedupStudentIds.length}/{viewingClass.maxCapacity})
                      </h4>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {dedupStudentIds.map((sid, idx) => {
                          const st = data.students.find(s => String(s.id).trim() === sid);
                          if (!st) return null;
                          return (
                            <div key={sid} className="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                                  {idx + 1}
                                </span>
                                <span className="font-bold text-slate-800">
                                  {isTeacher ? (st.vietnameseName?.trim() || st.fullName) : st.fullName}
                                </span>
                                <span className="text-slate-400">({st.id})</span>
                              </div>
                              {!isTeacher && (
                                <span className="text-slate-500 font-medium">PH: {st.parentPhone}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
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
