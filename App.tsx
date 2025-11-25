import React, { useState } from 'react';
import { ThesisView } from './views/ThesisView';
import { InternshipView } from './views/InternshipView';
import { LoginView } from './views/LoginView';
import { dataService } from './services/dataService';
import { supabase } from './services/supabaseClient';
import { UserRole } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'thesis' | 'internship'>('thesis');
  const [user, setUser] = useState(dataService.getCurrentUser());

  React.useEffect(() => {
    // Check initial session
    dataService.fetchCurrentUser().then((u) => {
      setUser(u);
      setIsAuthenticated(!!u);
    });

    // Listen for changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const u = await dataService.fetchCurrentUser();
        setUser(u);
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = () => {
    // This might be redundant if onAuthStateChange handles it, but good for manual triggers if needed
    const u = dataService.getCurrentUser();
    setUser(u);
    setIsAuthenticated(!!u);
    setCurrentView('thesis');
  };

  const handleLogout = async () => {
    await dataService.logout();
    // State update handled by onAuthStateChange
  };

  if (!isAuthenticated || !user) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 hidden md:flex flex-col z-10">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">SAT <span className="text-gray-400 font-light">Portal</span></h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setCurrentView('thesis')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentView === 'thesis'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <span className="mr-3">🎓</span> {user.role === UserRole.STUDENT ? 'Tugas Akhir' : 'Validasi Tugas Akhir'}
          </button>

          <button
            onClick={() => setCurrentView('internship')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentView === 'internship'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <span className="mr-3">🏢</span> {user.role === UserRole.STUDENT ? 'Magang / KP' : 'Validasi Magang'}
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center mb-3">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${user.role === UserRole.LECTURER ? 'bg-purple-600' : 'bg-blue-500'}`}>
              {user.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 truncate w-32">{user.name}</p>
              <p className="text-xs text-gray-500">{user.role === UserRole.STUDENT ? 'Mahasiswa' : 'Dosen'}</p>
              {user.role === UserRole.LECTURER && (
                <p className="text-xs text-gray-400 mt-0.5">NIP: {user.identifier}</p>
              )}
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-xs text-red-600 border border-red-200 rounded py-1 hover:bg-red-50">
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-gray-200 z-20 px-4 h-16 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-600">SAT Portal</h1>
        <div className="flex space-x-2">
          <button onClick={() => setCurrentView('thesis')} className={`p-2 rounded ${currentView === 'thesis' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}>🎓</button>
          <button onClick={() => setCurrentView('internship')} className={`p-2 rounded ${currentView === 'internship' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}>🏢</button>
          <button onClick={handleLogout} className="p-2 text-red-600">🚪</button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 mt-16 md:mt-0">
        <div className="max-w-4xl mx-auto">
          {currentView === 'thesis' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.role === UserRole.STUDENT ? 'Manajemen Tugas Akhir' : 'Validasi Tugas Akhir & Sidang'}
                </h2>
                <p className="text-gray-500 mt-1">
                  {user.role === UserRole.STUDENT ? 'Pendaftaran pembimbing, seminar, dan sidang.' : 'Daftar mahasiswa yang mengajukan proposal dan sidang.'}
                </p>
              </div>
              <ThesisView />
            </div>
          )}

          {currentView === 'internship' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.role === UserRole.STUDENT ? 'Kerja Praktik / Magang' : 'Validasi Kerja Praktik'}
                </h2>
                <p className="text-gray-500 mt-1">Administrasi pendaftaran magang dan seminar hasil.</p>
              </div>
              <InternshipView />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;