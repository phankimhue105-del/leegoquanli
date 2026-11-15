import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Filter,
  Users,
  Calendar,
  Award,
  BookOpen,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import {
  exportStudentsToExcel,
  exportAttendanceReportToExcel,
  exportAssessmentReportToExcel,
  exportTeacherWorkloadToExcel
} from '../../services/dataService';
import {
  AssessmentRecord,
  StudentScoreEntry,
  AssessmentComponentKey
} from '../../types';

const ASSESSMENT_COMPONENT_INFO: Record<AssessmentComponentKey, { label: string; short: string }> = {
  listening: { label: 'Listening (Nghe)', short: 'Nghe' },
  speaking: { label: 'Speaking (Nói)', short: 'Nói' },
  reading_and_writing: { label: 'Reading & Writing', short: 'Đọc-Viết' },
  reading: { label: 'Reading (Đọc)', short: 'Đọc' },
  writing: { label: 'Writing (Viết)', short: 'Viết' },
  language_focus: { label: 'Language Focus', short: 'Ngữ pháp' },
  phonetics: { label: 'Phonetics', short: 'Phát âm' },
  overall_score: { label: 'Overall Score (Tổng điểm)', short: 'Overall' },
};

const getEffectiveComponents = (asm: AssessmentRecord): AssessmentComponentKey[] => {
  if (Array.isArray(asm.selectedComponents) && asm.selectedComponents.length > 0) {
    return asm.selectedComponents;
  }
  return ['listening', 'speaking', 'reading', 'writing', 'language_focus', 'overall_score'];
};

const getStudentComponentScore = (sc: StudentScoreEntry, key: AssessmentComponentKey): number | null | undefined => {
  switch (key) {
    case 'listening':
      return sc.listening;
    case 'speaking':
      return sc.speaking;
    case 'reading_and_writing':
      return sc.readingAndWriting;
    case 'reading':
      return sc.reading;
    case 'writing':
      return sc.writing;
    case 'language_focus':
      return sc.languageFocus ?? sc.grammar;
    case 'phonetics':
      return sc.phonetics;
    case 'overall_score':
      return sc.overallScore ?? sc.totalScore;
    default:
      return undefined;
  }
};

const calculateClassAverage = (scores: StudentScoreEntry[], compKey: AssessmentComponentKey) => {
  let sum = 0;
  let count = 0;
  for (const sc of scores) {
    if (sc.participationStatus === 'absent') continue;
    const val = getStudentComponentScore(sc, compKey);
    if (val !== undefined && val !== null && !isNaN(Number(val))) {
      sum += Number(val);
      count++;
    }
  }
  if (count === 0) return { avg: null, count: 0 };
  return { avg: parseFloat((sum / count).toFixed(2)), count };
};

type ReportTab =
  | 'enrollment'
  | 'attendance'
  | 'workload'
  | 'performance'
  | 'curriculum';

export const AcademicReportsView: React.FC = () => {
  const { data } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ReportTab>('enrollment');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');

  // Performance Report Filters
  const [reportClassId, setReportClassId] = useState<string>('all');
  const [reportMonth, setReportMonth] = useState<string>('all');
  const [reportAssessmentId, setReportAssessmentId] = useState<string>('all');

  const assessmentsForFilterDropdown = useMemo(() => {
    return data.assessments.filter(asm => {
      if (reportClassId !== 'all' && String(asm.classId).trim() !== String(reportClassId).trim()) {
        return false;
      }
      if (reportMonth !== 'all') {
        const m = asm.month || (asm.date ? parseInt(asm.date.split('-')[1], 10) : undefined);
        if (m !== parseInt(reportMonth, 10)) {
          return false;
        }
      }
      return true;
    });
  }, [data.assessments, reportClassId, reportMonth]);

  const filteredPerformanceAssessments = useMemo(() => {
    return data.assessments.filter(asm => {
      if (reportClassId !== 'all' && String(asm.classId).trim() !== String(reportClassId).trim()) {
        return false;
      }
      if (reportMonth !== 'all') {
        const m = asm.month || (asm.date ? parseInt(asm.date.split('-')[1], 10) : undefined);
        if (m !== parseInt(reportMonth, 10)) {
          return false;
        }
      }
      if (reportAssessmentId !== 'all' && asm.id !== reportAssessmentId) {
        return false;
      }
      return true;
    });
  }, [data.assessments, reportClassId, reportMonth, reportAssessmentId]);

  // Print friendly handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs no-print">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600" />
            Báo Cáo Học Thuật & Vận Hành (Academic Reports)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thống kê chuyên sâu phục vụ công tác quản lý chất lượng đào tạo, tuyển sinh và giảng dạy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {/* Report Tabs Selector */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 no-print">
        <button
          onClick={() => setActiveTab('enrollment')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'enrollment'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Báo cáo Tuyển sinh & Học viên</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'attendance'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Báo cáo Chuyên cần Điểm danh</span>
        </button>

        <button
          onClick={() => setActiveTab('workload')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'workload'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Báo cáo Tải giờ Giáo viên</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'performance'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Báo cáo Điểm số & Xếp loại</span>
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'curriculum'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Tiến độ Hoàn thành Giáo án</span>
        </button>
      </div>

      {/* TAB 1: ENROLLMENT REPORT */}
      {activeTab === 'enrollment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-800">
              Tổng số học sinh: {data.students.length} • Đang theo học: {data.students.filter(s => s.status === 'studying').length}
            </div>
            <button
              onClick={() => {
                exportStudentsToExcel(data.students, data.classes);
                showToast('Đã xuất danh sách tuyển sinh ra Excel', 'success');
              }}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg border border-red-200 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Xuất Excel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 text-xs font-medium">Học sinh Starters (Pre A1)</span>
              <div className="text-2xl font-black text-red-600 mt-1">
                {data.students.filter(s => s.currentLevel.includes('Starters')).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 text-xs font-medium">Học sinh Movers (A1)</span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {data.students.filter(s => s.currentLevel.includes('Movers')).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 text-xs font-medium">Học sinh Flyers & KET/PET</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {data.students.filter(s => !s.currentLevel.includes('Starters') && !s.currentLevel.includes('Movers')).length}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mã HS</th>
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Khối lớp</th>
                  <th className="py-2.5 px-3">Trình độ</th>
                  <th className="py-2.5 px-3">Phụ huynh</th>
                  <th className="py-2.5 px-3">SĐT</th>
                  <th className="py-2.5 px-3">Ngày nhập học</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.students.map(s => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{s.id}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.fullName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.grade}</td>
                    <td className="py-2.5 px-3 font-medium text-red-600">{s.currentLevel}</td>
                    <td className="py-2.5 px-3 text-slate-700">{s.parentName}</td>
                    <td className="py-2.5 px-3 text-slate-500">{s.parentPhone}</td>
                    <td className="py-2.5 px-3 text-slate-500">{s.enrollmentDate}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE REPORT */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-800">
              Tổng số buổi điểm danh đã lưu: {data.attendance.length} buổi
            </div>
            <button
              onClick={() => {
                exportAttendanceReportToExcel(data.attendance);
                showToast('Đã xuất báo cáo chuyên cần ra Excel', 'success');
              }}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg border border-red-200 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Xuất Excel Điểm Danh
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Ngày</th>
                  <th className="py-3 px-3">Tên lớp</th>
                  <th className="py-3 px-3">Giáo viên</th>
                  <th className="py-3 px-3 text-center">Sĩ số</th>
                  <th className="py-3 px-3 text-center text-emerald-700">Có mặt</th>
                  <th className="py-3 px-3 text-center text-amber-700">Đi muộn</th>
                  <th className="py-3 px-3 text-center text-red-700">Vắng mặt</th>
                  <th className="py-3 px-3 text-center">Tỷ lệ chuyên cần</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.attendance.map(att => {
                  const rate = Math.round((att.presentCount / att.totalStudents) * 100);
                  return (
                    <tr key={att.id}>
                      <td className="py-3 px-3 font-semibold text-slate-800">{att.date}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{att.className}</td>
                      <td className="py-3 px-3 text-slate-600">{att.teacherName}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{att.totalStudents}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700">{att.presentCount}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-700">{att.lateCount}</td>
                      <td className="py-3 px-3 text-center font-bold text-red-700">{att.absentCount}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TEACHER WORKLOAD REPORT */}
      {activeTab === 'workload' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-800">
              Số lượng giáo viên: {data.teachers.length} (Bản ngữ: {data.teachers.filter(t => t.isNative).length})
            </div>
            <button
              onClick={() => {
                exportTeacherWorkloadToExcel(data.teachers, data.classes);
                showToast('Đã xuất báo cáo công tác giáo viên ra Excel', 'success');
              }}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg border border-red-200 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Xuất Excel Tải Giờ Dạy
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Mã GV</th>
                  <th className="py-3 px-3">Họ và Tên giáo viên</th>
                  <th className="py-3 px-3">Quốc tịch</th>
                  <th className="py-3 px-3">Bằng cấp & Kinh nghiệm</th>
                  <th className="py-3 px-3">Số lớp phụ trách</th>
                  <th className="py-3 px-3 text-center">Giờ dạy / tuần</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.teachers.map(t => {
                  const assigned = data.classes.filter(c => c.teacherId === t.id);
                  return (
                    <tr key={t.id}>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{t.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{t.fullName}</div>
                        <div className="text-[11px] text-slate-400">{t.email}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{t.nationality}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {t.qualifications} ({t.experienceYears} năm KN)
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{assigned.length} lớp</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          {assigned.map(c => c.name).join(', ')}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-sm text-red-600">
                        {t.workloadHours} giờ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700">
                          Đang giảng dạy
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PERFORMANCE REPORT */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 no-print">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-red-600" />
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Bộ Lọc Báo Cáo Điểm Số & Xếp Loại
                </span>
              </div>
              <button
                onClick={() => {
                  exportAssessmentReportToExcel(filteredPerformanceAssessments);
                  showToast(
                    filteredPerformanceAssessments.length === data.assessments.length
                      ? 'Đã xuất toàn bộ điểm thi ra Excel'
                      : `Đã xuất ${filteredPerformanceAssessments.length} kỳ thi đã lọc ra Excel`,
                    'success'
                  );
                }}
                disabled={filteredPerformanceAssessments.length === 0}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 font-bold rounded-lg border border-red-200 flex items-center gap-1.5 text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel Điểm Số ({filteredPerformanceAssessments.length})</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Filter Class */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Lớp học
                </label>
                <select
                  value={reportClassId}
                  onChange={e => {
                    setReportClassId(e.target.value);
                    setReportAssessmentId('all');
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="all">Tất cả các lớp ({data.classes.length})</option>
                  {data.classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Month */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Tháng kiểm tra
                </label>
                <select
                  value={reportMonth}
                  onChange={e => {
                    setReportMonth(e.target.value);
                    setReportAssessmentId('all');
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="all">Tất cả các tháng</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={String(m)}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Assessment */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Kỳ thi / Đánh giá
                </label>
                <select
                  value={reportAssessmentId}
                  onChange={e => setReportAssessmentId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="all">Tất cả kỳ thi ({assessmentsForFilterDropdown.length})</option>
                  {assessmentsForFilterDropdown.map(asm => (
                    <option key={asm.id} value={asm.id}>
                      {asm.title} - {asm.className} ({asm.date})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Assessment List */}
          <div className="space-y-5">
            {filteredPerformanceAssessments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                <Award className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600 text-sm">Không có dữ liệu bài kiểm tra</p>
                <p className="text-xs text-slate-400 mt-1">
                  Chưa có bài thi nào phù hợp với bộ lọc lớp học hoặc tháng đã chọn.
                </p>
              </div>
            ) : (
              filteredPerformanceAssessments.map(asm => {
                const components = getEffectiveComponents(asm);
                const scores = asm.scores || [];
                const totalStudents = scores.length;
                const participatingCount = scores.filter(s => s.participationStatus !== 'absent').length;
                const absentCount = totalStudents - participatingCount;

                return (
                  <div key={asm.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">{asm.title}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold text-[10px] border border-red-100">
                            {asm.examType || 'Bài thi'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px]">
                            {asm.scaleType}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">
                          Lớp: <span className="font-semibold text-slate-700">{asm.className}</span> • 
                          Ngày thi: <span className="font-semibold text-slate-700">{asm.date}</span>
                          {asm.month && <span> • Tháng: <span className="font-semibold text-slate-700">{asm.month}/{asm.year || ''}</span></span>}
                          {asm.evaluatedBy && <span> • Đánh giá: <span className="font-semibold text-slate-700">{asm.evaluatedBy}</span></span>}
                          <span> • Sĩ số: <span className="font-semibold text-slate-700">{totalStudents}</span> ({participatingCount} tham gia, {absentCount} vắng)</span>
                        </p>
                        {asm.notes && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">Ghi chú: {asm.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200/80">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">STT</th>
                            <th className="py-2.5 px-3">Học sinh</th>
                            <th className="py-2.5 px-3 text-center">Trạng thái</th>
                            {components.map(comp => (
                              <th
                                key={comp}
                                className={`py-2.5 px-3 text-center ${
                                  comp === 'overall_score'
                                    ? 'text-red-700 bg-red-50/50 font-black'
                                    : ''
                                }`}
                              >
                                {ASSESSMENT_COMPONENT_INFO[comp]?.short || comp}
                              </th>
                            ))}
                            {asm.scaleType === 'cambridge-shields' && (
                              <th className="py-2.5 px-3 text-center">Khiên</th>
                            )}
                            <th className="py-2.5 px-3">Nhận xét</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {scores.map((sc, idx) => {
                            const isAbsent = sc.participationStatus === 'absent';
                            return (
                              <tr key={sc.studentId || idx} className={isAbsent ? 'bg-amber-50/20' : 'hover:bg-slate-50/50'}>
                                <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">{sc.studentName}</td>
                                <td className="py-2 px-3 text-center">
                                  {isAbsent ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                      Vắng thi
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      Tham gia
                                    </span>
                                  )}
                                </td>
                                {components.map(comp => {
                                  const val = getStudentComponentScore(sc, comp);
                                  return (
                                    <td
                                      key={comp}
                                      className={`py-2 px-3 text-center ${
                                        comp === 'overall_score'
                                          ? 'font-black text-red-600'
                                          : 'text-slate-700 font-medium'
                                      }`}
                                    >
                                      {isAbsent ? (
                                        <span className="text-slate-300 font-normal">—</span>
                                      ) : val !== undefined && val !== null ? (
                                        val
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                {asm.scaleType === 'cambridge-shields' && (
                                  <td className="py-2 px-3 text-center font-bold text-amber-600">
                                    {isAbsent ? '—' : sc.shields ? `🛡️ ${sc.shields}/5` : '—'}
                                  </td>
                                )}
                                <td className="py-2 px-3 text-slate-600 italic text-[11px]">
                                  {sc.teacherFeedback || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Class Average Footer */}
                        <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-800">
                          <tr>
                            <td colSpan={3} className="py-2.5 px-3 text-right">
                              <span className="text-xs uppercase tracking-wider text-slate-600">
                                Điểm trung bình lớp:
                              </span>
                            </td>
                            {components.map(comp => {
                              const { avg, count } = calculateClassAverage(scores, comp);
                              return (
                                <td
                                  key={comp}
                                  className={`py-2.5 px-3 text-center font-bold ${
                                    comp === 'overall_score' ? 'text-red-700 bg-red-100/40 font-black' : 'text-slate-900'
                                  }`}
                                >
                                  {avg !== null ? (
                                    <div>
                                      <span>{avg}</span>
                                      <span className="block text-[9px] font-normal text-slate-500">
                                        (N={count})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-normal">—</span>
                                  )}
                                </td>
                              );
                            })}
                            {asm.scaleType === 'cambridge-shields' && (
                              <td className="py-2.5 px-3 text-center text-slate-400 font-normal">—</td>
                            )}
                            <td className="py-2.5 px-3 text-slate-400 font-normal text-[11px]">
                              {participatingCount}/{totalStudents} học sinh tham gia
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CURRICULUM COMPLETION */}
      {activeTab === 'curriculum' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Tiến độ chương trình học các lớp hiện hành</h3>
            <div className="space-y-4 text-xs">
              {data.classes.map(cls => {
                const prog = data.programs.find(p => p.id === cls.courseId);
                const total = prog?.totalLessons || 48;
                const reportsForClass = data.lessonPlans.filter(lp => lp.classId === cls.id);
                const currentLesson = reportsForClass.length > 0 ? Math.max(...reportsForClass.map(r => r.lessonNumber)) : 14;
                const percent = Math.min(100, Math.round((currentLesson / total) * 100));

                return (
                  <div key={cls.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{cls.name}</span>
                        <span className="text-slate-500 ml-2">({cls.level})</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        Buổi {currentLesson} / {total} ({percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-red-600 h-full rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
