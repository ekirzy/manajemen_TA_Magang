import React, { useState } from 'react';
import { Card, Button } from '../components/UI';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';

interface LoginViewProps {
  onLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (role: UserRole) => {
    setLoading(true);
    try {
      const user = await dataService.login(role);
      if (user) {
        onLogin();
      } else {
        alert("Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800">Sistem Akademik Terpadu</h1>
          <p className="text-gray-600 mt-2">Portal Pendaftaran Tugas Akhir & Magang</p>
        </div>

        <Card title="Silahkan Login">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-4 text-center">Pilih peran untuk simulasi login:</p>

            <button
              onClick={() => handleLogin(UserRole.STUDENT)}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mr-3">
                  M
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 group-hover:text-blue-700">Mahasiswa</div>
                  <div className="text-xs text-gray-500">Akses pendaftaran & upload berkas</div>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-blue-500">→</span>
            </button>

            <button
              onClick={() => handleLogin(UserRole.LECTURER)}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold mr-3">
                  D
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 group-hover:text-purple-700">Dosen / Kaprodi</div>
                  <div className="text-xs text-gray-500">Validasi & Penjadwalan Sidang</div>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-purple-500">→</span>
            </button>

            {loading && <p className="text-center text-sm text-blue-600">Logging in...</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};
