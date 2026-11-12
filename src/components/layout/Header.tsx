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
  Clock
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
  const { currentUser, switchUser } = useAuth();
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
    programs: { title: 'Chương Trình Học (Curricula)', subtitle: 'Khung Cambridge Starters, Movers, Flyers, KET, PET' },
    teachers: { title: 'Quản Lý Giáo Viên (Teachers)', subtitle: 'Đội ngũ giáo viên bản ngữ & Việt Nam, tải giờ giảng dạy' },
    assistants: { title: 'Quản Lý Trợ Giảng (Assistants)', subtitle: 'Đội ngũ trợ giảng hỗ trợ lớp học và sửa bài tập' },
    timetable: { title: 'Thời Khóa Biểu (Timetable)', subtitle: 'Lịch học hàng tuần và tự động phát hiện xung đột lịch' },
    attendance: { title: 'Điểm Danh Lớp Học (Attendance)', subtitle: 'Ghi nhận chuyên cần, đi muộn, có phép và vắng mặt' },
    assessments: { title: 'Đánh Giá Học Tập (Assessments)', subtitle: 'Bảng điểm 4 kỹ năng Cambridge, nhận xét và xếp loại' },
    lesson_plans: { title: 'Giáo Án & Báo Cáo Buổi Dạy', subtitle: 'Nộp báo cáo bài giảng và quản lý học thuật phê duyệt' },
    lesson_reports: { title: 'Báo Cáo Tình Hình Học Tập (Lesson Report)', subtitle: 'Quản lý báo cáo sau buổi học, đánh giá học viên, khóa sổ và xuất báo cáo gửi phụ huynh' },
    reports: { title: 'Báo Cáo Học Thuật (Academic Reports)', subtitle: 'Thống kê tuyển sinh, chuyên cần, giờ dạy và xuất Excel' },
    users: { title: 'Quản Lý Người Dùng & Phân Quyền', subtitle: 'Tài khoản hệ thống và thiết lập quyền truy cập (Admin)' },
    settings: { title: 'Cài Đặt Hệ Thống (Settings)', subtitle: 'Năm học, phòng học, kết nối database và dữ liệu mẫu' }
  };

  const handleRoleChange = (userId: string) => {
    switchUser(userId);
    setShowRoleMenu(false);
    showToast(`Đã chuyển sang tài khoản: ${data.users.find(u => u.id === userId)?.name}`, 'info');
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

          {/* Activity Logs Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowActivityDrawer(!showActivityDrawer)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 relative transition-colors"
              title="Nhật ký hoạt động"
            >
              <Bell className="w-5 h-5" />
              {data.activityLogs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full ring-2 ring-white"></span>
              )}
            </button>
          </div>

          {/* ROLE SWITCHER DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all text-xs font-semibold"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-red-600">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold leading-tight truncate max-w-[140px] text-slate-900">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-red-600 font-semibold uppercase tracking-wider">
                  {currentUser.role === 'admin'
                    ? 'Admin'
                    : currentUser.role === 'academic_manager'
                    ? 'Quản lý học thuật'
                    : 'Giáo viên'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Chuyển tài khoản & Phân quyền
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thử nghiệm hệ thống với các vai trò thực tế:
                  </p>
                </div>

                <div className="p-1 space-y-1">
                  {data.users.map(u => {
                    const isSelected = currentUser.id === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleRoleChange(u.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                          isSelected ? 'bg-red-50 text-red-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              u.role === 'admin'
                                ? 'bg-amber-100 text-amber-800'
                                : u.role === 'academic_manager'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.role === 'admin' ? (
                              <Shield className="w-3.5 h-3.5" />
                            ) : u.role === 'academic_manager' ? (
                              <Briefcase className="w-3.5 h-3.5" />
                            ) : (
                              <GraduationCap className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-500">{u.email}</div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      handleResetData();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục dữ liệu mẫu ban đầu</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Activity Drawer */}
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
                <h3 className="font-bold text-slate-800 text-sm">Nhật ký hoạt động hệ thống</h3>
              </div>
              <button
                onClick={() => setShowActivityDrawer(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                Đóng
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {data.activityLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-700">{log.userName} ({log.userRole})</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="font-semibold text-slate-900">{log.action}</div>
                  <div className="text-slate-600 leading-relaxed">{log.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Firebase / Storage Info Modal */}
      {showFirebaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setShowFirebaseModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl z-10 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cơ chế lưu trữ & Sẵn sàng Firebase</h3>
                <p className="text-xs text-slate-500">LeeGo English Center Data Architecture</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 mb-1">Hiện trạng dữ liệu:</div>
                <p>
                  Hệ thống đang hoạt động ở chế độ <span className="font-semibold text-emerald-700">Persistent Local Storage</span>. Mọi thay đổi về Học sinh, Lớp học, Điểm danh, Đánh giá, Báo cáo và Phân quyền đều được lưu trữ trực tiếp và tự động đồng bộ trên trình duyệt của bạn mà không bị mất khi tải lại trang.
                </p>
              </div>

              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900">
                <div className="font-bold mb-1 flex items-center gap-1.5 text-red-800">
                  <CheckCircle2 className="w-4 h-4 text-red-600" />
                  Sẵn sàng kết nối Firebase Firestore
                </div>
                <p className="text-red-700">
                  Cấu trúc dữ liệu đã được chuẩn hóa theo định dạng Document/Collection tương thích 100% với Google Cloud Firestore và Firebase Auth.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowFirebaseModal(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
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
