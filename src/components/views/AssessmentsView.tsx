import React, { useState, useMemo, useEffect } from 'react';
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
  Calendar,
  BookOpen,
  UserCheck,
  CheckSquare,
  Square,
  Trash2,
  Edit,
  Clock,
  Layers,
  Info
} from 'lucide-react';
import {
  AssessmentRecord,
  StudentScoreEntry,
  AssessmentComponentKey,
  AssessmentType,
  ParticipationStatus
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import {
  exportAssessmentReportToExcel,
  resolveStaffProfile,
  getAssignedClassesForStaff
} from '../../services/dataService';

export const ALL_ASSESSMENT_COMPONENTS: {
  key: AssessmentComponentKey;
  label: string;
  shortLabel: string;
  code: string;
  description: string;
}[] = [
  { key: 'listening', label: 'Listening (Nghe)', shortLabel: 'Listening', code: 'LIS', description: 'Điểm kỹ năng Nghe' },
  { key: 'speaking', label: 'Speaking (Nói)', shortLabel: 'Speaking', code: 'SPK', description: 'Điểm kỹ năng Nói' },
  { key: 'reading_and_writing', label: 'Reading & Writing (Đọc & Viết kết hợp)', shortLabel: 'Reading & Writing', code: 'R&W', description: 'Điểm kết hợp Đọc và Viết (không tách rời)' },
  { key: 'reading', label: 'Reading (Đọc)', shortLabel: 'Reading', code: 'RDG', description: 'Điểm kỹ năng Đọc riêng' },
  { key: 'writing', label: 'Writing (Viết)', shortLabel: 'Writing', code: 'WRT', description: 'Điểm kỹ năng Viết riêng' },
  { key: 'language_focus', label: 'Language Focus (Ngữ pháp & Từ vựng)', shortLabel: 'Language Focus', code: 'LANG', description: 'Điểm Ngữ pháp, Từ vựng hoặc Kiến thức ngôn ngữ' },
  { key: 'phonetics', label: 'Phonetics (Phát âm & Ngữ âm)', shortLabel: 'Phonetics', code: 'PHON', description: 'Điểm Ngữ âm / Phát âm' },
  { key: 'overall_score', label: 'Overall Score (Điểm tổng kết nhập tay)', shortLabel: 'Overall Score', code: 'OVERALL', description: 'Điểm tổng kết do giáo viên tự nhập tay (không tính tự động)' },
];

export const AssessmentsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, saveAssessment, updateAssessmentScore, deleteAssessment } = useData();
  const { showToast } = useToast();

  const userRole = currentUser.role;
  const isAuthorized = userRole === 'academic_manager' || userRole === 'teacher';

  const staff = resolveStaffProfile(currentUser, data.teachers, data.teachingAssistants);
  const isTeacher = userRole === 'teacher';

  // Classes available to this user
  const availableClasses = useMemo(() => {
    if (isTeacher) {
      return getAssignedClassesForStaff(data.classes, staff);
    }
    // Academic Manager has access to all center classes
    return data.classes;
  }, [data.classes, isTeacher, staff]);

  const availableClassIds = useMemo(() => new Set(availableClasses.map(c => String(c.id).trim())), [availableClasses]);

  // Assessments available to this user
  const availableAssessments = useMemo(() => {
    return data.assessments.filter(a => availableClassIds.has(String(a.classId).trim()));
  }, [data.assessments, availableClassIds]);

  // Filters state
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all'); // 'all', '1' - '12'
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Assessment
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  // Filtered assessment list
  const filteredAssessments = useMemo(() => {
    return availableAssessments.filter(asm => {
      // Class filter
      if (filterClassId !== 'all' && asm.classId !== filterClassId) {
        return false;
      }
      // Month filter
      if (filterMonth !== 'all') {
        const m = asm.month || (asm.date ? Number(asm.date.split('-')[1]) : undefined);
        if (m !== Number(filterMonth)) return false;
      }
      // Type filter
      if (filterType !== 'all') {
        if (asm.examType !== filterType) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = asm.title.toLowerCase().includes(q);
        const matchesClass = asm.className.toLowerCase().includes(q);
        if (!matchesTitle && !matchesClass) return false;
      }
      return true;
    });
  }, [availableAssessments, filterClassId, filterMonth, filterType, searchQuery]);

  // Auto-select first matching assessment if current selected is invalid
  useEffect(() => {
    if (filteredAssessments.length > 0) {
      if (!selectedAssessmentId || !filteredAssessments.some(a => a.id === selectedAssessmentId)) {
        setSelectedAssessmentId(filteredAssessments[0].id);
      }
    } else {
      setSelectedAssessmentId('');
    }
  }, [filteredAssessments, selectedAssessmentId]);

  const selectedAssessment = useMemo(() => {
    return availableAssessments.find(a => a.id === selectedAssessmentId) || null;
  }, [availableAssessments, selectedAssessmentId]);

  // Editable scores state for current assessment
  const [currentScores, setCurrentScores] = useState<StudentScoreEntry[]>([]);

  // Update currentScores whenever selectedAssessment changes
  useEffect(() => {
    if (selectedAssessment) {
      // Ensure all students in class are present
      const cls = data.classes.find(c => c.id === selectedAssessment.classId);
      const enrolledStudentIds = Array.from(new Set((cls?.studentIds || []).map(sid => String(sid).trim()).filter(Boolean)));
      
      const existingScoresMap = new Map(selectedAssessment.scores.map(s => [String(s.studentId).trim(), s]));
      
      const mergedScores: StudentScoreEntry[] = [];
      
      // First, add all enrolled students
      for (const sid of enrolledStudentIds) {
        const st = data.students.find(s => String(s.id).trim() === sid);
        const existing = existingScoresMap.get(sid);
        if (existing) {
          mergedScores.push({
            ...existing,
            studentName: st?.fullName || existing.studentName || sid,
            participationStatus: existing.participationStatus || 'participated'
          });
          existingScoresMap.delete(sid);
        } else {
          mergedScores.push({
            studentId: sid,
            studentName: st?.fullName || sid,
            participationStatus: 'participated',
            teacherFeedback: ''
          });
        }
      }

      // Add any additional scores that were in the record but not in current class enrollment
      for (const extra of existingScoresMap.values()) {
        mergedScores.push({
          ...extra,
          participationStatus: extra.participationStatus || 'participated'
        });
      }

      setCurrentScores(mergedScores);
    } else {
      setCurrentScores([]);
    }
  }, [selectedAssessmentId, selectedAssessment, data.classes, data.students]);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form State for Create / Edit
  const [formData, setFormData] = useState<{
    id?: string;
    classId: string;
    title: string;
    month: number;
    year: number;
    examType: AssessmentType | string;
    date: string;
    scaleType: '10-point' | 'cambridge-shields' | 'percentage';
    maxScore: number;
    selectedComponents: AssessmentComponentKey[];
    notes: string;
  }>({
    classId: availableClasses[0]?.id || '',
    title: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    examType: 'Monthly',
    date: new Date().toISOString().slice(0, 10),
    scaleType: '10-point',
    maxScore: 10,
    selectedComponents: ['listening', 'speaking', 'reading', 'writing', 'language_focus', 'overall_score'],
    notes: ''
  });

  const openCreateModal = () => {
    const defaultClassId = filterClassId !== 'all' ? filterClassId : (availableClasses[0]?.id || '');
    const currentM = filterMonth !== 'all' ? Number(filterMonth) : (new Date().getMonth() + 1);
    const cls = availableClasses.find(c => c.id === defaultClassId);
    
    setFormData({
      classId: defaultClassId,
      title: cls ? `Kiểm tra định kỳ tháng ${currentM} - ${cls.name}` : `Kiểm tra định kỳ tháng ${currentM}`,
      month: currentM,
      year: new Date().getFullYear(),
      examType: 'Monthly',
      date: new Date().toISOString().slice(0, 10),
      scaleType: '10-point',
      maxScore: 10,
      selectedComponents: ['listening', 'speaking', 'reading', 'writing', 'language_focus', 'overall_score'],
      notes: ''
    });
    setShowCreateModal(true);
  };

  const openEditModal = () => {
    if (!selectedAssessment) return;
    setFormData({
      id: selectedAssessment.id,
      classId: selectedAssessment.classId,
      title: selectedAssessment.title,
      month: selectedAssessment.month || (selectedAssessment.date ? Number(selectedAssessment.date.split('-')[1]) : new Date().getMonth() + 1),
      year: selectedAssessment.year || (selectedAssessment.date ? Number(selectedAssessment.date.split('-')[0]) : new Date().getFullYear()),
      examType: selectedAssessment.examType,
      date: selectedAssessment.date,
      scaleType: selectedAssessment.scaleType,
      maxScore: selectedAssessment.maxScore,
      selectedComponents: selectedAssessment.selectedComponents || ['listening', 'speaking', 'reading', 'writing', 'language_focus', 'overall_score'],
      notes: selectedAssessment.notes || ''
    });
    setShowEditModal(true);
  };

  // Toggle component checkbox in form
  const toggleComponent = (key: AssessmentComponentKey) => {
    setFormData(prev => {
      const exists = prev.selectedComponents.includes(key);
      if (exists) {
        if (prev.selectedComponents.length <= 1) {
          showToast('Phải chọn ít nhất 1 thành phần đánh giá!', 'warning');
          return prev;
        }
        return {
          ...prev,
          selectedComponents: prev.selectedComponents.filter(k => k !== key)
        };
      } else {
        return {
          ...prev,
          selectedComponents: [...prev.selectedComponents, key]
        };
      }
    });
  };

  // Quick preset component selections
  const applyPreset = (preset: 'cambridge_yle' | 'four_skills' | 'comprehensive') => {
    if (preset === 'cambridge_yle') {
      setFormData(prev => ({
        ...prev,
        selectedComponents: ['listening', 'speaking', 'reading_and_writing', 'overall_score']
      }));
    } else if (preset === 'four_skills') {
      setFormData(prev => ({
        ...prev,
        selectedComponents: ['listening', 'speaking', 'reading', 'writing', 'overall_score']
      }));
    } else if (preset === 'comprehensive') {
      setFormData(prev => ({
        ...prev,
        selectedComponents: ['listening', 'speaking', 'reading', 'writing', 'language_focus', 'phonetics', 'overall_score']
      }));
    }
  };

  // Save new assessment
  const handleSaveAssessmentForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Vui lòng nhập tên bài kiểm tra!', 'error');
      return;
    }
    if (formData.selectedComponents.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 thành phần điểm!', 'error');
      return;
    }

    const cls = data.classes.find(c => c.id === formData.classId);
    if (!cls) {
      showToast('Lớp học không hợp lệ!', 'error');
      return;
    }

    if (formData.id) {
      // Editing existing assessment
      const existing = data.assessments.find(a => a.id === formData.id);
      if (!existing) return;

      const updated = saveAssessment({
        ...existing,
        title: formData.title,
        classId: cls.id,
        className: cls.name,
        month: formData.month,
        year: formData.year,
        examType: formData.examType,
        date: formData.date,
        scaleType: formData.scaleType,
        maxScore: formData.maxScore,
        selectedComponents: formData.selectedComponents,
        notes: formData.notes
      });

      showToast(`Đã cập nhật bài đánh giá "${updated.title}"!`, 'success');
      setShowEditModal(false);
      setSelectedAssessmentId(updated.id);
    } else {
      // Creating new assessment
      const dedupStudentIds = Array.from(new Set((cls.studentIds || []).map(sid => String(sid).trim()).filter(Boolean)));
      const newScores: StudentScoreEntry[] = dedupStudentIds.map(sid => {
        const st = data.students.find(s => String(s.id).trim() === sid);
        return {
          studentId: sid,
          studentName: st?.fullName || sid,
          participationStatus: 'participated',
          teacherFeedback: ''
        };
      });

      const newRecord = saveAssessment({
        classId: cls.id,
        className: cls.name,
        title: formData.title,
        month: formData.month,
        year: formData.year,
        examType: formData.examType,
        date: formData.date,
        scaleType: formData.scaleType,
        maxScore: formData.maxScore,
        selectedComponents: formData.selectedComponents,
        notes: formData.notes,
        scores: newScores,
        evaluatedBy: currentUser.name
      });

      showToast(`Đã tạo kỳ đánh giá "${newRecord.title}" thành công!`, 'success');
      setShowCreateModal(false);
      setSelectedAssessmentId(newRecord.id);
    }
  };

  // Delete current assessment
  const handleDeleteCurrentAssessment = () => {
    if (!selectedAssessment) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa bài đánh giá "${selectedAssessment.title}"? Dữ liệu điểm đã nhập sẽ bị xóa vĩnh viễn.`)) {
      if (deleteAssessment) {
        deleteAssessment(selectedAssessment.id);
      }
      showToast(`Đã xóa bài đánh giá "${selectedAssessment.title}"`, 'info');
      setSelectedAssessmentId('');
    }
  };

  // Score Table Handlers
  const handleParticipationChange = (studentId: string, status: ParticipationStatus) => {
    setCurrentScores(prev =>
      prev.map(sc => {
        if (sc.studentId === studentId) {
          return {
            ...sc,
            participationStatus: status
          };
        }
        return sc;
      })
    );
  };

  const handleComponentScoreChange = (
    studentId: string,
    key: AssessmentComponentKey,
    valStr: string
  ) => {
    const num = valStr === '' ? null : Number(valStr);
    setCurrentScores(prev =>
      prev.map(sc => {
        if (sc.studentId === studentId) {
          const updated = { ...sc };
          switch (key) {
            case 'listening':
              updated.listening = num;
              break;
            case 'speaking':
              updated.speaking = num;
              break;
            case 'reading_and_writing':
              updated.readingAndWriting = num;
              break;
            case 'reading':
              updated.reading = num;
              break;
            case 'writing':
              updated.writing = num;
              break;
            case 'language_focus':
              updated.languageFocus = num;
              updated.grammar = num ?? undefined;
              break;
            case 'phonetics':
              updated.phonetics = num;
              break;
            case 'overall_score':
              // Manually entered overall score: DO NOT auto-calculate
              updated.overallScore = num;
              updated.totalScore = num ?? undefined;
              // Evaluate qualitative status if overall score provided
              if (num !== null && num !== undefined) {
                if (num >= 8.5) updated.status = 'excellent';
                else if (num >= 7.0) updated.status = 'good';
                else if (num >= 5.0) updated.status = 'pass';
                else updated.status = 'needs_improvement';
              }
              break;
          }
          return updated;
        }
        return sc;
      })
    );
  };

  const handleFeedbackChange = (studentId: string, feedback: string) => {
    setCurrentScores(prev =>
      prev.map(sc => (sc.studentId === studentId ? { ...sc, teacherFeedback: feedback } : sc))
    );
  };

  // Save all score changes
  const handleSaveScores = () => {
    if (!selectedAssessment) return;
    updateAssessmentScore(selectedAssessment.id, currentScores);
    showToast(`Đã lưu bảng điểm bài đánh giá "${selectedAssessment.title}" thành công!`, 'success');
  };

  // Active components for selected assessment
  const activeComponents = useMemo(() => {
    if (!selectedAssessment) return [];
    const keys = selectedAssessment.selectedComponents || ['listening', 'speaking', 'reading', 'writing', 'language_focus', 'overall_score'];
    return ALL_ASSESSMENT_COMPONENTS.filter(c => keys.includes(c.key));
  }, [selectedAssessment]);

  // Helper to extract student's score for a specific component
  const getStudentScoreValue = (sc: StudentScoreEntry, key: AssessmentComponentKey): number | '' => {
    if (sc.participationStatus === 'absent') return '';
    switch (key) {
      case 'listening':
        return sc.listening !== undefined && sc.listening !== null ? sc.listening : '';
      case 'speaking':
        return sc.speaking !== undefined && sc.speaking !== null ? sc.speaking : '';
      case 'reading_and_writing':
        return sc.readingAndWriting !== undefined && sc.readingAndWriting !== null ? sc.readingAndWriting : '';
      case 'reading':
        return sc.reading !== undefined && sc.reading !== null ? sc.reading : '';
      case 'writing':
        return sc.writing !== undefined && sc.writing !== null ? sc.writing : '';
      case 'language_focus':
        return sc.languageFocus !== undefined && sc.languageFocus !== null ? sc.languageFocus : (sc.grammar !== undefined && sc.grammar !== null ? sc.grammar : '');
      case 'phonetics':
        return sc.phonetics !== undefined && sc.phonetics !== null ? sc.phonetics : '';
      case 'overall_score':
        return sc.overallScore !== undefined && sc.overallScore !== null ? sc.overallScore : (sc.totalScore !== undefined && sc.totalScore !== null ? sc.totalScore : '');
      default:
        return '';
    }
  };

  // Automatic Class Average calculation for each active component
  // Rule: ONLY include participating students who have valid entered scores
  const classAverages = useMemo(() => {
    const results: Record<AssessmentComponentKey, { average: string; count: number; totalParticipated: number }> = {} as any;
    const participating = currentScores.filter(s => s.participationStatus !== 'absent');

    activeComponents.forEach(comp => {
      let sum = 0;
      let count = 0;

      participating.forEach(sc => {
        const val = getStudentScoreValue(sc, comp.key);
        if (typeof val === 'number' && !isNaN(val)) {
          sum += val;
          count++;
        }
      });

      if (count === 0) {
        results[comp.key] = { average: '—', count: 0, totalParticipated: participating.length };
      } else {
        const avg = Number((sum / count).toFixed(2));
        results[comp.key] = { average: avg.toString(), count, totalParticipated: participating.length };
      }
    });

    return results;
  }, [currentScores, activeComponents]);

  // Participation summary
  const participationSummary = useMemo(() => {
    const total = currentScores.length;
    const absent = currentScores.filter(s => s.participationStatus === 'absent').length;
    const participated = total - absent;
    return { total, participated, absent };
  }, [currentScores]);

  // Excel Export
  const handleExportExcel = () => {
    if (filteredAssessments.length === 0) {
      showToast('Không có dữ liệu bài đánh giá để xuất Excel', 'warning');
      return;
    }
    exportAssessmentReportToExcel(filteredAssessments);
    showToast(`Đã xuất ${filteredAssessments.length} bài đánh giá ra Excel`, 'success');
  };

  // Unauthorized access guard
  if (!isAuthorized) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-red-200 shadow-sm text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Truy cập bị giới hạn</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Chức năng <strong>Đánh Giá Năng Lực Học Viên (Academic Assessments)</strong> được cấu hình truy cập chuyên biệt dành riêng cho <strong>Quản lý chuyên môn (Academic Manager)</strong> và <strong>Giáo viên đứng lớp (Teacher)</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Đánh Giá Năng Lực Học Viên (Academic Assessments)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý kỳ thi, bài kiểm tra định kỳ theo lớp và tháng. Tùy chọn cấu hình các thành phần kỹ năng linh hoạt và tự động tính điểm trung bình lớp.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-950/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bài đánh giá mới</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR: Class, Month, Exam Type, Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
          <Filter className="w-3.5 h-3.5 text-red-600" />
          <span>Bộ lọc & Tìm kiếm bài kiểm tra</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Lớp học {isTeacher && '(Chỉ lớp được phân công)'}
            </label>
            <select
              value={filterClassId}
              onChange={e => setFilterClassId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="all">Tất cả lớp học ({availableClasses.length})</option>
              {availableClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.studentIds.length} HS)
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tháng đánh giá</label>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="all">Tất cả các tháng</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={String(m)}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Loại kỳ kiểm tra</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="all">Tất cả loại bài thi</option>
              <option value="Monthly">Bài kiểm tra tháng (Monthly Test)</option>
              <option value="Midterm">Thi giữa kỳ (Midterm Test)</option>
              <option value="Final">Thi cuối kỳ (Final Test)</option>
              <option value="Periodic">Đánh giá định kỳ (Periodic Test)</option>
              <option value="Speaking Check">Kiểm tra Nói (Speaking Check)</option>
              <option value="Other">Khác (Other)</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tìm kiếm theo tên</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Nhập tên bài thi hoặc lớp..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ASSESSMENT SELECTION & ACTION BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex-1 max-w-xl">
          <label className="font-bold text-slate-800 block mb-1">
            Chọn bài kiểm tra đang thao tác:
          </label>
          {filteredAssessments.length > 0 ? (
            <select
              value={selectedAssessmentId}
              onChange={e => setSelectedAssessmentId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              {filteredAssessments.map(asm => (
                <option key={asm.id} value={asm.id}>
                  {asm.title} • Lớp: {asm.className} {asm.month ? `(Tháng ${asm.month})` : ''} • {asm.date}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
              Không tìm thấy bài kiểm tra nào phù hợp với bộ lọc. Hãy tạo bài kiểm tra mới!
            </div>
          )}
        </div>

        {selectedAssessment && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={openEditModal}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition-colors"
              title="Chỉnh sửa thông tin bài thi hoặc thay đổi thành phần điểm"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Cấu hình thành phần</span>
            </button>

            <button
              onClick={handleDeleteCurrentAssessment}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold flex items-center gap-1.5 transition-colors"
              title="Xóa bài kiểm tra này"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>

            <button
              onClick={handleSaveScores}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm shadow-red-950/20 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Lưu bảng điểm</span>
            </button>
          </div>
        )}
      </div>

      {/* MAIN VIEWPORT: SCORE ENTRY TABLE */}
      {selectedAssessment ? (
        <div className="space-y-4">
          {/* Assessment Header Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {selectedAssessment.examType || 'Bài kiểm tra'}
                </span>
                {selectedAssessment.month && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-200 text-[10px] font-semibold">
                    Tháng {selectedAssessment.month}/{selectedAssessment.year || ''}
                  </span>
                )}
                <span className="text-slate-400 text-[11px]">
                  Ngày kiểm tra: <strong className="text-white">{selectedAssessment.date}</strong>
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                {selectedAssessment.title}
              </h3>
              <p className="text-slate-300 text-xs">
                Lớp học: <strong className="text-red-400">{selectedAssessment.className}</strong> • Đánh giá bởi: {selectedAssessment.evaluatedBy}
              </p>
              {selectedAssessment.notes && (
                <p className="text-slate-400 text-[11px] italic mt-1">
                  Ghi chú: {selectedAssessment.notes}
                </p>
              )}
            </div>

            {/* Participation & Stats Pill */}
            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl flex items-center gap-4 text-center shrink-0">
              <div>
                <div className="text-base font-black text-white">{participationSummary.total}</div>
                <div className="text-[10px] text-slate-400">Tổng học sinh</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <div className="text-base font-black text-emerald-400">{participationSummary.participated}</div>
                <div className="text-[10px] text-emerald-300">Tham gia thi</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <div className="text-base font-black text-amber-400">{participationSummary.absent}</div>
                <div className="text-[10px] text-amber-300">Vắng mặt</div>
              </div>
            </div>
          </div>

          {/* Active Components Pill bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-600 mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-red-600" />
                Các kỹ năng được đánh giá:
              </span>
              {activeComponents.map(comp => (
                <span
                  key={comp.key}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200"
                  title={comp.description}
                >
                  {comp.shortLabel}
                </span>
              ))}
            </div>

            <button
              onClick={openEditModal}
              className="text-red-600 hover:text-red-700 font-bold text-[11px] hover:underline"
            >
              + Thêm/bớt thành phần
            </button>
          </div>

          {/* Detailed Score Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="font-bold text-slate-800">
                Bảng điểm chi tiết ({currentScores.length} học viên)
              </span>
              <span className="text-[11px] text-slate-500 italic">
                * Học sinh đánh dấu <strong>Vắng thi</strong> sẽ không bị tính vào điểm trung bình lớp.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">STT</th>
                    <th className="py-3 px-3 min-w-[170px]">Học viên</th>
                    <th className="py-3 px-2 w-28 text-center">Trạng thái thi</th>
                    {activeComponents.map(comp => (
                      <th
                        key={comp.key}
                        className={`py-3 px-2 min-w-[90px] text-center ${
                          comp.key === 'overall_score' ? 'text-red-700 font-black bg-red-50/50' : ''
                        }`}
                      >
                        {comp.shortLabel}
                        {comp.key === 'overall_score' && (
                          <span className="block text-[9px] font-normal text-red-500">(Nhập tay)</span>
                        )}
                      </th>
                    ))}
                    <th className="py-3 px-3 min-w-[200px]">Nhận xét & Lời khuyên của Giáo viên</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {currentScores.map((score, idx) => {
                    const isAbsent = score.participationStatus === 'absent';

                    return (
                      <tr
                        key={score.studentId}
                        className={`transition-colors ${
                          isAbsent ? 'bg-amber-50/40 text-slate-400' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className={`font-bold ${isAbsent ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                            {score.studentName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{score.studentId}</div>
                        </td>

                        {/* Participation Status selector */}
                        <td className="py-3 px-2 text-center">
                          <select
                            value={score.participationStatus || 'participated'}
                            onChange={e =>
                              handleParticipationChange(score.studentId, e.target.value as ParticipationStatus)
                            }
                            className={`w-full text-[11px] font-bold py-1 px-1.5 rounded-lg border focus:outline-none ${
                              isAbsent
                                ? 'bg-amber-100 border-amber-300 text-amber-800'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            }`}
                          >
                            <option value="participated">Tham gia</option>
                            <option value="absent">Vắng thi</option>
                          </select>
                        </td>

                        {/* Dynamic Component Score Inputs */}
                        {activeComponents.map(comp => {
                          const val = getStudentScoreValue(score, comp.key);

                          return (
                            <td
                              key={comp.key}
                              className={`py-3 px-2 text-center ${
                                comp.key === 'overall_score' ? 'bg-red-50/30' : ''
                              }`}
                            >
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max={selectedAssessment.maxScore || 10}
                                disabled={isAbsent}
                                placeholder={isAbsent ? 'Vắng' : '—'}
                                value={val}
                                onChange={e =>
                                  handleComponentScoreChange(score.studentId, comp.key, e.target.value)
                                }
                                className={`w-16 text-center py-1 rounded-lg font-bold border focus:bg-white focus:ring-1 focus:ring-red-500 focus:outline-none ${
                                  isAbsent
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : comp.key === 'overall_score'
                                    ? 'bg-white text-red-600 border-red-300 font-extrabold text-sm'
                                    : 'bg-slate-50 text-slate-800 border-slate-200'
                                }`}
                              />
                            </td>
                          );
                        })}

                        {/* Teacher Feedback */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            disabled={isAbsent}
                            value={score.teacherFeedback || ''}
                            onChange={e => handleFeedbackChange(score.studentId, e.target.value)}
                            placeholder={isAbsent ? 'Học sinh vắng thi...' : 'Nhập nhận xét chi tiết...'}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs border focus:bg-white focus:ring-1 focus:ring-red-500 focus:outline-none ${
                              isAbsent
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* CLASS AVERAGE ROW (AUTOMATICALLY CALCULATED) */}
                <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-700">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right tracking-tight font-extrabold text-amber-300">
                      ĐIỂM TRUNG BÌNH LỚP (Class Average):
                    </td>
                    {activeComponents.map(comp => {
                      const stat = classAverages[comp.key];

                      return (
                        <td key={comp.key} className="py-3 px-2 text-center">
                          <div className={`text-sm font-black ${comp.key === 'overall_score' ? 'text-red-400' : 'text-white'}`}>
                            {stat?.average || '—'}
                          </div>
                          {stat && stat.count > 0 && (
                            <div className="text-[9px] text-slate-400 font-normal">
                              ({stat.count}/{stat.totalParticipated} HS)
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-[11px] text-slate-400 font-normal italic">
                      * Tính tự động chỉ dựa trên học sinh tham gia có điểm hợp lệ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Hãy nhớ bấm <strong>Lưu bảng điểm</strong> sau khi hoàn tất nhập điểm học viên.
              </span>
              <button
                onClick={handleSaveScores}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-red-950/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Lưu toàn bộ bảng điểm</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-3">
          <Award className="w-10 h-10 mx-auto text-slate-300" />
          <div className="font-semibold text-slate-600 text-sm">
            Chưa có bài kiểm tra nào được chọn hoặc tạo.
          </div>
          <p className="max-w-md mx-auto text-slate-400">
            Chọn lớp học và tháng ở thanh công cụ phía trên hoặc bấm vào <strong>"Tạo bài đánh giá mới"</strong> để thiết lập các thành phần điểm và tiến hành nhập điểm học viên.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bài đánh giá ngay</span>
          </button>
        </div>
      )}

      {/* CREATE & EDIT MODAL WITH COMPONENT SELECTION CHECKBOXES */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
            }}
          />
          <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl z-10 border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {showEditModal ? 'Cấu hình bài đánh giá & kỹ năng' : 'Tạo kỳ thi / Bài đánh giá mới'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tích chọn các thành phần kỹ năng cần đánh giá cho bài kiểm tra này.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssessmentForm} className="py-4 space-y-4">
              {/* Title */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tên bài kiểm tra / Kỳ thi <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Kiểm tra định kỳ tháng 11 - Movers"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Class & Month */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lớp học áp dụng</label>
                  <select
                    value={formData.classId}
                    onChange={e => {
                      const newCid = e.target.value;
                      const c = availableClasses.find(cl => cl.id === newCid);
                      setFormData({
                        ...formData,
                        classId: newCid,
                        title: c && !formData.id ? `Kiểm tra định kỳ tháng ${formData.month} - ${c.name}` : formData.title
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {availableClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.studentIds.length} học sinh)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tháng & Năm</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.month}
                      onChange={e => setFormData({ ...formData, month: Number(e.target.value) })}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={formData.year}
                      onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Type, Scale & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Loại kiểm tra</label>
                  <select
                    value={formData.examType}
                    onChange={e => setFormData({ ...formData, examType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white"
                  >
                    <option value="Monthly">Bài kiểm tra tháng</option>
                    <option value="Midterm">Thi giữa kỳ (Midterm)</option>
                    <option value="Final">Thi cuối kỳ (Final)</option>
                    <option value="Periodic">Đánh giá định kỳ</option>
                    <option value="Speaking Check">Kiểm tra Nói</option>
                    <option value="Other">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Thang điểm tối đa</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.maxScore}
                    onChange={e => setFormData({ ...formData, maxScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày thi</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* COMPONENT SELECTION CHECKBOXES */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-red-600" />
                    Tùy chọn các thành phần điểm thi (Assessment Components):
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyPreset('cambridge_yle')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                    >
                      Cambridge YLE
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('four_skills')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                    >
                      4 Kỹ năng
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('comprehensive')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                    >
                      Đầy đủ
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  {ALL_ASSESSMENT_COMPONENTS.map(comp => {
                    const isChecked = formData.selectedComponents.includes(comp.key);

                    return (
                      <label
                        key={comp.key}
                        onClick={() => toggleComponent(comp.key)}
                        className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer border transition-all ${
                          isChecked
                            ? 'bg-red-50/60 border-red-300 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by label onClick
                          className="mt-0.5 w-4 h-4 accent-red-600 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs leading-snug">{comp.label}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{comp.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <p className="text-[11px] text-slate-400 mt-2">
                  * <strong>Đọc & Viết kết hợp (Reading and Writing)</strong> là thành phần độc lập với Đọc riêng và Viết riêng.
                  <br />
                  * <strong>Điểm tổng kết (Overall Score)</strong> sẽ do giáo viên tự nhập tay, hệ thống <em>không</em> tự động tính trung bình số học.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú bổ sung (tùy chọn)</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về phạm vi bài thi, giáo trình, cấu trúc đề..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-950/20 transition-all"
                >
                  {showEditModal ? 'Lưu cấu hình bài thi' : 'Tạo bài đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
