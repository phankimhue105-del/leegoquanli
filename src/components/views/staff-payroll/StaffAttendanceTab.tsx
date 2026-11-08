import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Save,
  Check,
  Lock,
  Unlock,
  AlertCircle,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import {
  StaffAttendanceStatus,
  STAFF_ATTENDANCE_STATUS_LABELS,
  STAFF_POSITION_LABELS,
  WorkingShift
} from '../../../types/payroll';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../common/Toast';

interface LocalAttendanceRow {
  staffId: string;
  staffName: string;
  position: string;
  status: StaffAttendanceStatus;
  workingSessions: number;
  workingHours: number;
  notes: string;
}

export const StaffAttendanceTab: React.FC = () => {
  const {
    data,
    saveBulkStaffAttendance,
    isAttendancePeriodLocked,
    lockAttendancePeriod,
    unlockAttendancePeriod
  } = useData();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedShiftId, setSelectedShiftId] = useState<string>(
    data.staffShifts[0]?.id || 'SHIFT-MORNING'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPosition, setFilterPosition] = useState<string>('all');

  // Reopen/Unlock Modal state
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  // Lock status for the current month
  const [year, month] = selectedDate.split('-').map(Number);
  const isLocked = isAttendancePeriodLocked(month, year);

  const selectedShift = data.staffShifts.find(s => s.id === selectedShiftId) || data.staffShifts[0];

  // Active staff list
  const activeStaff = useMemo(() => {
    return data.staffList.filter(s => s.status === 'active');
  }, [data.staffList]);

  // Existing attendance records for this date and shift
  const existingForShift = useMemo(() => {
    return data.staffAttendance.filter(
      r => r.date === selectedDate && r.shiftId === selectedShiftId
    );
  }, [data.staffAttendance, selectedDate, selectedShiftId]);

  // Form rows state
  const [attendanceRows, setAttendanceRows] = useState<LocalAttendanceRow[]>([]);

  // Synchronize rows when date, shift, or staff changes
  useEffect(() => {
    const existingMap = new Map(existingForShift.map(r => [r.staffId, r]));

    const rows: LocalAttendanceRow[] = activeStaff.map(stf => {
      const existing = existingMap.get(stf.id);
      if (existing) {
        return {
          staffId: stf.id,
          staffName: stf.fullName,
          position: stf.position,
          status: existing.status,
          workingSessions: existing.workingSessions,
          workingHours: existing.workingHours,
          notes: existing.notes || ''
        };
      }
      return {
        staffId: stf.id,
        staffName: stf.fullName,
        position: stf.position,
        status: 'present',
        workingSessions: selectedShift?.standardSessions || 1,
        workingHours: selectedShift?.standardHours || 4,
        notes: ''
      };
    });

    setAttendanceRows(rows);
  }, [selectedDate, selectedShiftId, activeStaff, existingForShift, selectedShift]);

  // Filtered rows for search / position filter
  const visibleRows = useMemo(() => {
    return attendanceRows.filter(r => {
      if (filterPosition !== 'all' && r.position !== filterPosition) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.staffName.toLowerCase().includes(q) || r.staffId.toLowerCase().includes(q);
      }
      return true;
    });
  }, [attendanceRows, filterPosition, searchQuery]);

  // Handlers for individual fields
  const handleStatusChange = (staffId: string, status: StaffAttendanceStatus) => {
    if (isLocked) {
      showToast('Kỳ chấm công đã bị khóa!', 'error');
      return;
    }

    setAttendanceRows(prev =>
      prev.map(row => {
        if (row.staffId !== staffId) return row;

        let workingSessions = selectedShift.standardSessions;
        let workingHours = selectedShift.standardHours;

        if (status === 'half_day') {
          workingSessions = workingSessions * 0.5;
          workingHours = workingHours * 0.5;
        } else if (status === 'absent' || status === 'leave') {
          workingSessions = 0;
          workingHours = 0;
        } else if (status === 'extra_shift') {
          workingSessions = workingSessions;
          workingHours = workingHours;
        }

        return { ...row, status, workingSessions, workingHours };
      })
    );
  };

  const handleSessionsChange = (staffId: string, sessions: number) => {
    if (isLocked) return;
    setAttendanceRows(prev =>
      prev.map(r => (r.staffId === staffId ? { ...r, workingSessions: Math.max(0, sessions) } : r))
    );
  };

  const handleHoursChange = (staffId: string, hours: number) => {
    if (isLocked) return;
    setAttendanceRows(prev =>
      prev.map(r => (r.staffId === staffId ? { ...r, workingHours: Math.max(0, hours) } : r))
    );
  };

  const handleNotesChange = (staffId: string, notes: string) => {
    if (isLocked) return;
    setAttendanceRows(prev =>
      prev.map(r => (r.staffId === staffId ? { ...r, notes } : r))
    );
  };

  const handleMarkAllPresent = () => {
    if (isLocked) {
      showToast('Kỳ chấm công đã bị khóa!', 'error');
      return;
    }
    setAttendanceRows(prev =>
      prev.map(r => ({
        ...r,
        status: 'present',
        workingSessions: selectedShift.standardSessions,
        workingHours: selectedShift.standardHours
      }))
    );
    showToast('Đã đánh dấu tất cả nhân sự có mặt!', 'info');
  };

  const handleSave = () => {
    if (isLocked) {
      showToast('Kỳ công đã bị khóa. Không thể lưu thay đổi!', 'error');
      return;
    }

    const payload = attendanceRows.map(r => ({
      staffId: r.staffId,
      status: r.status,
      workingSessions: r.workingSessions,
      workingHours: r.workingHours,
      notes: r.notes
    }));

    const result = saveBulkStaffAttendance(selectedDate, selectedShiftId, payload);
    if (result.success) {
      showToast(`Đã lưu điểm danh ngày ${selectedDate} cho ca ${selectedShift.name}!`, 'success');
    } else {
      showToast(result.error || 'Có lỗi xảy ra', 'error');
    }
  };

  const handleToggleLock = () => {
    if (isLocked) {
      setIsUnlockModalOpen(true);
    } else {
      if (confirm(`Bạn có chắc chắn muốn khóa kỳ chấm công tháng ${month}/${year}? Sau khi khóa, nhân sự không thể chỉnh sửa điểm danh.`)) {
        lockAttendancePeriod(month, year);
        showToast(`Đã khóa kỳ chấm công tháng ${month}/${year}!`, 'success');
      }
    }
  };

  const handleConfirmUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockReason.trim()) {
      showToast('Vui lòng nhập lý do mở khóa!', 'error');
      return;
    }

    const result = unlockAttendancePeriod(month, year, unlockReason.trim());
    if (result.success) {
      showToast(`Đã mở khóa kỳ công tháng ${month}/${year}!`, 'success');
      setIsUnlockModalOpen(false);
      setUnlockReason('');
    } else {
      showToast(result.error || 'Lỗi', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Ngày chấm công</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Ca làm việc</label>
            <select
              value={selectedShiftId}
              onChange={e => setSelectedShiftId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-red-500"
            >
              {data.staffShifts.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startTime} - {s.endTime})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Lọc vị trí</label>
            <select
              value={filterPosition}
              onChange={e => setFilterPosition(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Tất cả vị trí ({activeStaff.length} người)</option>
              {Object.entries(STAFF_POSITION_LABELS).map(([pos, label]) => (
                <option key={pos} value={pos}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tìm kiếm</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tên hoặc mã..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-2 pl-7 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 w-36"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end">
          <button
            onClick={handleToggleLock}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
              isLocked
                ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {isLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4 text-slate-500" />}
            <span>{isLocked ? 'Kỳ công đã khóa (Mở lại)' : 'Khóa kỳ công'}</span>
          </button>

          <button
            onClick={handleMarkAllPresent}
            disabled={isLocked}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl font-bold transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Tất cả có mặt</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isLocked}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md shadow-red-950/20 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Lưu điểm danh</span>
          </button>
        </div>
      </div>

      {/* Lock Notice Banner */}
      {isLocked && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Kỳ công tháng {month}/{year} đã được khóa bởi Admin.</strong> Bảng điểm danh được đóng băng để chuẩn bị chốt lương.
            </span>
          </div>
          <button
            onClick={() => setIsUnlockModalOpen(true)}
            className="underline font-bold text-amber-900 hover:text-amber-700"
          >
            Mở khóa để điều chỉnh
          </button>
        </div>
      )}

      {/* Daily Attendance Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-red-600" />
            <span>
              Danh sách chấm công ngày {selectedDate} – Ca: {selectedShift.name} ({visibleRows.length} nhân sự)
            </span>
          </div>
          {existingForShift.length > 0 && (
            <span className="text-[11px] text-slate-500">
              Đã lưu {existingForShift.length} bản ghi bởi <strong>{existingForShift[0].recordedBy}</strong>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">STT</th>
                <th className="py-3 px-4 w-48">Nhân sự</th>
                <th className="py-3 px-4">Trạng thái chấm công (7 Trạng thái)</th>
                <th className="py-3 px-3 w-20 text-center">Số buổi</th>
                <th className="py-3 px-3 w-20 text-center">Số giờ</th>
                <th className="py-3 px-4 w-56">Ghi chú / Lý do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy nhân sự phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, idx) => {
                  const statusConfig = STAFF_ATTENDANCE_STATUS_LABELS[row.status];
                  return (
                    <tr key={row.staffId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{row.staffName}</div>
                        <div className="text-[11px] text-slate-400">
                          {row.staffId} • {STAFF_POSITION_LABELS[row.position as any]}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(
                            [
                              'present',
                              'late',
                              'half_day',
                              'leave',
                              'compensatory_leave',
                              'extra_shift',
                              'absent'
                            ] as StaffAttendanceStatus[]
                          ).map(st => {
                            const isSelected = row.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleStatusChange(row.staffId, st)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-red-600 text-white shadow-xs font-bold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {STAFF_ATTENDANCE_STATUS_LABELS[st].shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="4"
                          disabled={isLocked}
                          value={row.workingSessions}
                          onChange={e => handleSessionsChange(row.staffId, Number(e.target.value))}
                          className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="12"
                          disabled={isLocked}
                          value={row.workingHours}
                          onChange={e => handleHoursChange(row.staffId, Number(e.target.value))}
                          className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={row.notes}
                          onChange={e => handleNotesChange(row.staffId, e.target.value)}
                          placeholder="Lý do đi muộn, ca dạy..."
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs disabled:opacity-50"
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

      {/* Reopen/Unlock Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Mở Khóa Kỳ Chấm Công</h3>
                <p className="text-xs text-slate-500">Tháng {month}/{year}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmUnlock} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Lý do mở khóa bắt buộc <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={unlockReason}
                  onChange={e => setUnlockReason(e.target.value)}
                  placeholder="VD: Giáo viên David Miller bổ sung ca dạy bù lớp Movers..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
                Thao tác mở khóa sẽ được ghi lại trong Nhật ký kiểm toán (Audit Log) bao gồm người thực hiện, thời điểm và lý do.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Xác nhận mở khóa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
