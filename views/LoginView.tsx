import React, { useState } from 'react';
import { Card, Button } from '../components/UI';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';

interface LoginViewProps {
  onLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState(''); // NIM or NIP
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, error } = await dataService.loginWithPassword(email, password);
      if (user) {
        onLogin();
      } else {
        alert(error?.message || "Login failed.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, error } = await dataService.register(email, password, fullName, role, identifier);
      if (user) {
        alert("Registration successful! You can now login.");
        setIsRegistering(false);
      } else {
        alert(error?.message || "Registration failed.");
      }
    } catch (error) {
      console.error("Register error:", error);
      alert("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await dataService.loginWithGoogle();
    if (error) {
      alert("Google Login failed: " + error.message);
      setLoading(false);
    }
    // Redirect happens automatically
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800">Sistem Akademik Terpadu</h1>
          <p className="text-gray-600 mt-2">Portal Pendaftaran Tugas Akhir & Magang</p>
          <p className="text-xs text-gray-400 mt-1">v2.0 (Supabase Auth Enabled)</p>
        </div>

        <Card title={isRegistering ? "Daftar Akun Baru" : "Silahkan Login"}>
          <div className="space-y-4">

            {/* Google Login Button */}
            {!isRegistering && (
              <>
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 bg-white text-gray-700 font-medium"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 mr-3" alt="Google" />
                  Login with Google
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
              </>
            )}

            <form onSubmit={isRegistering ? handleRegister : handleEmailLogin} className="space-y-4">
              {isRegistering && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Peran</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      value={role}
                      onChange={e => setRole(e.target.value as UserRole)}
                    >
                      <option value={UserRole.STUDENT}>Mahasiswa</option>
                      <option value={UserRole.LECTURER}>Dosen</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{role === UserRole.STUDENT ? 'NIM' : 'NIP'}</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Processing...' : (isRegistering ? 'Daftar' : 'Login')}
              </button>
            </form>

            <div className="text-center mt-4">
              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-blue-600 hover:underline"
              >
                {isRegistering ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
