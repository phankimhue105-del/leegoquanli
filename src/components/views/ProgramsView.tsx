import React, { useState } from 'react';
import {
  BookMarked,
  Plus,
  BookOpen,
  Award,
  Layers,
  Clock,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  ListOrdered
} from 'lucide-react';
import { AcademicProgram } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';

export const ProgramsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, addProgram, updateProgram, deleteProgram } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const [selectedProgram, setSelectedProgram] = useState<AcademicProgram | null>(data.programs[0] || null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState<Omit<AcademicProgram, 'id'>>({
    name: '',
    code: '',
    level: 'Pre A1 Starters',
    curriculum: 'Cambridge Young Learners English (YLE)',
    textbook: '',
    totalLessons: 48,
    lessonsPerWeek: 2,
    durationMinutes: 90,
    learningObjectives: [''],
    skills: ['Listening 30%', 'Speaking 30%', 'Reading & Writing 40%'],
    assessmentCriteria: ['Thang 5 Khiên Cambridge', 'Đánh giá giữa kỳ và cuối kỳ'],
    lessonSequence: [
      { lessonNumber: 1, title: 'Introduction & Basics', grammarFocus: 'Greetings and Introductions', vocabFocus: 'Classroom objects', homework: 'Workbook Unit 1' }
    ]
  });

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('Vui lòng nhập tên và mã chương trình', 'error');
      return;
    }

    const created = addProgram(formData);
    showToast(`Đã thêm chương trình học "${created.name}"`, 'success');
    setSelectedProgram(created);
    setShowAddModal(false);
  };

  const handleDeleteProgram = (prog: AcademicProgram) => {
    if (window.confirm(`Bạn có chắc muốn xóa chương trình "${prog.name}"?`)) {
      deleteProgram(prog.id);
      showToast(`Đã xóa chương trình "${prog.name}"`, 'info');
      setSelectedProgram(data.programs[0] || null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-red-600" />
            Chương Trình Đào Tạo Cambridge (Academic Curricula)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý giáo trình chuẩn quốc tế: Starters, Movers, Flyers, KET, PET và lộ trình chi tiết từng bài học.
          </p>
        </div>

        {!isTeacher && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm chương trình đào tạo</span>
          </button>
        )}
      </div>

      {/* Main Layout: List on Left, Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Cards / List */}
        <div className="space-y-3">
          {data.programs.map(prog => {
            const isSelected = selectedProgram?.id === prog.id;
            const classCount = data.classes.filter(c => c.courseId === prog.id).length;

            return (
              <div
                key={prog.id}
                onClick={() => setSelectedProgram(prog)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-50/70 border-red-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {prog.code}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">{classCount} lớp đang học</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{prog.name}</h3>
                <div className="text-xs text-red-600 font-medium mt-1">{prog.level}</div>
                <div className="text-[11px] text-slate-500 mt-1">Giáo trình: {prog.textbook}</div>
              </div>
            );
          })}
        </div>

        {/* Program Detailed Syllabus */}
        {selectedProgram && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded border border-red-200">
                  {selectedProgram.code}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">{selectedProgram.name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chuẩn đầu ra: <strong className="text-slate-800">{selectedProgram.curriculum}</strong> ({selectedProgram.level})
                </p>
              </div>

              {!isTeacher && currentUser.role === 'admin' && (
                <button
                  onClick={() => handleDeleteProgram(selectedProgram)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Xóa chương trình"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Thời lượng khóa học</span>
                <span className="text-base font-black text-slate-800">{selectedProgram.totalLessons} buổi</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Tần suất học</span>
                <span className="text-base font-black text-slate-800">{selectedProgram.lessonsPerWeek} buổi / tuần</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Thời lượng / buổi</span>
                <span className="text-base font-black text-slate-800">{selectedProgram.durationMinutes} phút</span>
              </div>
            </div>

            {/* Learning Objectives */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mục tiêu đào tạo (Learning Objectives)
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {selectedProgram.learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Skills & Assessment Criteria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" /> Trọng số kỹ năng:
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProgram.skills.map((sk, i) => (
                    <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" /> Tiêu chí đánh giá:
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProgram.assessmentCriteria.map((cr, i) => (
                    <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700">
                      {cr}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Lesson Sequence Samples */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-red-600" /> Lộ trình bài giảng mẫu (Lesson Outline)
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {selectedProgram.lessonSequence.map(ls => (
                  <div key={ls.lessonNumber} className="p-3 bg-white hover:bg-slate-50">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>Buổi {ls.lessonNumber}: {ls.title}</span>
                      <span className="text-[11px] text-slate-400 font-normal">BTVN: {ls.homework}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Ngữ pháp: <span className="font-medium text-slate-700">{ls.grammarFocus}</span> • Từ vựng: <span className="font-medium text-slate-700">{ls.vocabFocus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE PROGRAM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl z-10 border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">Thêm chương trình học mới</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="py-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên chương trình học</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cambridge B2 First (FCE)"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mã chương trình</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CAM-FCE"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chương trình / Cấp độ</label>
                  <select
                    value={formData.level}
                    onChange={e => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Pre A1 Starters">Pre A1 Starters</option>
                    <option value="A1 Movers">A1 Movers</option>
                    <option value="A2 Flyers">A2 Flyers</option>
                    <option value="A2 Key for Schools (KET)">A2 Key for Schools (KET)</option>
                    <option value="B1 Preliminary (PET)">B1 Preliminary (PET)</option>
                    <option value="Cambridge B1 PET">Cambridge B1 PET</option>
                    <option value="B2 First (FCE)">B2 First (FCE)</option>
                    <option value="IELTS Foundation">IELTS Foundation</option>
                    <option value="IELTS">IELTS</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Giáo trình chính</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Complete First 3rd Edition"
                  value={formData.textbook}
                  onChange={e => setFormData({ ...formData, textbook: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số buổi</label>
                  <input
                    type="number"
                    value={formData.totalLessons}
                    onChange={e => setFormData({ ...formData, totalLessons: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Buổi/tuần</label>
                  <input
                    type="number"
                    value={formData.lessonsPerWeek}
                    onChange={e => setFormData({ ...formData, lessonsPerWeek: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phút/buổi</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={e => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
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
                  Lưu chương trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
