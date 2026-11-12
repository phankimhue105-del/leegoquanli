import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Save,
  Calendar,
  Users,
  Search,
  Check,
  Download,
  Filter
} from 'lucide-react';
import { AttendanceStatus, StudentAttendanceEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import { exportAttendanceReportToExcel } from '../../services/dataService';

export const AttendanceView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, saveAttendance } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const teacherObj = isTeacher ? data.teachers.find(t => t.id === currentUser.teacherId || t.email === currentUser.email) : null;
  const teacherClassIds = teacherObj ? teacherObj.assignedClassIds : [];

  const availableClasses = useMemo(() => {
    if (isTeacher) {
      return data.classes.filter(c => teacherClassIds.includes(c.id));
    }
    return data.classes;
  }, [data.classes, isTeacher, teacherClassIds]);

  // Selected Class & Date for taking attendance
  const [selectedClassId, setSelectedClassId] = useState<string>(availableClasses[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const selectedClass = data.classes.find(c => c.id === selectedClassId);

  // Check if attendance already recorded for this class & date
  const existingRecord = data.attendance.find(
    a => a.classId === selectedClassId && a.date === selectedDate
  );

  // Active attendance entries in form
  const [attendanceEntries, setAttendanceEntries] = useState<StudentAttendanceEntry[]>(() => {
    if (existingRecord) return existingRecord.records;
    if (selectedClass) {
      return selectedClass.studentIds.map(sid => {
        const student = data.students.find(s => s.id === sid);
        return {
          studentId: sid,
          studentName: student?.fullName || sid,
          status: 'present',
          note: ''
        };
      });
    }
    return [];
  });

  // Re-sync attendance entries when class or date changes
  React.useEffect(() => {
    if (existingRecord) {
      setAttendanceEntries(existingRecord.records);
    } else if (selectedClass) {
      setAttendanceEntries(
        selectedClass.studentIds.map(sid => {
          const student = data.students.find(s => s.id === sid);
          return {
            studentId: sid,
            studentName: student?.fullName || sid,
            status: 'present',
            note: ''
          };
        })
      );
    } else {
      setAttendanceEntries([]);
    }
  }, [selectedClassId, selectedDate, existingRecord, selectedClass]);

  // Status counters
  const presentCount = attendanceEntries.filter(e => e.status === 'present').length;
  const absentCount = attendanceEntries.filter(e => e.status === 'absent').length;
  const lateCount = attendanceEntries.filter(e => e.status === 'late').length;
  const excusedCount = attendanceEntries.filter(e => e.status === 'excused').length;
  const attendanceRate = attendanceEntries.length > 0 ? Math.round((presentCount / attendanceEntries.length) * 100) : 100;

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceEntries(prev =>
      prev.map(item => (item.studentId === studentId ? { ...item, status } : item))
    );
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceEntries(prev =>
      prev.map(item => (item.studentId === studentId ? { ...item, note } : item))
    );
  };

  const handleMarkAllPresent = () => {
    setAttendanceEntries(prev => prev.map(item => ({ ...item, status: 'present' })));
    showToast('Đã đánh dấu tất cả học sinh có mặt!', 'info');
  };

  const handleSaveAttendance = () => {
    if (!selectedClass) {
      showToast('Vui lòng chọn lớp học', 'error');
      return;
    }

    saveAttendance(
      selectedClassId,
      selectedDate,
      attendanceEntries,
      selectedClass.scheduleTime
    );

    showToast(`Đã lưu điểm danh lớp ${selectedClass.name} ngày ${selectedDate}!`, 'success');
  };

  const handleExportAttendance = () => {
    exportAttendanceReportToExcel(data.attendance);
    showToast('Đã xuất báo cáo điểm danh ra file Excel', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-red-600" />
            Điểm Danh Học Viên (Attendance Management)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận chính xác tình trạng đi học, chuyên cần, đi muộn và lý do vắng mặt.
          </p>
        </div>

        <button
          onClick={handleExportAttendance}
          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Xuất báo cáo điểm danh Excel</span>
        </button>
      </div>

      {/* Control Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Chọn lớp học</label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-red-500"
          >
            {availableClasses.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.scheduleDays} - {cls.scheduleTime})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Ngày điểm danh</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-red-500"
          >
          </input>
        </div>

        <div className="flex items-end justify-between gap-2">
          <button
            onClick={handleMarkAllPresent}
            className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Tất cả có mặt</span>
          </button>

          <button
            onClick={handleSaveAttendance}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-950/20 flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Lưu điểm danh</span>
          </button>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-xl text-center">
          <div className="text-xl font-black text-emerald-700">{presentCount}</div>
          <div className="text-[11px] font-semibold text-emerald-800">Có mặt ({attendanceRate}%)</div>
        </div>

        <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-xl text-center">
          <div className="text-xl font-black text-amber-700">{lateCount}</div>
          <div className="text-[11px] font-semibold text-amber-800">Đi muộn</div>
        </div>

        <div className="bg-blue-50 border border-blue-200/80 p-3.5 rounded-xl text-center">
          <div className="text-xl font-black text-blue-700">{excusedCount}</div>
          <div className="text-[11px] font-semibold text-blue-800">Vắng có phép</div>
        </div>

        <div className="bg-red-50 border border-red-200/80 p-3.5 rounded-xl text-center">
          <div className="text-xl font-black text-red-700">{absentCount}</div>
          <div className="text-[11px] font-semibold text-red-800">Vắng không phép</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="font-bold text-slate-800">
            Danh sách học viên lớp {selectedClass?.name} ({attendanceEntries.length} học sinh)
          </div>
          {existingRecord && (
            <span className="text-[11px] text-slate-500">
              Lần lưu gần nhất: {existingRecord.takenAt} bởi <strong>{existingRecord.takenBy}</strong>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Họ và Tên học sinh</th>
                <th className="py-3 px-4">Trạng thái điểm danh</th>
                <th className="py-3 px-4">Ghi chú của giáo viên / Lý do vắng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    Lớp học này chưa có học sinh nào trong danh sách.
                  </td>
                </tr>
              ) : (
                attendanceEntries.map((entry, idx) => {
                  const student = data.students.find(s => s.id === entry.studentId);
                  return (
                    <tr key={entry.studentId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {isTeacher
                            ? (student?.vietnameseName?.trim() || student?.fullName || entry.studentName)
                            : entry.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {entry.studentId}{!isTeacher && ` • PH: ${student?.parentPhone}`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(entry.studentId, 'present')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                              entry.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            Có mặt
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(entry.studentId, 'late')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                              entry.status === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                          >
                            Đi muộn
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(entry.studentId, 'excused')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                              entry.status === 'excused'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                          >
                            Có phép
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(entry.studentId, 'absent')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                              entry.status === 'absent'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                            }`}
                          >
                            Vắng mặt
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Nhập ghi chú hoặc lý do nếu có..."
                          value={entry.note || ''}
                          onChange={e => handleNoteChange(entry.studentId, e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance History Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-3">Lịch sử các buổi điểm danh gần đây</h3>
        <div className="space-y-2 text-xs">
          {data.attendance.slice(0, 5).map(att => (
            <div
              key={att.id}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <span className="font-bold text-slate-900">{att.className}</span>
                <span className="text-slate-500 ml-2">Ngày: {att.date} ({att.sessionTime})</span>
                <span className="text-slate-400 block sm:inline sm:ml-2">GV: {att.teacherName}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  {att.presentCount}/{att.totalStudents} có mặt
                </span>
                {att.absentCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[11px]">
                    {att.absentCount} vắng
                  </span>
                )}
                {att.lateCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                    {att.lateCount} trễ
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
