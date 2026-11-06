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
import { AcademicReportsView } from './components/views/AcademicReportsView';
import { UserManagementView } from './components/views/UserManagementView';
import { SettingsView } from './components/views/SettingsView';
import { ShieldAlert } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Validate permission for currentTab
  const role = currentUser.role;

  const isTabAllowed = (tab: NavigationTab): boolean => {
    if (role === 'admin') return true;
    if (role === 'academic_manager') {
      return !['users', 'settings'].includes(tab);
    }
    if (role === 'teacher') {
      return ['dashboard', 'students', 'classes', 'teaching_schedule', 'timetable', 'attendance', 'assessments', 'lesson_plans'].includes(tab);
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
