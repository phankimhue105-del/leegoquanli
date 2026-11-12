import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users2,
  BookOpen,
  BookMarked,
  UserCheck,
  UserPlus,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  Award,
  FileText,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationTab =
  | 'dashboard'
  | 'students'
  | 'parents'
  | 'classes'
  | 'teaching_schedule'
  | 'programs'
  | 'teachers'
  | 'assistants'
  | 'timetable'
  | 'attendance'
  | 'assessments'
  | 'lesson_plans'
  | 'lesson_reports'
  | 'reports'
  | 'users'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const { currentUser } = useAuth();
  const role = currentUser.role;

  interface MenuItem {
    id: NavigationTab;
    label: string;
    sublabel?: string;
    icon: React.ElementType;
    allowedRoles: ('admin' | 'academic_manager' | 'teacher')[];
    badge?: string;
  }

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      sublabel: 'Tổng quan',
      icon: LayoutDashboard,
      allowedRoles: ['admin', 'academic_manager', 'teacher'],
    },
    {
      id: 'students',
      label: 'Học sinh',
      sublabel: 'Students',
      icon: GraduationCap,
      allowedRoles: ['admin', 'academic_manager'],
    },
    {
      id: 'parents',
      label: 'Phụ huynh',
      sublabel: 'Parents',
      icon: Users2,
      allowedRoles: ['admin', 'academic_manager'],
    },
    {
      id: 'classes',
      label: 'Lớp học',
      sublabel: 'Classes',
      icon: BookOpen,
      allowedRoles: ['admin', 'academic_manager', 'teacher'],
    },
    {
      id: 'teaching_schedule',
      label: 'Teaching Schedule',
      sublabel: 'Lịch giảng dạy',
      icon: CalendarDays,
      allowedRoles: ['admin', 'academic_manager', 'teacher'],
    },
    {
      id: 'teachers',
      label: 'Giáo viên',
      sublabel: 'Teachers',
      icon: UserCheck,
      allowedRoles: ['admin', 'academic_manager'],
    },
    {
      id: 'assistants',
      label: 'Trợ giảng',
      sublabel: 'Teaching Assistants',
      icon: UserPlus,
      allowedRoles: ['admin', 'academic_manager'],
    },
    {
      id: 'timetable',
      label: 'Thời khóa biểu',
      sublabel: 'Timetable',
      icon: Calendar,
      allowedRoles: ['admin', 'academic_manager', 'teacher'],
    },
    {
      id: 'attendance',
      label: 'Điểm danh',
      sublabel: 'Attendance',
      icon: ClipboardCheck,
      allowedRoles: ['admin', 'academic_manager', 'teacher'],
    },
    {
      id: 'assessments',
      label: 'Đánh giá học tập',
      sublabel: 'Assessments',
      icon: Award,
      allowedRoles: ['admin', 'academic_manager', 'teacher'],
    },
    {
      id: 'lesson_plans',
      label: 'Giáo án & Báo cáo',
      sublabel: 'Lesson Plans',
      icon: FileText,
      allowedRoles: ['admin', 'academic_manager', 'teacher'],
    },
    {
      id: 'lesson_reports',
      label: 'Lesson Report',
      sublabel: 'Báo cáo buổi học',
      icon: FileSpreadsheet,
      allowedRoles: ['admin', 'academic_manager', 'teacher'],
    },
    {
      id: 'reports',
      label: 'Báo cáo học thuật',
      sublabel: 'Academic Reports',
      icon: BarChart3,
      allowedRoles: ['admin', 'academic_manager'],
    },
    {
      id: 'users',
      label: 'Quản lý tài khoản',
      sublabel: 'User Management',
      icon: ShieldCheck,
      allowedRoles: ['admin'],
    },
    {
      id: 'settings',
      label: 'Cài đặt',
      sublabel: 'Settings',
      icon: Settings,
      allowedRoles: ['admin'],
    },
  ];

  const visibleItems = menuItems.filter(item => item.allowedRoles.includes(role));

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 select-none z-20 shrink-0 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Logo Mark: LeeGo Red Badge */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-red-900/40 shrink-0 border border-red-500/30">
            L
          </div>
          {!collapsed && (
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-base tracking-tight">LeeGo</span>
                <span className="text-xs bg-red-600/30 text-red-400 font-semibold px-1.5 py-0.5 rounded border border-red-500/20">
                  CENTER
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">Hệ thống quản lý trung tâm</p>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors hidden md:flex items-center justify-center"
          title={collapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Role Pill */}
      {!collapsed ? (
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/50">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Quyền truy cập
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                role === 'admin'
                  ? 'bg-amber-400 ring-4 ring-amber-400/20'
                  : role === 'academic_manager'
                  ? 'bg-blue-400 ring-4 ring-blue-400/20'
                  : 'bg-emerald-400 ring-4 ring-emerald-400/20'
              }`}
            />
            <span className="text-xs font-semibold text-white">
              {role === 'admin' && 'Admin - Quản trị viên cao cấp'}
              {role === 'academic_manager' && 'Quản lý học thuật'}
              {role === 'teacher' && 'Giáo viên giảng dạy'}
            </span>
          </div>
        </div>
      ) : (
        <div className="py-2 flex justify-center border-b border-slate-800/60">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              role === 'admin' ? 'bg-amber-400' : role === 'academic_manager' ? 'bg-blue-400' : 'bg-emerald-400'
            }`}
            title={`Vai trò: ${role}`}
          />
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all text-left group ${
                isActive
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
              title={collapsed ? `${item.label} (${item.sublabel})` : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!collapsed && (
                <div className="flex-1 truncate">
                  <span className="truncate">{item.label}</span>
                  {item.sublabel && (
                    <span
                      className={`block text-[11px] font-normal truncate ${
                        isActive ? 'text-red-100' : 'text-slate-400'
                      }`}
                    >
                      {item.sublabel}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Center Info / Status */}
      {!collapsed && (
        <div className="p-3 m-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">LeeGo English</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <Sparkles className="w-3 h-3" /> Online
            </span>
          </div>
          <div className="text-[11px] text-slate-400">Học kỳ: Xuân 2025</div>
          <div className="text-[10px] text-slate-400 mt-1">Cơ sở: Cầu Giấy, Hà Nội</div>
        </div>
      )}
    </aside>
  );
};
