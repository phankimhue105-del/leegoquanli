import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit2,
  Trash2,
  ArrowRightLeft,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  School,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { Student, StudentStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../common/Toast';
import { exportStudentsToExcel, parseExcelToStudents } from '../../services/dataService';

const WAITLIST_OPTION = 'Chờ lớp';

export const StudentsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data, addStudent, updateStudent, deleteStudent, transferStudentClass, importStudents } = useData();
  const { showToast } = useToast();

  const isTeacher = currentUser.role === 'teacher';
  const teacherObj = isTeacher ? data.teachers.find(t => t.id === currentUser.teacherId || t.email === currentUser.email) : null;
  const teacherClassIds = teacherObj ? teacherObj.assignedClassIds : [];

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [transferringStudent, setTransferringStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<'info' | 'classes' | 'attendance' | 'scores' | 'comments'>('info');

  // Filter students based on role and filters
  const filteredStudents = useMemo(() => {
    return data.students.filter(student => {
      // Role enforcement: Teachers only see students enrolled in their assigned classes
      if (isTeacher) {
        const inTeacherClass = student.classIds.some(cid => teacherClassIds.includes(cid));
        if (!inTeacherClass) return false;
      }

      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = student.fullName.toLowerCase().includes(query);
        const matchCode = student.id.toLowerCase().includes(query);
        const matchPhone = student.parentPhone.includes(query);
        const matchNick = student.vietnameseName.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchPhone && !matchNick) return false;
      }

      // Class filter
      if (selectedClassFilter !== 'all' && !student.classIds.includes(selectedClassFilter)) {
        return false;
      }

      // Grade filter
      if (selectedGradeFilter !== 'all' && student.grade !== selectedGradeFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all' && student.status !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [data.students, isTeacher, teacherClassIds, searchTerm, selectedClassFilter, selectedGradeFilter, selectedStatusFilter]);

  // Valid existing classes for "Lớp phù hợp" dropdown
  const suitableClassOptions = useMemo(() => {
    return data.classes.filter(c => {
      const isValid = c.status !== 'cancelled';
      const isCurrentlySelected = editingStudent?.suitableClassId === c.id;
      return isValid || isCurrentlySelected;
    });
  }, [data.classes, editingStudent]);

  const resolveSuitableClassLabel = (suitableClassId?: string): string => {
    if (!suitableClassId) return '';
    if (suitableClassId === WAITLIST_OPTION) return WAITLIST_OPTION;
    const matched = data.classes.find(c => c.id === suitableClassId);
    return matched ? matched.name : suitableClassId;
  };

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Omit<Student, 'id'>>({
    fullName: '',
    vietnameseName: '',
    dob: '2016-01-01',
    gender: 'male',
    school: '',
    grade: 'Lớp 3',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    enrollmentDate: new Date().toISOString().slice(0, 10),
    currentLevel: '',
    entryTestResult: '',
    suitableClassId: '',
    classIds: [],
    status: 'studying',
    notes: ''
  });

  const openAddModal = () => {
    setFormData({
      fullName: '',
      vietnameseName: '',
      dob: '2016-01-01',
      gender: 'male',
      school: '',
      grade: 'Lớp 3',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      address: '',
      enrollmentDate: new Date().toISOString().slice(0, 10),
      currentLevel: '',
      entryTestResult: '',
      suitableClassId: '',
      classIds: [],
      status: 'studying',
      notes: ''
    });
    setEditingStudent(null);
    setShowAddModal(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      fullName: student.fullName,
      vietnameseName: student.vietnameseName,
      dob: student.dob,
      gender: student.gender,
      school: student.school,
      grade: student.grade,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      address: student.address,
      enrollmentDate: student.enrollmentDate,
      currentLevel: student.currentLevel,
      entryTestResult: student.entryTestResult ?? '',
      suitableClassId: student.suitableClassId ?? '',
      classIds: [...student.classIds],
      status: student.status,
      notes: student.notes
    });
    setShowAddModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      showToast('Vui lòng nhập họ và tên học sinh', 'error');
      return;
    }
    if (!formData.parentPhone.trim()) {
      showToast('Vui lòng nhập số điện thoại phụ huynh', 'error');
      return;
    }

    const payload: Omit<Student, 'id'> = {
      ...formData,
      entryTestResult: (formData.entryTestResult || '').trim(),
      suitableClassId: formData.suitableClassId || ''
    };

    if (editingStudent) {
      updateStudent(editingStudent.id, payload);
      showToast(`Đã cập nhật thông tin học sinh ${payload.fullName}`, 'success');
    } else {
      const created = addStudent(payload);
      showToast(`Đã thêm thành công học sinh ${created.fullName} (${created.id})`, 'success');
    }
    setShowAddModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa học sinh "${name}" khỏi hệ thống?`)) {
      deleteStudent(id);
      showToast(`Đã xóa học sinh ${name}`, 'info');
      if (viewingStudent?.id === id) {
        setViewingStudent(null);
      }
    }
  };

  const handleExportExcel = () => {
    exportStudentsToExcel(filteredStudents, data.classes);
    showToast(`Đã xuất ${filteredStudents.length} học sinh ra file Excel`, 'success');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseExcelToStudents(file);
      if (parsed.length === 0) {
        showToast('Không tìm thấy dữ liệu hợp lệ trong file Excel', 'error');
        return;
      }
      const count = importStudents(parsed);
      showToast(`Đã import thành công ${count} học sinh vào hệ thống!`, 'success');
      e.target.value = '';
    } catch (err) {
      showToast('Có lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file', 'error');
    }
  };

  // Transfer Class Form State
  const [transferTargetClassId, setTransferTargetClassId] = useState<string>('');
  const [transferSourceClassId, setTransferSourceClassId] = useState<string>('');

  const openTransferModal = (student: Student) => {
    setTransferringStudent(student);
    setTransferSourceClassId(student.classIds[0] || '');
    setTransferTargetClassId('');
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringStudent || !transferTargetClassId) {
      showToast('Vui lòng chọn lớp học đích', 'error');
      return;
    }
    if (transferSourceClassId === transferTargetClassId) {
      showToast('Lớp chuyển đến phải khác lớp hiện tại', 'warning');
      return;
    }

    transferStudentClass(transferringStudent.id, transferSourceClassId, transferTargetClassId);
    showToast(`Đã chuyển học sinh ${transferringStudent.fullName} sang lớp mới`, 'success');
    setTransferringStudent(null);
  };

  // Unique grades for filter
  const allGrades = Array.from(new Set(data.students.map(s => s.grade))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-red-600" />
            Hồ Sơ Học Sinh ({filteredStudents.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isTeacher
              ? 'Danh sách học sinh thuộc các lớp Thầy/Cô được phân công giảng dạy.'
              : 'Quản lý thông tin cá nhân, phụ huynh, chuyển lớp và theo dõi học tập toàn diện.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isTeacher && (
            <>
              <label className="cursor-pointer px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Nhập Excel</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleImportExcel}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleExportExcel}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Xuất Excel</span>
              </button>

              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-red-950/20"
              >
                <Plus className="w-4 h-4" />
                <span>Tiếp nhận học sinh mới</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh, mã HS, SĐT phụ huynh..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Class filter */}
          <select
            value={selectedClassFilter}
            onChange={e => setSelectedClassFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Tất cả lớp học</option>
            {data.classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Grade filter */}
          <select
            value={selectedGradeFilter}
            onChange={e => setSelectedGradeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Tất cả khối lớp</option>
            {allGrades.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="studying">Đang học</option>
            <option value="reserved">Bảo lưu</option>
            <option value="graduated">Đã tốt nghiệp</option>
            <option value="dropped">Nghỉ học</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã HS</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4">Ngày sinh / Giới tính</th>
                <th className="py-3 px-4">Trình độ & Lớp học</th>
                <th className="py-3 px-4">Phụ huynh & Liên hệ</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy học sinh nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const assignedClasses = data.classes.filter(c => student.classIds.includes(c.id));
                  const suitableClassLabel = resolveSuitableClassLabel(student.suitableClassId);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {student.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{student.fullName}</div>
                        {student.vietnameseName && (
                          <div className="text-[11px] text-slate-500 font-medium">{student.vietnameseName}</div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">{student.school} • {student.grade}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{student.dob}</div>
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold mt-0.5 ${
                          student.gender === 'male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        }`}>
                          {student.gender === 'male' ? 'Nam' : 'Nữ'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {student.currentLevel && (
                          <span className="font-semibold text-slate-800 block">{student.currentLevel}</span>
                        )}
                        {student.entryTestResult && (
                          <span className="text-[11px] text-slate-700 block">
                            <span className="text-slate-400">Test đầu vào:</span>{' '}
                            <span className="font-semibold">{student.entryTestResult}</span>
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assignedClasses.length > 0 ? (
                            assignedClasses.map(c => (
                              <span
                                key={c.id}
                                className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200/60 rounded text-[10px] font-semibold"
                              >
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Chưa xếp lớp</span>
                          )}
                        </div>
                        {suitableClassLabel && (
                          <div className="mt-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                student.suitableClassId === WAITLIST_OPTION
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              Lớp phù hợp: {suitableClassLabel}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{student.parentName}</div>
                        <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{student.parentPhone}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            student.status === 'studying'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : student.status === 'reserved'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : student.status === 'graduated'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {student.status === 'studying' && 'Đang học'}
                          {student.status === 'reserved' && 'Bảo lưu'}
                          {student.status === 'graduated' && 'Đã tốt nghiệp'}
                          {student.status === 'dropped' && 'Nghỉ học'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingStudent(student)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Xem hồ sơ chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isTeacher && (
                            <>
                              <button
                                onClick={() => openTransferModal(student)}
                                className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Chuyển lớp"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => openEditModal(student)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Sửa thông tin"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {currentUser.role === 'admin' && (
                                <button
                                  onClick={() => handleDelete(student.id, student.fullName)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Xóa học sinh"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT PROFILE MODAL / DRAWER */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setViewingStudent(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl z-10 border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white font-black text-lg flex items-center justify-center shadow-md">
                  {viewingStudent.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {viewingStudent.fullName}
                    </h3>
                    <span className="font-mono text-xs text-red-600 font-bold px-2 py-0.5 rounded bg-red-50 border border-red-200">
                      {viewingStudent.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[viewingStudent.vietnameseName, viewingStudent.currentLevel, viewingStudent.grade]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-5 bg-white text-xs font-semibold text-slate-600 gap-6">
              <button
                onClick={() => setProfileTab('info')}
                className={`py-3 border-b-2 transition-colors ${
                  profileTab === 'info' ? 'border-red-600 text-red-600 font-bold' : 'border-transparent hover:text-slate-900'
                }`}
              >
                Thông tin cá nhân & Phụ huynh
              </button>
              <button
                onClick={() => setProfileTab('classes')}
                className={`py-3 border-b-2 transition-colors ${
                  profileTab === 'classes' ? 'border-red-600 text-red-600 font-bold' : 'border-transparent hover:text-slate-900'
                }`}
              >
                Lớp học ({viewingStudent.classIds.length})
              </button>
              <button
                onClick={() => setProfileTab('attendance')}
                className={`py-3 border-b-2 transition-colors ${
                  profileTab === 'attendance' ? 'border-red-600 text-red-600 font-bold' : 'border-transparent hover:text-slate-900'
                }`}
              >
                Lịch sử điểm danh
              </button>
              <button
                onClick={() => setProfileTab('scores')}
                className={`py-3 border-b-2 transition-colors ${
                  profileTab === 'scores' ? 'border-red-600 text-red-600 font-bold' : 'border-transparent hover:text-slate-900'
                }`}
              >
                Kết quả đánh giá
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {profileTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                    <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-red-600" /> Thông tin học viên
                    </h4>
                    <div><span className="text-slate-400">Ngày sinh:</span> <span className="font-semibold text-slate-700">{viewingStudent.dob}</span></div>
                    <div><span className="text-slate-400">Giới tính:</span> <span className="font-semibold text-slate-700">{viewingStudent.gender === 'male' ? 'Nam' : 'Nữ'}</span></div>
                    <div><span className="text-slate-400">Trường đang học:</span> <span className="font-semibold text-slate-700">{viewingStudent.school || 'Chưa cập nhật'}</span></div>
                    <div><span className="text-slate-400">Khối lớp:</span> <span className="font-semibold text-slate-700">{viewingStudent.grade}</span></div>
                    <div><span className="text-slate-400">Ngày nhập học:</span> <span className="font-semibold text-slate-700">{viewingStudent.enrollmentDate}</span></div>
                    <div><span className="text-slate-400">Kết quả test đầu vào:</span> <span className="font-semibold text-slate-700">{viewingStudent.entryTestResult || 'Chưa cập nhật'}</span></div>
                    <div><span className="text-slate-400">Lớp phù hợp:</span> <span className="font-semibold text-slate-700">{resolveSuitableClassLabel(viewingStudent.suitableClassId) || 'Chưa cập nhật'}</span></div>
                    <div><span className="text-slate-400">Trạng thái học:</span> <span className="font-semibold text-emerald-700">{viewingStudent.status}</span></div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                    <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-blue-600" /> Thông tin phụ huynh
                    </h4>
                    <div><span className="text-slate-400">Họ tên phụ huynh:</span> <span className="font-semibold text-slate-700">{viewingStudent.parentName}</span></div>
                    <div><span className="text-slate-400">Số điện thoại:</span> <span className="font-semibold text-slate-700">{viewingStudent.parentPhone}</span></div>
                    <div><span className="text-slate-400">Email:</span> <span className="font-semibold text-slate-700">{viewingStudent.parentEmail || 'Chưa có email'}</span></div>
                    <div><span className="text-slate-400">Địa chỉ liên hệ:</span> <span className="font-semibold text-slate-700">{viewingStudent.address}</span></div>
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-400 block mb-1">Ghi chú học tập / Tính cách:</span>
                      <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 italic">
                        {viewingStudent.notes || 'Không có ghi chú đặc biệt.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {profileTab === 'classes' && (
                <div className="space-y-3">
                  {viewingStudent.classIds.map(cid => {
                    const cls = data.classes.find(c => c.id === cid);
                    const teacher = data.teachers.find(t => t.id === cls?.teacherId);
                    if (!cls) return null;
                    return (
                      <div key={cls.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{cls.name}</div>
                          <div className="text-slate-500 mt-1">
                            Lịch học: <span className="font-semibold text-slate-700">{cls.scheduleDays} ({cls.scheduleTime})</span>
                          </div>
                          <div className="text-slate-500">
                            Phòng: {cls.classroom} • Giáo viên: {teacher?.fullName}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          {cls.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {profileTab === 'attendance' && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-800 mb-2">Nhật ký điểm danh gần nhất:</div>
                  {data.attendance.filter(att => att.records.some(r => r.studentId === viewingStudent.id)).length === 0 ? (
                    <p className="text-slate-400 italic">Chưa có bản ghi điểm danh nào cho học sinh này.</p>
                  ) : (
                    data.attendance.map(att => {
                      const entry = att.records.find(r => r.studentId === viewingStudent.id);
                      if (!entry) return null;
                      return (
                        <div key={att.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800">{att.className}</span>
                            <span className="text-slate-400 ml-2">• Ngày: {att.date} ({att.sessionTime})</span>
                            {entry.note && <p className="text-[11px] text-amber-700 mt-0.5">Ghi chú: {entry.note}</p>}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            entry.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                            entry.status === 'late' ? 'bg-amber-100 text-amber-800' :
                            entry.status === 'excused' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {entry.status === 'present' ? 'Có mặt' : entry.status === 'late' ? 'Đi muộn' : entry.status === 'excused' ? 'Có phép' : 'Vắng'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {profileTab === 'scores' && (
                <div className="space-y-3">
                  {data.assessments.filter(asm => asm.scores.some(s => s.studentId === viewingStudent.id)).length === 0 ? (
                    <p className="text-slate-400 italic">Chưa có kết quả thi hoặc đánh giá nào.</p>
                  ) : (
                    data.assessments.map(asm => {
                      const scoreItem = asm.scores.find(s => s.studentId === viewingStudent.id);
                      if (!scoreItem) return null;
                      return (
                        <div key={asm.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{asm.title}</span>
                            <span className="text-slate-500">{asm.date}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-2 text-center pt-2">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-400 block">Listening</span>
                              <span className="font-bold text-sm text-slate-800">{scoreItem.listening}</span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-400 block">Speaking</span>
                              <span className="font-bold text-sm text-slate-800">{scoreItem.speaking}</span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-400 block">Reading</span>
                              <span className="font-bold text-sm text-slate-800">{scoreItem.reading}</span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-400 block">Writing</span>
                              <span className="font-bold text-sm text-slate-800">{scoreItem.writing}</span>
                            </div>
                            <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                              <span className="text-[10px] text-red-600 block font-bold">Tổng điểm</span>
                              <span className="font-black text-sm text-red-700">{scoreItem.totalScore}</span>
                            </div>
                          </div>
                          {scoreItem.teacherFeedback && (
                            <div className="pt-2 text-[11px] text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200">
                              <span className="font-semibold not-italic text-slate-800">Nhận xét:</span> {scoreItem.teacherFeedback}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl z-10 border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingStudent ? `Chỉnh sửa thông tin: ${editingStudent.fullName}` : 'Tiếp nhận học sinh mới'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Họ và tên học sinh <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="VD: Nguyễn Bảo Nam"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tên tiếng Anh (Nick Name)
                  </label>
                  <input
                    type="text"
                    value={formData.vietnameseName}
                    onChange={e => setFormData({ ...formData, vietnameseName: e.target.value })}
                    placeholder="VD: Leo / Amy"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Giới tính</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trường phổ thông</label>
                  <input
                    type="text"
                    value={formData.school}
                    onChange={e => setFormData({ ...formData, school: e.target.value })}
                    placeholder="VD: Tiểu học Đoàn Thị Điểm"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Khối lớp</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={e => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="VD: Lớp 3"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kết quả test đầu vào</label>
                  <input
                    type="text"
                    value={formData.entryTestResult ?? ''}
                    onChange={e => setFormData({ ...formData, entryTestResult: e.target.value })}
                    placeholder="Nhập kết quả test đầu vào..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lớp phù hợp</label>
                  <select
                    value={formData.suitableClassId ?? ''}
                    onChange={e => setFormData({ ...formData, suitableClassId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Chọn lớp phù hợp --</option>
                    {suitableClassOptions.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value={WAITLIST_OPTION}>{WAITLIST_OPTION}</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Trạng thái học</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="studying">Đang học</option>
                    <option value="reserved">Bảo lưu</option>
                    <option value="graduated">Đã tốt nghiệp</option>
                    <option value="dropped">Nghỉ học</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-xs mb-3">Thông tin liên hệ phụ huynh</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Họ tên phụ huynh <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.parentName}
                      onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="VD: Nguyễn Văn Tuấn"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Số điện thoại liên hệ <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.parentPhone}
                      onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                      placeholder="VD: 0983112244"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Email phụ huynh</label>
                    <input
                      type="email"
                      value={formData.parentEmail}
                      onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                      placeholder="VD: phuhuynh@gmail.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Địa chỉ cư trú</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="VD: Cầu Giấy, Hà Nội"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghi chú học viên</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú sở thích, khả năng tiếp thu hoặc điểm cần hỗ trợ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-950/20"
                >
                  {editingStudent ? 'Lưu thay đổi' : 'Thêm học sinh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER CLASS MODAL */}
      {transferringStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setTransferringStudent(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
              Chuyển Lớp Học Viên
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Học viên: <span className="font-bold text-slate-800">{transferringStudent.fullName}</span> ({transferringStudent.id})
            </p>

            <form onSubmit={handleConfirmTransfer} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lớp đang học hiện tại</label>
                <select
                  value={transferSourceClassId}
                  onChange={e => setTransferSourceClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {transferringStudent.classIds.map(cid => {
                    const c = data.classes.find(cls => cls.id === cid);
                    return <option key={cid} value={cid}>{c?.name || cid}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Chuyển sang lớp mới</label>
                <select
                  required
                  value={transferTargetClassId}
                  onChange={e => setTransferTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Chọn lớp học đích --</option>
                  {data.classes
                    .filter(c => !transferringStudent.classIds.includes(c.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.level} • {c.studentIds.length}/{c.maxCapacity} học viên)
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferringStudent(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
                >
                  Xác nhận chuyển lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
