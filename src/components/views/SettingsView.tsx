import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Database,
  Building,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Sparkles
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';

export const SettingsView: React.FC = () => {
  const { data, updateSettings, resetAllData } = useData();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({ ...data.settings });
  const [newRoomName, setNewRoomName] = useState('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    showToast('Đã lưu cài đặt hệ thống thành công!', 'success');
  };

  const handleAddRoom = () => {
    if (!newRoomName.trim()) return;
    if (formData.classrooms.includes(newRoomName.trim())) {
      showToast('Phòng học này đã tồn tại', 'warning');
      return;
    }
    setFormData({
      ...formData,
      classrooms: [...formData.classrooms, newRoomName.trim()]
    });
    setNewRoomName('');
  };

  const handleRemoveRoom = (room: string) => {
    setFormData({
      ...formData,
      classrooms: formData.classrooms.filter(r => r !== room)
    });
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Bạn có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu (30 học sinh, 6 lớp, 5 giáo viên, TKB và bảng điểm chuẩn)? Dữ liệu thử nghiệm vừa nhập sẽ được đặt lại.'
      )
    ) {
      resetAllData();
      setFormData({ ...data.settings });
      showToast('Đã khôi phục dữ liệu mẫu thành công!', 'success');
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LeeGo_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Đã tải xuống file sao lưu hệ thống JSON!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-red-600" />
            Cài Đặt Hệ Thống & Cơ Sở Dữ Liệu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình thông tin trung tâm, năm học, danh sách phòng học và trạng thái lưu trữ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Sao lưu dữ liệu JSON</span>
          </button>

          <button
            onClick={handleResetData}
            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Khôi phục dữ liệu mẫu</span>
          </button>
        </div>
      </div>

      {/* Database Integration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">Trạng thái Cơ Sở Dữ Liệu</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Local Storage Persistent Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Kiến trúc dữ liệu dạng Document/Collection chuẩn hóa sẵn sàng kết nối Firebase Firestore
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-600 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Dữ liệu tự động đồng bộ liên tục
          </div>
          <p>
            Tất cả thao tác thêm, sửa, xóa học sinh, lớp học, thời khóa biểu, điểm danh và đánh giá đều được lưu tức thời trên trình duyệt máy bạn. Dữ liệu không bị mất sau khi tải lại trang hoặc khởi động lại trình duyệt.
          </p>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-red-600" /> Thông tin trung tâm Anh ngữ LeeGo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tên trung tâm</label>
              <input
                type="text"
                value={formData.centerName}
                onChange={e => setFormData({ ...formData, centerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Khẩu hiệu / Tiêu đề phụ</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Hotline liên hệ</label>
              <input
                type="text"
                value={formData.hotline}
                onChange={e => setFormData({ ...formData, hotline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email hỗ trợ phụ huynh</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Địa chỉ trụ sở chính</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-extrabold text-slate-900 text-sm mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-600" /> Cấu hình học vụ & Năm học
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Năm học hiện tại</label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Học kỳ đang diễn ra</label>
              <input
                type="text"
                value={formData.currentTerm}
                onChange={e => setFormData({ ...formData, currentTerm: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sĩ số tối đa mặc định</label>
              <input
                type="number"
                value={formData.maxClassCapacityDefault}
                onChange={e => setFormData({ ...formData, maxClassCapacityDefault: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-extrabold text-slate-900 text-sm mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-red-600" /> Danh mục phòng học
          </h3>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập tên phòng học mới (VD: Phòng 401 - STEAM Lab)..."
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddRoom}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900"
              >
                Thêm phòng
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {formData.classrooms.map(room => (
                <div
                  key={room}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-semibold text-slate-800"
                >
                  <span>{room}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRoom(room)}
                    className="text-slate-400 hover:text-red-600 p-1"
                    title="Xóa phòng"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md shadow-red-950/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Lưu tất cả cấu hình</span>
          </button>
        </div>
      </form>
    </div>
  );
};
