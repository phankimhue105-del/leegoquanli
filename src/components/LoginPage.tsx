import React, { useState } from 'react';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { loginWithCredentials } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useToast } from './common/Toast';

export const LoginPage: React.FC = () => {
  const { loginAs } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();

    if (!trimmedUser) {
      setErrorMessage('Vui lòng nhập tên đăng nhập.');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      // Preserve exact password casing and special characters
      const response = await loginWithCredentials(trimmedUser, password, rememberMe);

      if (response.success && response.user) {
        showToast(`Đăng nhập thành công! Chào mừng ${response.user.name}`, 'success');
        loginAs(response.user, rememberMe);
      } else {
        setErrorMessage(response.error || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setErrorMessage('Không thể kết nối máy chủ xác thực. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-slate-50 text-slate-800 font-sans selection:bg-red-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-red-900/30 border border-red-500/20">
            L
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-bold text-slate-900 text-sm tracking-tight">LeeGo</span>
              <span className="text-[10px] bg-red-600/10 text-red-600 font-bold px-1.5 py-0.5 rounded border border-red-500/20">
                CENTER
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Hệ thống quản lý trung tâm Anh ngữ</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bảo mật hệ thống học thuật</span>
        </div>
      </header>

      {/* Main Centered Login Section */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 transition-all">
          {/* Brand Logo & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-red-700/30 border border-red-500/30 mb-3">
              L
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              LEEGO CENTER MANAGEMENT
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống quản lý trung tâm Anh ngữ
            </p>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label
                htmlFor="username-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tên đăng nhập (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="username-input"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={isLoading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Mật khẩu (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={isLoading}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 accent-red-600"
                />
                <span className="text-xs text-slate-600 font-medium">Ghi nhớ đăng nhập</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-red-700 active:bg-red-800 transition-all shadow-md shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ĐANG XÁC THỰC...</span>
                </>
              ) : (
                <span>ĐĂNG NHẬP</span>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        <p className="font-semibold text-slate-600">LeeGo English Center</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Academic Management System &bull; Hệ thống quản lý học thuật
        </p>
      </footer>
    </div>
  );
};
