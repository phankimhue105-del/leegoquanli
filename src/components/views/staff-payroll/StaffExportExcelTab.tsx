import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  CalendarCheck2,
  CalendarDays,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import {
  exportStaffAttendanceToExcel,
  exportWorkRecordsToExcel,
  exportPayrollReportToExcel,
  exportPaymentReportToExcel,
  aggregateAllWorkRecords
} from '../../../services/payrollService';
import { useToast } from '../../common/Toast';

interface StaffExportExcelTabProps {
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
}

export const StaffExportExcelTab: React.FC<StaffExportExcelTabProps> = ({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}) => {
  const { data } = useData();
  const { showToast } = useToast();

  const currentBatch = data.payrollBatches.find(
    b => b.month === selectedMonth && b.year === selectedYear
  );

  const handleExportAttendance = () => {
    exportStaffAttendanceToExcel(data.staffAttendance, selectedMonth, selectedYear);
    showToast(`Đã xuất Báo cáo Điểm danh nhân sự tháng ${selectedMonth}/${selectedYear} ra Excel!`, 'success');
  };

  const handleExportWorkRecords = () => {
    const summaries = aggregateAllWorkRecords(data.staffList, data.staffAttendance, selectedMonth, selectedYear);
    exportWorkRecordsToExcel(summaries, selectedMonth, selectedYear);
    showToast(`Đã xuất Báo cáo Bảng công nhân sự tháng ${selectedMonth}/${selectedYear} ra Excel!`, 'success');
  };

  const handleExportPayroll = () => {
    if (!currentBatch) {
      showToast(`Chưa có bảng lương tháng ${selectedMonth}/${selectedYear}. Vui lòng tạo bảng lương trước!`, 'error');
      return;
    }
    exportPayrollReportToExcel(currentBatch);
    showToast(`Đã xuất Báo cáo Bảng lương tháng ${selectedMonth}/${selectedYear} ra Excel!`, 'success');
  };

  const handleExportPayment = () => {
    if (!currentBatch) {
      showToast(`Chưa có bảng lương tháng ${selectedMonth}/${selectedYear}!`, 'error');
      return;
    }
    exportPaymentReportToExcel(currentBatch);
    showToast(`Đã xuất Báo cáo Thanh toán lương tháng ${selectedMonth}/${selectedYear} ra Excel!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Period Selector Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Trung Tâm Xuất Báo Cáo Excel Nhân Sự & Lương (.xlsx)</span>
          </h3>
          <p className="text-slate-500 mt-0.5">
            Các file Excel chuẩn hỗ trợ tiếng Việt Unicode có dấu, định dạng tiền tệ VNĐ và độ rộng cột tự động tối ưu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-700">Chọn kỳ báo cáo:</label>
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
      </div>

      {/* 4 Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Report A: Staff Attendance Report */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">A. Báo Cáo Điểm Danh Nhân Sự (Staff Attendance Report)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Chi tiết từng lượt chấm công theo ngày của toàn bộ giáo viên và nhân sự: Ngày, Ca làm, Trạng thái (Có mặt, Đi muộn, Vắng, Nghỉ phép, Nửa ngày, Tăng ca), Số buổi, Số giờ và Ghi chú.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              LeeGo_Diem_Danh_Nhan_Su_{selectedMonth}_{selectedYear}.xlsx
            </span>
            <button
              onClick={handleExportAttendance}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Tải file Excel</span>
            </button>
          </div>
        </div>

        {/* Report B: Monthly Work Records */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">B. Bảng Công Tổng Hợp Tháng (Monthly Work Records)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tổng hợp công thực tế của từng nhân viên: Số ngày làm việc, Tổng buổi, Tổng giờ, Số buổi tính lương, Số ca tính lương, Số lần đi muộn, Vắng không phép, Nghỉ phép và Tỷ lệ chuyên cần (%).
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              LeeGo_Bang_Cong_Nhan_Su_{selectedMonth}_{selectedYear}.xlsx
            </span>
            <button
              onClick={handleExportWorkRecords}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Tải file Excel</span>
            </button>
          </div>
        </div>

        {/* Report C: Monthly Payroll Report */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-300 transition-all">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm">C. Báo Cáo Bảng Lương Chi Tiết (Monthly Payroll Report)</h4>
              {currentBatch ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Sẵn sàng ({currentBatch.status})
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Chưa tạo bảng lương
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bảng thanh toán lương hoàn chỉnh: Đơn giá cơ sở, Số buổi/ca tính lương, Lương cơ bản, Khen thưởng, Phụ cấp, Thù lao OT, Khấu trừ, Số tiền Thực Lĩnh và Công thức tính minh bạch.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              LeeGo_Bang_Luong_Nhan_Su_{selectedMonth}_{selectedYear}.xlsx
            </span>
            <button
              onClick={handleExportPayroll}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Tải file Excel</span>
            </button>
          </div>
        </div>

        {/* Report D: Payment Report */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-rose-300 transition-all">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">D. Báo Cáo Chứng Từ Thanh Toán Lương (Payment Report)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Chứng từ chi trả phục vụ kiểm toán tài chính: Mã nhân sự, Họ tên, Kỳ lương, Số tiền đã phê duyệt, Ngày chi trả, Hình thức thanh toán (Ngân hàng/Tiền mặt), Mã tham chiếu UNC và Trạng thái.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              LeeGo_Bao_Cao_Thanh_Toan_Luong_{selectedMonth}_{selectedYear}.xlsx
            </span>
            <button
              onClick={handleExportPayment}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Tải file Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
