import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  Download,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  Search
} from 'lucide-react';
import {
  MonthlyWorkRecordSummary,
  STAFF_POSITION_LABELS,
  STAFF_PAY_TYPE_LABELS,
  STAFF_ATTENDANCE_STATUS_LABELS,
  StaffAttendanceRecord
} from '../../../types/payroll';
import { useData } from '../../../context/DataContext';
import { aggregateAllWorkRecords, exportWorkRecordsToExcel } from '../../../services/payrollService';
import { useToast } from '../../common/Toast';

interface StaffWorkRecordsTabProps {
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
}

export const StaffWorkRecordsTab: React.FC<StaffWorkRecordsTabProps> = ({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}) => {
  const { data } = useData();
  const { showToast } = useToast();

  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drill-down Modal State
  const [drillDownStaffId, setDrillDownStaffId] = useState<string | null>(null);

  // Compute aggregated work records for this month
  const allSummaries = useMemo(() => {
    return aggregateAllWorkRecords(
      data.staffList,
      data.staffAttendance,
      selectedMonth,
      selectedYear
    );
  }, [data.staffList, data.staffAttendance, selectedMonth, selectedYear]);

  // Filter summaries
  const visibleSummaries = useMemo(() => {
    return allSummaries.filter(s => {
      if (positionFilter !== 'all' && s.position !== positionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.staffName.toLowerCase().includes(q) || s.staffId.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allSummaries, positionFilter, searchQuery]);

  // Drill-down records for selected staff member
  const drillDownStaff = data.staffList.find(s => s.id === drillDownStaffId);
  const drillDownRecords = useMemo(() => {
    if (!drillDownStaffId) return [];
    return data.staffAttendance.filter(r => {
      if (r.staffId !== drillDownStaffId) return false;
      const [y, m] = r.date.split('-').map(Number);
      return y === selectedYear && m === selectedMonth;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [drillDownStaffId, data.staffAttendance, selectedMonth, selectedYear]);

  const handleExport = () => {
    exportWorkRecordsToExcel(visibleSummaries, selectedMonth, selectedYear);
    showToast(`Đã xuất Bảng công tháng ${selectedMonth}/${selectedYear} ra file Excel!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="font-bold text-slate-700">Kỳ công:</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-bold text-slate-700">Vị trí:</label>
            <select
              value={positionFilter}
              onChange={e => setPositionFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Tất cả chức danh</option>
              {Object.entries(STAFF_POSITION_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Tìm nhân sự..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 pl-7 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          </div>
        </div>

        <button
          onClick={handleExport}
          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Xuất Bảng Công Excel</span>
        </button>
      </div>

      {/* Aggregated Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-red-600" />
            <span>
              Bảng công tổng hợp tháng {selectedMonth}/{selectedYear} ({visibleSummaries.length} nhân sự)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click vào dòng hoặc nút xem để kiểm tra chi tiết từng ngày
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">STT</th>
                <th className="py-3 px-4">Mã NS</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4">Vị trí</th>
                <th className="py-3 px-3 text-center">Ngày làm</th>
                <th className="py-3 px-3 text-center">Tổng buổi</th>
                <th className="py-3 px-3 text-center">Tổng giờ</th>
                <th className="py-3 px-3 text-center bg-indigo-50/50 text-indigo-900">Buổi tính lương</th>
                <th className="py-3 px-3 text-center bg-indigo-50/50 text-indigo-900">Ca tính lương</th>
                <th className="py-3 px-3 text-center">Đi muộn</th>
                <th className="py-3 px-3 text-center">Vắng KP</th>
                <th className="py-3 px-3 text-center">Nghỉ phép</th>
                <th className="py-3 px-3 text-center">Tăng ca</th>
                <th className="py-3 px-3 text-center">Chuyên cần</th>
                <th className="py-3 px-3 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleSummaries.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    Chưa có dữ liệu chấm công cho kỳ này.
                  </td>
                </tr>
              ) : (
                visibleSummaries.map((summary, idx) => (
                  <tr
                    key={summary.staffId}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => setDrillDownStaffId(summary.staffId)}
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-600">{summary.staffId}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{summary.staffName}</div>
                      <div className="text-[10px] text-slate-400">
                        {STAFF_PAY_TYPE_LABELS[summary.payType]}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {STAFF_POSITION_LABELS[summary.position]}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {summary.totalWorkingDays}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {summary.totalWorkingSessions}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-slate-700">
                      {summary.totalWorkingHours}h
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-indigo-700 bg-indigo-50/30">
                      {summary.paidSessions}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-indigo-700 bg-indigo-50/30">
                      {summary.paidShifts}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {summary.lateArrivals > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {summary.lateArrivals}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {summary.absences > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          {summary.absences}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">
                      {summary.leaveDays > 0 ? summary.leaveDays : '-'}
                    </td>
                    <td className="py-3 px-3 text-center text-indigo-600 font-semibold">
                      {summary.extraShifts > 0 ? `+${summary.extraShifts}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold ${
                          summary.attendanceRate >= 95
                            ? 'text-emerald-700'
                            : summary.attendanceRate >= 80
                            ? 'text-amber-700'
                            : 'text-red-600'
                        }`}
                      >
                        {summary.attendanceRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setDrillDownStaffId(summary.staffId)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Xem chi tiết các ngày"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Modal */}
      {drillDownStaffId && drillDownStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Lịch Sử Chấm Công Chi Tiết: {drillDownStaff.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  {drillDownStaff.id} • {STAFF_POSITION_LABELS[drillDownStaff.position]} • Tháng {selectedMonth}/{selectedYear}
                </p>
              </div>
              <button
                onClick={() => setDrillDownStaffId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {drillDownRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Không có bản ghi điểm danh nào trong tháng này.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Ngày</th>
                      <th className="py-2.5 px-3">Ca làm việc</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3 text-center">Buổi</th>
                      <th className="py-2.5 px-3 text-center">Giờ</th>
                      <th className="py-2.5 px-3">Ghi chú</th>
                      <th className="py-2.5 px-3">Người ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drillDownRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{r.date}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.shiftName}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STAFF_ATTENDANCE_STATUS_LABELS[r.status]?.bgColor || 'bg-slate-100'} ${STAFF_ATTENDANCE_STATUS_LABELS[r.status]?.color || 'text-slate-600'}`}
                          >
                            {STAFF_ATTENDANCE_STATUS_LABELS[r.status]?.label || r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">{r.workingSessions}</td>
                        <td className="py-2.5 px-3 text-center text-slate-700">{r.workingHours}h</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.notes || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">{r.recordedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDrillDownStaffId(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold rounded-xl text-xs text-slate-700"
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
