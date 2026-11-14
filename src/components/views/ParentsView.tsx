import React, { useState } from 'react';
import {
  Users2,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Search,
  MessageCircle,
  Plus,
  UserCheck
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';

export const ParentsView: React.FC = () => {
  const { data } = useData();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique parents from students and data.parents
  const parentsList = data.students.map(s => ({
    name: s.parentName,
    phone: s.parentPhone,
    email: s.parentEmail,
    address: s.address,
    studentName: s.fullName,
    studentId: s.id,
    grade: s.grade,
    level: s.currentLevel,
    classIds: s.classIds
  }));

  const filteredParents = parentsList.filter(p => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.phone || '').includes(q) ||
      String(p.studentName || '').toLowerCase().includes(q) ||
      String(p.studentId || '').toLowerCase().includes(q)
    );
  });

  const handleQuickCall = (phone: string, name: string) => {
    showToast(`Đang kết nối cuộc gọi đến phụ huynh ${name} (${phone})...`, 'info');
  };

  const handleQuickSMS = (phone: string, name: string) => {
    showToast(`Đã mở khung soạn tin nhắn thông báo đến phụ huynh ${name}`, 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users2 className="w-5 h-5 text-red-600" />
            Sổ Danh Bạ Phụ Huynh (Parents Directory)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thông tin liên hệ phụ huynh, kết nối học viên, gửi tin nhắn thông báo tình hình học tập.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm phụ huynh theo tên, số điện thoại, tên con..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="text-xs font-bold text-slate-500 hidden sm:block">
          Hiển thị: {filteredParents.length} phụ huynh
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParents.map((parent, index) => {
          const assignedClasses = data.classes.filter(c => parent.classIds.includes(c.id));
          return (
            <div
              key={`${parent.phone}-${index}`}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 font-extrabold text-sm flex items-center justify-center">
                    PH
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Đang liên lạc
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{parent.name}</h3>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <strong className="text-slate-800">{parent.phone}</strong>
                </div>

                {parent.email && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{parent.email}</span>
                  </div>
                )}

                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-red-600" />
                    Học sinh: {parent.studentName} ({parent.studentId})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Trình độ: <span className="font-semibold text-slate-700">{parent.level}</span> • {parent.grade}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Lớp: {assignedClasses.map(c => c.name).join(', ') || 'Chưa xếp lớp'}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => handleQuickCall(parent.phone, parent.name)}
                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> Gọi điện
                </button>
                <button
                  onClick={() => handleQuickSMS(parent.phone, parent.name)}
                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-blue-600" /> Nhắn tin
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
