import React, { useState } from 'react';
import {
  UserPlus,
  Plus,
  Mail,
  Phone,
  School,
  Award,
  BookOpen,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { TeachingAssistant } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';

export const TeachingAssistantsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, addAssistant, updateAssistant, deleteAssistant } = useData();
  const { showToast } = useToast();

  const isAdmin = currentUser.role === 'admin';
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTA, setEditingTA] = useState<TeachingAssistant | null>(null);

  const [formData, setFormData] = useState<Omit<TeachingAssistant, 'id'>>({
    fullName: '',
    email: '',
    phone: '',
    university: 'Đại học Ngoại Thương (FTU)',
    englishCertificate: 'IELTS 7.5',
    assignedClassIds: [],
    status: 'active',
    notes: ''
  });

  const openAddModal = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      university: 'Đại học Sư phạm Hà Nội',
      englishCertificate: 'IELTS 7.5',
      assignedClassIds: [],
      status: 'active',
      notes: ''
    });
    setEditingTA(null);
    setShowAddModal(true);
  };

  const openEditModal = (ta: TeachingAssistant) => {
    setEditingTA(ta);
    setFormData({
      fullName: ta.fullName,
      email: ta.email,
      phone: ta.phone,
      university: ta.university,
      englishCertificate: ta.englishCertificate,
      assignedClassIds: [...ta.assignedClassIds],
      status: ta.status,
      notes: ta.notes || ''
    });
    setShowAddModal(true);
  };

  const handleSaveTA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) {
      showToast('Vui lòng nhập tên trợ giảng và email', 'error');
      return;
    }

    if (editingTA) {
      updateAssistant(editingTA.id, formData);
      showToast(`Đã cập nhật trợ giảng ${formData.fullName}`, 'success');
    } else {
      const created = addAssistant(formData);
      showToast(`Đã thêm trợ giảng ${created.fullName}`, 'success');
    }
    setShowAddModal(false);
  };

  const handleDeleteTA = (ta: TeachingAssistant) => {
    if (window.confirm(`Bạn có chắc muốn xóa trợ giảng "${ta.fullName}"?`)) {
      deleteAssistant(ta.id);
      showToast(`Đã xóa trợ giảng ${ta.fullName}`, 'info');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-red-600" />
            Đội Ngũ Trợ Giảng (Teaching Assistants)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý đội ngũ trợ giảng hỗ trợ giáo viên bản ngữ, chấm bài tập và quản lý nề nếp lớp học.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm trợ giảng mới</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.teachingAssistants.map(ta => {
          const assignedClasses = data.classes.filter(c => c.assistantTeacherId === ta.id);

          return (
            <div
              key={ta.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-extrabold text-sm flex items-center justify-center">
                    TA
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {ta.id}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{ta.fullName}</h3>
                <div className="text-xs text-red-600 font-semibold mt-0.5">{ta.englishCertificate}</div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <School className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ta.university}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{ta.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ta.phone}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-slate-400 block text-[10px] mb-1">Các lớp đang trợ giảng:</span>
                  <div className="flex flex-wrap gap-1">
                    {assignedClasses.length > 0 ? (
                      assignedClasses.map(c => (
                        <span key={c.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold border border-blue-200">
                          {c.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Chưa xếp lớp</span>
                    )}
                  </div>
                </div>

                {ta.notes && (
                  <p className="mt-3 text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {ta.notes}
                  </p>
                )}
              </div>

              {isAdmin && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-1">
                  <button
                    onClick={() => openEditModal(ta)}
                    className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-50 rounded-lg"
                    title="Sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTA(ta)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded-lg"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">
                {editingTA ? `Sửa hồ sơ trợ giảng` : 'Thêm trợ giảng mới'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTA} className="py-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trường đại học</label>
                  <input
                    type="text"
                    value={formData.university}
                    onChange={e => setFormData({ ...formData, university: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chứng chỉ tiếng Anh</label>
                  <input
                    type="text"
                    value={formData.englishCertificate}
                    onChange={e => setFormData({ ...formData, englishCertificate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghi chú chuyên môn</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
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
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
