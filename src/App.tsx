import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './components/LandingPage';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { KioskScanner } from './components/KioskScanner';
import { DashboardView } from './components/DashboardView';
import { StudentsClassesView } from './components/StudentsClassesView';
import { TeachersView } from './components/TeachersView';
import { UserManagementView } from './components/UserManagementView';
import { AttendanceReportsView } from './components/AttendanceReportsView';
import { StudentCardPrintView } from './components/StudentCardPrintView';
import { AsasAsatView } from './components/AsasAsatView';
import { KatrolNilaiView } from './components/KatrolNilaiView';
import { SettingsScheduleView } from './components/SettingsScheduleView';
import { AchievementsView } from './components/AchievementsView';

const MainLayout: React.FC = () => {
  const { viewMode, isAdminLoggedIn, isGuru, activeTab } = useApp();

  // If user is in Landing mode OR not authenticated, show Landing Page
  if (viewMode === 'landing' || !isAdminLoggedIn) {
    return (
      <>
        <LandingPage />
        <AdminLoginModal />
      </>
    );
  }

  // Admin / Guru Dashboard Mode (Authenticated Fullscreen)
  return (
    <div className="h-[100dvh] w-full bg-slate-100 flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Minimalist Header */}
      <Header />

      {/* Main Full-Width Flex Area: Sidebar + Active View */}
      <div className="flex-1 flex w-full overflow-hidden min-h-0">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Content View with independent internal scroll */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 min-w-0 min-h-0 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'students' && <StudentsClassesView />}
          {activeTab === 'teachers' && <TeachersView />}
          {activeTab === 'users' && !isGuru && <UserManagementView />}
          {activeTab === 'users' && isGuru && <DashboardView />}
          {activeTab === 'reports' && <AttendanceReportsView />}
          {activeTab === 'cards' && <StudentCardPrintView />}
          {activeTab === 'exam' && <AsasAsatView />}
          {activeTab === 'katrol' && <KatrolNilaiView />}
          {activeTab === 'achievements' && <AchievementsView />}
          {activeTab === 'settings' && !isGuru && <SettingsScheduleView />}
          {activeTab === 'settings' && isGuru && <DashboardView />}
          {activeTab === 'kiosk' && <KioskScanner />}
        </main>
      </div>

      <AdminLoginModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
