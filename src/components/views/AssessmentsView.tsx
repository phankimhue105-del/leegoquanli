import React, { useState } from 'react';
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
  TrendingUp,
  Edit3
} from 'lucide-react';
import { AssessmentComponent, AssessmentRecord, StudentScoreEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import { exportAssessmentReportToExcel } from '../../services/dataService';

const ASSESSMENT_COMPONENTS: AssessmentComponent[] = [
  'Listening',
  'Speaking',
  'Reading',
  'Writing',
  'Reading and Writing',
  'Language Focus',
  'Phonetics',
  'Overall Score'
];

export const AssessmentsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, saveAssessment, updateAssessmentScore } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const teacherObj = isTeacher ? data.teachers.find(t => t.id === currentUser.teacherId || t.email === currentUser.email) : null;
  const teacherClassIds = teacherObj ? teacherObj.assignedClassIds : [];

  const availableClasses = isTeacher
    ? data.classes.filter(c => teacherClassIds.includes(c.id))
    : data.classes;

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(data.assessments[0]?.id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [componentError, setComponentError] = useState<string>('');

  const selectedAssessment = data.assessments.find(a => a.id === selectedAssessmentId) || data.assessments[0];
  const selectedComponents = selectedAssessment?.components;
  const hasConfiguredComponents = Boolean(selectedComponents && selectedComponents.length > 0);

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
    maxScore: 15,
    components: [] as AssessmentComponent[]
  });

  const openCreateModal = () => {
    setEditingAssessmentId(null);
    setComponentError('');
    setCreateForm({
      classId: availableClasses[0]?.id || '',
      title: '',
      examType: 'Midterm',
      date: new Date().toISOString().slice(0, 10),
      scaleType: 'cambridge-shields',
      maxScore: 15,
      components: []
    });
    setShowCreateModal(true);
  };

  const openEditModal = (assessment: AssessmentRecord) => {
    setEditingAssessmentId(assessment.id);
    setComponentError('');
    setCreateForm({
      classId: assessment.classId,
      title: assessment.title,
      examType: assessment.examType,
      date: assessment.date,
      scaleType: assessment.scaleType,
      maxScore: assessment.maxScore,
      components: assessment.components ? [...assessment.components] : []
    });
    setShowCreateModal(true);
  };

  const handleToggleComponent = (component: AssessmentComponent) => {
    setCreateForm(prev => {
      const exists = prev.components.includes(component);
      const nextUnsorted = exists
        ? prev.components.filter(c => c !== component)
        : [...prev.components, component];
      const nextComponents = ASSESSMENT_COMPONENTS.filter(c => nextUnsorted.includes(c));
      return { ...prev, components: nextComponents };
    });
    setComponentError('');
  };

  const getComponentScoreValue = (
    score: StudentScoreEntry,
    component: AssessmentComponent
  ): number | '' => {
    if (score.componentScores !== undefined) {
      const val = score.componentScores[component];
      return val !== undefined ? val : '';
    }
    switch (component) {
      case 'Listening':
        return score.listening;
      case 'Speaking':
        return score.speaking;
      case 'Reading':
        return score.reading;
      case 'Writing':
        return score.writing;
      case 'Overall Score':
        return score.totalScore;
      default:
        return '';
    }
  };

  const handleComponentScoreChange = (
    studentId: string,
    component: AssessmentComponent,
    rawValue: string
  ) => {
    const numericValue = rawValue === '' ? undefined : Number(rawValue);
    if (numericValue !== undefined && Number.isNaN(numericValue)) return;

    setCurrentScores(prev =>
      prev.map(sc => {
        if (sc.studentId !== studentId) return sc;

        const nextComponentScores: Partial<Record<AssessmentComponent, number>> =
          sc.componentScores !== undefined
            ? { ...sc.componentScores }
            : {
                Listening: sc.listening,
                Speaking: sc.speaking,
                Reading: sc.reading,
                Writing: sc.writing,
                'Overall Score': sc.totalScore
              };

        if (numericValue === undefined) {
          delete nextComponentScores[component];
        } else {
          nextComponentScores[component] = numericValue;
        }

        const updated: StudentScoreEntry = {
          ...sc,
          componentScores: nextComponentScores
        };

        const fallbackZero = numericValue ?? 0;
        if (component === 'Listening') updated.listening = fallbackZero;
        if (component === 'Speaking') updated.speaking = fallbackZero;
        if (component === 'Reading') updated.reading = fallbackZero;
        if (component === 'Writing') updated.writing = fallbackZero;
        if (component === 'Overall Score') updated.totalScore = fallbackZero;

        return updated;
      })
    );
  };

  const handleScoreChange = (
    studentId: string,
    field: keyof StudentScoreEntry,
    value: any
  ) => {
    setCurrentScores(prev =>
      prev.map(sc => {
        if (sc.studentId === studentId) {
          const updated = { ...sc, [field]: value };

          // Do not run legacy 5-skill auto-calculation when custom components are configured
          if (hasConfiguredComponents) {
            return updated;
          }

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

    if (createForm.components.length === 0) {
      const errorMessage = 'Vui lòng chọn ít nhất một thành phần / kỹ năng đánh giá.';
      setComponentError(errorMessage);
      showToast(errorMessage, 'error');
      return;
    }

    const cls = data.classes.find(c => c.id === createForm.classId);
    if (!cls) return;

    const existingAssessment = editingAssessmentId
      ? data.assessments.find(a => a.id === editingAssessmentId)
      : undefined;

    // Preserve existing scores if editing the same class; otherwise generate score entries for all students in class
    const nextScores: StudentScoreEntry[] =
      existingAssessment && existingAssessment.classId === cls.id
        ? existingAssessment.scores
        : cls.studentIds.map(sid => {
            const st = data.students.find(s => s.id === sid);
            return {
              studentId: sid,
              studentName: st?.fullName || sid,
              listening: 0,
              speaking: 0,
              reading: 0,
              writing: 0,
              grammar: 0,
              totalScore: 0,
              componentScores: {},
              teacherFeedback: 'Học sinh tham gia làm bài đầy đủ.',
              status: 'good'
            };
          });

    const newAssessment = saveAssessment({
      ...(existingAssessment ? { id: existingAssessment.id } : {}),
      classId: cls.id,
      className: cls.name,
      title: createForm.title.trim(),
      examType: createForm.examType,
      date: createForm.date,
      scaleType: createForm.scaleType,
      maxScore:
        createForm.scaleType === 'cambridge-shields'
          ? 15
          : createForm.scaleType === 'percentage'
            ? 100
            : 10,
      components: createForm.components,
      scores: nextScores,
      evaluatedBy: existingAssessment ? existingAssessment.evaluatedBy : currentUser.name,
      ...(existingAssessment?.reviewedBy ? { reviewedBy: existingAssessment.reviewedBy } : {})
    });

    showToast(
      existingAssessment
        ? `Đã cập nhật kỳ đánh giá "${newAssessment.title}" thành công!`
        : `Đã tạo kỳ đánh giá "${newAssessment.title}" thành công!`,
      'success'
    );
    setSelectedAssessmentId(newAssessment.id);
    setShowCreateModal(false);
    setEditingAssessmentId(null);
    setComponentError('');
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
            onClick={openCreateModal}
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
            {data.assessments.map(asm => (
              <option key={asm.id} value={asm.id}>
                {asm.title} - Lớp: {asm.className} ({asm.date})
              </option>
            ))}
          </select>
        </div>

        {selectedAssessment && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right hidden sm:block mr-1">
              <div className="font-bold text-slate-900 text-sm">{selectedAssessment.className}</div>
              <div className="text-slate-500 text-[11px]">
                Hình thức: <span className="font-semibold text-red-600">{selectedAssessment.scaleType}</span> • Ngày: {selectedAssessment.date}
              </div>
            </div>

            <button
              type="button"
              onClick={() => openEditModal(selectedAssessment)}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-semibold transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4 text-slate-500" />
              <span>Chỉnh sửa</span>
            </button>

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
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-800">
              Bảng điểm chi tiết: {selectedAssessment.title} ({currentScores.length} học viên)
            </span>
            <span className="text-[11px] text-slate-500">
              Đánh giá bởi: <strong>{selectedAssessment.evaluatedBy}</strong>
            </span>
          </div>

          {hasConfiguredComponents && selectedComponents && (
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-semibold text-slate-600 mr-1">Thành phần / Kỹ năng đánh giá:</span>
              {selectedComponents.map(comp => (
                <span
                  key={comp}
                  className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold"
                >
                  {comp}
                </span>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">STT</th>
                  <th className="py-3 px-3 min-w-[150px]">Học viên</th>
                  {hasConfiguredComponents && selectedComponents ? (
                    selectedComponents.map(comp => (
                      <th key={comp} className="py-3 px-2 min-w-[100px] text-center">
                        {comp}
                      </th>
                    ))
                  ) : (
                    <>
                      <th className="py-3 px-2 w-20 text-center">Listening</th>
                      <th className="py-3 px-2 w-20 text-center">Speaking</th>
                      <th className="py-3 px-2 w-20 text-center">Reading</th>
                      <th className="py-3 px-2 w-20 text-center">Writing</th>
                      <th className="py-3 px-2 w-20 text-center">Grammar</th>
                      <th className="py-3 px-3 w-24 text-center font-black text-red-700">Tổng điểm</th>
                      {selectedAssessment.scaleType === 'cambridge-shields' && (
                        <th className="py-3 px-3 w-28 text-center text-amber-700">Khiên Cambridge</th>
                      )}
                    </>
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
                    {hasConfiguredComponents && selectedComponents ? (
                      selectedComponents.map(comp => (
                        <td key={comp} className="py-3 px-2 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="-"
                            value={getComponentScoreValue(score, comp)}
                            onChange={e =>
                              handleComponentScoreChange(score.studentId, comp, e.target.value)
                            }
                            className="w-16 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-red-500"
                          />
                        </td>
                      ))
                    ) : (
                      <>
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
                      </>
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

      {/* CREATE / EDIT ASSESSMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => {
              setShowCreateModal(false);
              setEditingAssessmentId(null);
              setComponentError('');
            }}
          />
          <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl z-10 border border-slate-200 text-xs flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h3 className="font-bold text-slate-800 text-base">
                {editingAssessmentId ? 'Chỉnh sửa kỳ thi / Đánh giá' : 'Tạo kỳ thi / Đánh giá mới'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingAssessmentId(null);
                  setComponentError('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
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

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-slate-700">
                      Thành phần / Kỹ năng đánh giá <span className="text-red-600">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Đã chọn: <strong className="text-red-600">{createForm.components.length}</strong>/
                      {ASSESSMENT_COMPONENTS.length}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-2 ${
                      componentError ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    {ASSESSMENT_COMPONENTS.map(component => {
                      const isChecked = createForm.components.includes(component);
                      return (
                        <label
                          key={component}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none ${
                            isChecked
                              ? 'bg-red-50 border-red-300 text-red-800 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleComponent(component)}
                            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 accent-red-600"
                          />
                          <span className="text-xs">{component}</span>
                        </label>
                      );
                    })}
                  </div>
                  {componentError && (
                    <p className="mt-1.5 text-[11px] font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{componentError}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 shrink-0 bg-white rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAssessmentId(null);
                    setComponentError('');
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                >
                  {editingAssessmentId ? 'Lưu thay đổi' : 'Tạo bảng điểm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
