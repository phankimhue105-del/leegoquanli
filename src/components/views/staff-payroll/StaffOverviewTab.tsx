import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  CalendarCheck2,
  CalendarX2,
  AlertTriangle,
  DollarSign,
  Gift,
  TrendingDown,
  CheckCircle2,
  CreditCard,
  Filter,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  StaffPosition,
  STAFF_POSITION_LABELS,
  PayrollBatchStatus,
  PAYROLL_STATUS_LABELS
} from '../../../types/payroll';
import { useData } from '../../../context/DataContext';
import { formatVND, formatNumber } from '../../../services/payrollService';

interface StaffOverviewTabProps {
  onNavigateTab: (tabIndex: number) => void;
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  onOpenStaffModal: () => void;
}

export const StaffOverviewTab: React.FC<StaffOverviewTabProps> = ({
  onNavigateTab,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  onOpenStaffModal
}) => {
  const { data } = useData();

  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return data.staffList.filter(s => {
      if (positionFilter !== 'all' && s.position !== positionFilter) return false;
      if (staffFilter !== 'all' && s.id !== staffFilter) return false;
      return true;
    });
  }, [data.staffList, positionFilter, staffFilter]);

  // Attendance metrics for selected month & year
  const monthAttendance = useMemo(() => {
    const staffIds = new Set(filteredStaff.map(s => s.id));
    return data.staffAttendance.filter(att => {
      if (!staffIds.has(att.staffId)) return false;
      const [y, m] = att.date.split('-').map(Number);
      return y === selectedYear && m === selectedMonth;
    });
  }, [data.staffAttendance, filteredStaff, selectedMonth, selectedYear]);

  // Compute metrics
  const totalStaff = filteredStaff.length;
  const totalWorkingSessions = monthAttendance.reduce((acc, r) => acc + (r.workingSessions || 0), 0);
  const totalWorkingHours = monthAttendance.reduce((acc, r) => acc + (r.workingHours || 0), 0);

  const presentDays = monthAttendance.filter(r => r.status === 'present' || r.status === 'extra_shift').length;
  const absentDays = monthAttendance.filter(r => r.status === 'absent').length;
  const lateArrivals = monthAttendance.filter(r => r.status === 'late').length;

  // Monthly Payroll Batch for this period
  const currentBatch = data.payrollBatches.find(
    b => b.month === selectedMonth && b.year === selectedYear
  );

  // Batches for approved / paid metrics
  const totalEstimatedPayroll = currentBatch ? currentBatch.totalPayable : 0;
  const totalBonuses = currentBatch ? currentBatch.totalBonuses : 0;
  const totalDeductions = currentBatch ? currentBatch.totalDeductions : 0;

  const totalApprovedPayroll = data.payrollBatches
    .filter(b => b.status === 'approved' && b.month === selectedMonth && b.year === selectedYear)
    .reduce((acc, b) => acc + b.totalPayable, 0);

  const totalPaidPayroll = data.payrollBatches
    .filter(b => b.status === 'paid' && b.month === selectedMonth && b.year === selectedYear)
    .reduce((acc, b) => acc + b.totalPayable, 0);

  const batchStatusObj = currentBatch ? PAYROLL_STATUS_LABELS[currentBatch.status] : null;

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Filter className="w-4 h-4 text-red-600" />
            <span>Bộ lọc kỳ làm việc:</span>
          </div>

          <div className="flex items-center gap-2">
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

          <select
            value={positionFilter}
            onChange={e => setPositionFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="all">Tất cả vị trí (8 chức danh)</option>
            {Object.entries(STAFF_POSITION_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="all">Tất cả nhân sự</option>
            {data.staffList.map(s => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({STAFF_POSITION_LABELS[s.position]})
              </option>
            ))}
          </select>
        </div>

        {/* Current Batch Status Pill */}
        <div className="flex items-center gap-2">
          {batchStatusObj ? (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${batchStatusObj.badgeClass}`}>
              Kỳ lương {selectedMonth}/{selectedYear}: {batchStatusObj.label}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Kỳ lương {selectedMonth}/{selectedYear}: Chưa lập bảng tính
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid (10 Required Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Total Staff */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tổng nhân sự</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalStaff}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">8 vị trí chức danh</p>
        </div>

        {/* Metric 2: Total Working Sessions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tổng buổi công</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700">{formatNumber(totalWorkingSessions)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Buổi dạy & hành chính</p>
        </div>

        {/* Metric 3: Total Working Hours */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tổng giờ công</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700">{formatNumber(totalWorkingHours)}h</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Giờ làm việc thực tế</p>
        </div>

        {/* Metric 4: Total Attendance Days */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Lượt có mặt</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{presentDays}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Lượt chấm công hợp lệ</p>
        </div>

        {/* Metric 5 & 6: Absences & Late Arrivals */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Vắng & Đi muộn</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {absentDays} / <span className="text-red-600">{lateArrivals}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Vắng KP: {absentDays} • Muộn: {lateArrivals}</p>
        </div>

        {/* Metric 7: Estimated Payroll */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Dự toán quỹ lương</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-700">{formatVND(totalEstimatedPayroll)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Tháng {selectedMonth}/{selectedYear}</p>
        </div>

        {/* Metric 8: Total Bonuses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tổng thưởng & OT</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700">+{formatVND(totalBonuses)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Khen thưởng & phụ cấp</p>
        </div>

        {/* Metric 9: Total Deductions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tổng khấu trừ & phạt</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600">-{formatVND(totalDeductions)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Trừ đi muộn, tạm ứng</p>
        </div>

        {/* Metric 10: Approved Payroll */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Lương đã chốt duyệt</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-800">{formatVND(totalApprovedPayroll)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Đã đóng băng số liệu</p>
        </div>

        {/* Metric 11: Paid Payroll */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Đã thanh toán thực tế</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700">{formatVND(totalPaidPayroll)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Chuyển khoản & tiền mặt</p>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab(1)} // Tab Điểm danh
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-red-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-bold text-slate-800 text-sm mb-1">Chấm công hôm nay</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ghi nhận chuyên cần cho giáo viên, trợ giảng và nhân viên văn phòng theo từng ca làm việc.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab(2)} // Tab Bảng công
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-red-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-bold text-slate-800 text-sm mb-1">Bảng công tổng hợp</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Xem tổng số buổi dạy, số ca làm, số giờ tính lương và tỷ lệ chuyên cần cả tháng.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab(3)} // Tab Tính lương
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-red-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-bold text-slate-800 text-sm mb-1">Quy trình duyệt lương 4 bước</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Nháp (Draft) → Kiểm tra (Reviewed) → Chốt lương (Approved) → Thanh toán (Paid).
          </p>
        </div>
      </div>

      {/* Staff Positions Roster Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-600" />
            <span>Danh sách nhân sự & Vị trí công tác ({data.staffList.length} nhân sự)</span>
          </div>
          <button
            onClick={onOpenStaffModal}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>+ Thêm nhân sự</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Mã NS</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4">Vị trí công tác</th>
                <th className="py-3 px-4">Hình thức chi trả</th>
                <th className="py-3 px-4">Đơn giá cơ sở</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.staffList.map((stf, idx) => (
                <tr key={stf.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-600">{stf.id}</td>
                  <td className="py-2.5 px-4">
                    <div className="font-bold text-slate-900">{stf.fullName}</div>
                    <div className="text-[11px] text-slate-400">{stf.email} • {stf.phone}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {STAFF_POSITION_LABELS[stf.position]}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 font-medium">
                    {stf.payType === 'monthly' && 'Lương tháng'}
                    {stf.payType === 'per_session' && 'Theo buổi dạy/làm'}
                    {stf.payType === 'per_shift' && 'Theo ca'}
                    {stf.payType === 'per_hour' && 'Theo giờ'}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">
                    {formatVND(stf.baseRate)}
                  </td>
                  <td className="py-2.5 px-4">
                    {stf.status === 'active' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Đang làm việc
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                        Tạm nghỉ
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
