import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Mail,
  Phone,
  Globe,
  Award,
  BookOpen,
  Clock,
  Edit2,
  Trash2,
  X,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { Teacher } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';

export const TeachersView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, addTeacher, updateTeacher, deleteTeacher } = useData();
  const { showToast } = useToast();

  const isAdmin = currentUser.role === 'admin';
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState<Omit<Teacher, 'id'>>({
    fullName: '',
    vietnameseName: '',
    email: '',
    phone: '',
    nationality: 'Việt Nam',
    isNative: false,
    qualifications: 'Cử nhân Sư phạm Tiếng Anh, TESOL 120h',
    experienceYears: 3,
    teachingLevels: ['Pre A1 Starters', 'A1 Movers'],
    status: 'active',
    assignedClassIds: [],
    workloadHours: 0,
    hourlyRate: 350000
  });

  const openAddModal = () => {
    setFormData({
      fullName: '',
      vietnameseName: '',
      email: '',
      phone: '',
      nationality: 'Việt Nam',
      isNative: false,
      qualifications: 'Cử nhân Sư phạm Tiếng Anh, TESOL 120h',
      experienceYears: 3,
      teachingLevels: ['Pre A1 Starters', 'A1 Movers'],
      status: 'active',
      assignedClassIds: [],
      workloadHours: 0,
      hourlyRate: 350000
    });
    setEditingTeacher(null);
    setShowAddModal(true);
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setFormData({
      fullName: t.fullName,
      vietnameseName: t.vietnameseName || '',
      email: t.email,
      phone: t.phone,
      nationality: t.nationality,
      isNative: t.isNative,
      qualifications: t.qualifications,
      experienceYears: t.experienceYears,
      teachingLevels: [...t.teachingLevels],
      status: t.status,
      assignedClassIds: [...t.assignedClassIds],
      workloadHours: t.workloadHours,
      hourlyRate: t.hourlyRate
    });
    setShowAddModal(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) {
      showToast('Vui lòng nhập tên giáo viên và email', 'error');
      return;
    }

    if (editingTeacher) {
      updateTeacher(editingTeacher.id, formData);
      showToast(`Đã cập nhật thông tin giáo viên ${formData.fullName}`, 'success');
    } else {
      const created = addTeacher(formData);
      showToast(`Đã thêm giáo viên ${created.fullName} (${created.id})`, 'success');
    }
    setShowAddModal(false);
  };

  const handleDeleteTeacher = (t: Teacher) => {
    if (window.confirm(`Bạn có chắc muốn xóa giáo viên "${t.fullName}"?`)) {
      deleteTeacher(t.id);
      showToast(`Đã xóa giáo viên ${t.fullName}`, 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-600" />
            Đội Ngũ Giáo Viên LeeGo ({data.teachers.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý hồ sơ giáo viên bản ngữ & Việt Nam, tải giờ giảng dạy và các lớp đang phụ trách.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm giáo viên mới</span>
          </button>
        )}
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.teachers.map(teacher => {
          const assignedClasses = data.classes.filter(c => c.teacherId === teacher.id);
          const teacherSessions = data.timetable.filter(s => s.teacherId === teacher.id);

          return (
            <div
              key={teacher.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white font-extrabold text-base flex items-center justify-center shadow-md">
                    {teacher.fullName.charAt(0)}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      teacher.isNative
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {teacher.isNative ? 'GV Bản Ngữ' : 'GV Việt Nam'}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{teacher.fullName}</h3>
                {teacher.vietnameseName && (
                  <div className="text-xs text-slate-500 font-medium">{teacher.vietnameseName}</div>
                )}

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>{teacher.nationality}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{teacher.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span className="truncate">{teacher.qualifications}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tải giờ dạy / tuần</span>
                    <span className="font-extrabold text-red-600 text-sm">{teacher.workloadHours} giờ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Lớp phụ trách</span>
                    <span className="font-bold text-slate-800">{assignedClasses.length} lớp ({teacherSessions.length} ca)</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setViewingTeacher(teacher)}
                  className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Hồ sơ chi tiết
                </button>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(teacher)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-white rounded-lg"
                      title="Sửa thông tin"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(teacher)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg"
                      title="Xóa giáo viên"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* TEACHER DETAIL MODAL */}
      {viewingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setViewingTeacher(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl z-10 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white font-extrabold text-base flex items-center justify-center">
                  {viewingTeacher.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{viewingTeacher.fullName}</h3>
                  <p className="text-slate-500">{viewingTeacher.nationality} • {viewingTeacher.experienceYears} năm kinh nghiệm</p>
                </div>
              </div>
              <button onClick={() => setViewingTeacher(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div><span className="text-slate-400">Bằng cấp:</span> <span className="font-semibold text-slate-800">{viewingTeacher.qualifications}</span></div>
                <div><span className="text-slate-400">Cấp độ giảng dạy:</span> <span className="font-semibold text-slate-800">{viewingTeacher.teachingLevels.join(', ')}</span></div>
                <div><span className="text-slate-400">Email:</span> <span className="font-semibold text-slate-800">{viewingTeacher.email}</span></div>
                <div><span className="text-slate-400">Số điện thoại:</span> <span className="font-semibold text-slate-800">{viewingTeacher.phone}</span></div>
                <div><span className="text-slate-400">Tải giờ chuẩn:</span> <span className="font-bold text-red-600">{viewingTeacher.workloadHours} giờ / tuần</span></div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Các lớp đang phân công giảng dạy:</h4>
                <div className="space-y-1.5">
                  {data.classes.filter(c => c.teacherId === viewingTeacher.id).map(cls => (
                    <div key={cls.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                      <span className="font-bold text-slate-900">{cls.name}</span>
                      <span className="text-slate-500">{cls.scheduleDays} ({cls.scheduleTime})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingTeacher(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT TEACHER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">
                {editingTeacher ? `Sửa hồ sơ: ${editingTeacher.fullName}` : 'Thêm giáo viên mới'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="py-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Họ và tên giáo viên <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: David Miller"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên tiếng Việt / Tên gọi quen thuộc</label>
                <input
                  type="text"
                  placeholder="VD: Thầy David"
                  value={formData.vietnameseName}
                  onChange={e => setFormData({ ...formData, vietnameseName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quốc tịch</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loại giáo viên</label>
                  <select
                    value={formData.isNative ? 'native' : 'vn'}
                    onChange={e => setFormData({ ...formData, isNative: e.target.value === 'native' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="native">Giáo viên bản ngữ</option>
                    <option value="vn">Giáo viên Việt Nam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bằng cấp & Chứng chỉ</label>
                <input
                  type="text"
                  value={formData.qualifications}
                  onChange={e => setFormData({ ...formData, qualifications: e.target.value })}
                  placeholder="VD: CELTA (Cambridge), Bachelor of Arts"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số năm kinh nghiệm</label>
                  <input
                    type="number"
                    value={formData.experienceYears}
                    onChange={e => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tải giờ dạy / tuần</label>
                  <input
                    type="number"
                    value={formData.workloadHours}
                    onChange={e => setFormData({ ...formData, workloadHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

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
                  {editingTeacher ? 'Lưu thay đổi' : 'Thêm giáo viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
