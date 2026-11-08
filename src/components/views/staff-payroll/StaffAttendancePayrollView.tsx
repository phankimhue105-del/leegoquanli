import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  CalendarDays,
  DollarSign,
  Gift,
  History,
  FileSpreadsheet,
  ShieldAlert,
  Users,
  Settings2,
  Lock
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { StaffOverviewTab } from './StaffOverviewTab';
import { StaffAttendanceTab } from './StaffAttendanceTab';
import { StaffWorkRecordsTab } from './StaffWorkRecordsTab';
import { StaffPayrollCalcTab } from './StaffPayrollCalcTab';
import { StaffAdjustmentsTab } from './StaffAdjustmentsTab';
import { StaffPayrollHistoryTab } from './StaffPayrollHistoryTab';
import { StaffExportExcelTab } from './StaffExportExcelTab';
import { StaffManagementModal } from './StaffManagementModal';

export const StaffAttendancePayrollView: React.FC = () => {
  const { currentUser } = useAuth();

  // Strict Admin-only Authorization Guard
  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center space-y-4 max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Truy Cập Bị Giới Hạn (Admin Only)</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Phân hệ <strong>Điểm danh nhân sự & Tính lương</strong> chứa dữ liệu tài chính và tiền lương nhạy cảm, chỉ dành riêng cho tài khoản Quản trị viên (Admin).
        </p>
        <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 font-mono">
          Tài khoản hiện tại: {currentUser.name} ({currentUser.role})
        </div>
      </div>
    );
  }

  // Active Tab Index (0 to 6)
  const [activeTab, setActiveTab] = useState<number>(0);

  // Common Month & Year state shared across tabs
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // e.g. 11
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());   // e.g. 2026

  // Staff Management Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);

  const tabs = [
    { id: 0, label: '1. Tổng quan', icon: LayoutDashboard },
    { id: 1, label: '2. Điểm danh', icon: CalendarCheck2 },
    { id: 2, label: '3. Bảng công', icon: CalendarDays },
    { id: 3, label: '4. Tính lương', icon: DollarSign },
    { id: 4, label: '5. Điều chỉnh lương', icon: Gift },
    { id: 5, label: '6. Lịch sử bảng lương', icon: History },
    { id: 6, label: '7. Xuất Excel', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              Điểm Danh Nhân Sự & Quản Lý Lương (Staff Attendance & Payroll V2)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
              ADMIN ONLY
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quy trình khép kín: Điểm danh → Bảng công → Tính lương → Kiểm tra & Chốt lương → Thanh toán.
          </p>
        </div>

        <button
          onClick={() => setIsStaffModalOpen(true)}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-xs"
        >
          <Users className="w-4 h-4 text-slate-300" />
          <span>Quản lý hồ sơ nhân sự</span>
        </button>
      </div>

      {/* 7 Tabs Navigation Bar */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex overflow-x-auto gap-1 scrollbar-none">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-red-600 text-white shadow-xs shadow-red-950/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Viewport */}
      <div>
        {activeTab === 0 && (
          <StaffOverviewTab
            onNavigateTab={setActiveTab}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            onOpenStaffModal={() => setIsStaffModalOpen(true)}
          />
        )}

        {activeTab === 1 && <StaffAttendanceTab />}

        {activeTab === 2 && (
          <StaffWorkRecordsTab
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
          />
        )}

        {activeTab === 3 && (
          <StaffPayrollCalcTab
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
          />
        )}

        {activeTab === 4 && (
          <StaffAdjustmentsTab
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
          />
        )}

        {activeTab === 5 && <StaffPayrollHistoryTab />}

        {activeTab === 6 && (
          <StaffExportExcelTab
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
          />
        )}
      </div>

      {/* Staff Management Modal */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />
    </div>
  );
};
