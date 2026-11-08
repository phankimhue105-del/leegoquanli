/**
 * LEEGO CENTER MANAGEMENT - STAFF ATTENDANCE & PAYROLL V2
 * Complete Type Definitions
 */

export type StaffPosition =
  | 'admin_accounting'     // Hành chính / Kế toán
  | 'academic_manager'    // Quản lí học thuật
  | 'teacher'             // Giáo viên
  | 'teaching_assistant'  // Trợ giảng
  | 'cleaning_staff'      // Tạp vụ
  | 'class_manager'       // Quản lí lớp
  | 'hr'                  // Nhân sự
  | 'receptionist';       // Lễ tân

export const STAFF_POSITION_LABELS: Record<StaffPosition, string> = {
  admin_accounting: 'Hành chính / Kế toán',
  academic_manager: 'Quản lí học thuật',
  teacher: 'Giáo viên',
  teaching_assistant: 'Trợ giảng',
  cleaning_staff: 'Tạp vụ',
  class_manager: 'Quản lí lớp',
  hr: 'Nhân sự',
  receptionist: 'Lễ tân'
};

export type StaffPayType =
  | 'monthly'      // Lương cứng cố định hàng tháng
  | 'per_session'  // Theo buổi làm / dạy
  | 'per_shift'    // Theo ca làm việc
  | 'per_hour';    // Theo giờ làm việc

export const STAFF_PAY_TYPE_LABELS: Record<StaffPayType, string> = {
  monthly: 'Lương cố định tháng (Monthly)',
  per_session: 'Theo buổi dạy/làm (Per Session)',
  per_shift: 'Theo ca làm việc (Per Shift)',
  per_hour: 'Theo giờ làm việc (Per Hour)'
};

export interface StaffMember {
  id: string; // STF-XXX or TCH-XXX or TA-XXX
  fullName: string;
  email: string;
  phone: string;
  position: StaffPosition;
  payType: StaffPayType;
  baseRate: number; // VND per month, session, shift, or hour
  standardMonthlyHours?: number; // e.g. 176 hours for full-time monthly
  standardMonthlyDays?: number;  // e.g. 22 or 26 days
  defaultShiftId?: string;
  linkedTeacherId?: string; // links to existing Teacher id if position is teacher
  linkedAssistantId?: string; // links to existing TeachingAssistant id if position is TA
  linkedUserId?: string; // links to User id
  status: 'active' | 'inactive';
  startDate: string; // YYYY-MM-DD
  notes?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

export type WorkingShiftType = 'morning' | 'afternoon' | 'evening' | 'full_day' | 'custom';

export interface WorkingShift {
  id: string; // SHIFT-MORNING, SHIFT-AFTERNOON, etc.
  name: string; // "Ca Sáng", "Ca Chiều", "Ca Tối", "Cả Ngày", etc.
  type: WorkingShiftType;
  startTime: string; // "08:00"
  endTime: string; // "12:00"
  breakDurationMinutes: number; // e.g. 0 or 90
  standardSessions: number; // 1 or 2
  standardHours: number; // 4, 3.5, 8
  description?: string;
  isDefault?: boolean;
}

export type StaffAttendanceStatus =
  | 'present'             // Có mặt
  | 'late'                // Đi muộn
  | 'absent'              // Vắng không phép
  | 'leave'               // Vắng có phép (được duyệt)
  | 'compensatory_leave'  // Nghỉ bù
  | 'half_day'            // Nửa ngày
  | 'extra_shift';        // Tăng ca / Ca bổ sung

export const STAFF_ATTENDANCE_STATUS_LABELS: Record<StaffAttendanceStatus, { label: string; shortLabel: string; color: string; bgColor: string }> = {
  present: {
    label: 'Có mặt (Present)',
    shortLabel: 'Có mặt',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200'
  },
  late: {
    label: 'Đi muộn (Late)',
    shortLabel: 'Đi muộn',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200'
  },
  absent: {
    label: 'Vắng không phép (Absent)',
    shortLabel: 'Vắng KP',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200'
  },
  leave: {
    label: 'Nghỉ có phép (Leave)',
    shortLabel: 'Có phép',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  compensatory_leave: {
    label: 'Nghỉ bù (Compensatory Leave)',
    shortLabel: 'Nghỉ bù',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200'
  },
  half_day: {
    label: 'Nửa ngày (Half-day)',
    shortLabel: 'Nửa ngày',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200'
  },
  extra_shift: {
    label: 'Tăng ca / Ca phụ (Extra Shift)',
    shortLabel: 'Tăng ca',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50 border-indigo-200'
  }
};

export interface StaffAttendanceRecord {
  id: string; // ATT-STF-[staffId]-[date]-[shiftId]
  date: string; // YYYY-MM-DD
  staffId: string;
  staffName: string;
  position: StaffPosition;
  shiftId: string;
  shiftName: string;
  status: StaffAttendanceStatus;
  workingSessions: number; // e.g. 1.0, 0.5, 2.0
  workingHours: number; // e.g. 4.0, 2.0, 8.0
  notes?: string;
  checkInTime?: string; // HH:mm
  checkOutTime?: string; // HH:mm
  isLocked: boolean; // locked when month is closed
  recordedBy: string;
  recordedAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface StaffPayRate {
  id: string;
  staffId: string;
  staffName: string;
  position: StaffPosition;
  payType: StaffPayType;
  rate: number; // VND
  effectiveDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type StaffAdjustmentType =
  | 'bonus'            // Thưởng hiệu quả, thành tích, lễ tết
  | 'penalty'          // Phạt kỷ luật / vi phạm nội quy
  | 'overtime'         // Phụ cấp tăng ca ngoài giờ
  | 'allowance'        // Phụ cấp ăn trưa, xăng xe, trách nhiệm
  | 'salary_adjustment'// Điều chỉnh lương khác
  | 'other_deduction'; // Khấu trừ khác (tạm ứng, BHXH, v.v.)

export const STAFF_ADJUSTMENT_LABELS: Record<StaffAdjustmentType, { label: string; isCredit: boolean; color: string }> = {
  bonus: { label: 'Khen thưởng', isCredit: true, color: 'text-emerald-600' },
  allowance: { label: 'Phụ cấp trợ cấp', isCredit: true, color: 'text-blue-600' },
  overtime: { label: 'Thù lao tăng ca (OT)', isCredit: true, color: 'text-indigo-600' },
  penalty: { label: 'Phạt vi phạm', isCredit: false, color: 'text-red-600' },
  salary_adjustment: { label: 'Điều chỉnh số dư', isCredit: true, color: 'text-amber-600' },
  other_deduction: { label: 'Khấu trừ / Tạm ứng', isCredit: false, color: 'text-rose-600' }
};

export interface StaffPayrollAdjustment {
  id: string; // ADJ-XXX
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  month: number; // 1-12
  year: number; // e.g. 2026
  adjustmentType: StaffAdjustmentType;
  amount: number; // positive number (the system adds or subtracts based on type)
  reason: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface MonthlyWorkRecordSummary {
  staffId: string;
  staffName: string;
  position: StaffPosition;
  payType: StaffPayType;
  month: number;
  year: number;
  totalWorkingDays: number;
  totalWorkingSessions: number;
  totalWorkingHours: number;
  paidSessions: number;
  paidShifts: number;
  paidHours: number;
  presentDays: number;
  lateArrivals: number;
  absences: number;
  leaveDays: number;
  compensatoryDays: number;
  halfDays: number;
  extraShifts: number;
  attendanceRate: number; // 0 - 100%
}

export type PayrollBatchStatus = 'draft' | 'reviewed' | 'approved' | 'paid';

export const PAYROLL_STATUS_LABELS: Record<PayrollBatchStatus, { label: string; step: number; color: string; badgeClass: string }> = {
  draft: {
    label: 'Nháp (Draft)',
    step: 1,
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  reviewed: {
    label: 'Đã kiểm tra (Reviewed)',
    step: 2,
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  approved: {
    label: 'Đã chốt lương (Approved)',
    step: 3,
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  paid: {
    label: 'Đã thanh toán (Paid)',
    step: 4,
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  }
};

export interface StaffPayrollLineItem {
  staffId: string;
  staffName: string;
  position: StaffPosition;
  payType: StaffPayType;
  
  // Historical Snapshots
  baseRateSnapshot: number;
  totalSessions: number;
  totalShifts: number;
  totalHours: number;
  paidSessions: number;
  paidShifts: number;
  paidHours: number;
  
  // Earnings
  baseEarnings: number;
  totalBonus: number;
  totalAllowances: number;
  totalOvertime: number;
  totalPenalties: number;
  totalOtherDeductions: number;
  netAdjustments: number; // bonus + allowances + overtime - penalties - otherDeductions
  finalPayable: number; // baseEarnings + netAdjustments
  
  // Calculation details/flags
  calculationFormula: string;
  isFlaggedForReview?: boolean;
  reviewRemarks?: string;
  
  // Payment info for this line item
  paymentStatus: 'pending' | 'paid';
  paidDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
}

export interface StaffPayrollBatch {
  id: string; // PAY-YYYY-MM, e.g., PAY-2026-11
  month: number; // 1-12
  year: number; // e.g. 2026
  title: string; // "Bảng lương tháng 11/2026"
  status: PayrollBatchStatus;
  
  // Aggregates
  staffCount: number;
  totalSessions: number;
  totalHours: number;
  totalBaseEarnings: number;
  totalBonuses: number;
  totalAllowances: number;
  totalDeductions: number;
  totalPayable: number;
  
  // Line items
  items: StaffPayrollLineItem[];
  
  // Workflow timestamps & users
  createdAt: string;
  createdBy: string;
  
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  
  approvedAt?: string;
  approvedBy?: string;
  approvalNotes?: string;
  
  paidAt?: string;
  paidBy?: string;
  paymentMethod?: 'bank_transfer' | 'cash' | 'other';
  paymentReference?: string;
  paymentNotes?: string;
  
  isAttendanceLocked: boolean;
  isPayrollLocked: boolean;
}

export interface AttendancePeriodLock {
  id: string; // LOCK-YYYY-MM
  month: number;
  year: number;
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
}

export interface PayrollAuditLog {
  id: string;
  timestamp: string;
  period: string; // "MM/YYYY"
  batchId?: string;
  userId: string;
  userName: string;
  action:
    | 'attendance_lock'
    | 'attendance_unlock'
    | 'payroll_created'
    | 'payroll_recalculated'
    | 'payroll_reviewed'
    | 'payroll_approved'
    | 'payroll_paid'
    | 'payroll_reopened'
    | 'payroll_corrected'
    | 'adjustment_added'
    | 'adjustment_deleted'
    | 'rate_updated';
  previousState?: string;
  newState?: string;
  reason?: string;
  details: string;
}
