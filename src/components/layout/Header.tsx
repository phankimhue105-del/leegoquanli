import React, { useState } from 'react';
import {
  Bell,
  Search,
  Shield,
  GraduationCap,
  Briefcase,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  Database,
  ExternalLink,
  Menu,
  Clock,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import { NavigationTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onToggleMobileSidebar?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onToggleMobileSidebar,
  searchQuery,
  setSearchQuery
}) => {
  const { currentUser, switchUser, logout } = useAuth();
  const { data, resetAllData } = useData();
  const { showToast } = useToast();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  const tabTitles: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Bảng Điều Khiển (Dashboard)', subtitle: 'Tổng quan vận hành và thống kê trung tâm LeeGo' },
    students: { title: 'Quản Lý Học Sinh (Students)', subtitle: 'Hồ sơ học sinh, chuyển lớp, nhập xuất danh sách' },
    parents: { title: 'Quản Lý Phụ Huynh (Parents)', subtitle: 'Thông tin liên hệ, học sinh phụ thuộc và lịch sử trao đổi' },
    classes: { title: 'Quản Lý Lớp Học (Classes)', subtitle: 'Danh sách lớp, phân công giáo viên và phòng học' },
    teaching_schedule: { title: 'Lịch Giảng Dạy (Teaching Schedule)', subtitle: 'Kế hoạch giảng dạy hàng tháng, nội dung buổi dạy và xuất văn bản Word/Excel' },
    course_duration: { title: 'Quản Lý Thời Gian Khóa Học (Course Duration)', subtitle: 'Tính toán ngày hoàn thành, theo dõi tiến độ, quản lý ngày nghỉ và lịch học bù' },
    programs: { title: 'Chương Trình Học (Curricula)', subtitle: 'Khung Cambridge Starters, Movers, Flyers, KET, PET' },
    teachers: { title: 'Quản Lý Giáo Viên (Teachers)', subtitle: 'Đội ngũ giáo viên bản ngữ & Việt Nam, tải giờ giảng dạy' },
    assistants: { title: 'Quản Lý Trợ Giảng (Assistants)', subtitle: 'Đội ngũ trợ giảng hỗ trợ lớp học và sửa bài tập' },
    timetable: { title: 'Thời Khóa Biểu (Timetable)', subtitle: 'Lịch học hàng tuần và tự động phát hiện xung đột lịch' },
    attendance: { title: 'Điểm Danh Lớp Học (Attendance)', subtitle: 'Ghi nhận chuyên cần, đi muộn, có phép và vắng mặt' },
    lesson_reports: { title: 'Báo Cáo Tình Hình Học Tập (Lesson Report)', subtitle: 'Quản lý báo cáo sau buổi học, đánh giá học viên, khóa sổ và xuất báo cáo phụ huynh' },
    assessments: { title: 'Đánh Giá Học Tập (Assessments)', subtitle: 'Bảng điểm 4 kỹ năng Cambridge, nhận xét và xếp loại' },
    lesson_plans: { title: 'Giáo Án & Báo Cáo Buổi Dạy', subtitle: 'Nộp báo cáo bài giảng và quản lý học thuật phê duyệt' },
    reports: { title: 'Báo Cáo Học Thuật (Academic Reports)', subtitle: 'Thống kê tuyển sinh, chuyên cần, giờ dạy và xuất Excel' },
    users: { title: 'Quản Lý Người Dùng & Phân Quyền', subtitle: 'Tài khoản hệ thống và thiết lập quyền truy cập (Admin)' },
    settings: { title: 'Cài Đặt Hệ Thống (Settings)', subtitle: 'Năm học, phòng học, kết nối database và dữ liệu mẫu' }
  };

  const handleRoleChange = (userId: string) => {
    switchUser(userId);
    setShowRoleMenu(false);
    showToast(`Đã chuyển sang tài khoản: ${data.users.find(u => u.id === userId)?.name}`, 'info');
  };

  const handleLogout = () => {
    logout();
    showToast('Đã đăng xuất khỏi hệ thống', 'info');
  };

  const handleResetData = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục toàn bộ hệ thống về 30 học sinh, 6 lớp học và dữ liệu chuẩn ban đầu?')) {
      resetAllData();
      showToast('Đã khôi phục dữ liệu mẫu thành công!', 'success');
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base md:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <span>{tabTitles[currentTab]?.title || 'LeeGo Center'}</span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              {tabTitles[currentTab]?.subtitle}
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Quick Search for Students / Classes */}
          <div className="relative hidden lg:block w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm học sinh, lớp, GV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
            />
          </div>

          {/* Database Mode Indicator */}
          <button
            onClick={() => setShowFirebaseModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium hover:bg-emerald-100 transition-colors"
            title="Xem trạng thái lưu trữ & kết nối Firestore"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Local Sync</span>
          </button>

          {/* Activity Log Drawer Trigger */}
          <button
            onClick={() => setShowActivityDrawer(true)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
            title="Xem nhật ký hoạt động hệ thống"
          >
            <Clock className="w-5 h-5" />
            {data.activityLogs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Reset System Button (Demo convenience) */}
          <button
            onClick={handleResetData}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium transition-colors"
            title="Khôi phục dữ liệu ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Khôi phục mẫu</span>
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={currentUser?.name || 'User'}
                className="w-7 h-7 rounded-lg object-cover"
              />
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentUser?.name || 'Khách'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {currentUser?.role === 'admin'
                    ? 'Administrator'
                    : currentUser?.role === 'academic_manager'
                    ? 'Academic Manager'
                    : 'Teacher'}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Chuyển nhanh tài khoản demo
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Chọn vai trò để kiểm thử phân quyền RBAC
                  </p>
                </div>

                <div className="py-1">
                  {data.users.map((u) => {
                    const isCurrent = u.id === currentUser?.id;
                    const Icon =
                      u.role === 'admin'
                        ? Shield
                        : u.role === 'academic_manager'
                        ? Briefcase
                        : GraduationCap;

                    return (
                      <button
                        key={u.id}
                        onClick={() => handleRoleChange(u.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                          isCurrent ? 'bg-red-50 text-red-700 font-medium' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : u.role === 'academic_manager'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-medium">{u.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {u.role === 'admin'
                                ? 'Admin'
                                : u.role === 'academic_manager'
                                ? 'Quản lý học thuật'
                                : 'Giáo viên'}
                            </div>
                          </div>
                        </div>
                        {isCurrent && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                      </button>
                    );
                  })}
                </div>

                {/* Logout Option */}
                <div className="pt-1 mt-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Direct Quick Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Activity Logs Drawer */}
      {showActivityDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setShowActivityDrawer(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-800 text-base">Nhật Ký Hệ Thống</h3>
              </div>
              <button
                onClick={() => setShowActivityDrawer(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {data.activityLogs.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Chưa có nhật ký hoạt động nào</p>
              ) : (
                data.activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800">{log.userName}</span>
                      <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                    </div>
                    <div className="font-medium text-red-600 mb-0.5">{log.action}</div>
                    <p className="text-slate-600 text-[11px]">{log.details}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <span>Tổng cộng: {data.activityLogs.length} sự kiện</span>
              <button
                onClick={() => {
                  data.activityLogs = [];
                  showToast('Đã xóa nhật ký gần đây', 'info');
                }}
                className="text-red-600 hover:underline"
              >
                Xóa lịch sử
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Info Modal */}
      {showFirebaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowFirebaseModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Cấu Hình Firebase & Offline Storage</h3>
                <p className="text-xs text-slate-500">Trạng thái đồng bộ dữ liệu LeeGo Center</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 mb-6">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span>Bộ nhớ hiện tại:</span>
                <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  LocalStorage Sync (100% Offline-first)
                </span>
              </div>
              <p>
                Toàn bộ dữ liệu lớp học, điểm số, học sinh, điểm danh, lịch giảng dạy và báo cáo học tập được tự động lưu trữ tức thời vào bộ nhớ trình duyệt, sẵn sàng đồng bộ sang Cloud Firestore.
              </p>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                <p className="font-semibold">💡 Hướng dẫn triển khai Firebase:</p>
                <p>
                  Điền các biến môi trường <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_FIREBASE_API_KEY</code>, <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_FIREBASE_PROJECT_ID</code> trong file <code className="bg-amber-100 px-1 py-0.5 rounded">.env</code> để kích hoạt Cloud Firestore nhiều người dùng.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowFirebaseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 text-xs transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
