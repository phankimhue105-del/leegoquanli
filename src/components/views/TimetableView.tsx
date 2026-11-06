import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  UserCheck,
  AlertTriangle,
  X,
  Trash2,
  Edit2,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { TimetableSession } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';

export const TimetableView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, addTimetableSession, updateTimetableSession, deleteTimetableSession, checkScheduleConflict } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const teacherObj = isTeacher ? data.teachers.find(t => t.id === currentUser.teacherId || t.email === currentUser.email) : null;

  // Filters
  const [filterMode, setFilterMode] = useState<'all' | 'teacher' | 'classroom' | 'class'>('all');
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>('all');
  const [calendarView, setCalendarView] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<number>(1); // 1 = Mon

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSession, setEditingSession] = useState<TimetableSession | null>(null);

  // Form State
  const [sessionFormData, setSessionFormData] = useState<Omit<TimetableSession, 'id'>>({
    classId: data.classes[0]?.id || '',
    className: data.classes[0]?.name || '',
    teacherId: data.teachers[0]?.id || '',
    teacherName: data.teachers[0]?.fullName || '',
    assistantId: data.teachingAssistants[0]?.id || '',
    assistantName: data.teachingAssistants[0]?.fullName || '',
    classroom: data.settings.classrooms[0] || 'Phòng 101 - Smart Room',
    dayOfWeek: 1,
    dayName: 'Thứ 2',
    startTime: '17:30',
    endTime: '19:00',
    status: 'scheduled'
  });

  const [activeConflicts, setActiveConflicts] = useState<string[]>([]);

  // Days of week definitions
  const daysOfWeek = [
    { dayNumber: 1, name: 'Thứ 2' },
    { dayNumber: 2, name: 'Thứ 3' },
    { dayNumber: 3, name: 'Thứ 4' },
    { dayNumber: 4, name: 'Thứ 5' },
    { dayNumber: 5, name: 'Thứ 6' },
    { dayNumber: 6, name: 'Thứ 7' },
    { dayNumber: 7, name: 'Chủ Nhật' }
  ];

  // Filter sessions
  const filteredSessions = data.timetable.filter(session => {
    // If logged in as teacher, show only their sessions by default
    if (isTeacher) {
      if (teacherObj && session.teacherId !== teacherObj.id) return false;
    }

    if (filterMode === 'teacher' && selectedFilterValue !== 'all') {
      if (session.teacherId !== selectedFilterValue) return false;
    }

    if (filterMode === 'classroom' && selectedFilterValue !== 'all') {
      if (session.classroom !== selectedFilterValue) return false;
    }

    if (filterMode === 'class' && selectedFilterValue !== 'all') {
      if (session.classId !== selectedFilterValue) return false;
    }

    if (calendarView === 'day' && session.dayOfWeek !== selectedDay) {
      return false;
    }

    return true;
  });

  // Check conflicts dynamically when form fields change
  const handleFormChange = (field: keyof Omit<TimetableSession, 'id'>, value: any) => {
    const updated = { ...sessionFormData, [field]: value };

    // sync class name if classId changed
    if (field === 'classId') {
      const cls = data.classes.find(c => c.id === value);
      if (cls) {
        updated.className = cls.name;
        if (cls.teacherId) {
          const t = data.teachers.find(teacher => teacher.id === cls.teacherId);
          if (t) {
            updated.teacherId = t.id;
            updated.teacherName = t.fullName;
          }
        }
      }
    }

    // sync teacher name if teacherId changed
    if (field === 'teacherId') {
      const t = data.teachers.find(teacher => teacher.id === value);
      if (t) updated.teacherName = t.fullName;
    }

    // sync day name
    if (field === 'dayOfWeek') {
      const dayObj = daysOfWeek.find(d => d.dayNumber === Number(value));
      if (dayObj) updated.dayName = dayObj.name;
    }

    setSessionFormData(updated);

    // Run conflict checker
    const conflictResult = checkScheduleConflict(
      updated.dayOfWeek,
      updated.startTime,
      updated.endTime,
      updated.teacherId,
      updated.classroom,
      updated.classId,
      editingSession ? editingSession.id : undefined
    );

    setActiveConflicts(conflictResult.details);
  };

  const openAddSessionModal = () => {
    const firstClass = data.classes[0];
    const firstTeacher = data.teachers.find(t => t.id === firstClass?.teacherId) || data.teachers[0];

    setSessionFormData({
      classId: firstClass?.id || '',
      className: firstClass?.name || '',
      teacherId: firstTeacher?.id || '',
      teacherName: firstTeacher?.fullName || '',
      assistantId: data.teachingAssistants[0]?.id || '',
      assistantName: data.teachingAssistants[0]?.fullName || '',
      classroom: data.settings.classrooms[0] || 'Phòng 101 - Smart Room',
      dayOfWeek: 1,
      dayName: 'Thứ 2',
      startTime: '17:30',
      endTime: '19:00',
      status: 'scheduled'
    });
    setEditingSession(null);
    setActiveConflicts([]);
    setShowAddModal(true);
  };

  const openEditSessionModal = (session: TimetableSession) => {
    setEditingSession(session);
    setSessionFormData({
      classId: session.classId,
      className: session.className,
      teacherId: session.teacherId,
      teacherName: session.teacherName,
      assistantId: session.assistantId,
      assistantName: session.assistantName,
      classroom: session.classroom,
      dayOfWeek: session.dayOfWeek,
      dayName: session.dayName,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status
    });
    setActiveConflicts([]);
    setShowAddModal(true);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeConflicts.length > 0) {
      if (!window.confirm('Cảnh báo: Có xung đột lịch học! Bạn có chắc chắn muốn bỏ qua và tiếp tục lưu?')) {
        return;
      }
    }

    if (editingSession) {
      const res = updateTimetableSession(editingSession.id, sessionFormData);
      if (res.success) {
        showToast('Đã cập nhật ca học thành công', 'success');
        setShowAddModal(false);
      } else {
        showToast('Không thể cập nhật do có xung đột lịch!', 'error');
      }
    } else {
      const res = addTimetableSession(sessionFormData);
      if (res.success) {
        showToast('Đã thêm ca học vào thời khóa biểu', 'success');
        setShowAddModal(false);
      } else {
        showToast('Không thể thêm do xung đột lịch nghiêm trọng!', 'error');
      }
    }
  };

  const handleDeleteSession = (session: TimetableSession) => {
    if (window.confirm(`Bạn có chắc muốn xóa ca học lớp ${session.className} vào ${session.dayName}?`)) {
      deleteTimetableSession(session.id);
      showToast('Đã xóa ca học khỏi thời khóa biểu', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-red-600" />
            Thời Khóa Biểu Tuần (Weekly Timetable)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động phát hiện trùng phòng học, trùng ca giáo viên và lịch học của lớp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                calendarView === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Xem theo Tuần
            </button>
            <button
              onClick={() => setCalendarView('day')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                calendarView === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Xem theo Ngày
            </button>
          </div>

          {!isTeacher && (
            <button
              onClick={openAddSessionModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-950/20"
            >
              <Plus className="w-4 h-4" />
              <span>Xếp ca học mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Lọc theo:
          </span>

          <select
            value={filterMode}
            onChange={e => {
              setFilterMode(e.target.value as any);
              setSelectedFilterValue('all');
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="all">Tất cả lịch học</option>
            <option value="teacher">Theo Giáo viên</option>
            <option value="classroom">Theo Phòng học</option>
            <option value="class">Theo Lớp học</option>
          </select>

          {filterMode === 'teacher' && (
            <select
              value={selectedFilterValue}
              onChange={e => setSelectedFilterValue(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">-- Chọn giáo viên --</option>
              {data.teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          )}

          {filterMode === 'classroom' && (
            <select
              value={selectedFilterValue}
              onChange={e => setSelectedFilterValue(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">-- Chọn phòng học --</option>
              {data.settings.classrooms.map(rm => (
                <option key={rm} value={rm}>
                  {rm}
                </option>
              ))}
            </select>
          )}

          {filterMode === 'class' && (
            <select
              value={selectedFilterValue}
              onChange={e => setSelectedFilterValue(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">-- Chọn lớp học --</option>
              {data.classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {calendarView === 'day' && (
          <div className="flex items-center gap-1">
            {daysOfWeek.map(d => (
              <button
                key={d.dayNumber}
                onClick={() => setSelectedDay(d.dayNumber)}
                className={`px-3 py-1 rounded-lg font-bold ${
                  selectedDay === d.dayNumber
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TIMETABLE GRID */}
      {calendarView === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {daysOfWeek.map(day => {
            const daySessions = filteredSessions.filter(s => s.dayOfWeek === day.dayNumber);
            return (
              <div
                key={day.dayNumber}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col"
              >
                {/* Day Header */}
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-center">
                  <div className="font-extrabold text-slate-800 text-xs">{day.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{daySessions.length} ca học</div>
                </div>

                {/* Day Sessions List */}
                <div className="p-2 space-y-2 flex-1 min-h-[300px] bg-slate-50/30">
                  {daySessions.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[11px] text-slate-300 italic text-center p-4">
                      Trống lịch
                    </div>
                  ) : (
                    daySessions.map(session => (
                      <div
                        key={session.id}
                        className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-red-300 transition-all text-xs space-y-2 relative group"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900 leading-tight block">
                            {session.className}
                          </span>
                          {!isTeacher && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEditSessionModal(session)}
                                className="p-1 hover:text-amber-600 text-slate-400"
                                title="Sửa ca học"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session)}
                                className="p-1 hover:text-red-600 text-slate-400"
                                title="Hủy ca học"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-500">
                          <div className="flex items-center gap-1 font-semibold text-red-600">
                            <Clock className="w-3 h-3" />
                            <span>{session.startTime} - {session.endTime}</span>
                          </div>

                          <div className="flex items-center gap-1 text-slate-700">
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{session.teacherName}</span>
                          </div>

                          <div className="flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{session.classroom}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // DAY VIEW
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <h3 className="font-bold text-slate-800 text-base mb-4">
            Lịch học chi tiết: {daysOfWeek.find(d => d.dayNumber === selectedDay)?.name}
          </h3>

          <div className="space-y-3">
            {filteredSessions.length === 0 ? (
              <p className="text-slate-400 italic text-xs py-8 text-center">
                Không có ca học nào được xếp vào ngày này.
              </p>
            ) : (
              filteredSessions.map(session => (
                <div
                  key={session.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center">
                      <Clock className="w-4 h-4 mb-1" />
                      <span>{session.startTime}</span>
                      <span>{session.endTime}</span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{session.className}</h4>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span>Giáo viên: <strong className="text-slate-700">{session.teacherName}</strong></span>
                        {session.assistantName && <span>Trợ giảng: <strong>{session.assistantName}</strong></span>}
                        <span>Phòng: <strong className="text-slate-700">{session.classroom}</strong></span>
                      </div>
                    </div>
                  </div>

                  {!isTeacher && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditSessionModal(session)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT SESSION MODAL WITH CONFLICT CHECKING */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl z-10 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">
                {editingSession ? 'Sửa ca học thời khóa biểu' : 'Thêm ca học mới'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="py-4 space-y-4 text-xs">
              {/* Conflict Warning Alert Box */}
              {activeConflicts.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                  <div className="font-bold text-red-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Phát hiện xung đột lịch học ({activeConflicts.length}):
                  </div>
                  <ul className="list-disc list-inside text-red-700 text-[11px] space-y-0.5">
                    {activeConflicts.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Lớp học</label>
                  <select
                    value={sessionFormData.classId}
                    onChange={e => handleFormChange('classId', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  >
                    {data.classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.level})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Giáo viên phụ trách</label>
                  <select
                    value={sessionFormData.teacherId}
                    onChange={e => handleFormChange('teacherId', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {data.teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phòng học</label>
                  <select
                    value={sessionFormData.classroom}
                    onChange={e => handleFormChange('classroom', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {data.settings.classrooms.map(rm => (
                      <option key={rm} value={rm}>
                        {rm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Thứ trong tuần</label>
                  <select
                    value={sessionFormData.dayOfWeek}
                    onChange={e => handleFormChange('dayOfWeek', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {daysOfWeek.map(d => (
                      <option key={d.dayNumber} value={d.dayNumber}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trợ giảng</label>
                  <select
                    value={sessionFormData.assistantId || ''}
                    onChange={e => handleFormChange('assistantId', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Không có TA --</option>
                    {data.teachingAssistants.map(ta => (
                      <option key={ta.id} value={ta.id}>
                        {ta.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={sessionFormData.startTime}
                    onChange={e => handleFormChange('startTime', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    value={sessionFormData.endTime}
                    onChange={e => handleFormChange('endTime', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-950/20"
                >
                  {editingSession ? 'Lưu thay đổi' : 'Xác nhận xếp lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
