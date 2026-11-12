import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/common/Toast';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Views
import { DashboardView } from './components/views/DashboardView';
import { StudentsView } from './components/views/StudentsView';
import { ParentsView } from './components/views/ParentsView';
import { ClassesView } from './components/views/ClassesView';
import { TeachingScheduleView } from './components/views/TeachingScheduleView';
import { ProgramsView } from './components/views/ProgramsView';
import { TeachersView } from './components/views/TeachersView';
import { TeachingAssistantsView } from './components/views/TeachingAssistantsView';
import { TimetableView } from './components/views/TimetableView';
import { AttendanceView } from './components/views/AttendanceView';
import { AssessmentsView } from './components/views/AssessmentsView';
import { LessonPlansView } from './components/views/LessonPlansView';
import { LessonReportsView } from './components/views/LessonReportsView';
import { AcademicReportsView } from './components/views/AcademicReportsView';
import { UserManagementView } from './components/views/UserManagementView';
import { SettingsView } from './components/views/SettingsView';
import { ShieldAlert, Shield, Briefcase, GraduationCap, Lock, Mail } from 'lucide-react';
import { initialUsers } from './data/initialData';
import { User } from './types';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập email hoặc tên đăng nhập.');
      return;
    }

    const found = initialUsers.find(
      u => u.email.toLowerCase() === trimmed || u.name.toLowerCase() === trimmed
    );

    if (found) {
      onLogin(found);
    } else {
      setErrorMessage('Không tìm thấy tài khoản với thông tin đăng nhập đã cung cấp.');
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 space-y-6">
        {/* LeeGo Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-red-500/30">
            L
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            LeeGo English Center
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Hệ Thống Quản Lý Trung Tâm – Đăng Nhập Hệ Thống
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleManualLogin} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email hoặc Tên đăng nhập
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@leego.edu.vn"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-500/20 transition-all cursor-pointer"
          >
            Đăng nhập hệ thống
          </button>
        </form>

        {/* Quick Role Sign-In for Easy Authorized Access */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Đăng nhập nhanh theo vai trò
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onLogin(initialUsers[0])}
              className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-xl text-center transition-all cursor-pointer group"
            >
              <div className="text-[11px] font-bold text-slate-800 group-hover:text-amber-800">Admin</div>
              <div className="text-[9px] text-slate-400 truncate">Quản trị viên</div>
            </button>
            <button
              type="button"
              onClick={() => onLogin(initialUsers[1])}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl text-center transition-all cursor-pointer group"
            >
              <div className="text-[11px] font-bold text-slate-800 group-hover:text-blue-800">Academic</div>
              <div className="text-[9px] text-slate-400 truncate">Học thuật</div>
            </button>
            <button
              type="button"
              onClick={() => onLogin(initialUsers[2])}
              className="p-2.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-center transition-all cursor-pointer group"
            >
              <div className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-800">Teacher</div>
              <div className="text-[9px] text-slate-400 truncate">Giáo viên</div>
            </button>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400">
          Trung tâm Anh ngữ LeeGo • Bảo mật thông tin & Phân quyền RBAC
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated, loginAs } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  if (!isAuthenticated) {
    return <LoginView onLogin={loginAs} />;
  }

  // Validate permission for currentTab
  const role = currentUser.role;

  const isTabAllowed = (tab: NavigationTab): boolean => {
    if (role === 'admin') return true;
    if (role === 'academic_manager') {
      return !['users', 'settings'].includes(tab);
    }
    if (role === 'teacher') {
      return ['dashboard', 'students', 'classes', 'teaching_schedule', 'timetable', 'attendance', 'assessments', 'lesson_plans', 'lesson_reports'].includes(tab);
    }
    return false;
  };

  const handleSelectTab = (tab: NavigationTab) => {
    if (isTabAllowed(tab)) {
      setCurrentTab(tab);
      setMobileSidebarOpen(false);
    }
  };

  // Safe fallback if active tab became disallowed after role switch
  const activeTab = isTabAllowed(currentTab) ? currentTab : 'dashboard';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar
          currentTab={activeTab}
          onSelectTab={handleSelectTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 h-full">
            <Sidebar
              currentTab={activeTab}
              onSelectTab={handleSelectTab}
              collapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          currentTab={activeTab}
          onSelectTab={handleSelectTab}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          searchQuery={globalSearchQuery}
          setSearchQuery={setGlobalSearchQuery}
        />

        {/* View Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin">
          <div className="max-w-7xl mx-auto pb-12">
            {activeTab === 'dashboard' && <DashboardView onNavigate={handleSelectTab} />}
            {activeTab === 'students' && <StudentsView />}
            {activeTab === 'parents' && <ParentsView />}
            {activeTab === 'classes' && <ClassesView />}
            {activeTab === 'teaching_schedule' && <TeachingScheduleView />}
            {activeTab === 'programs' && <ProgramsView />}
            {activeTab === 'teachers' && <TeachersView />}
            {activeTab === 'assistants' && <TeachingAssistantsView />}
            {activeTab === 'timetable' && <TimetableView />}
            {activeTab === 'attendance' && <AttendanceView />}
            {activeTab === 'assessments' && <AssessmentsView />}
            {activeTab === 'lesson_plans' && <LessonPlansView />}
            {activeTab === 'lesson_reports' && <LessonReportsView />}
            {activeTab === 'reports' && <AcademicReportsView />}
            {activeTab === 'users' && <UserManagementView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}
