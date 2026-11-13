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
  Sparkles,
  ShieldCheck,
  FileSearch,
  RefreshCw,
  FileJson,
  Eye,
  Cloud,
  X,
  Info
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import {
  runDataSurveyScanner,
  downloadFullBackup,
  validateBackupFile,
  SurveyScanReport,
  fetchCenterDataFromGoogleAppsScript
} from '../../services/dataService';

export const SettingsView: React.FC = () => {
  const { data, updateSettings, resetAllData, restoreFromBackup } = useData();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({ ...data.settings });
  const [newRoomName, setNewRoomName] = useState('');

  // Milestone 1 Survey & Backup state
  const [surveyReport, setSurveyReport] = useState<SurveyScanReport | null>(() => runDataSurveyScanner(data));
  const [isScanning, setIsScanning] = useState(false);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<{
    name: string;
    type: 'modified' | 'new';
    ids: string[];
  } | null>(null);

  // Restore verification state
  const [restoreFileResult, setRestoreFileResult] = useState<{
    valid: boolean;
    data?: any;
    summary?: Record<string, number>;
    totalRecords?: number;
    exportedAt?: string;
    error?: string;
  } | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoreSectionOpen, setIsRestoreSectionOpen] = useState(false);

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
      setSurveyReport(runDataSurveyScanner(data));
      showToast('Đã khôi phục dữ liệu mẫu thành công!', 'success');
    }
  };

  const handleExportJSON = () => {
    downloadFullBackup(data);
    showToast('Đã tải xuống file sao lưu hệ thống JSON toàn diện!', 'success');
  };

  const handleRunSurveyScan = async () => {
    setIsScanning(true);
    try {
      // 1. Fetch remote cloud data in read-only mode
      const cloudRes = await fetchCenterDataFromGoogleAppsScript();
      let remoteData: any = null;
      let cloudFetchStatus: 'success' | 'failed' | 'skipped' = 'skipped';
      let cloudMessage = '';

      if (cloudRes.success && cloudRes.data) {
        remoteData = cloudRes.data;
        cloudFetchStatus = 'success';
        cloudMessage = 'Đã kết nối thành công với Google Sheets leegodata.';
      } else {
        cloudFetchStatus = 'failed';
        cloudMessage = cloudRes.error || 'Không đọc được dữ liệu Google Sheets leegodata.';
      }

      // 2. Run survey scanner against current local data and remote data
      const report = runDataSurveyScanner(data, remoteData, cloudFetchStatus, cloudMessage);
      setSurveyReport(report);
      showToast('Đã hoàn thành khảo sát và kiểm kê dữ liệu hiện tại!', 'success');
    } catch (err: any) {
      const report = runDataSurveyScanner(data, null, 'failed', err.message || 'Lỗi khi kiểm kê');
      setSurveyReport(report);
      showToast('Kiểm kê Local hoàn tất (Không kết nối được Cloud)', 'warning');
    } finally {
      setIsScanning(false);
    }
  };

  const handleExportScanReport = () => {
    if (!surveyReport) return;
    const reportStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(surveyReport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', reportStr);
    downloadAnchor.setAttribute('download', `LeeGo_Survey_Report_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Đã tải xuống báo cáo kiểm kê dữ liệu!', 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = validateBackupFile(text);
      setRestoreFileResult(res);
      if (res.valid) {
        showToast(`File sao lưu hợp lệ (${res.totalRecords} bản ghi)`, 'success');
      } else {
        showToast(res.error || 'File sao lưu không hợp lệ', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = () => {
    if (!restoreFileResult?.valid || !restoreFileResult.data) {
      showToast('Chưa có file sao lưu hợp lệ để phục hồi', 'error');
      return;
    }
    if (restoreConfirmText.trim().toUpperCase() !== 'PHỤC HỒI') {
      showToast('Vui lòng nhập đúng chữ "PHỤC HỒI" để xác nhận an toàn', 'warning');
      return;
    }
    if (restoreFromBackup) {
      const result = restoreFromBackup(restoreFileResult.data);
      if (result.success) {
        showToast(result.message || 'Đã phục hồi dữ liệu thành công!', 'success');
        setShowRestoreModal(false);
        setRestoreFileResult(null);
        setRestoreConfirmText('');
        setSurveyReport(runDataSurveyScanner(restoreFileResult.data));
      } else {
        showToast(result.message || 'Lỗi khi phục hồi dữ liệu', 'error');
      }
    }
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

      {/* ========================================================================= */}
      {/* MILESTONE 1: READ-ONLY SURVEY & COMPREHENSIVE BACKUP CARD */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-sky-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900">
                  Kiểm Kê Dữ Liệu & Sao Lưu Toàn Diện (Milestone 1)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                  Chế độ Chỉ Đọc (Read-Only)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kiểm kê phân loại Demo vs Dữ liệu thật, đối chiếu Cloud và xuất file sao lưu an toàn.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Tải file Backup (.JSON)</span>
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={handleRunSurveyScan}
              className={`px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                isScanning ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Đang khảo sát...' : 'Khảo sát & Đối chiếu Cloud'}</span>
            </button>

            {surveyReport && (
              <button
                type="button"
                onClick={handleExportScanReport}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Tải kết quả kiểm kê dạng JSON"
              >
                <FileJson className="w-4 h-4 text-slate-500" />
                <span>Xuất báo cáo</span>
              </button>
            )}
          </div>
        </div>

        {/* Safety Notice */}
        <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-xl text-xs text-sky-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              Cam kết an toàn tuyệt đối: Không thực hiện bất kỳ thao tác ghi, sửa, xóa hoặc Migration nào.
            </p>
            <p className="text-sky-800 text-[11px] leading-relaxed">
              Mọi dữ liệu trên máy tính này và trên Google Sheets đều được giữ nguyên 100%. Quá trình khảo sát chỉ đọc bộ nhớ để phân loại dữ liệu và xuất file sao lưu dự phòng.
            </p>
          </div>
        </div>

        {/* 5 Summary KPI Cards */}
        {surveyReport && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] font-semibold block">Tổng bản ghi Local</span>
              <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                {surveyReport.totalLocalRecords}
              </span>
              <span className="text-[10px] text-slate-500">Trên trình duyệt máy này</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] font-semibold block">Demo nguyên bản</span>
              <span className="text-xl font-extrabold text-slate-600 mt-1 block">
                {surveyReport.totalDemoUntouched}
              </span>
              <span className="text-[10px] text-slate-500">Dữ liệu mẫu chưa sửa</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-amber-800 text-[11px] font-semibold block">Demo đã chỉnh sửa</span>
              <span className="text-xl font-extrabold text-amber-700 mt-1 block">
                {surveyReport.totalDemoModified}
              </span>
              <span className="text-[10px] text-amber-600">Đã sửa thông tin mẫu</span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-emerald-800 text-[11px] font-semibold block">Dữ liệu thật mới tạo</span>
              <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
                {surveyReport.totalRealNew}
              </span>
              <span className="text-[10px] text-emerald-600">100% dữ liệu thực tế</span>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 col-span-2 lg:col-span-1">
              <span className="text-indigo-800 text-[11px] font-semibold block">Cloud Google Sheets</span>
              <span className="text-xl font-extrabold text-indigo-700 mt-1 block">
                {surveyReport.totalCloudRecords !== null
                  ? `${surveyReport.totalCloudRecords} bản ghi`
                  : 'Chưa đối chiếu'}
              </span>
              <span className="text-[10px] text-indigo-600">
                {surveyReport.cloudFetchStatus === 'success'
                  ? 'Đã đối chiếu leegodata'
                  : surveyReport.cloudFetchStatus === 'failed'
                  ? 'Lỗi kết nối Cloud'
                  : 'Nhấn khảo sát để đọc'}
              </span>
            </div>
          </div>
        )}

        {/* Detailed Category Inventory Table */}
        {surveyReport && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileSearch className="w-4 h-4 text-sky-600" />
                <span>Bảng Kiểm Kê Chi Tiết 19 Danh Mục Dữ Liệu</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                Khảo sát lúc: {surveyReport.scannedAt}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                    <th className="py-2.5 px-3">Danh mục</th>
                    <th className="py-2.5 px-3 text-center">Tổng Local</th>
                    <th className="py-2.5 px-3 text-center">Demo Gốc</th>
                    <th className="py-2.5 px-3 text-center">Demo Đã Sửa</th>
                    <th className="py-2.5 px-3 text-center">Dữ Liệu Mới</th>
                    <th className="py-2.5 px-3 text-center">Cloud (leegodata)</th>
                    <th className="py-2.5 px-3">Đánh giá An toàn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {surveyReport.categories.map((cat) => {
                    const hasModified = cat.demoModified > 0;
                    const hasNew = cat.realNew > 0;
                    return (
                      <tr key={cat.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {cat.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {cat.totalLocal}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">
                          {cat.demoUntouched}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {hasModified ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCategoryDetail({
                                  name: cat.name,
                                  type: 'modified',
                                  ids: cat.modifiedIds
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300"
                              title="Bấm để xem danh sách ID đã sửa"
                            >
                              <span>{cat.demoModified}</span>
                              <Eye className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {hasNew ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCategoryDetail({
                                  name: cat.name,
                                  type: 'new',
                                  ids: cat.newIds
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                              title="Bấm để xem danh sách ID bản ghi mới"
                            >
                              <span>{cat.realNew}</span>
                              <Eye className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-indigo-700 font-semibold">
                          {cat.totalCloud !== null ? cat.totalCloud : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {hasNew || hasModified ? (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              🛡️ Cần bảo toàn khi Sync
                            </span>
                          ) : cat.totalLocal > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                              Demo nguyên bản
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-400">
                              Trống
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Restore Inspector Collapsible Section */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsRestoreSectionOpen(!isRestoreSectionOpen)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>
              {isRestoreSectionOpen
                ? 'Đóng khu vực Kiểm tra File Backup & Thử nghiệm Phục hồi'
                : 'Mở rộng: Kiểm tra Tính Toàn Vẹn File Backup & Phục Hồi Khẩn Cấp'}
            </span>
          </button>

          {isRestoreSectionOpen && (
            <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Bạn có thể chọn một file sao lưu JSON đã tải về để kiểm tra tính hợp lệ và cấu trúc các danh mục dữ liệu. Hệ thống chỉ đọc và phân tích file, không tự động ghi đè.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Chọn file Backup (.JSON) để kiểm tra</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {restoreFileResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    restoreFileResult.valid
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : 'bg-red-50/80 border-red-300 text-red-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {restoreFileResult.valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>File sao lưu hợp lệ (Xuất lúc: {restoreFileResult.exportedAt})</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span>File không hợp lệ: {restoreFileResult.error}</span>
                      </>
                    )}
                  </div>

                  {restoreFileResult.valid && restoreFileResult.summary && (
                    <div className="space-y-2">
                      <div className="text-[11px] text-emerald-800">
                        Tổng số bản ghi trong file: <strong>{restoreFileResult.totalRecords}</strong> bản ghi.
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                        {Object.entries(restoreFileResult.summary).map(([key, count]) => (
                          <div key={key} className="bg-white/80 p-1.5 rounded-lg border border-emerald-200">
                            <span className="text-slate-500 block">{key}:</span>
                            <span className="font-bold text-slate-800">{count} bản ghi</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowRestoreModal(true)}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-2xs flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Phục hồi dữ liệu từ file này (Cần xác nhận 2 lớp)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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

      {/* Modal: View Specific IDs */}
      {selectedCategoryDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-sky-600" />
                  <span>Danh sách mã ID: {selectedCategoryDetail.name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Phân loại:{' '}
                  {selectedCategoryDetail.type === 'modified'
                    ? 'Bản ghi Demo đã chỉnh sửa thông tin'
                    : 'Bản ghi mới (100% dữ liệu thật)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategoryDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                Tìm thấy <strong>{selectedCategoryDetail.ids.length}</strong> mã bản ghi:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedCategoryDetail.ids.map((id) => (
                  <span
                    key={id}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border ${
                      selectedCategoryDetail.type === 'modified'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCategoryDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gated Restore Confirmation */}
      {showRestoreModal && restoreFileResult?.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-red-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Xác nhận Phục hồi Dữ liệu từ File
                </h3>
                <p className="text-[11px] text-slate-500">Thao tác có tác động đến dữ liệu trong bộ nhớ</p>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 space-y-1.5 leading-relaxed">
              <p className="font-bold">Cảnh báo quan trọng:</p>
              <p>
                Thao tác này sẽ nạp lại toàn bộ <strong>{restoreFileResult.totalRecords}</strong> bản ghi từ file sao lưu vào trình duyệt.
              </p>
              <p>
                Để bảo đảm an toàn, vui lòng gõ đúng chữ <strong>PHỤC HỒI</strong> vào ô bên dưới trước khi bấm xác nhận.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">
                Nhập chữ xác nhận:
              </label>
              <input
                type="text"
                placeholder="Gõ PHỤC HỒI..."
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 uppercase"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreConfirmText('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={restoreConfirmText.trim().toUpperCase() !== 'PHỤC HỒI'}
                onClick={handleExecuteRestore}
                className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm ${
                  restoreConfirmText.trim().toUpperCase() !== 'PHỤC HỒI'
                    ? 'opacity-40 cursor-not-allowed'
                    : ''
                }`}
              >
                Xác nhận phục hồi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
