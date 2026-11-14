import React, { useState, useMemo } from 'react';
import {
  Award,
  Plus,
  Search,
  Filter,
  Save,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Star,
  Shield,
  X,
  Eye,
  TrendingUp
} from 'lucide-react';
import { AssessmentRecord, StudentScoreEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import { exportAssessmentReportToExcel } from '../../services/dataService';

export const AssessmentsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, saveAssessment, updateAssessmentScore } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const teacherObj = isTeacher
    ? data.teachers.find(
        t =>
          String(t.id).trim() === String(currentUser.teacherId).trim() ||
          (Boolean(currentUser.email) && t.email.toLowerCase() === currentUser.email.toLowerCase())
      )
    : null;
  const currentTeacherId = teacherObj ? String(teacherObj.id).trim() : (currentUser.teacherId ? String(currentUser.teacherId).trim() : '');

  const availableClasses = useMemo(() => {
    if (isTeacher) {
      return data.classes.filter(c => Boolean(currentTeacherId) && String(c.teacherId).trim() === currentTeacherId);
    }
    return data.classes;
  }, [data.classes, isTeacher, currentTeacherId]);

  const availableClassIds = useMemo(() => availableClasses.map(c => String(c.id).trim()), [availableClasses]);
  const availableAssessments = useMemo(() => {
    return isTeacher
      ? data.assessments.filter(a => availableClassIds.includes(String(a.classId).trim()))
      : data.assessments;
  }, [data.assessments, isTeacher, availableClassIds]);

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(availableAssessments[0]?.id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);

  React.useEffect(() => {
    if ((!selectedAssessmentId || !availableAssessments.some(a => a.id === selectedAssessmentId)) && availableAssessments.length > 0) {
      setSelectedAssessmentId(availableAssessments[0].id);
    }
  }, [availableAssessments, selectedAssessmentId]);

  const selectedAssessment = availableAssessments.find(a => a.id === selectedAssessmentId) || availableAssessments[0];

  // Editable scores state for current assessment
  const [currentScores, setCurrentScores] = useState<StudentScoreEntry[]>(() => {
    return selectedAssessment ? [...selectedAssessment.scores] : [];
  });

  React.useEffect(() => {
    if (selectedAssessment) {
      setCurrentScores([...selectedAssessment.scores]);
    }
  }, [selectedAssessmentId, selectedAssessment]);

  // Create Assessment form state
  const [createForm, setCreateForm] = useState({
    classId: availableClasses[0]?.id || '',
    title: '',
    examType: 'Midterm' as 'Midterm' | 'Final' | 'Monthly' | 'Speaking Check',
    date: new Date().toISOString().slice(0, 10),
    scaleType: 'cambridge-shields' as '10-point' | 'cambridge-shields' | 'percentage',
    maxScore: 15
  });

  const handleScoreChange = (
    studentId: string,
    field: keyof StudentScoreEntry,
    value: any
  ) => {
    setCurrentScores(prev =>
      prev.map(sc => {
        if (sc.studentId === studentId) {
          const updated = { ...sc, [field]: value };

          // Recalculate total
          const l = Number(field === 'listening' ? value : updated.listening) || 0;
          const sp = Number(field === 'speaking' ? value : updated.speaking) || 0;
          const r = Number(field === 'reading' ? value : updated.reading) || 0;
          const w = Number(field === 'writing' ? value : updated.writing) || 0;
          const g = Number(field === 'grammar' ? value : updated.grammar) || 0;

          if (selectedAssessment?.scaleType === 'cambridge-shields') {
            const sumShields = Math.round((l + sp + r + w + g) / 5);
            updated.shields = Math.min(5, Math.max(1, sumShields));
            updated.totalScore = Number(((l + sp + r + w + g) / 5 * 3).toFixed(1)); // out of 15
          } else {
            const avg = Number(((l + sp + r + w + g) / 5).toFixed(1));
            updated.totalScore = avg;
          }

          // Evaluate status
          if (updated.totalScore >= 8.5 || (updated.shields && updated.shields >= 4)) {
            updated.status = 'excellent';
          } else if (updated.totalScore >= 7.0 || (updated.shields && updated.shields === 3)) {
            updated.status = 'good';
          } else if (updated.totalScore >= 5.0) {
            updated.status = 'pass';
          } else {
            updated.status = 'needs_improvement';
          }

          return updated;
        }
        return sc;
      })
    );
  };

  const handleSaveAllScores = () => {
    if (!selectedAssessment) return;
    updateAssessmentScore(selectedAssessment.id, currentScores);
    showToast(`Đã lưu kết quả đánh giá cho "${selectedAssessment.title}"!`, 'success');
  };

  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      showToast('Vui lòng nhập tên kỳ thi / bài kiểm tra', 'error');
      return;
    }

    const cls = data.classes.find(c => c.id === createForm.classId);
    if (!cls) return;

    // Generate score entries for all students in class (deduplicated & normalized)
    const dedupStudentIds = Array.from(new Set((cls.studentIds || []).map(sid => String(sid).trim()).filter(Boolean)));
    const newScores: StudentScoreEntry[] = dedupStudentIds.map(sid => {
      const st = data.students.find(s => String(s.id).trim() === sid);
      return {
        studentId: sid,
        studentName: st?.fullName || sid,
        listening: 8,
        speaking: 8,
        reading: 8,
        writing: 8,
        grammar: 8,
        totalScore: 8,
        shields: 4,
        teacherFeedback: 'Học sinh tham gia làm bài đầy đủ.',
        status: 'good'
      };
    });

    const newAssessment = saveAssessment({
      classId: cls.id,
      className: cls.name,
      title: createForm.title,
      examType: createForm.examType,
      date: createForm.date,
      scaleType: createForm.scaleType,
      maxScore: createForm.scaleType === 'cambridge-shields' ? 15 : 10,
      scores: newScores,
      evaluatedBy: currentUser.name
    });

    showToast(`Đã tạo kỳ đánh giá "${newAssessment.title}" thành công!`, 'success');
    setSelectedAssessmentId(newAssessment.id);
    setShowCreateModal(false);
  };

  const handleExportExcel = () => {
    exportAssessmentReportToExcel(data.assessments);
    showToast('Đã xuất toàn bộ kết quả đánh giá ra Excel', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-red-600" />
            Đánh Giá Năng Lực Học Viên (Academic Assessments)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhập điểm 4 kỹ năng chuẩn Cambridge (Nghe, Nói, Đọc, Viết) hoặc thang điểm 10 quy đổi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Xuất bảng điểm Excel</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo kỳ thi / Bài đánh giá</span>
          </button>
        </div>
      </div>

      {/* Select Assessment Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex-1 max-w-md">
          <label className="font-bold text-slate-700 block mb-1">Chọn kỳ đánh giá / Bài kiểm tra</label>
          <select
            value={selectedAssessmentId}
            onChange={e => setSelectedAssessmentId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-red-500"
          >
            {availableAssessments.map(asm => (
              <option key={asm.id} value={asm.id}>
                {asm.title} - Lớp: {asm.className} ({asm.date})
              </option>
            ))}
          </select>
        </div>

        {selectedAssessment && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="font-bold text-slate-900 text-sm">{selectedAssessment.className}</div>
              <div className="text-slate-500 text-[11px]">
                Hình thức: <span className="font-semibold text-red-600">{selectedAssessment.scaleType}</span> • Ngày: {selectedAssessment.date}
              </div>
            </div>

            <button
              onClick={handleSaveAllScores}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-950/20 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu bảng điểm</span>
            </button>
          </div>
        )}
      </div>

      {/* Scores Table */}
      {selectedAssessment ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Bảng điểm chi tiết: {selectedAssessment.title} ({currentScores.length} học viên)
            </span>
            <span className="text-[11px] text-slate-500">
              Đánh giá bởi: <strong>{selectedAssessment.evaluatedBy}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">STT</th>
                  <th className="py-3 px-3 min-w-[150px]">Học viên</th>
                  <th className="py-3 px-2 w-20 text-center">Listening</th>
                  <th className="py-3 px-2 w-20 text-center">Speaking</th>
                  <th className="py-3 px-2 w-20 text-center">Reading</th>
                  <th className="py-3 px-2 w-20 text-center">Writing</th>
                  <th className="py-3 px-2 w-20 text-center">Grammar</th>
                  <th className="py-3 px-3 w-24 text-center font-black text-red-700">Tổng điểm</th>
                  {selectedAssessment.scaleType === 'cambridge-shields' && (
                    <th className="py-3 px-3 w-28 text-center text-amber-700">Khiên Cambridge</th>
                  )}
                  <th className="py-3 px-3 min-w-[220px]">Nhận xét & Lời khuyên của Giáo viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentScores.map((score, idx) => (
                  <tr key={score.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{score.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{score.studentId}</div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={score.listening}
                        onChange={e => handleScoreChange(score.studentId, 'listening', Number(e.target.value))}
                        className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-red-500"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={score.speaking}
                        onChange={e => handleScoreChange(score.studentId, 'speaking', Number(e.target.value))}
                        className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-red-500"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={score.reading}
                        onChange={e => handleScoreChange(score.studentId, 'reading', Number(e.target.value))}
                        className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-red-500"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={score.writing}
                        onChange={e => handleScoreChange(score.studentId, 'writing', Number(e.target.value))}
                        className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-red-500"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={score.grammar}
                        onChange={e => handleScoreChange(score.studentId, 'grammar', Number(e.target.value))}
                        className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-red-500"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-black text-sm text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {score.totalScore}
                      </span>
                    </td>
                    {selectedAssessment.scaleType === 'cambridge-shields' && (
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Shield className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          {score.shields || 5}/5
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={score.teacherFeedback || ''}
                        onChange={e => handleScoreChange(score.studentId, 'teacherFeedback', e.target.value)}
                        placeholder="Nhập nhận xét chi tiết..."
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-red-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
          Chưa có kỳ đánh giá nào. Bấm vào nút "Tạo kỳ thi / Bài đánh giá" để bắt đầu.
        </div>
      )}

      {/* CREATE ASSESSMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">Tạo kỳ thi / Đánh giá mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="py-4 space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tên kỳ kiểm tra <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Kiểm tra Giữa kỳ Cambridge Starters"
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lớp học áp dụng</label>
                <select
                  value={createForm.classId}
                  onChange={e => setCreateForm({ ...createForm, classId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {availableClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.studentIds.length} học sinh)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loại bài kiểm tra</label>
                  <select
                    value={createForm.examType}
                    onChange={e => setCreateForm({ ...createForm, examType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Midterm">Giữa kỳ (Midterm)</option>
                    <option value="Final">Cuối kỳ (Final)</option>
                    <option value="Monthly">Định kỳ tháng (Monthly)</option>
                    <option value="Speaking Check">Kiểm tra Nói (Speaking)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Thang điểm</label>
                  <select
                    value={createForm.scaleType}
                    onChange={e => setCreateForm({ ...createForm, scaleType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="cambridge-shields">Khiên Cambridge (Shields 1-5)</option>
                    <option value="10-point">Thang điểm 10</option>
                    <option value="percentage">Phần trăm (100%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ngày đánh giá</label>
                <input
                  type="date"
                  value={createForm.date}
                  onChange={e => setCreateForm({ ...createForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                >
                  Tạo bảng điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
