import React, { useState } from 'react';
import {
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  Download,
  Info,
  Lock,
  Unlock,
  Plus,
  Eye,
  FileCheck2,
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  StaffPayrollBatch,
  PayrollBatchStatus,
  PAYROLL_STATUS_LABELS,
  STAFF_POSITION_LABELS,
  STAFF_PAY_TYPE_LABELS
} from '../../../types/payroll';
import { useData } from '../../../context/DataContext';
import { formatVND, formatNumber, exportPayrollReportToExcel } from '../../../services/payrollService';
import { useToast } from '../../common/Toast';

interface StaffPayrollCalcTabProps {
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
}

export const StaffPayrollCalcTab: React.FC<StaffPayrollCalcTabProps> = ({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}) => {
  const {
    data,
    createPayrollBatch,
    recalculatePayrollBatch,
    reviewPayrollBatch,
    approvePayrollBatch,
    payPayrollBatch,
    reopenPayrollBatch
  } = useData();
  const { showToast } = useToast();

  // Find batch for current selected period
  const batch = data.payrollBatches.find(
    b => b.month === selectedMonth && b.year === selectedYear
  );

  // Reopen Modal state
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenTargetStatus, setReopenTargetStatus] = useState<'draft' | 'reviewed'>('draft');
  const [reopenReason, setReopenReason] = useState('');

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'other'>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState(`UNC-TCB-${Date.now().toString().slice(-6)}`);
  const [paymentNotes, setPaymentNotes] = useState('Đã hoàn tất thanh toán lương');

  // Formula inspection modal
  const [inspectedFormula, setInspectedFormula] = useState<{
    staffName: string;
    formula: string;
    baseEarnings: number;
    bonus: number;
    allowance: number;
    deduction: number;
    finalPayable: number;
  } | null>(null);

  // Workflow Handlers
  const handleCreateBatch = () => {
    const res = createPayrollBatch(selectedMonth, selectedYear);
    if (res.success) {
      showToast(`Đã tạo bảng lương tháng ${selectedMonth}/${selectedYear} ở trạng thái Nháp!`, 'success');
    } else {
      showToast(res.error || 'Lỗi', 'error');
    }
  };

  const handleRecalculate = () => {
    if (!batch) return;
    if (confirm(`Bạn có chắc chắn muốn tính lại bảng lương tháng ${selectedMonth}/${selectedYear}? Dữ liệu công và điều chỉnh mới nhất sẽ được áp dụng.`)) {
      const res = recalculatePayrollBatch(batch.id);
      if (res.success) {
        showToast('Đã cập nhật lại bảng tính lương!', 'success');
      } else {
        showToast(res.error || 'Lỗi', 'error');
      }
    }
  };

  const handleReview = () => {
    if (!batch) return;
    const notes = prompt('Ghi chú kiểm tra (tùy chọn):', 'Đã đối soát đầy đủ số buổi dạy và phụ cấp');
    if (notes === null) return;

    const res = reviewPayrollBatch(batch.id, notes);
    if (res.success) {
      showToast('Đã chuyển bảng lương sang trạng thái ĐÃ KIỂM TRA (Reviewed)!', 'success');
    } else {
      showToast(res.error || 'Lỗi', 'error');
    }
  };

  const handleApprove = () => {
    if (!batch) return;
    if (confirm(`XÁC NHẬN PHÊ DUYỆT & CHỐT LƯƠNG tháng ${selectedMonth}/${selectedYear}?\n\nLưu ý quan trọng: Toàn bộ đơn giá, bảng công và số tiền thực lĩnh sẽ được ĐÓNG BĂNG để làm căn cứ chi trả và báo cáo. Mọi thay đổi sau này bắt buộc phải qua quy trình mở lại có lý do.`)) {
      const res = approvePayrollBatch(batch.id, 'Ban Giám đốc phê duyệt chốt lương');
      if (res.success) {
        showToast('Đã chốt lương thành công! Số liệu đã được đóng băng.', 'success');
      } else {
        showToast(res.error || 'Lỗi', 'error');
      }
    }
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    const res = payPayrollBatch(batch.id, paymentMethod, paymentReference.trim(), paymentNotes.trim());
    if (res.success) {
      showToast('Đã ghi nhận thanh toán lương thành công!', 'success');
      setIsPaymentModalOpen(false);
    } else {
      showToast(res.error || 'Lỗi', 'error');
    }
  };

  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;
    if (!reopenReason.trim()) {
      showToast('Bắt buộc phải nhập lý do mở lại bảng lương!', 'error');
      return;
    }

    const res = reopenPayrollBatch(batch.id, reopenTargetStatus, reopenReason.trim());
    if (res.success) {
      showToast(`Đã mở lại bảng lương về trạng thái ${reopenTargetStatus.toUpperCase()}!`, 'success');
      setIsReopenModalOpen(false);
      setReopenReason('');
    } else {
      showToast(res.error || 'Lỗi', 'error');
    }
  };

  const handleExport = () => {
    if (!batch) {
      showToast('Chưa có bảng lương để xuất báo cáo!', 'error');
      return;
    }
    exportPayrollReportToExcel(batch);
    showToast(`Đã xuất Báo cáo bảng lương tháng ${batch.month}/${batch.year} ra file Excel!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Period Selector & Batch Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="font-bold text-slate-700">Kỳ tính lương:</label>
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

          {batch && (
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full font-bold border ${PAYROLL_STATUS_LABELS[batch.status].badgeClass}`}>
                {PAYROLL_STATUS_LABELS[batch.status].label}
              </span>
              {batch.isPayrollLocked && (
                <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-purple-600" />
                  <span>Đã đóng băng số liệu</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons based on batch existence & status */}
        <div className="flex flex-wrap items-center gap-2">
          {!batch ? (
            <button
              onClick={handleCreateBatch}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-950/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo bảng lương tháng {selectedMonth}/{selectedYear}</span>
            </button>
          ) : (
            <>
              {/* Draft state buttons */}
              {batch.status === 'draft' && (
                <>
                  <button
                    onClick={handleRecalculate}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    <span>Tính lại lương</span>
                  </button>
                  <button
                    onClick={handleReview}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận đã kiểm tra</span>
                  </button>
                </>
              )}

              {/* Reviewed state buttons */}
              {batch.status === 'reviewed' && (
                <>
                  <button
                    onClick={handleRecalculate}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    <span>Tính lại</span>
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Phê duyệt & Chốt lương</span>
                  </button>
                </>
              )}

              {/* Approved state buttons */}
              {batch.status === 'approved' && (
                <>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Đánh dấu đã thanh toán</span>
                  </button>
                  <button
                    onClick={() => {
                      setReopenTargetStatus('reviewed');
                      setIsReopenModalOpen(true);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Mở lại để sửa</span>
                  </button>
                </>
              )}

              {/* Paid state buttons */}
              {batch.status === 'paid' && (
                <button
                  onClick={() => {
                    setReopenTargetStatus('approved');
                    setIsReopenModalOpen(true);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl font-bold transition-colors flex items-center gap-1.5"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Mở lại bảng lương đã thanh toán</span>
                </button>
              )}

              {/* Excel Download Button */}
              <button
                onClick={handleExport}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4-Step Approval Workflow Stepper Banner */}
      {batch && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span>Tiến trình duyệt lương 4 giai đoạn:</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Step 1: Draft */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                batch.status === 'draft'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>1. Nháp (Draft)</span>
                {batch.status !== 'draft' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Được phép sửa công & tính lại</p>
              <p className="text-[10px] text-slate-400 mt-1">Tạo: {batch.createdAt}</p>
            </div>

            {/* Step 2: Reviewed */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                batch.status === 'reviewed'
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400'
                  : batch.status === 'approved' || batch.status === 'paid'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>2. Đã kiểm tra (Reviewed)</span>
                {(batch.status === 'approved' || batch.status === 'paid') && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Đã đối soát cảnh báo</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {batch.reviewedAt ? `Bởi: ${batch.reviewedBy}` : 'Chờ kiểm tra'}
              </p>
            </div>

            {/* Step 3: Approved */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                batch.status === 'approved'
                  ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400'
                  : batch.status === 'paid'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>3. Đã chốt lương (Approved)</span>
                {batch.status === 'paid' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Đóng băng số liệu lịch sử</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {batch.approvedAt ? `Duyệt: ${batch.approvedAt.slice(0, 10)}` : 'Chờ chốt'}
              </p>
            </div>

            {/* Step 4: Paid */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                batch.status === 'paid'
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
                  : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>4. Đã thanh toán (Paid)</span>
                {batch.status === 'paid' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Đã chi trả lương thực tế</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {batch.paidAt ? `Chi: ${batch.paidAt.slice(0, 10)}` : 'Chờ giải ngân'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Batch Overview KPI Cards */}
      {batch && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500">Số nhân sự</span>
            <div className="text-xl font-black text-slate-800">{batch.staffCount}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500">Tổng lương cơ bản</span>
            <div className="text-base font-bold text-slate-800">{formatVND(batch.totalBaseEarnings)}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500">Thưởng & Phụ cấp</span>
            <div className="text-base font-bold text-emerald-600">
              +{formatVND(batch.totalBonuses + batch.totalAllowances)}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500">Khấu trừ & Phạt</span>
            <div className="text-base font-bold text-rose-600">
              -{formatVND(batch.totalDeductions)}
            </div>
          </div>

          <div className="bg-red-50/80 p-3.5 rounded-xl border border-red-200">
            <span className="text-red-700 font-bold">TỔNG THỰC LĨNH</span>
            <div className="text-xl font-black text-red-600">{formatVND(batch.totalPayable)}</div>
          </div>
        </div>
      )}

      {/* Detailed Payroll Table */}
      {batch ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-red-600" />
              <span>Bảng tính chi tiết từng nhân sự ({batch.items.length} người)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Click vào biểu tượng công thức để xem diễn giải chi tiết
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">STT</th>
                  <th className="py-3 px-3">Mã NS</th>
                  <th className="py-3 px-4">Họ và Tên</th>
                  <th className="py-3 px-3">Vị trí</th>
                  <th className="py-3 px-3">Hình thức</th>
                  <th className="py-3 px-3 text-right">Đơn giá</th>
                  <th className="py-3 px-3 text-center">Buổi / Ca</th>
                  <th className="py-3 px-3 text-right">Lương cơ bản</th>
                  <th className="py-3 px-3 text-right text-emerald-700">Thưởng / Phụ cấp</th>
                  <th className="py-3 px-3 text-right text-rose-700">Khấu trừ</th>
                  <th className="py-3 px-4 text-right font-black text-red-600">THỰC LĨNH</th>
                  <th className="py-3 px-3 text-center">Công thức</th>
                  <th className="py-3 px-3 text-center">Cảnh báo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batch.items.map((item, idx) => {
                  return (
                    <tr
                      key={item.staffId}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        item.isFlaggedForReview ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-600">{item.staffId}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.staffName}</div>
                        {item.paymentStatus === 'paid' && (
                          <span className="text-[10px] text-emerald-600 font-semibold">Đã thanh toán</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {STAFF_POSITION_LABELS[item.position]}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {STAFF_PAY_TYPE_LABELS[item.payType]}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {formatVND(item.baseRateSnapshot)}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-700">
                        {item.payType === 'per_shift' ? `${item.paidShifts} ca` : `${item.paidSessions} buổi`}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-800">
                        {formatVND(item.baseEarnings)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-600">
                        {item.totalBonus + item.totalAllowances + item.totalOvertime > 0
                          ? `+${formatVND(item.totalBonus + item.totalAllowances + item.totalOvertime)}`
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-rose-600">
                        {item.totalPenalties + item.totalOtherDeductions > 0
                          ? `-${formatVND(item.totalPenalties + item.totalOtherDeductions)}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                        {formatVND(item.finalPayable)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() =>
                            setInspectedFormula({
                              staffName: item.staffName,
                              formula: item.calculationFormula,
                              baseEarnings: item.baseEarnings,
                              bonus: item.totalBonus + item.totalOvertime,
                              allowance: item.totalAllowances,
                              deduction: item.totalPenalties + item.totalOtherDeductions,
                              finalPayable: item.finalPayable
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Xem công thức chi tiết"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.isFlaggedForReview ? (
                          <span
                            title={item.reviewRemarks}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Lưu ý</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">
            Chưa có bảng lương tháng {selectedMonth}/{selectedYear}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hệ thống sẽ tổng hợp số liệu chấm công, định mức lương và các khoản điều chỉnh để lập bảng tính lương tự động.
          </p>
          <button
            onClick={handleCreateBatch}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-950/20 inline-flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bảng lương tháng {selectedMonth}/{selectedYear}</span>
          </button>
        </div>
      )}

      {/* Formula Inspector Modal */}
      {inspectedFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Diễn Giải Công Thức Lương: {inspectedFormula.staffName}
                </h3>
                <p className="text-xs text-slate-500">Minh bạch cách tính thực lĩnh</p>
              </div>
              <button
                onClick={() => setInspectedFormula(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-700 block">Công thức cơ bản:</span>
                <p className="font-mono text-slate-800 font-semibold">{inspectedFormula.formula}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Lương cơ bản:</span>
                  <div className="font-bold text-slate-800">{formatVND(inspectedFormula.baseEarnings)}</div>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-700">Khen thưởng & OT:</span>
                  <div className="font-bold text-emerald-800">+{formatVND(inspectedFormula.bonus)}</div>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <span className="text-blue-700">Phụ cấp:</span>
                  <div className="font-bold text-blue-800">+{formatVND(inspectedFormula.allowance)}</div>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-lg">
                  <span className="text-rose-700">Khấu trừ & Phạt:</span>
                  <div className="font-bold text-rose-800">-{formatVND(inspectedFormula.deduction)}</div>
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-red-900">THỰC LĨNH CUỐI CÙNG:</span>
                <span className="font-black text-red-600 text-base">{formatVND(inspectedFormula.finalPayable)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectedFormula(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold rounded-xl text-xs text-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {isPaymentModalOpen && batch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Ghi Nhận Thanh Toán Lương</h3>
                <p className="text-xs text-slate-500">
                  Kỳ tháng {batch.month}/{batch.year} – Tổng: {formatVND(batch.totalPayable)}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Hình thức chi trả</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="bank_transfer">Chuyển khoản ngân hàng (Bank Transfer)</option>
                  <option value="cash">Tiền mặt (Cash)</option>
                  <option value="other">Hình thức khác</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mã tham chiếu / Số chứng từ UNC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  placeholder="VD: UNC-TCB-202611-001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú thanh toán</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                Sau khi xác nhận thanh toán, bảng lương sẽ được chuyển sang trạng thái <strong>Đã thanh toán (Paid)</strong> và bị khóa bảo vệ.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Xác nhận đã thanh toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reopen Batch Modal */}
      {isReopenModalOpen && batch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-800">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Mở Lại Bảng Lương Đã Chốt/Chi Trả</h3>
                <p className="text-xs text-slate-500">Kỳ tháng {batch.month}/{batch.year}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmReopen} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Chuyển về trạng thái:</label>
                <select
                  value={reopenTargetStatus}
                  onChange={e => setReopenTargetStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="draft">Nháp (Draft - cho phép tính lại hoàn toàn)</option>
                  <option value="reviewed">Đã kiểm tra (Reviewed - đối soát lại)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Lý do mở lại bắt buộc <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  placeholder="VD: Điều chỉnh thiếu phụ cấp ca tối của GV Robert Fox..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800">
                Thao tác mở lại sẽ được lưu vết vĩnh viễn trong Audit Log kèm tên tài khoản Admin thực hiện và lý do giải trình.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Xác nhận mở lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
