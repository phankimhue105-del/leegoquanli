import React, { useState } from 'react';
import { X, UserPlus, Save, DollarSign, Briefcase, Mail, Phone, Calendar, Building2 } from 'lucide-react';
import {
  StaffMember,
  StaffPosition,
  StaffPayType,
  STAFF_POSITION_LABELS,
  STAFF_PAY_TYPE_LABELS
} from '../../../types/payroll';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../common/Toast';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: StaffMember | null;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  staffToEdit
}) => {
  const { data, addStaffMember, updateStaffMember } = useData();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(staffToEdit?.fullName || '');
  const [email, setEmail] = useState(staffToEdit?.email || '');
  const [phone, setPhone] = useState(staffToEdit?.phone || '');
  const [position, setPosition] = useState<StaffPosition>(staffToEdit?.position || 'teacher');
  const [payType, setPayType] = useState<StaffPayType>(staffToEdit?.payType || 'per_session');
  const [baseRate, setBaseRate] = useState<number>(staffToEdit?.baseRate || 400000);
  const [defaultShiftId, setDefaultShiftId] = useState<string>(
    staffToEdit?.defaultShiftId || data.staffShifts[0]?.id || 'SHIFT-EVENING'
  );
  const [status, setStatus] = useState<'active' | 'inactive'>(staffToEdit?.status || 'active');
  const [startDate, setStartDate] = useState(staffToEdit?.startDate || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(staffToEdit?.notes || '');
  const [bankName, setBankName] = useState(staffToEdit?.bankAccount?.bankName || 'Techcombank');
  const [accountNumber, setAccountNumber] = useState(staffToEdit?.bankAccount?.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(staffToEdit?.bankAccount?.accountHolder || '');

  React.useEffect(() => {
    if (staffToEdit) {
      setFullName(staffToEdit.fullName);
      setEmail(staffToEdit.email);
      setPhone(staffToEdit.phone);
      setPosition(staffToEdit.position);
      setPayType(staffToEdit.payType);
      setBaseRate(staffToEdit.baseRate);
      setDefaultShiftId(staffToEdit.defaultShiftId || data.staffShifts[0]?.id || 'SHIFT-EVENING');
      setStatus(staffToEdit.status);
      setStartDate(staffToEdit.startDate);
      setNotes(staffToEdit.notes || '');
      setBankName(staffToEdit.bankAccount?.bankName || 'Techcombank');
      setAccountNumber(staffToEdit.bankAccount?.accountNumber || '');
      setAccountHolder(staffToEdit.bankAccount?.accountHolder || '');
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setPosition('teacher');
      setPayType('per_session');
      setBaseRate(400000);
      setStatus('active');
      setStartDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setAccountNumber('');
      setAccountHolder('');
    }
  }, [staffToEdit, data.staffShifts]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Vui lòng nhập họ và tên nhân sự', 'error');
      return;
    }
    if (!email.trim()) {
      showToast('Vui lòng nhập địa chỉ email', 'error');
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      position,
      payType,
      baseRate: Number(baseRate) || 0,
      defaultShiftId,
      status,
      startDate,
      notes: notes.trim(),
      bankAccount: accountNumber.trim()
        ? {
            bankName,
            accountNumber: accountNumber.trim(),
            accountHolder: accountHolder.trim().toUpperCase() || fullName.toUpperCase()
          }
        : undefined
    };

    if (staffToEdit) {
      updateStaffMember(staffToEdit.id, payload);
      showToast(`Đã cập nhật thông tin nhân sự ${fullName}!`, 'success');
    } else {
      addStaffMember(payload);
      showToast(`Đã thêm mới nhân sự ${fullName}!`, 'success');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {staffToEdit ? 'Chỉnh Sửa Hồ Sơ Nhân Sự' : 'Thêm Nhân Sự Mới'}
              </h3>
              <p className="text-xs text-slate-500">
                Thiết lập vị trí công tác, hình thức chi trả và định mức lương
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Họ và Tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn Anh"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Email làm việc <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="VD: anh.nguyen@leego.edu.vn"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="VD: 0912345678"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Ngày bắt đầu làm việc</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Vị trí công tác (8 Vị trí) <span className="text-red-500">*</span>
              </label>
              <select
                value={position}
                onChange={e => setPosition(e.target.value as StaffPosition)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-red-500"
              >
                {Object.entries(STAFF_POSITION_LABELS).map(([posKey, posLabel]) => (
                  <option key={posKey} value={posKey}>
                    {posLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Ca làm việc mặc định</label>
              <select
                value={defaultShiftId}
                onChange={e => setDefaultShiftId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-red-500"
              >
                {data.staffShifts.map(shift => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.startTime} - {shift.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Hình thức trả lương <span className="text-red-500">*</span>
              </label>
              <select
                value={payType}
                onChange={e => setPayType(e.target.value as StaffPayType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-red-500"
              >
                {Object.entries(STAFF_PAY_TYPE_LABELS).map(([pKey, pLabel]) => (
                  <option key={pKey} value={pKey}>
                    {pLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Định mức lương cơ sở (VNĐ) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  required
                  value={baseRate}
                  onChange={e => setBaseRate(Number(e.target.value))}
                  className="w-full px-3 py-2 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-red-500"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {payType === 'monthly' && 'Lương cứng cố định / tháng'}
                {payType === 'per_session' && 'Thù lao / buổi dạy hoặc làm việc'}
                {payType === 'per_shift' && 'Thù lao / ca làm'}
                {payType === 'per_hour' && 'Thù lao / giờ làm việc'}
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Trạng thái công tác</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-red-500"
              >
                <option value="active">Đang làm việc (Active)</option>
                <option value="inactive">Đã thôi việc / Tạm nghỉ (Inactive)</option>
              </select>
            </div>
          </div>

          {/* Bank Account Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-red-600" />
              <span>Thông tin tài khoản ngân hàng chi trả lương</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Tên ngân hàng</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="VD: Techcombank, VCB..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Số tài khoản</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="VD: 1903888..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Chủ tài khoản</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={e => setAccountHolder(e.target.value.toUpperCase())}
                  placeholder="VD: NGUYEN VAN A"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs uppercase"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Ghi chú bổ sung</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="VD: Thỏa thuận thử việc, phân công nhiệm vụ đặc biệt..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md shadow-red-950/20 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{staffToEdit ? 'Lưu Thay Đổi' : 'Thêm Nhân Sự'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
