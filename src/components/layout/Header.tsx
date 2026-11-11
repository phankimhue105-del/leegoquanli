import React, { useState, useEffect, useRef } from 'react';
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
  Menu,
  Clock,
  LogOut,
  RefreshCw,
  AlertTriangle,
  UploadCloud
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
  const { currentUser, logout } = useAuth();
  const {
    data,
    resetAllData,
    syncStatus,
    syncError,
    lastSyncedAt,
    cloudVersion,
    pendingSyncCount,
    unsyncedLocalCount,
    syncNow,
    retryPendingSync,
    mergeUnsyncedLocalData,
    forcePushLocalToCloud
  } = useData();
  const { showToast } = useToast();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const lastNotifiedErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (syncError && syncError !== lastNotifiedErrorRef.current) {
      lastNotifiedErrorRef.current = syncError;
      showToast(syncError, 'error');
    } else if (!syncError) {
      lastNotifiedErrorRef.current = null;
    }
  }, [syncError, showToast]);

  const tabTitles: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Bảng Điều Khiển (Dashboard)', subtitle: 'Tổng quan vận hành và thống kê trung tâm LeeGo' },
    students: { title: 'Quản Lý Học Sinh (Students)', subtitle: 'Hồ sơ học sinh, chuyển lớp, nhập xuất danh sách' },
    parents: { title: 'Quản Lý Phụ Huynh (Parents)', subtitle: 'Thông tin liên hệ, học sinh phụ thuộc và lịch sử trao đổi' },
    classes: { title: 'Quản Lý Lớp Học (Classes)', subtitle: 'Danh sách lớp, phân công giáo viên và phòng học' },
    teaching_schedule: { title: 'Lịch Giảng Dạy (Teaching Schedule)', subtitle: 'Kế hoạch giảng dạy hàng tháng, nội dung buổi dạy và xuất văn bản Word/Excel' },
    course_duration: { title: 'Quản Lý Thời Gian Khóa Học (Course Duration)', subtitle: 'Theo dõi tiến độ, hạn hoàn thành, ngày nghỉ lễ và học bù' },
    programs: { title: 'Chương Trình Học (Curricula)', subtitle: 'Khung Cambridge Starters, Movers, Flyers, KET, PET' },
    teachers: { title: 'Quản Lý Giáo Viên (Teachers)', subtitle: 'Đội ngũ giáo viên bản ngữ & Việt Nam, tải giờ giảng dạy' },
    assistants: { title: 'Quản Lý Trợ Giảng (Assistants)', subtitle: 'Đội ngũ trợ giảng hỗ trợ lớp học và sửa bài tập' },
    timetable: { title: 'Thời Khóa Biểu (Timetable)', subtitle: 'Lịch học hàng tuần và tự động phát hiện xung đột lịch' },
    attendance: { title: 'Điểm Danh Lớp Học (Attendance)', subtitle: 'Ghi nhận chuyên cần, đi muộn, có phép và vắng mặt' },
    lesson_reports: { title: 'Báo Cáo Tình Hình Học Tập (Lesson Report)', subtitle: 'Đánh giá sau buổi học, khóa sổ và xuất báo cáo phụ huynh' },
    assessments: { title: 'Đánh Giá Học Tập (Assessments)', subtitle: 'Bảng điểm 4 kỹ năng Cambridge, nhận xét và xếp loại' },
    lesson_plans: { title: 'Giáo Án & Báo Cáo Buổi Dạy', subtitle: 'Nộp báo cáo bài giảng và quản lý học thuật phê duyệt' },
    reports: { title: 'Báo Cáo Học Thuật (Academic Reports)', subtitle: 'Thống kê tuyển sinh, chuyên cần, giờ dạy và xuất Excel' },
    users: { title: 'Quản Lý Người Dùng & Phân Quyền', subtitle: 'Tài khoản hệ thống và thiết lập quyền truy cập (Admin)' },
    settings: { title: 'Cài Đặt Hệ Thống (Settings)', subtitle: 'Năm học, phòng học, kết nối database và dữ liệu mẫu' }
  };

  const handleLogout = () => {
    setShowRoleMenu(false);
    logout();
    showToast('Đã đăng xuất khỏi hệ thống', 'info');
  };

  const handleResetData = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục toàn bộ hệ thống về 30 học sinh, 6 lớp học và dữ liệu chuẩn ban đầu?')) {
      resetAllData();
      showToast('Đã khôi phục dữ liệu mẫu thành công!', 'success');
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const ok = await syncNow();
      if (ok) {
        showToast('Đã đồng bộ dữ liệu mới nhất từ Google Sheets!', 'success');
      } else {
        showToast('Đồng bộ chưa thành công. Vui lòng kiểm tra trạng thái kết nối.', 'error');
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleRetryPending = async () => {
    setIsManualSyncing(true);
    try {
      const ok = await retryPendingSync();
      if (ok) {
        showToast('Đã đẩy toàn bộ thay đổi lên Google Sheets thành công!', 'success');
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleMergeLocal = async () => {
    setIsManualSyncing(true);
    try {
      const ok = await mergeUnsyncedLocalData();
      if (ok) {
        showToast('Đã gộp dữ liệu cục bộ lên Google Sheets an toàn!', 'success');
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleForcePushLocal = async () => {
    if (
      !window.confirm(
        'Thao tác này sẽ ghi đè dữ liệu trên Google Sheets bằng toàn bộ dữ liệu hiện tại trên máy bạn. Chỉ sử dụng khi muốn khôi phục từ máy này. Bạn có chắc chắn?'
      )
    ) {
      return;
    }
    setIsManualSyncing(true);
    try {
      const ok = await forcePushLocalToCloud();
      if (ok) {
        showToast('Đã đẩy toàn bộ dữ liệu hiện tại lên Google Sheets!', 'success');
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isBusy = isManualSyncing || syncStatus === 'syncing' || syncStatus === 'saving';

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

          {/* Shared Cloud Sync Status Indicator */}
          <button
            onClick={() => setShowFirebaseModal(true)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              syncStatus === 'error'
                ? 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                : isBusy
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
            title="Xem trạng thái đồng bộ dữ liệu dùng chung (Google Sheets)"
          >
            {syncStatus === 'error' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            ) : isBusy ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>
              {syncStatus === 'error'
                ? pendingSyncCount > 0
                  ? `Chờ đồng bộ (${pendingSyncCount})`
                  : 'Lỗi đồng bộ'
                : syncStatus === 'saving'
                ? 'Đang lưu Cloud...'
                : isBusy
                ? 'Đang đồng bộ...'
                : cloudVersion > 0
                ? `Cloud Sync v${cloudVersion}`
                : 'Cloud Sync'}
            </span>
            {unsyncedLocalCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                +{unsyncedLocalCount}
              </span>
            )}
          </button>

          {/* Quick Refresh Button */}
          <button
            onClick={handleManualSync}
            disabled={isBusy}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Đồng bộ dữ liệu mới nhất từ Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin text-amber-600' : ''}`} />
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

          {/* USER PROFILE DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all text-xs font-semibold"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-red-600">
                {(currentUser.name || 'U').charAt(0)}
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
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      currentUser.role === 'admin'
                        ? 'bg-amber-100 text-amber-800'
                        : currentUser.role === 'academic_manager'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {currentUser.role === 'admin' ? (
                      <Shield className="w-4 h-4" />
                    ) : currentUser.role === 'academic_manager' ? (
                      <Briefcase className="w-4 h-4" />
                    ) : (
                      <GraduationCap className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-xs truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {currentUser.username || currentUser.email || currentUser.id}
                      {currentUser.role === 'teacher' && currentUser.teacherId
                        ? ` • ${currentUser.teacherId}`
                        : ''}
                    </div>
                  </div>
                </div>

                {currentUser.role === 'admin' && (
                  <div className="pt-1 px-1">
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
                )}

                <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
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

      {/* Shared Cloud Sync Details Modal */}
      {showFirebaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setShowFirebaseModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl z-10 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  syncStatus === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Đồng bộ dữ liệu dùng chung (Google Sheets)</h3>
                <p className="text-xs text-slate-500">
                  Phiên bản Cloud: v{cloudVersion} {lastSyncedAt ? `• Đồng bộ lúc ${lastSyncedAt}` : ''}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Nguồn dữ liệu trung tâm dùng chung</span>
                </div>
                <p>
                  Toàn bộ dữ liệu Học sinh, Lớp học, Giáo viên, Thời khóa biểu, Điểm danh, Đánh giá và Lịch giảng dạy được đồng bộ qua Google Sheets (<code className="font-mono">leegodata</code>) để mọi tài khoản được phân quyền trên các máy khác nhau đều thấy cùng một dữ liệu.
                </p>
              </div>

              {syncError && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900">
                  <div className="font-bold mb-1 flex items-center gap-1.5 text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Cảnh báo đồng bộ</span>
                  </div>
                  <p className="text-red-700">{syncError}</p>
                </div>
              )}

              {unsyncedLocalCount > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <UploadCloud className="w-4 h-4 text-amber-600" />
                    <span>Phát hiện {unsyncedLocalCount} bản ghi cục bộ chưa có trên Cloud</span>
                  </div>
                  <p className="text-amber-800">
                    Bấm nút bên dưới để gộp an toàn các bản ghi đã tạo cục bộ trên máy này lên Google Sheets mà không ghi đè dữ liệu hiện có của tài khoản khác.
                  </p>
                  <button
                    onClick={handleMergeLocal}
                    disabled={isBusy}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                  >
                    Gộp {unsyncedLocalCount} bản ghi lên Cloud
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              {pendingSyncCount > 0 && (
                <button
                  onClick={handleRetryPending}
                  disabled={isBusy}
                  className="px-3.5 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  Thử gửi lại ({pendingSyncCount})
                </button>
              )}

              {currentUser.role === 'admin' && (
                <button
                  onClick={handleForcePushLocal}
                  disabled={isBusy}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Đẩy toàn bộ máy này lên Cloud
                </button>
              )}

              <button
                onClick={handleManualSync}
                disabled={isBusy}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                <span>Đồng bộ từ Cloud ngay</span>
              </button>

              <button
                onClick={() => setShowFirebaseModal(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
