import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  CreditCard,
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  Eye,
  FileCheck2,
  Calendar,
  Search,
  Filter
} from 'lucide-react';
import {
  StaffPayrollBatch,
  PAYROLL_STATUS_LABELS,
  PayrollAuditLog
} from '../../../types/payroll';
import { useData } from '../../../context/DataContext';
import { formatVND } from '../../../services/payrollService';

export const StaffPayrollHistoryTab: React.FC = () => {
  const { data } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'batches' | 'audit_logs'>('batches');
  const [searchLogQuery, setSearchLogQuery] = useState('');

  // Batches sorted newest first
  const sortedBatches = [...data.payrollBatches].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // Filtered audit logs
  const filteredLogs = data.payrollAuditLogs.filter(log => {
    if (!searchLogQuery.trim()) return true;
    const q = searchLogQuery.toLowerCase();
    return (
      log.details.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.period.toLowerCase().includes(q) ||
      (log.reason && log.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('batches')}
          className={`pb-2 px-3 font-bold transition-all relative ${
            activeSubTab === 'batches'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <History className="w-4 h-4" />
            <span>Lịch Sử Các Bảng Lương Đã Lập ({data.payrollBatches.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit_logs')}
          className={`pb-2 px-3 font-bold transition-all relative ${
            activeSubTab === 'audit_logs'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Nhật Ký Kiểm Toán & Mở Khóa (Audit Log - {data.payrollAuditLogs.length})</span>
          </span>
        </button>
      </div>

      {/* Sub-tab 1: Batches History */}
      {activeSubTab === 'batches' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-red-600" />
              <span>Danh sách các kỳ bảng lương trung tâm ({sortedBatches.length} kỳ)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Dữ liệu kỳ đã duyệt/thanh toán được bảo tồn nguyên vẹn
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Kỳ lương</th>
                  <th className="py-3 px-3">Mã bảng lương</th>
                  <th className="py-3 px-3 text-center">Số NS</th>
                  <th className="py-3 px-3 text-center">Tổng ca/buổi</th>
                  <th className="py-3 px-3 text-right">Lương cơ bản</th>
                  <th className="py-3 px-3 text-right">Thưởng/Phụ cấp</th>
                  <th className="py-3 px-3 text-right">Khấu trừ</th>
                  <th className="py-3 px-4 text-right font-black text-red-600">Tổng thực lĩnh</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-4">Thông tin phê duyệt / Thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedBatches.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Chưa có bảng lương nào được tạo.
                    </td>
                  </tr>
                ) : (
                  sortedBatches.map(b => {
                    const statusObj = PAYROLL_STATUS_LABELS[b.status];
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          Tháng {b.month}/{b.year}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-semibold text-slate-600">
                          {b.id}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                          {b.staffCount}
                        </td>
                        <td className="py-3.5 px-3 text-center font-medium text-indigo-700">
                          {b.totalSessions} buổi ({b.totalHours}h)
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-slate-800">
                          {formatVND(b.totalBaseEarnings)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-emerald-600">
                          +{formatVND(b.totalBonuses + b.totalAllowances)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-rose-600">
                          -{formatVND(b.totalDeductions)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                          {formatVND(b.totalPayable)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusObj.badgeClass}`}
                          >
                            {statusObj.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-500">
                          {b.status === 'paid' && (
                            <div>
                              <span className="font-bold text-emerald-700">Đã TT: </span>
                              <span>{b.paidAt?.slice(0, 10)}</span>
                              <div className="text-[10px] text-slate-400">
                                {b.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'} • {b.paymentReference}
                              </div>
                            </div>
                          )}
                          {b.status === 'approved' && (
                            <div>
                              <span className="font-bold text-purple-700">Đã chốt: </span>
                              <span>{b.approvedAt?.slice(0, 10)}</span>
                              <div className="text-[10px] text-slate-400">Duyệt bởi: {b.approvedBy}</div>
                            </div>
                          )}
                          {b.status === 'reviewed' && (
                            <div>
                              <span className="font-bold text-blue-700">Đã đối soát: </span>
                              <span>{b.reviewedAt?.slice(0, 10)}</span>
                            </div>
                          )}
                          {b.status === 'draft' && (
                            <span className="text-amber-700 font-medium">Bản nháp đang mở</span>
                          )}
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

      {/* Sub-tab 2: Audit Logs */}
      {activeSubTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span className="font-bold text-slate-700">Tra cứu nhật ký kiểm toán hệ thống</span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm người thực hiện, lý do..."
                value={searchLogQuery}
                onChange={e => setSearchLogQuery(e.target.value)}
                className="px-3 py-1.5 pl-7 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 w-64"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-800">
              Nhật ký vết thao tác khóa, mở khóa, duyệt và sửa đổi bảng lương ({filteredLogs.length} sự kiện)
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">STT</th>
                    <th className="py-3 px-4 w-36">Thời điểm</th>
                    <th className="py-3 px-3 w-20">Kỳ lương</th>
                    <th className="py-3 px-4 w-36">Hành động</th>
                    <th className="py-3 px-3 w-32">Chuyển trạng thái</th>
                    <th className="py-3 px-6">Chi tiết sự kiện</th>
                    <th className="py-3 px-5">Lý do giải trình (nếu có)</th>
                    <th className="py-3 px-4 w-36">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Không tìm thấy sự kiện kiểm toán nào.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-600">{log.timestamp}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{log.period}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">
                            {log.action === 'attendance_lock' && 'Khóa chấm công'}
                            {log.action === 'attendance_unlock' && 'Mở khóa chấm công'}
                            {log.action === 'payroll_created' && 'Tạo bảng lương'}
                            {log.action === 'payroll_recalculated' && 'Tính lại lương'}
                            {log.action === 'payroll_reviewed' && 'Xác nhận kiểm tra'}
                            {log.action === 'payroll_approved' && 'Chốt lương (Approve)'}
                            {log.action === 'payroll_paid' && 'Thanh toán lương'}
                            {log.action === 'payroll_reopened' && 'Mở lại bảng lương'}
                            {log.action === 'adjustment_added' && 'Thêm điều chỉnh'}
                            {log.action === 'rate_updated' && 'Cập nhật đơn giá'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          {log.previousState && log.newState ? (
                            <span className="font-mono text-slate-600">
                              {log.previousState} → <strong>{log.newState}</strong>
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-slate-800 font-medium">{log.details}</td>
                        <td className="py-3 px-5">
                          {log.reason ? (
                            <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              {log.reason}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {log.userName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
