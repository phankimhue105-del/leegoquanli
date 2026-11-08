import React, { useState, useMemo } from 'react';
import {
  Gift,
  Plus,
  Trash2,
  Filter,
  DollarSign,
  AlertTriangle,
  Clock,
  Briefcase,
  TrendingUp,
  TrendingDown,
  X,
  Search
} from 'lucide-react';
import {
  StaffAdjustmentType,
  STAFF_ADJUSTMENT_LABELS,
  StaffPayrollAdjustment,
  STAFF_POSITION_LABELS
} from '../../../types/payroll';
import { useData } from '../../../context/DataContext';
import { formatVND } from '../../../services/payrollService';
import { useToast } from '../../common/Toast';

interface StaffAdjustmentsTabProps {
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
}

export const StaffAdjustmentsTab: React.FC<StaffAdjustmentsTabProps> = ({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}) => {
  const { data, addStaffAdjustment, deleteStaffAdjustment } = useData();
  const { showToast } = useToast();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetStaffId, setTargetStaffId] = useState<string>(data.staffList[0]?.id || '');
  const [adjDate, setAdjDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [adjType, setAdjType] = useState<StaffAdjustmentType>('bonus');
  const [adjAmount, setAdjAmount] = useState<number>(500000);
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjNotes, setAdjNotes] = useState<string>('');

  // Adjustments list for the selected period
  const filteredAdjustments = useMemo(() => {
    return data.staffAdjustments.filter(adj => {
      if (adj.month !== selectedMonth || adj.year !== selectedYear) return false;
      if (typeFilter !== 'all' && adj.adjustmentType !== typeFilter) return false;
      if (staffFilter !== 'all' && adj.staffId !== staffFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          adj.staffName.toLowerCase().includes(q) ||
          adj.reason.toLowerCase().includes(q) ||
          adj.staffId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data.staffAdjustments, selectedMonth, selectedYear, typeFilter, staffFilter, searchQuery]);

  // Aggregate totals
  const totalBonusAmount = filteredAdjustments
    .filter(a => STAFF_ADJUSTMENT_LABELS[a.adjustmentType].isCredit)
    .reduce((acc, a) => acc + a.amount, 0);

  const totalDeductionAmount = filteredAdjustments
    .filter(a => !STAFF_ADJUSTMENT_LABELS[a.adjustmentType].isCredit)
    .reduce((acc, a) => acc + a.amount, 0);

  const handleOpenModal = () => {
    setTargetStaffId(data.staffList[0]?.id || '');
    setAdjDate(new Date().toISOString().slice(0, 10));
    setAdjType('bonus');
    setAdjAmount(500000);
    setAdjReason('');
    setAdjNotes('');
    setIsModalOpen(true);
  };

  const handleCreateAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      showToast('Vui lòng nhập lý do điều chỉnh!', 'error');
      return;
    }
    if (adjAmount <= 0) {
      showToast('Số tiền điều chỉnh phải lớn hơn 0!', 'error');
      return;
    }

    const staff = data.staffList.find(s => s.id === targetStaffId);
    if (!staff) return;

    const [aYear, aMonth] = adjDate.split('-').map(Number);

    addStaffAdjustment({
      staffId: staff.id,
      staffName: staff.fullName,
      date: adjDate,
      month: aMonth,
      year: aYear,
      adjustmentType: adjType,
      amount: adjAmount,
      reason: adjReason.trim(),
      notes: adjNotes.trim()
    });

    showToast(`Đã thêm khoản điều chỉnh cho ${staff.fullName}!`, 'success');
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa khoản điều chỉnh này?')) {
      const res = deleteStaffAdjustment(id);
      if (res.success) {
        showToast('Đã xóa khoản điều chỉnh!', 'success');
      } else {
        showToast(res.error || 'Lỗi', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Control & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="font-bold text-slate-700">Kỳ áp dụng:</label>
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
            <label className="font-bold text-slate-700">Loại điều chỉnh:</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Tất cả loại (6 loại)</option>
              {Object.entries(STAFF_ADJUSTMENT_LABELS).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-bold text-slate-700">Nhân sự:</label>
            <select
              value={staffFilter}
              onChange={e => setStaffFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Tất cả nhân sự</option>
              {data.staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Tìm theo lý do, tên..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 pl-7 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-950/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm khoản điều chỉnh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="font-bold text-emerald-800">Tổng thưởng, phụ cấp & OT (+)</span>
            <div className="text-xl font-black text-emerald-700 mt-1">
              +{formatVND(totalBonusAmount)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="font-bold text-rose-800">Tổng khấu trừ & phạt (-)</span>
            <div className="text-xl font-black text-rose-700 mt-1">
              -{formatVND(totalDeductionAmount)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-700">Chênh lệch điều chỉnh ròng</span>
            <div className="text-xl font-black text-slate-800 mt-1">
              {formatVND(totalBonusAmount - totalDeductionAmount)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-2">
            <Gift className="w-4 h-4 text-red-600" />
            <span>
              Danh sách các khoản điều chỉnh tháng {selectedMonth}/{selectedYear} ({filteredAdjustments.length} khoản)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Tất cả điều chỉnh đều được lưu vết phục vụ đối soát
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">STT</th>
                <th className="py-3 px-3">Ngày</th>
                <th className="py-3 px-4">Nhân sự áp dụng</th>
                <th className="py-3 px-3">Loại điều chỉnh</th>
                <th className="py-3 px-4 text-right">Số tiền</th>
                <th className="py-3 px-6">Lý do điều chỉnh</th>
                <th className="py-3 px-4">Ghi chú</th>
                <th className="py-3 px-3">Người lập</th>
                <th className="py-3 px-3 w-12 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Không có khoản điều chỉnh nào trong kỳ này.
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((adj, idx) => {
                  const typeCfg = STAFF_ADJUSTMENT_LABELS[adj.adjustmentType];
                  return (
                    <tr key={adj.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{adj.date}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{adj.staffName}</div>
                        <div className="text-[10px] text-slate-400">{adj.staffId}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            typeCfg.isCredit
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sm">
                        <span className={typeCfg.isCredit ? 'text-emerald-700' : 'text-rose-600'}>
                          {typeCfg.isCredit ? '+' : '-'}{formatVND(adj.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-6 font-medium text-slate-800">{adj.reason}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{adj.notes || '-'}</td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        <div>{adj.createdBy}</div>
                        <div className="text-[9px]">{adj.createdAt?.slice(0, 10)}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleDelete(adj.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Xóa khoản này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Adjustment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm">Thêm Khoản Thưởng / Phạt / Phụ Cấp</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nhân sự áp dụng <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetStaffId}
                  onChange={e => setTargetStaffId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  {data.staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({STAFF_POSITION_LABELS[s.position]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Ngày phát sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={adjDate}
                    onChange={e => setAdjDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Loại điều chỉnh <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={adjType}
                    onChange={e => setAdjType(e.target.value as StaffAdjustmentType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    {Object.entries(STAFF_ADJUSTMENT_LABELS).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label} ({cfg.isCredit ? 'Cộng lương' : 'Khấu trừ'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Số tiền (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1000"
                  step="10000"
                  required
                  value={adjAmount}
                  onChange={e => setAdjAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Lý do chi tiết <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  placeholder="VD: Thưởng thành tích giảng dạy xuất sắc tháng 11..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  value={adjNotes}
                  onChange={e => setAdjNotes(e.target.value)}
                  placeholder="Số quyết định, biên bản xác nhận..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Lưu khoản điều chỉnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
