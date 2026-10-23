import React, { useState, useEffect } from 'react';
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  Edit3, 
  FileText, 
  FolderPlus, 
  GraduationCap, 
  HelpCircle, 
  Layers, 
  Plus, 
  RefreshCw, 
  RotateCcw, 
  Search, 
  ShieldCheck, 
  Trash2, 
  Users, 
  X,
  AlertCircle
} from 'lucide-react';
import { Course, CourseModule, CourseLesson } from '../../types';
import { api } from '../../services/api';
import { store } from '../../services/store';

export const AcademyManager: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'modules' | 'questions' | 'enrollments'>('courses');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  // Course edit / modal state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Module & Lesson management
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  const [showLessonModal, setShowLessonModal] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState<number | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    contentType: 'text',
    content: '',
    mediaUrl: '',
    durationMinutes: 10
  });

  // Questions management
  const [questions, setQuestions] = useState<any[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    id: 0,
    questionText: '',
    questionType: 'single_choice',
    points: 1,
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' }
    ],
    correctAnswer: 'a',
    explanation: ''
  });

  // Enrollments & attempts
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [enrollmentSubView, setEnrollmentSubView] = useState<'enrollments' | 'attempts' | 'certificates'>('enrollments');

  // Load courses
  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetAcademyCourses({
        search: searchQuery,
        status: statusFilter
      });
      setCourses(data);
      if (data.length > 0 && selectedCourseId === null) {
        setSelectedCourseId(Number(data[0].id));
      }
    } catch (e) {
      console.error('Failed to load courses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [statusFilter]);

  // Load modules when selectedCourseId changes
  useEffect(() => {
    if (selectedCourseId) {
      loadCourseModules(selectedCourseId);
      loadQuestions(selectedCourseId);
    }
  }, [selectedCourseId]);

  // Load course modules
  const loadCourseModules = async (cId: number) => {
    try {
      const data = await api.adminGetCourseModules(cId);
      setModules(data || []);
    } catch (err) {
      console.error('Failed to load modules', err);
    }
  };

  // Load assessment questions
  const loadQuestions = async (cId: number) => {
    try {
      const data = await api.adminGetQuestions(cId);
      setQuestions(data || []);
    } catch (err) {
      console.error('Failed to load questions', err);
    }
  };

  // Load enrollments / attempts
  const loadEnrollmentsData = async () => {
    try {
      const data = await api.adminGetAcademyEnrollments({
        course_id: selectedCourseId || undefined,
        view: enrollmentSubView
      });
      if (enrollmentSubView === 'enrollments') setEnrollments(data.enrollments || []);
      if (enrollmentSubView === 'attempts') setAttempts(data.attempts || []);
      if (enrollmentSubView === 'certificates') setCertificates(data.certificates || []);
    } catch (e) {
      console.error('Failed to load enrollments data', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'enrollments') {
      loadEnrollmentsData();
    }
  }, [activeTab, enrollmentSubView, selectedCourseId]);

  // Handle Save Course
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse?.title || !editingCourse?.description) {
      setModalError('Title and description are required.');
      return;
    }
    setIsSavingCourse(true);
    setModalError(null);
    try {
      const res = await api.adminSaveCourse(editingCourse);
      if (res.success) {
        setShowCourseModal(false);
        setEditingCourse(null);
        await loadCourses();
      } else {
        setModalError(res.error || 'Failed to save course.');
      }
    } catch {
      setModalError('Failed to communicate with course manager.');
    } finally {
      setIsSavingCourse(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (courseId: number, newStatus: 'Draft' | 'Published' | 'Archived') => {
    await api.adminSetCourseStatus(courseId, newStatus);
    await loadCourses();
  };

  // Handle Create Module
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !newModuleTitle.trim()) return;
    const res = await api.adminCreateModule({
      course_id: selectedCourseId,
      title: newModuleTitle.trim(),
      description: newModuleDesc.trim()
    });
    if (res.success) {
      setNewModuleTitle('');
      setNewModuleDesc('');
      setShowModuleModal(false);
      await loadCourseModules(selectedCourseId);
    }
  };

  // Handle Create Lesson
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !targetModuleId || !lessonForm.title.trim() || !lessonForm.content.trim()) return;
    const res = await api.adminCreateLesson({
      course_id: selectedCourseId,
      module_id: targetModuleId,
      title: lessonForm.title.trim(),
      content_type: lessonForm.contentType,
      content: lessonForm.content.trim(),
      media_url: lessonForm.mediaUrl.trim(),
      duration_minutes: lessonForm.durationMinutes
    });
    if (res.success) {
      setShowLessonModal(false);
      setLessonForm({ title: '', contentType: 'text', content: '', mediaUrl: '', durationMinutes: 10 });
      await loadCourseModules(selectedCourseId);
    }
  };

  // Handle Delete Lesson
  const handleDeleteLesson = async (lessonId: number) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    await api.adminDeleteLesson(lessonId);
    if (selectedCourseId) await loadCourseModules(selectedCourseId);
  };

  // Handle Save Question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !questionForm.questionText.trim()) return;
    const validOptions = questionForm.options.filter(o => o.text.trim().length > 0);
    if (validOptions.length < 2) {
      alert('Please provide at least 2 valid options.');
      return;
    }

    const payload = {
      id: questionForm.id || undefined,
      course_id: selectedCourseId,
      assessment_id: 1, // linked assessment
      question_text: questionForm.questionText.trim(),
      question_type: questionForm.questionType,
      options: validOptions,
      correct_answers: [questionForm.correctAnswer],
      explanation: questionForm.explanation.trim(),
      points: questionForm.points
    };

    const res = await api.adminSaveQuestion(payload);
    if (res.success) {
      setShowQuestionModal(false);
      await loadQuestions(selectedCourseId);
    }
  };

  // Handle Delete Question
  const handleDeleteQuestion = async (qId: number) => {
    if (!confirm('Are you sure you want to delete this assessment question?')) return;
    await api.adminDeleteQuestion(qId);
    if (selectedCourseId) await loadQuestions(selectedCourseId);
  };

  // Reset student attempts
  const handleResetAttempts = async (flId: number) => {
    if (!selectedCourseId) return;
    if (!confirm('Reset failed attempts for this freelancer?')) return;
    const res = await api.adminResetAssessmentAttempts(flId, selectedCourseId);
    if (res.success) {
      await loadEnrollmentsData();
    }
  };

  const selectedCourse = courses.find(c => Number(c.id) === Number(selectedCourseId));

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#02167F] text-[#FFD014] rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Operational Academy & Curriculum Management
              </h2>
              <p className="text-xs text-slate-500">
                Authoritative course management, lesson SOPs, question bank, and digital certification governance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingCourse({
                title: '',
                courseCode: '',
                description: '',
                category: 'Field Operations',
                language: 'en',
                estimatedMinutes: 45,
                passingScore: 80,
                maxAssessmentAttempts: 3,
                isMandatory: false,
                status: 'Published'
              });
              setShowCourseModal(true);
            }}
            className="bg-[#02167F] hover:bg-[#0320b3] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Course</span>
          </button>
        </div>
      </div>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Courses</span>
          <span className="text-xl font-black text-slate-900">{courses.length}</span>
          <span className="text-[10px] text-emerald-600 block">Active in catalogue</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Lessons</span>
          <span className="text-xl font-black text-[#02167F]">
            {courses.reduce((acc, c) => acc + (c.lessonsCount || 0), 0)}
          </span>
          <span className="text-[10px] text-slate-500 block">Structured field SOPs</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Enrollments</span>
          <span className="text-xl font-black text-blue-600">
            {courses.reduce((acc, c) => acc + (c.enrollmentsCount || 0), 0)}
          </span>
          <span className="text-[10px] text-slate-500 block">Enrolled freelancers</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Certificates Issued</span>
          <span className="text-xl font-black text-purple-700">
            {courses.reduce((acc, c) => acc + (c.certificatesCount || 0), 0)}
          </span>
          <span className="text-[10px] text-purple-600 font-semibold block">Verifiable credentials</span>
        </div>
      </div>

      {/* Academy Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-2xl gap-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'courses', label: 'Course Catalogue', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'modules', label: 'Curriculum & Lessons', icon: <Layers className="w-4 h-4" /> },
          { id: 'questions', label: 'Assessment Questions', icon: <HelpCircle className="w-4 h-4" /> },
          { id: 'enrollments', label: 'Student Progress & Certs', icon: <Users className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#02167F] text-[#02167F]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: COURSE CATALOGUE */}
      {activeTab === 'courses' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase">Status:</span>
              {['All', 'Published', 'Draft', 'Archived'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    statusFilter === st ? 'bg-[#02167F] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#02167F] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Courses Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Course Code & Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Curriculum</th>
                  <th className="p-3">Passing Req</th>
                  <th className="p-3">Students</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[10px] text-slate-400 block">{c.courseCode}</span>
                        <span className="font-bold text-slate-900 block">{c.title}</span>
                        {c.isMandatory && (
                          <span className="text-[9px] bg-[#FFD014] text-[#02167F] px-1.5 py-0.2 rounded font-black uppercase">
                            Mandatory Foundation
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{c.category}</td>
                    <td className="p-3 text-slate-600">
                      {c.modulesCount || 0} Modules · {c.lessonsCount || 0} Lessons ({c.estimatedMinutes}m)
                    </td>
                    <td className="p-3 text-slate-600">
                      Score: <strong className="text-slate-900">{c.passingScore}%</strong> (Max {c.maxAssessmentAttempts} attempts)
                    </td>
                    <td className="p-3">
                      <div className="text-[11px]">
                        <span className="font-bold text-blue-700">{c.enrollmentsCount || 0} enrolled</span>
                        <span className="text-slate-400 block">{c.certificatesCount || 0} certified</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        c.status === 'Published' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : c.status === 'Draft' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedCourseId(Number(c.id));
                            setActiveTab('modules');
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                          title="Manage Lessons"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCourse(c);
                            setShowCourseModal(true);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                          title="Edit Course Metadata"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {c.status === 'Published' ? (
                          <button
                            onClick={() => handleToggleStatus(Number(c.id), 'Draft')}
                            className="text-[10px] px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded font-bold"
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(Number(c.id), 'Published')}
                            className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded font-bold"
                          >
                            Publish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CURRICULUM & LESSONS */}
      {activeTab === 'modules' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 p-6 space-y-6">
          {/* Course Selector Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Selected Course:</span>
              <select
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-hidden"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowModuleModal(true)}
              className="bg-[#02167F] hover:bg-[#0320b3] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Add Module</span>
            </button>
          </div>

          {/* Modules List */}
          <div className="space-y-4">
            {modules.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No modules found for this course. Click "Add Module" to start structuring lessons.
              </div>
            ) : (
              modules.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{m.title}</h4>
                      {m.description && <p className="text-[11px] text-slate-500">{m.description}</p>}
                    </div>

                    <button
                      onClick={() => {
                        setTargetModuleId(Number(m.id));
                        setShowLessonModal(true);
                      }}
                      className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Lesson</span>
                    </button>
                  </div>

                  {/* Lessons list in module */}
                  <div className="space-y-2">
                    {m.lessons.map((les) => (
                      <div
                        key={les.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-400 text-[10px]">{les.sortOrder}</span>
                          <div>
                            <span className="font-bold text-slate-900 block">{les.title}</span>
                            <span className="text-[10px] text-slate-400">
                              {les.durationMinutes} mins · {les.contentType} {les.mediaUrl ? '· With Media' : ''}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteLesson(Number(les.id))}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Delete Lesson"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: QUESTIONS BANK */}
      {activeTab === 'questions' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Selected Course Assessment:</span>
              <select
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-hidden"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setQuestionForm({
                  id: 0,
                  questionText: '',
                  questionType: 'single_choice',
                  points: 1,
                  options: [
                    { id: 'a', text: '' },
                    { id: 'b', text: '' },
                    { id: 'c', text: '' },
                    { id: 'd', text: '' }
                  ],
                  correctAnswer: 'a',
                  explanation: ''
                });
                setShowQuestionModal(true);
              }}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No questions configured for this course. Click "Add Question" to build the certification exam.
              </div>
            ) : (
              questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-bold text-slate-900">{q.questionText}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDeleteQuestion(Number(q.id))}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7 text-[11px]">
                    {q.options?.map((opt: any) => {
                      const isCorrect = q.correctAnswers?.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          className={`p-2 rounded border ${
                            isCorrect 
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' 
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="uppercase text-[9px] mr-1.5 font-mono font-bold">[{opt.id}]</span>
                          <span>{opt.text}</span>
                          {isCorrect && <span className="ml-1 text-[10px] text-emerald-700">✓ Correct</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <p className="text-[10px] text-slate-500 pl-7 italic">Explanation: {q.explanation}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ENROLLMENTS & CERTS */}
      {activeTab === 'enrollments' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {[
                { id: 'enrollments', label: 'All Enrollments' },
                { id: 'attempts', label: 'Assessment Attempts' },
                { id: 'certificates', label: 'Issued Certificates' }
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setEnrollmentSubView(sub.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    enrollmentSubView === sub.id 
                      ? 'bg-[#02167F] text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subview Table */}
          {enrollmentSubView === 'enrollments' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Freelancer</th>
                    <th className="p-3">Course</th>
                    <th className="p-3">Progress</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Certificate</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {enrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{enr.freelancerName}</span>
                        <span className="text-[10px] text-slate-400">{enr.freelancerPhone} · {enr.freelancerCity}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] text-slate-400 block">{enr.courseCode}</span>
                        <span className="text-slate-700">{enr.courseTitle}</span>
                      </td>
                      <td className="p-3">
                        <div className="w-24 space-y-1">
                          <span className="text-[10px] font-bold text-slate-800">{enr.progressPercent}%</span>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#02167F]" style={{ width: `${enr.progressPercent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          enr.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {enr.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {enr.certificateRef ? (
                          <span className="font-mono text-emerald-700 text-[10px] font-bold block">
                            {enr.certificateRef} ({enr.certifiedScore}%)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleResetAttempts(enr.freelancerId)}
                          className="text-[10px] text-slate-600 hover:text-amber-800 underline font-semibold"
                        >
                          Reset Exam Attempts
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {enrollmentSubView === 'attempts' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Freelancer</th>
                    <th className="p-3">Course</th>
                    <th className="p-3">Attempt #</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Result</th>
                    <th className="p-3">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {attempts.map((att) => (
                    <tr key={att.id}>
                      <td className="p-3 font-bold text-slate-900">{att.freelancerName}</td>
                      <td className="p-3 text-slate-700">{att.courseTitle}</td>
                      <td className="p-3 text-slate-600">Attempt {att.attemptNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{att.scorePercent}%</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          att.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {att.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">{att.submittedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {enrollmentSubView === 'certificates' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Certificate Ref</th>
                    <th className="p-3">Associate</th>
                    <th className="p-3">Course</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Verification Code</th>
                    <th className="p-3">Issue Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {certificates.map((cert) => (
                    <tr key={cert.id}>
                      <td className="p-3 font-mono font-bold text-emerald-800">{cert.certificateRef}</td>
                      <td className="p-3 font-bold text-slate-900">{cert.freelancerName}</td>
                      <td className="p-3 text-slate-700">{cert.courseTitle}</td>
                      <td className="p-3 font-bold text-slate-900">{cert.scorePercent}%</td>
                      <td className="p-3 font-mono text-[#02167F] font-bold">{cert.verificationCode}</td>
                      <td className="p-3 text-slate-500 text-[11px]">{cert.issueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT COURSE MODAL */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-extrabold text-slate-900">
                {editingCourse?.id ? 'Edit Course' : 'Create New Academy Course'}
              </h3>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-800 text-xs">{modalError}</div>
            )}

            <form onSubmit={handleSaveCourse} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={editingCourse?.title || ''}
                  onChange={(e) => setEditingCourse((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Field Ethics & Safety Protocols"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Course Code (Optional)</label>
                <input
                  type="text"
                  value={editingCourse?.courseCode || ''}
                  onChange={(e) => setEditingCourse((prev) => ({ ...prev, courseCode: e.target.value }))}
                  placeholder="e.g. WO-CRS-SAFE-01"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={editingCourse?.category || 'Field Operations'}
                    onChange={(e) => setEditingCourse((prev) => ({ ...prev, category: e.target.value as any }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Field Operations">Field Operations</option>
                    <option value="Safety & Ethics">Safety & Ethics</option>
                    <option value="Merchant Acquisition">Merchant Acquisition</option>
                    <option value="KYC & Verification">KYC & Verification</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Language</label>
                  <select
                    value={editingCourse?.language || 'en'}
                    onChange={(e) => setEditingCourse((prev) => ({ ...prev, language: e.target.value }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="en">English (en)</option>
                    <option value="hi">Hindi (hi)</option>
                    <option value="kn">Kannada (kn)</option>
                    <option value="te">Telugu (te)</option>
                    <option value="ta">Tamil (ta)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={editingCourse?.description || ''}
                  onChange={(e) => setEditingCourse((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the operational curriculum and skills gained..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Passing Score (%)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={editingCourse?.passingScore || 80}
                    onChange={(e) => setEditingCourse((prev) => ({ ...prev, passingScore: Number(e.target.value) }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Attempts</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editingCourse?.maxAssessmentAttempts || 3}
                    onChange={(e) => setEditingCourse((prev) => ({ ...prev, maxAssessmentAttempts: Number(e.target.value) }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_mandatory_check"
                  checked={Boolean(editingCourse?.isMandatory)}
                  onChange={(e) => setEditingCourse((prev) => ({ ...prev, isMandatory: e.target.checked }))}
                  className="rounded text-[#02167F]"
                />
                <label htmlFor="is_mandatory_check" className="font-bold text-slate-700 text-xs">
                  Mandatory Foundation (Required before high-value project dispatch)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCourse}
                  className="px-5 py-2 bg-[#02167F] hover:bg-[#0320b3] text-white rounded-xl text-xs font-bold"
                >
                  {isSavingCourse ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODULE MODAL */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-extrabold text-slate-900">Add Curriculum Module</h3>
              <button onClick={() => setShowModuleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateModule} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Module Title *</label>
                <input
                  type="text"
                  required
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Module 1: Merchant Verification & Eligibility"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  placeholder="Summary of modules and topics..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#02167F] hover:bg-[#0320b3] text-white rounded-xl text-xs font-bold"
                >
                  Create Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE LESSON MODAL */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-extrabold text-slate-900">Add Lesson to Module</h3>
              <button onClick={() => setShowLessonModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Lesson Title *</label>
                <input
                  type="text"
                  required
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. 1.1 Physical Storefront Verification"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Content Type</label>
                  <select
                    value={lessonForm.contentType}
                    onChange={(e) => setLessonForm((prev) => ({ ...prev, contentType: e.target.value }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="text">Structured Text SOP</option>
                    <option value="video_ref">Video / Media Reference</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={lessonForm.durationMinutes}
                    onChange={(e) => setLessonForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lesson Content (Markdown / Text) *</label>
                <textarea
                  required
                  rows={5}
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Write step-by-step procedures, safety guidelines, and SOP steps..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">External Reference URL (Optional)</label>
                <input
                  type="url"
                  value={lessonForm.mediaUrl}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, mediaUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLessonModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#02167F] hover:bg-[#0320b3] text-white rounded-xl text-xs font-bold"
                >
                  Create Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT QUESTION MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-extrabold text-slate-900">Add Assessment Question</h3>
              <button onClick={() => setShowQuestionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Question Text *</label>
                <textarea
                  required
                  rows={2}
                  value={questionForm.questionText}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, questionText: e.target.value }))}
                  placeholder="e.g. Is an associate allowed to accept informal cash tips from merchants?"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">Options & Correct Answer Choice *</label>
                {questionForm.options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct_answer_radio"
                      checked={questionForm.correctAnswer === opt.id}
                      onChange={() => setQuestionForm((prev) => ({ ...prev, correctAnswer: opt.id }))}
                      title="Select as correct answer"
                      className="text-purple-700 focus:ring-purple-700"
                    />
                    <span className="font-mono text-slate-400 uppercase font-bold w-4">[{opt.id}]</span>
                    <input
                      type="text"
                      required={idx < 2}
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...questionForm.options];
                        newOpts[idx].text = e.target.value;
                        setQuestionForm((prev) => ({ ...prev, options: newOpts }));
                      }}
                      placeholder={`Option ${opt.id.toUpperCase()}`}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Explanation (Provided after grading)</label>
                <textarea
                  rows={2}
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))}
                  placeholder="Explain why the selected answer is correct..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
