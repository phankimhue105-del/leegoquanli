/**
 * LEEGO CENTER MANAGEMENT - STAFF ATTENDANCE & PAYROLL V2
 * Calculation Engine, Aggregation & Excel Export Service
 */

import * as XLSX from 'xlsx';
import {
  StaffMember,
  StaffPosition,
  STAFF_POSITION_LABELS,
  STAFF_PAY_TYPE_LABELS,
  StaffAttendanceRecord,
  StaffPayrollAdjustment,
  MonthlyWorkRecordSummary,
  StaffPayrollBatch,
  StaffPayrollLineItem,
  StaffPayRate,
  STAFF_ATTENDANCE_STATUS_LABELS,
  STAFF_ADJUSTMENT_LABELS,
  PAYROLL_STATUS_LABELS
} from '../types/payroll';

// Currency Formatter Helper
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * 1. AGGREGATE ATTENDANCE INTO WORK RECORDS (BẢNG CÔNG)
 */
export function calculateMonthlyWorkRecord(
  staff: StaffMember,
  attendanceRecords: StaffAttendanceRecord[],
  month: number,
  year: number
): MonthlyWorkRecordSummary {
  // Filter attendance for this staff in target month & year
  const staffRecords = attendanceRecords.filter(rec => {
    if (rec.staffId !== staff.id) return false;
    const [rYear, rMonth] = rec.date.split('-').map(Number);
    return rYear === year && rMonth === month;
  });

  // Calculate distinct working days
  const workingDates = new Set<string>();
  let totalWorkingSessions = 0;
  let totalWorkingHours = 0;
  let paidSessions = 0;
  let paidShifts = 0;
  let paidHours = 0;
  let presentDays = 0;
  let lateArrivals = 0;
  let absences = 0;
  let leaveDays = 0;
  let compensatoryDays = 0;
  let halfDays = 0;
  let extraShifts = 0;

  staffRecords.forEach(rec => {
    switch (rec.status) {
      case 'present':
        workingDates.add(rec.date);
        presentDays += 1;
        totalWorkingSessions += rec.workingSessions;
        totalWorkingHours += rec.workingHours;
        paidSessions += rec.workingSessions;
        paidShifts += 1;
        paidHours += rec.workingHours;
        break;

      case 'late':
        workingDates.add(rec.date);
        lateArrivals += 1;
        totalWorkingSessions += rec.workingSessions;
        totalWorkingHours += rec.workingHours;
        paidSessions += rec.workingSessions;
        paidShifts += 1;
        paidHours += rec.workingHours;
        break;

      case 'half_day':
        workingDates.add(rec.date);
        halfDays += 1;
        totalWorkingSessions += rec.workingSessions;
        totalWorkingHours += rec.workingHours;
        paidSessions += rec.workingSessions;
        paidShifts += 0.5;
        paidHours += rec.workingHours;
        break;

      case 'extra_shift':
        workingDates.add(rec.date);
        extraShifts += 1;
        totalWorkingSessions += rec.workingSessions;
        totalWorkingHours += rec.workingHours;
        paidSessions += rec.workingSessions;
        paidShifts += 1;
        paidHours += rec.workingHours;
        break;

      case 'leave':
        leaveDays += 1;
        // Leave is tracked, but base earnings are not automatically added unless monthly rule specifies
        break;

      case 'compensatory_leave':
        compensatoryDays += 1;
        // Compensatory leave can be paid as standard if requested
        paidSessions += rec.workingSessions;
        paidHours += rec.workingHours;
        break;

      case 'absent':
        absences += 1;
        break;
    }
  });

  const totalWorkingDays = workingDates.size;
  const totalRecordedDays = presentDays + lateArrivals + halfDays + leaveDays + compensatoryDays + absences;
  const attendanceRate = totalRecordedDays > 0
    ? Math.round(((presentDays + lateArrivals + halfDays * 0.5) / totalRecordedDays) * 100)
    : 100;

  return {
    staffId: staff.id,
    staffName: staff.fullName,
    position: staff.position,
    payType: staff.payType,
    month,
    year,
    totalWorkingDays,
    totalWorkingSessions,
    totalWorkingHours,
    paidSessions,
    paidShifts,
    paidHours,
    presentDays,
    lateArrivals,
    absences,
    leaveDays,
    compensatoryDays,
    halfDays,
    extraShifts,
    attendanceRate
  };
}

export function aggregateAllWorkRecords(
  staffList: StaffMember[],
  attendanceRecords: StaffAttendanceRecord[],
  month: number,
  year: number
): MonthlyWorkRecordSummary[] {
  return staffList.map(stf => calculateMonthlyWorkRecord(stf, attendanceRecords, month, year));
}

/**
 * 2. PAYROLL CALCULATION ENGINE
 */
export function calculateStaffPayrollItem(
  staff: StaffMember,
  workRecord: MonthlyWorkRecordSummary,
  adjustments: StaffPayrollAdjustment[],
  effectiveRate: number
): StaffPayrollLineItem {
  // Filter adjustments for this staff and this month
  const staffAdjustments = adjustments.filter(adj => {
    return adj.staffId === staff.id && adj.month === workRecord.month && adj.year === workRecord.year;
  });

  let totalBonus = 0;
  let totalAllowances = 0;
  let totalOvertime = 0;
  let totalPenalties = 0;
  let totalOtherDeductions = 0;

  staffAdjustments.forEach(adj => {
    switch (adj.adjustmentType) {
      case 'bonus':
        totalBonus += adj.amount;
        break;
      case 'allowance':
        totalAllowances += adj.amount;
        break;
      case 'overtime':
        totalOvertime += adj.amount;
        break;
      case 'penalty':
        totalPenalties += adj.amount;
        break;
      case 'salary_adjustment':
        // Adjustments can be positive or negative
        if (adj.amount >= 0) totalBonus += adj.amount;
        else totalPenalties += Math.abs(adj.amount);
        break;
      case 'other_deduction':
        totalOtherDeductions += adj.amount;
        break;
    }
  });

  let baseEarnings = 0;
  let formula = '';

  switch (staff.payType) {
    case 'per_session':
      baseEarnings = Math.round(workRecord.paidSessions * effectiveRate);
      formula = `${workRecord.paidSessions} buổi × ${formatNumber(effectiveRate)}đ/buổi = ${formatNumber(baseEarnings)}đ`;
      break;

    case 'per_shift':
      baseEarnings = Math.round(workRecord.paidShifts * effectiveRate);
      formula = `${workRecord.paidShifts} ca × ${formatNumber(effectiveRate)}đ/ca = ${formatNumber(baseEarnings)}đ`;
      break;

    case 'per_hour':
      baseEarnings = Math.round(workRecord.paidHours * effectiveRate);
      formula = `${workRecord.paidHours} giờ × ${formatNumber(effectiveRate)}đ/giờ = ${formatNumber(baseEarnings)}đ`;
      break;

    case 'monthly':
    default:
      // Monthly fixed rate: if standard days specified and attendance was partial, calculate proportionally
      const standardDays = staff.standardMonthlyDays || 22;
      if (workRecord.totalWorkingDays >= standardDays || workRecord.totalWorkingDays === 0) {
        baseEarnings = effectiveRate;
        formula = `Lương cứng tháng (${standardDays} ngày chuẩn): ${formatNumber(effectiveRate)}đ`;
      } else {
        // Prorated based on days worked
        baseEarnings = Math.round((effectiveRate / standardDays) * (workRecord.totalWorkingDays + workRecord.leaveDays * 0.5));
        formula = `(${formatNumber(effectiveRate)}đ ÷ ${standardDays} ngày) × ${workRecord.totalWorkingDays} ngày làm = ${formatNumber(baseEarnings)}đ`;
      }
      break;
  }

  const netAdjustments = totalBonus + totalAllowances + totalOvertime - totalPenalties - totalOtherDeductions;
  const finalPayable = Math.max(0, baseEarnings + netAdjustments);

  // Review flags: e.g., missing attendance, excessive absences, zero earnings
  let isFlaggedForReview = false;
  let reviewRemarks = '';

  if (workRecord.absences > 0) {
    isFlaggedForReview = true;
    reviewRemarks = `Có ${workRecord.absences} ngày vắng không phép`;
  } else if (workRecord.paidSessions === 0 && staff.payType !== 'monthly') {
    isFlaggedForReview = true;
    reviewRemarks = 'Chưa ghi nhận buổi làm việc nào trong tháng';
  } else if (workRecord.lateArrivals >= 3) {
    isFlaggedForReview = true;
    reviewRemarks = `Đi muộn ${workRecord.lateArrivals} lần trong tháng`;
  }

  return {
    staffId: staff.id,
    staffName: staff.fullName,
    position: staff.position,
    payType: staff.payType,
    baseRateSnapshot: effectiveRate,
    totalSessions: workRecord.totalWorkingSessions,
    totalShifts: workRecord.paidShifts,
    totalHours: workRecord.totalWorkingHours,
    paidSessions: workRecord.paidSessions,
    paidShifts: workRecord.paidShifts,
    paidHours: workRecord.paidHours,
    baseEarnings,
    totalBonus,
    totalAllowances,
    totalOvertime,
    totalPenalties,
    totalOtherDeductions,
    netAdjustments,
    finalPayable,
    calculationFormula: formula,
    isFlaggedForReview,
    reviewRemarks,
    paymentStatus: 'pending'
  };
}

/**
 * 3. CREATE OR RECALCULATE MONTHLY PAYROLL BATCH
 */
export function buildPayrollBatch(
  month: number,
  year: number,
  staffList: StaffMember[],
  attendanceRecords: StaffAttendanceRecord[],
  adjustments: StaffPayrollAdjustment[],
  payRates: StaffPayRate[],
  createdBy: string
): StaffPayrollBatch {
  const activeStaff = staffList.filter(s => s.status === 'active');
  const rateMap = new Map(payRates.map(r => [r.staffId, r.rate]));

  const lineItems: StaffPayrollLineItem[] = activeStaff.map(staff => {
    const workRecord = calculateMonthlyWorkRecord(staff, attendanceRecords, month, year);
    const rate = rateMap.get(staff.id) ?? staff.baseRate;
    return calculateStaffPayrollItem(staff, workRecord, adjustments, rate);
  });

  const totalSessions = lineItems.reduce((acc, item) => acc + item.totalSessions, 0);
  const totalHours = lineItems.reduce((acc, item) => acc + item.totalHours, 0);
  const totalBaseEarnings = lineItems.reduce((acc, item) => acc + item.baseEarnings, 0);
  const totalBonuses = lineItems.reduce((acc, item) => acc + item.totalBonus + item.totalOvertime, 0);
  const totalAllowances = lineItems.reduce((acc, item) => acc + item.totalAllowances, 0);
  const totalDeductions = lineItems.reduce((acc, item) => acc + item.totalPenalties + item.totalOtherDeductions, 0);
  const totalPayable = lineItems.reduce((acc, item) => acc + item.finalPayable, 0);

  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  return {
    id: `PAY-${year}-${String(month).padStart(2, '0')}`,
    month,
    year,
    title: `Bảng lương tháng ${month}/${year}`,
    status: 'draft',
    staffCount: activeStaff.length,
    totalSessions,
    totalHours,
    totalBaseEarnings,
    totalBonuses,
    totalAllowances,
    totalDeductions,
    totalPayable,
    items: lineItems,
    createdAt: now,
    createdBy,
    isAttendanceLocked: false,
    isPayrollLocked: false
  };
}

/**
 * 4. EXCEL EXPORTS (4 OFFICIAL REPORTS)
 */

// A. Staff Attendance Report
export function exportStaffAttendanceToExcel(
  records: StaffAttendanceRecord[],
  month: number,
  year: number
): void {
  const filtered = records.filter(r => {
    const [rYear, rMonth] = r.date.split('-').map(Number);
    return rYear === year && rMonth === month;
  });

  const rows = filtered.map((rec, idx) => ({
    'STT': idx + 1,
    'Ngày': rec.date,
    'Mã nhân sự': rec.staffId,
    'Họ và tên': rec.staffName,
    'Vị trí chức vụ': STAFF_POSITION_LABELS[rec.position] || rec.position,
    'Ca làm việc': rec.shiftName,
    'Trạng thái điểm danh': STAFF_ATTENDANCE_STATUS_LABELS[rec.status]?.label || rec.status,
    'Số buổi công': rec.workingSessions,
    'Số giờ công': rec.workingHours,
    'Giờ vào': rec.checkInTime || '',
    'Giờ ra': rec.checkOutTime || '',
    'Ghi chú': rec.notes || '',
    'Người ghi nhận': rec.recordedBy,
    'Thời điểm ghi nhận': rec.recordedAt
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Ngày
    { wch: 14 }, // Mã nhân sự
    { wch: 22 }, // Họ và tên
    { wch: 24 }, // Vị trí chức vụ
    { wch: 26 }, // Ca làm việc
    { wch: 22 }, // Trạng thái
    { wch: 14 }, // Số buổi công
    { wch: 14 }, // Số giờ công
    { wch: 10 }, // Giờ vào
    { wch: 10 }, // Giờ ra
    { wch: 30 }, // Ghi chú
    { wch: 18 }, // Người ghi nhận
    { wch: 18 }  // Thời điểm
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Diem_danh_T${month}_${year}`);
  XLSX.writeFile(workbook, `LeeGo_Diem_Danh_Nhan_Su_${month}_${year}.xlsx`);
}

// B. Monthly Work Records (Bảng công)
export function exportWorkRecordsToExcel(
  summaries: MonthlyWorkRecordSummary[],
  month: number,
  year: number
): void {
  const rows = summaries.map((s, idx) => ({
    'STT': idx + 1,
    'Mã nhân sự': s.staffId,
    'Họ và tên': s.staffName,
    'Vị trí chức danh': STAFF_POSITION_LABELS[s.position] || s.position,
    'Hình thức trả lương': STAFF_PAY_TYPE_LABELS[s.payType] || s.payType,
    'Tổng ngày làm việc': s.totalWorkingDays,
    'Tổng số buổi công': s.totalWorkingSessions,
    'Tổng số giờ công': s.totalWorkingHours,
    'Số buổi tính lương': s.paidSessions,
    'Số ca tính lương': s.paidShifts,
    'Số giờ tính lương': s.paidHours,
    'Số lần đi muộn': s.lateArrivals,
    'Vắng không phép': s.absences,
    'Nghỉ có phép': s.leaveDays,
    'Nghỉ bù': s.compensatoryDays,
    'Nửa ngày': s.halfDays,
    'Tăng ca': s.extraShifts,
    'Tỷ lệ chuyên cần (%)': `${s.attendanceRate}%`
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã nhân sự
    { wch: 22 }, // Họ và tên
    { wch: 24 }, // Vị trí
    { wch: 26 }, // Hình thức
    { wch: 18 }, // Ngày làm
    { wch: 18 }, // Buổi công
    { wch: 18 }, // Giờ công
    { wch: 18 }, // Buổi tính lương
    { wch: 16 }, // Ca tính lương
    { wch: 16 }, // Giờ tính lương
    { wch: 16 }, // Đi muộn
    { wch: 16 }, // Vắng KP
    { wch: 14 }, // Nghỉ CP
    { wch: 12 }, // Nghỉ bù
    { wch: 12 }, // Nửa ngày
    { wch: 12 }, // Tăng ca
    { wch: 18 }  // Chuyên cần
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Bang_cong_T${month}_${year}`);
  XLSX.writeFile(workbook, `LeeGo_Bang_Cong_Nhan_Su_${month}_${year}.xlsx`);
}

// C. Monthly Payroll Report
export function exportPayrollReportToExcel(batch: StaffPayrollBatch): void {
  const rows = batch.items.map((item, idx) => ({
    'STT': idx + 1,
    'Mã nhân sự': item.staffId,
    'Họ và tên': item.staffName,
    'Vị trí chức vụ': STAFF_POSITION_LABELS[item.position] || item.position,
    'Hình thức trả lương': STAFF_PAY_TYPE_LABELS[item.payType] || item.payType,
    'Đơn giá cơ sở (VNĐ)': item.baseRateSnapshot,
    'Số buổi tính lương': item.paidSessions,
    'Số ca tính lương': item.paidShifts,
    'Số giờ tính lương': item.paidHours,
    'Lương cơ bản (VNĐ)': item.baseEarnings,
    'Khen thưởng (VNĐ)': item.totalBonus,
    'Phụ cấp trợ cấp (VNĐ)': item.totalAllowances,
    'Thù lao OT (VNĐ)': item.totalOvertime,
    'Khấu trừ & Phạt (VNĐ)': item.totalPenalties + item.totalOtherDeductions,
    'THỰC LĨNH (VNĐ)': item.finalPayable,
    'Công thức tính': item.calculationFormula,
    'Trạng thái bảng lương': PAYROLL_STATUS_LABELS[batch.status]?.label || batch.status,
    'Trạng thái chi trả': item.paymentStatus === 'paid' ? 'Đã chi trả' : 'Chưa chi trả',
    'Cảnh báo đối soát': item.reviewRemarks || 'Hợp lệ'
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã nhân sự
    { wch: 22 }, // Họ tên
    { wch: 24 }, // Vị trí
    { wch: 24 }, // Hình thức
    { wch: 18 }, // Đơn giá
    { wch: 18 }, // Số buổi
    { wch: 16 }, // Số ca
    { wch: 16 }, // Số giờ
    { wch: 18 }, // Lương cơ bản
    { wch: 16 }, // Thưởng
    { wch: 18 }, // Phụ cấp
    { wch: 16 }, // OT
    { wch: 18 }, // Khấu trừ
    { wch: 20 }, // Thực lĩnh
    { wch: 40 }, // Công thức
    { wch: 22 }, // Trạng thái batch
    { wch: 18 }, // Chi trả
    { wch: 28 }  // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Bang_luong_T${batch.month}_${batch.year}`);
  XLSX.writeFile(workbook, `LeeGo_Bang_Luong_Nhan_Su_${batch.month}_${batch.year}.xlsx`);
}

// D. Payment Report
export function exportPaymentReportToExcel(batch: StaffPayrollBatch): void {
  const rows = batch.items.map((item, idx) => ({
    'STT': idx + 1,
    'Mã nhân sự': item.staffId,
    'Họ và tên': item.staffName,
    'Vị trí chức vụ': STAFF_POSITION_LABELS[item.position] || item.position,
    'Kỳ lương': `Tháng ${batch.month}/${batch.year}`,
    'Số tiền đã chốt (VNĐ)': item.finalPayable,
    'Ngày thanh toán': item.paidDate || batch.paidAt?.slice(0, 10) || '',
    'Hình thức thanh toán': item.paymentMethod === 'bank_transfer'
      ? 'Chuyển khoản ngân hàng'
      : item.paymentMethod === 'cash'
      ? 'Tiền mặt'
      : item.paymentMethod || (batch.paymentMethod === 'bank_transfer' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt'),
    'Mã chứng từ / Tham chiếu': item.paymentReference || batch.paymentReference || '',
    'Trạng thái chi trả': item.paymentStatus === 'paid' || batch.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán',
    'Người chi trả': batch.paidBy || '',
    'Ghi chú': batch.paymentNotes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã NV
    { wch: 22 }, // Họ tên
    { wch: 24 }, // Vị trí
    { wch: 16 }, // Kỳ lương
    { wch: 20 }, // Số tiền
    { wch: 16 }, // Ngày TT
    { wch: 22 }, // Hình thức
    { wch: 24 }, // Mã chứng từ
    { wch: 18 }, // Trạng thái
    { wch: 18 }, // Người chi trả
    { wch: 30 }  // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Bao_cao_TT_T${batch.month}_${batch.year}`);
  XLSX.writeFile(workbook, `LeeGo_Bao_Cao_Thanh_Toan_Luong_${batch.month}_${batch.year}.xlsx`);
}
