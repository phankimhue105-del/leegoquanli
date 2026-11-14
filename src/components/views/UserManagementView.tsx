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
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { User, UserRole, AcademicManager } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';

export const UserManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, addUser, updateUser, toggleUserStatus, addAcademicManager } = useData();
  const { showToast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Quick modal to create Academic Manager profile if none exists
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [newManagerForm, setNewManagerForm] = useState({
    fullName: '',
    vietnameseName: '',
    email: '',
    phone: '',
    title: 'Quản lý học thuật',
    qualifications: 'Thạc sĩ Quản lý Giáo dục, TESOL, IELTS 8.0+',
    experienceYears: 5,
    department: 'Ban Học Thuật & Đào Tạo',
    status: 'active' as const,
    notes: ''
  });

  const [formData, setFormData] = useState<Omit<User, 'id' | 'createdAt'>>({
    name: '',
    email: '',
    role: 'teacher',
    phone: '',
    status: 'active',
    teacherId: '',
    academicManagerId: '',
    teachingAssistantId: '',
    assistantId: ''
  });

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      role: 'teacher',
      phone: '',
      password: '',
      status: 'active',
      teacherId: '',
      academicManagerId: '',
      teachingAssistantId: '',
      assistantId: ''
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
      password: user.password || '',
      phone: user.phone || '',
      status: user.status,
      teacherId: user.teacherId || '',
      academicManagerId: user.academicManagerId || '',
      teachingAssistantId: user.teachingAssistantId || user.assistantId || '',
      assistantId: user.assistantId || user.teachingAssistantId || ''
    });
    setShowAddModal(true);
  };

  const handleCreateManagerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManagerForm.fullName.trim()) {
      showToast('Vui lòng nhập họ tên Quản lý học thuật', 'error');
      return;
    }
    if (typeof addAcademicManager === 'function') {
      const created = addAcademicManager({
        fullName: newManagerForm.fullName.trim(),
        vietnameseName: newManagerForm.vietnameseName.trim() || undefined,
        email: newManagerForm.email.trim() || formData.email || '',
        phone: newManagerForm.phone.trim() || formData.phone || '',
        title: newManagerForm.title.trim() || 'Quản lý học thuật',
        qualifications: newManagerForm.qualifications.trim(),
        experienceYears: Number(newManagerForm.experienceYears) || 0,
        department: newManagerForm.department.trim(),
        status: newManagerForm.status,
        notes: newManagerForm.notes.trim() || undefined
      });
      setFormData(prev => ({ ...prev, academicManagerId: created.id }));
      showToast(`Đã tạo hồ sơ Quản lý học thuật ${created.fullName} (${created.id})`, 'success');
      setShowAddManagerModal(false);
      setNewManagerForm({
        fullName: '',
        vietnameseName: '',
        email: '',
        phone: '',
        title: 'Quản lý học thuật',
        qualifications: 'Thạc sĩ Quản lý Giáo dục, TESOL, IELTS 8.0+',
        experienceYears: 5,
        department: 'Ban Học Thuật & Đào Tạo',
        status: 'active',
        notes: ''
      });
    }
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
                    {u.role === 'teacher' && u.teacherId && (
                      <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                        Mã GV: {u.teacherId}
                      </div>
                    )}
                    {u.role === 'teaching_assistant' && (u.teachingAssistantId || u.assistantId) && (
                      <div className="text-[10px] text-purple-600 font-medium mt-0.5">
                        Mã TG: {u.teachingAssistantId || u.assistantId}
                      </div>
                    )}
                    {u.role === 'academic_manager' && u.academicManagerId && (
                      <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                        Mã QLHT: {u.academicManagerId}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        u.role === 'admin'
                          ? 'bg-amber-100 text-amber-800'
                          : u.role === 'academic_manager'
                          ? 'bg-blue-100 text-blue-800'
                          : u.role === 'teaching_assistant'
                          ? 'bg-purple-100 text-purple-800'
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
                      {u.role === 'teaching_assistant' && 'Trợ giảng'}
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
                <label className="font-semibold text-slate-700 block mb-1">
                  Mật khẩu đăng nhập {editingUser ? '(để trống nếu không đổi)' : <span className="text-red-600">*</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Nhập mật khẩu cho tài khoản'}
                  value={formData.password || ''}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
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
                  <option value="teaching_assistant">Teaching Assistant - Trợ giảng</option>
                </select>
              </div>

              {formData.role === 'teaching_assistant' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Liên kết với hồ sơ Trợ giảng:
                  </label>
                  <select
                    value={formData.teachingAssistantId || formData.assistantId || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        teachingAssistantId: e.target.value,
                        assistantId: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Chọn hồ sơ trợ giảng --</option>
                    {data.teachingAssistants.map(ta => (
                      <option key={ta.id} value={ta.id}>
                        {ta.fullName} ({ta.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

              {formData.role === 'academic_manager' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 block">
                      Liên kết với hồ sơ Quản lí học thuật:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewManagerForm({
                          fullName: formData.name || '',
                          vietnameseName: '',
                          email: formData.email || '',
                          phone: formData.phone || '',
                          title: 'Quản lý học thuật',
                          qualifications: 'Thạc sĩ Quản lý Giáo dục, TESOL, IELTS 8.0+',
                          experienceYears: 5,
                          department: 'Ban Học Thuật & Đào Tạo',
                          status: 'active',
                          notes: ''
                        });
                        setShowAddManagerModal(true);
                      }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                    >
                      + Tạo hồ sơ mới
                    </button>
                  </div>
                  {(!data.academicManagers || data.academicManagers.length === 0) ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        Chưa có hồ sơ Quản lý học thuật
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Hệ thống chưa có hồ sơ nhân sự Quản lý học thuật nào. Vui lòng bấm <strong>"+ Tạo hồ sơ mới"</strong> ở góc trên để tạo hồ sơ nhân sự trước khi liên kết.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={formData.academicManagerId || ''}
                      onChange={e => setFormData({ ...formData, academicManagerId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="">-- Chọn hồ sơ Quản lí học thuật --</option>
                      {data.academicManagers.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.id}) {m.title ? `– ${m.title}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
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

      {/* Modal Tạo hồ sơ Quản lý học thuật mới */}
      {showAddManagerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-red-600" />
                Tạo hồ sơ Quản lý học thuật
              </h3>
              <button
                type="button"
                onClick={() => setShowAddManagerModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManagerProfile} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Họ và tên nhân sự <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trần Học Thuật"
                  value={newManagerForm.fullName}
                  onChange={e => setNewManagerForm({ ...newManagerForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tên gọi/Danh xưng
                </label>
                <input
                  type="text"
                  placeholder="VD: Thầy Thuật"
                  value={newManagerForm.vietnameseName}
                  onChange={e => setNewManagerForm({ ...newManagerForm, vietnameseName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@leego.edu.vn"
                    value={newManagerForm.email}
                    onChange={e => setNewManagerForm({ ...newManagerForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0908765432"
                    value={newManagerForm.phone}
                    onChange={e => setNewManagerForm({ ...newManagerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chức danh / Vị trí chuyên môn
                </label>
                <input
                  type="text"
                  placeholder="VD: Quản lý học thuật / Giám đốc học thuật"
                  value={newManagerForm.title}
                  onChange={e => setNewManagerForm({ ...newManagerForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Bằng cấp & Chứng chỉ chuyên môn
                </label>
                <input
                  type="text"
                  placeholder="VD: Thạc sĩ Quản lý Giáo dục, TESOL, IELTS 8.5"
                  value={newManagerForm.qualifications}
                  onChange={e => setNewManagerForm({ ...newManagerForm, qualifications: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddManagerModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                >
                  Tạo hồ sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
