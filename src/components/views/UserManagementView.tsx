import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Shield,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  X,
  KeyRound,
  RotateCw
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';

export const UserManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, addUser, updateUser, toggleUserStatus } = useData();
  const { showToast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<Omit<User, 'id' | 'createdAt'>>({
    name: '',
    email: '',
    role: 'teacher',
    phone: '',
    status: 'active',
    teacherId: ''
  });

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      role: 'teacher',
      phone: '',
      status: 'active',
      teacherId: ''
    });
    setEditingUser(null);
    setShowAddModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      status: user.status,
      teacherId: user.teacherId || ''
    });
    setShowAddModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Vui lòng nhập họ tên và email tài khoản', 'error');
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, formData);
      showToast(`Đã cập nhật tài khoản ${formData.name}`, 'success');
    } else {
      const created = addUser(formData);
      showToast(`Đã tạo tài khoản cho ${created.name}`, 'success');
    }
    setShowAddModal(false);
  };

  const handleResetPassword = (user: User) => {
    showToast(`Đã gửi liên kết đặt lại mật khẩu đến email ${user.email}`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-600" />
            Quản Lý Tài Khoản & Phân Quyền (RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân quyền 3 vai trò: Admin (Toàn quyền), Quản lý học thuật (Giáo trình & Lớp học) và Giáo viên (Giảng dạy).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-950/20"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo tài khoản người dùng</span>
        </button>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
          <div className="font-bold text-amber-900 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-amber-700" />
            Vai trò: ADMIN (Quản trị viên)
          </div>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            Toàn quyền hệ thống: quản lý tài khoản, thiết lập cấu hình, phân công nhân sự, xuất báo cáo và xem nhật ký kiểm toán.
          </p>
        </div>

        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-blue-700" />
            Vai trò: QUẢN LÝ HỌC THUẬT
          </div>
          <p className="text-blue-800 text-[11px] leading-relaxed">
            Quản lý giáo trình Cambridge, xếp lớp, xếp TKB, giám sát giáo án và theo dõi kết quả học tập của toàn bộ trung tâm.
          </p>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
          <div className="font-bold text-emerald-900 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-emerald-700" />
            Vai trò: GIÁO VIÊN (Teacher)
          </div>
          <p className="text-emerald-800 text-[11px] leading-relaxed">
            Xem lịch dạy cá nhân, học sinh lớp được giao, điểm danh, chấm điểm 4 kỹ năng và nộp báo cáo buổi dạy.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tài khoản & Email</th>
                <th className="py-3 px-4">Vai trò hệ thống</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Ngày tạo / Đăng nhập gần nhất</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        u.role === 'admin'
                          ? 'bg-amber-100 text-amber-800'
                          : u.role === 'academic_manager'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {u.role === 'admin' ? (
                        <Shield className="w-3 h-3" />
                      ) : u.role === 'academic_manager' ? (
                        <Briefcase className="w-3 h-3" />
                      ) : (
                        <GraduationCap className="w-3 h-3" />
                      )}
                      {u.role === 'admin' && 'Admin'}
                      {u.role === 'academic_manager' && 'Quản lý học thuật'}
                      {u.role === 'teacher' && 'Giáo viên'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{u.phone || 'Chưa có SĐT'}</td>
                  <td className="py-3 px-4 text-slate-500">
                    <div>{u.createdAt}</div>
                    <div className="text-[10px] text-slate-400">{u.lastLogin || 'Chưa đăng nhập'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleUserStatus(u.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {u.status === 'active' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoạt động
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-slate-400" /> Tạm khóa
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleResetPassword(u)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Đặt lại mật khẩu"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Sửa thông tin"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">
                {editingUser ? 'Sửa thông tin tài khoản' : 'Tạo tài khoản người dùng'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="py-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Họ và tên người dùng <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trần Học Thuật"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email đăng nhập <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="VD: user@leego.edu.vn"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="VD: 0912345678"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Phân quyền vai trò (Role)
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="admin">Admin - Quản trị viên toàn quyền</option>
                  <option value="academic_manager">Academic Manager - Quản lý học thuật</option>
                  <option value="teacher">Teacher - Giáo viên giảng dạy</option>
                </select>
              </div>

              {formData.role === 'teacher' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Liên kết với hồ sơ Giáo viên:
                  </label>
                  <select
                    value={formData.teacherId || ''}
                    onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Chọn hồ sơ giáo viên --</option>
                    {data.teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                >
                  {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
