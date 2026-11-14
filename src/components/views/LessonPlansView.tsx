import React, { useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  BookOpen,
  UserCheck,
  Send,
  X,
  Eye,
  Filter
} from 'lucide-react';
import { LessonPlanReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';

export const LessonPlansView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, submitLessonPlan, reviewLessonPlan } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const isManager = currentUser.role === 'academic_manager' || currentUser.role === 'admin';
  const teacherObj = isTeacher
    ? data.teachers.find(
        t =>
          String(t.id).trim() === String(currentUser.teacherId).trim() ||
          (Boolean(currentUser.email) && t.email.toLowerCase() === currentUser.email.toLowerCase())
      )
    : null;
  const currentTeacherId = teacherObj ? String(teacherObj.id).trim() : (currentUser.teacherId ? String(currentUser.teacherId).trim() : '');

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<LessonPlanReport | null>(null);
  const [managerFeedbackText, setManagerFeedbackText] = useState('');

  // Submit form state (teacherId only, excluding TA-only assignments)
  const availableClasses = isTeacher
    ? data.classes.filter(c => Boolean(currentTeacherId) && String(c.teacherId).trim() === currentTeacherId)
    : data.classes;

  const [formData, setFormData] = useState({
    classId: availableClasses[0]?.id || '',
    lessonNumber: 1,
    textbook: availableClasses[0]?.curriculum || '',
    lessonContent: '',
    learningObjectives: '',
    activitiesCompleted: '',
    homeworkAssigned: '',
    studentsAttention: '',
    teachingNotes: '',
    date: new Date().toISOString().slice(0, 10)
  });

  const displayedPlans = data.lessonPlans.filter(lp => {
    if (isTeacher) {
      return Boolean(currentTeacherId) && String(lp.teacherId).trim() === currentTeacherId;
    }
    return true;
  });

  const handleSubmitPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lessonContent.trim() || !formData.learningObjectives.trim()) {
      showToast('Vui lòng nhập nội dung bài học và mục tiêu buổi dạy', 'error');
      return;
    }

    const cls = data.classes.find(c => c.id === formData.classId);
    if (!cls) return;

    submitLessonPlan({
      classId: cls.id,
      className: cls.name,
      teacherId: teacherObj?.id || 'TCH-001',
      teacherName: teacherObj?.fullName || currentUser.name,
      date: formData.date,
      lessonNumber: Number(formData.lessonNumber),
      textbook: formData.textbook,
      lessonContent: formData.lessonContent,
      learningObjectives: formData.learningObjectives,
      activitiesCompleted: formData.activitiesCompleted,
      homeworkAssigned: formData.homeworkAssigned,
      studentsAttention: formData.studentsAttention,
      teachingNotes: formData.teachingNotes,
      status: 'submitted'
    });

    showToast('Đã nộp báo cáo buổi dạy thành công!', 'success');
    setShowSubmitModal(false);
  };

  const handleApprovePlan = (planId: string) => {
    reviewLessonPlan(planId, 'approved', managerFeedbackText || 'Đã duyệt đạt chuẩn học thuật.');
    showToast('Đã duyệt báo cáo buổi dạy', 'success');
    setViewingPlan(null);
    setManagerFeedbackText('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600" />
            Giáo Án & Báo Cáo Buổi Dạy (Teaching Reports)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isTeacher
              ? 'Nộp báo cáo tiến độ từng buổi học, bài tập về nhà và học sinh cần lưu ý.'
              : 'Quản lý học thuật kiểm duyệt chất lượng giảng dạy và theo dõi tiến độ chương trình.'}
          </p>
        </div>

        {isTeacher && (
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nộp báo cáo buổi dạy</span>
          </button>
        )}
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedPlans.map(plan => (
          <div
            key={plan.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Bài số {plan.lessonNumber} • {plan.date}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    plan.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : plan.status === 'reviewed'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {plan.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                  {plan.status === 'submitted' && <Clock className="w-3 h-3" />}
                  {plan.status === 'approved' ? 'Đã duyệt' : plan.status === 'reviewed' ? 'Đã phản hồi' : 'Chờ duyệt'}
                </span>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base">{plan.className}</h3>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Giáo viên: <strong className="text-slate-800">{plan.teacherName}</strong></span>
                <span>•</span>
                <span>Sách: {plan.textbook}</span>
              </div>

              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="font-semibold text-slate-700">Nội dung bài dạy:</div>
                <p className="text-slate-600 line-clamp-2 leading-relaxed">{plan.lessonContent}</p>

                {plan.homeworkAssigned && (
                  <div className="pt-2 text-[11px] text-slate-500">
                    <strong>BTVN:</strong> {plan.homeworkAssigned}
                  </div>
                )}
              </div>

              {plan.managerFeedback && (
                <div className="mt-3 p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900">
                  <span className="font-bold flex items-center gap-1 mb-0.5 text-blue-800">
                    <MessageSquare className="w-3.5 h-3.5" /> Phản hồi từ Quản lý học thuật:
                  </span>
                  <p className="text-[11px]">{plan.managerFeedback}</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[10px]">Nộp lúc: {plan.submittedAt}</span>
              <button
                onClick={() => {
                  setViewingPlan(plan);
                  setManagerFeedbackText(plan.managerFeedback || '');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Xem chi tiết {isManager && '& Duyệt'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* VIEW & REVIEW MODAL */}
      {viewingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setViewingPlan(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl z-10 border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="font-bold text-red-600">Bài số {viewingPlan.lessonNumber} • {viewingPlan.date}</span>
                <h3 className="font-extrabold text-slate-900 text-base mt-0.5">{viewingPlan.className}</h3>
                <p className="text-slate-500">Giáo viên: {viewingPlan.teacherName}</p>
              </div>
              <button onClick={() => setViewingPlan(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Giáo trình & Bài học:</span>
                <p className="text-slate-700 p-2.5 bg-slate-50 rounded-lg border border-slate-200">{viewingPlan.textbook}</p>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Mục tiêu buổi học (Objectives):</span>
                <p className="text-slate-700 p-2.5 bg-slate-50 rounded-lg border border-slate-200">{viewingPlan.learningObjectives}</p>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Nội dung chi tiết & Hoạt động đã triển khai:</span>
                <p className="text-slate-700 p-2.5 bg-slate-50 rounded-lg border border-slate-200 whitespace-pre-line">{viewingPlan.lessonContent}</p>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Bài tập về nhà (Homework):</span>
                <p className="text-slate-700 p-2.5 bg-slate-50 rounded-lg border border-slate-200">{viewingPlan.homeworkAssigned || 'Không có BTVN'}</p>
              </div>

              {viewingPlan.studentsAttention && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="font-bold text-amber-900 block mb-0.5">Học sinh cần lưu ý / kèm cặp:</span>
                  <p className="text-amber-800">{viewingPlan.studentsAttention}</p>
                </div>
              )}

              {/* Manager Feedback Form */}
              {isManager && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <label className="font-bold text-slate-800 block">Nhận xét của Quản lý học thuật:</label>
                  <textarea
                    rows={2}
                    value={managerFeedbackText}
                    onChange={e => setManagerFeedbackText(e.target.value)}
                    placeholder="Nhập nhận xét hoặc phản hồi chuyên môn..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setViewingPlan(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </button>

              {isManager && (
                <button
                  onClick={() => handleApprovePlan(viewingPlan.id)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Phê duyệt báo cáo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT LESSON PLAN MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowSubmitModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl z-10 border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">Nộp báo cáo buổi dạy mới</h3>
              <button onClick={() => setShowSubmitModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPlan} className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lớp học</label>
                  <select
                    value={formData.classId}
                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {availableClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Buổi số / Lesson No.</label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={formData.lessonNumber}
                    onChange={e => setFormData({ ...formData, lessonNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Giáo trình & Unit</label>
                <input
                  type="text"
                  value={formData.textbook}
                  onChange={e => setFormData({ ...formData, textbook: e.target.value })}
                  placeholder="VD: Kid's Box Starter Unit 4: In the Jungle"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mục tiêu buổi dạy <span className="text-red-600">*</span></label>
                <textarea
                  rows={2}
                  required
                  value={formData.learningObjectives}
                  onChange={e => setFormData({ ...formData, learningObjectives: e.target.value })}
                  placeholder="Học sinh nắm được từ vựng, mẫu câu..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nội dung bài giảng & Hoạt động đã thực hiện <span className="text-red-600">*</span></label>
                <textarea
                  rows={3}
                  required
                  value={formData.lessonContent}
                  onChange={e => setFormData({ ...formData, lessonContent: e.target.value })}
                  placeholder="Chi tiết các hoạt động warm-up, thực hành nhóm, trò chơi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bài tập về nhà giao cho học viên</label>
                <input
                  type="text"
                  value={formData.homeworkAssigned}
                  onChange={e => setFormData({ ...formData, homeworkAssigned: e.target.value })}
                  placeholder="VD: Workbook trang 32-33 + Ghi âm gửi Zalo..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Học sinh vắng hoặc cần kèm cặp đặc biệt</label>
                <input
                  type="text"
                  value={formData.studentsAttention}
                  onChange={e => setFormData({ ...formData, studentsAttention: e.target.value })}
                  placeholder="VD: Học sinh vắng có phép, cần gửi video bài giảng..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Nộp báo cáo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

