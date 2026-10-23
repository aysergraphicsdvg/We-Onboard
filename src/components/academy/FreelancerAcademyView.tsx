import React, { useState, useEffect } from 'react';
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  FileText, 
  GraduationCap, 
  HelpCircle, 
  Play, 
  RotateCcw, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  X,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { Course, CourseLesson, FreelancerCertificate } from '../../types';
import { api } from '../../services/api';

interface FreelancerAcademyViewProps {
  freelancerId?: string;
  onCertificateEarned?: (cert: FreelancerCertificate) => void;
}

export const FreelancerAcademyView: React.FC<FreelancerAcademyViewProps> = ({
  onCertificateEarned
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates' | 'verifier'>('courses');
  
  // Active course viewing state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);

  // Assessment taking state
  const [takingAssessment, setTakingAssessment] = useState(false);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string | number, string>>({});
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  // Certificates list
  const [certificates, setCertificates] = useState<FreelancerCertificate[]>([]);
  const [viewingCertificate, setViewingCertificate] = useState<FreelancerCertificate | null>(null);

  // Public verifier state
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Load courses & certificates
  const loadAcademyData = async () => {
    setLoading(true);
    try {
      const [crsList, certList] = await Promise.all([
        api.getAcademyCourses(),
        api.getFreelancerCertificates()
      ]);
      setCourses(crsList);
      setCertificates(certList);
    } catch (e) {
      console.error('Failed to load academy courses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcademyData();
  }, []);

  // Open a course for learning
  const handleOpenCourse = async (courseId: string | number) => {
    try {
      const fullCourse = await api.getAcademyCourseDetail(courseId);
      if (fullCourse) {
        setSelectedCourse(fullCourse);
        setAssessmentResult(null);
        setTakingAssessment(false);

        // Find initial lesson to show: resume lesson or first lesson
        let startLesson: CourseLesson | null = null;
        if (fullCourse.resumeLessonId) {
          for (const m of fullCourse.modules || []) {
            const found = m.lessons.find((l) => Number(l.id) === Number(fullCourse.resumeLessonId));
            if (found) {
              startLesson = found;
              break;
            }
          }
        }
        if (!startLesson && fullCourse.modules && fullCourse.modules.length > 0 && fullCourse.modules[0].lessons.length > 0) {
          startLesson = fullCourse.modules[0].lessons[0];
        }
        setActiveLesson(startLesson);
      }
    } catch (err) {
      console.error('Failed to load course details', err);
    }
  };

  // Enroll in course
  const handleEnroll = async (courseId: number) => {
    const res = await api.enrollCourse(courseId);
    if (res.success) {
      await loadAcademyData();
      await handleOpenCourse(courseId);
    }
  };

  // Complete active lesson
  const handleCompleteActiveLesson = async () => {
    if (!selectedCourse || !activeLesson) return;
    setIsSubmittingLesson(true);
    try {
      const res = await api.completeLesson(Number(selectedCourse.id), Number(activeLesson.id));
      if (res.success) {
        // Update local selected course completed lessons
        activeLesson.isCompleted = true;
        if (selectedCourse.enrollment) {
          selectedCourse.enrollment.progressPercent = res.progressPercent;
          selectedCourse.enrollment.completedLessons = res.completedLessonIds;
        }

        // Advance to next lesson if available
        let foundCurrent = false;
        let nextLesson: CourseLesson | null = null;
        for (const m of selectedCourse.modules || []) {
          for (const l of m.lessons) {
            if (foundCurrent) {
              nextLesson = l;
              break;
            }
            if (Number(l.id) === Number(activeLesson.id)) {
              foundCurrent = true;
            }
          }
          if (nextLesson) break;
        }

        if (nextLesson) {
          setActiveLesson(nextLesson);
        } else if (res.isReadyForAssessment) {
          // Reached end of lessons, prompt for exam
          handleStartAssessment(Number(selectedCourse.id));
        }
      }
    } catch (err) {
      console.error('Failed to complete lesson', err);
    } finally {
      setIsSubmittingLesson(false);
    }
  };

  // Start assessment
  const handleStartAssessment = async (courseId: number) => {
    setExamError(null);
    setAssessmentResult(null);
    setSelectedAnswers({});
    try {
      const data = await api.takeAssessment(courseId);
      if (data.success && data.status === 'READY') {
        setAssessmentData(data.assessment);
        setTakingAssessment(true);
      } else if (data.status === 'ALREADY_PASSED') {
        setExamError(data.message || 'You have already passed this assessment.');
        if (data.certificate) {
          setViewingCertificate(data.certificate);
        }
      } else {
        setExamError(data.error || 'Unable to start assessment.');
      }
    } catch {
      setExamError('Network error starting assessment.');
    }
  };

  // Submit assessment answers
  const handleSubmitExam = async () => {
    if (!selectedCourse || !assessmentData) return;
    setIsSubmittingExam(true);
    setExamError(null);
    try {
      const res = await api.submitAssessment(
        Number(selectedCourse.id),
        Number(assessmentData.id),
        selectedAnswers
      );
      if (res.success) {
        setAssessmentResult(res);
        if (res.passed && res.certificate) {
          setCertificates((prev) => [res.certificate, ...prev]);
          if (onCertificateEarned) onCertificateEarned(res.certificate);
        }
        await loadAcademyData();
      } else {
        setExamError(res.error || 'Failed to submit assessment.');
      }
    } catch {
      setExamError('Failed to communicate with assessment engine.');
    } finally {
      setIsSubmittingExam(false);
    }
  };

  // Public verifier
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.verifyCertificatePublic(verifyInput.trim());
      setVerifyResult(res);
    } catch {
      setVerifyResult({ success: false, verified: false, error: 'Verification service error' });
    } finally {
      setIsVerifying(false);
    }
  };

  // Filter courses
  const filteredCourses = courses.filter((c) => {
    const matchesCat = categoryFilter === 'All' || c.category === categoryFilter;
    const matchesSearch = !searchQuery || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. ACADEMY HEADER */}
      <div className="bg-[#02167F] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-white/10">
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#FFD014]/20 border border-[#FFD014]/40 px-3 py-1 rounded-full text-[#FFD014] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>We Onboard Operational Academy & Certification</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Operational Knowledge & Field Certifications
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Complete accredited, self-paced operational SOPs, master physical safety protocols, and pass verifiable assessments. 
            Earning official certificates unlocks high-volume field dispatches and team leadership promotions.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={() => { setActiveTab('courses'); setSelectedCourse(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'courses' ? 'bg-[#FFD014] text-[#02167F] shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Course Catalogue ({courses.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('certificates'); setSelectedCourse(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'certificates' ? 'bg-[#FFD014] text-[#02167F] shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>My Certificates ({certificates.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('verifier'); setSelectedCourse(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'verifier' ? 'bg-[#FFD014] text-[#02167F] shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Certificate</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TAB CONTENT */}
      {activeTab === 'courses' && (
        <>
          {/* COURSE VIEWER / LESSON MODE */}
          {selectedCourse ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Top Navigation Bar */}
              <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors text-xs font-bold flex items-center gap-1"
                  >
                    <span>&larr; Catalogue</span>
                  </button>
                  <div>
                    <span className="text-[10px] text-[#FFD014] font-bold uppercase tracking-wider block">
                      {selectedCourse.courseCode} · {selectedCourse.category}
                    </span>
                    <h3 className="text-sm font-extrabold text-white truncate max-w-md">
                      {selectedCourse.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-400 block">Overall Progress</span>
                    <span className="text-xs font-extrabold text-[#FFD014]">
                      {selectedCourse.enrollment?.progressPercent || 0}% Completed
                    </span>
                  </div>
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#FFD014] transition-all"
                      style={{ width: `${selectedCourse.enrollment?.progressPercent || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Course Detail Split Screen */}
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
                {/* Left Sidebar: Curriculum Tree */}
                <div className="lg:col-span-4 bg-slate-50 border-r border-slate-200 p-4 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Curriculum Outline</h4>
                    <p className="text-[11px] text-slate-500">
                      {selectedCourse.modulesCount || 0} Modules · {selectedCourse.lessonsCount || 0} Lessons
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedCourse.modules?.map((m) => (
                      <div key={m.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="p-3 bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-800">
                          {m.title}
                        </div>
                        <div className="divide-y divide-slate-100">
                          {m.lessons.map((lesson) => {
                            const isCurrent = activeLesson?.id === lesson.id && !takingAssessment;
                            const isDone = Boolean(lesson.isCompleted || selectedCourse.enrollment?.completedLessons?.includes(Number(lesson.id)));
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => {
                                  setActiveLesson(lesson);
                                  setTakingAssessment(false);
                                  setAssessmentResult(null);
                                }}
                                className={`w-full text-left p-3 text-xs flex items-center justify-between gap-2 transition-colors ${
                                  isCurrent ? 'bg-blue-50 text-[#02167F] font-bold border-l-4 border-[#02167F]' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 shrink-0">
                                      {lesson.sortOrder}
                                    </div>
                                  )}
                                  <span className="truncate">{lesson.title}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  {lesson.durationMinutes}m
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Final Assessment Trigger Card */}
                    {selectedCourse.assessment && (
                      <div className={`p-4 rounded-xl border transition-all ${
                        takingAssessment 
                          ? 'bg-purple-50 border-purple-300 text-purple-900 ring-2 ring-purple-500/20' 
                          : 'bg-white border-purple-200 hover:border-purple-300'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                              <Award className="w-4 h-4 text-purple-600" />
                              <span>Certification Exam</span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              Passing Score: {selectedCourse.assessment.passingScore}% · {selectedCourse.assessment.questionsCount || 5} Questions
                            </p>
                          </div>
                          {selectedCourse.certificate && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              Passed
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleStartAssessment(Number(selectedCourse.id))}
                          className="w-full mt-3 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{selectedCourse.certificate ? 'Review Assessment' : 'Take Certification Exam'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Area: Lesson Content OR Exam Room */}
                <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between">
                  {takingAssessment ? (
                    /* ASSESSMENT ENGINE */
                    <div className="space-y-6">
                      <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">
                            Final Certification Exam
                          </span>
                          <h3 className="text-lg font-extrabold text-slate-900">
                            {assessmentData?.title}
                          </h3>
                        </div>
                        <div className="text-right text-xs">
                          <span className="text-slate-500 block">Passing Target</span>
                          <span className="font-extrabold text-purple-700">{assessmentData?.passingScore}%</span>
                        </div>
                      </div>

                      {examError && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                          {examError}
                        </div>
                      )}

                      {assessmentResult ? (
                        /* EXAM RESULTS DISPLAY */
                        <div className={`p-6 rounded-2xl border space-y-4 text-center ${
                          assessmentResult.passed 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                            : 'bg-amber-50 border-amber-200 text-amber-950'
                        }`}>
                          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                            assessmentResult.passed ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {assessmentResult.passed ? <Award className="w-8 h-8" /> : <RotateCcw className="w-8 h-8" />}
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-xl font-black">
                              {assessmentResult.passed ? 'Assessment Passed! Certificate Issued' : 'Assessment Threshold Not Met'}
                            </h4>
                            <p className="text-xs text-slate-600">
                              You achieved <strong>{assessmentResult.scorePercent}%</strong>. Required passing score: {assessmentResult.passingScore}%.
                            </p>
                          </div>

                          {assessmentResult.passed && assessmentResult.certificate && (
                            <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-xs max-w-md mx-auto text-left space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900">Certificate Reference:</span>
                                <span className="font-mono text-emerald-700 font-bold">{assessmentResult.certificate.certificateRef}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900">Verification Code:</span>
                                <span className="font-mono text-slate-700 font-bold">{assessmentResult.certificate.verificationCode}</span>
                              </div>
                              <button
                                onClick={() => setViewingCertificate(assessmentResult.certificate)}
                                className="w-full mt-2 bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>View Official Certificate</span>
                              </button>
                            </div>
                          )}

                          {!assessmentResult.passed && (
                            <div className="space-y-3 pt-2">
                              <p className="text-xs text-amber-800">
                                Attempts remaining: {assessmentResult.attemptsRemaining}. Please review the course lessons and try again.
                              </p>
                              <button
                                onClick={() => handleStartAssessment(Number(selectedCourse.id))}
                                className="bg-amber-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors"
                              >
                                Retake Assessment
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* EXAM QUESTIONS FORM */
                        <div className="space-y-6">
                          <div className="space-y-6">
                            {assessmentData?.questions?.map((q: any, idx: number) => (
                              <div key={q.id} className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                                <div className="flex items-start gap-2">
                                  <span className="w-6 h-6 rounded-full bg-[#02167F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                                    {idx + 1}
                                  </span>
                                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                                    {q.questionText}
                                  </p>
                                </div>

                                <div className="space-y-2 pl-8">
                                  {q.options.map((opt: any) => {
                                    const isSelected = selectedAnswers[q.id] === opt.id;
                                    return (
                                      <label
                                        key={opt.id}
                                        onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                                        className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                                          isSelected 
                                            ? 'bg-blue-50 border-[#02167F] text-[#02167F] font-semibold' 
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`question_${q.id}`}
                                          checked={isSelected}
                                          onChange={() => {}}
                                          className="text-[#02167F] focus:ring-[#02167F]"
                                        />
                                        <span>{opt.text}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              Answered {Object.keys(selectedAnswers).length} of {assessmentData?.questions?.length || 0} questions
                            </span>
                            <button
                              onClick={handleSubmitExam}
                              disabled={isSubmittingExam || Object.keys(selectedAnswers).length === 0}
                              className="bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                            >
                              {isSubmittingExam ? 'Grading Answers...' : 'Submit Assessment for Verification'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : activeLesson ? (
                    /* LESSON READER */
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            Lesson {activeLesson.sortOrder}
                          </span>
                          <h3 className="text-xl font-black text-slate-900">
                            {activeLesson.title}
                          </h3>
                        </div>

                        {/* Lesson Content Body */}
                        <div className="prose prose-sm max-w-none text-slate-700 text-xs sm:text-sm leading-relaxed space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-100 whitespace-pre-wrap font-sans">
                          {activeLesson.content}
                        </div>

                        {activeLesson.mediaUrl && (
                          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Play className="w-4 h-4 text-blue-700" />
                              <span>Reference Media Available</span>
                            </div>
                            <a 
                              href={activeLesson.mediaUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs font-bold text-blue-800 underline hover:text-blue-950 flex items-center gap-1"
                            >
                              <span>Open Reference</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Bottom Lesson Footer */}
                      <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {activeLesson.isCompleted ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Lesson marked as completed
                            </span>
                          ) : (
                            'Read and absorb SOP guidelines thoroughly before advancing.'
                          )}
                        </span>

                        <button
                          onClick={handleCompleteActiveLesson}
                          disabled={isSubmittingLesson}
                          className="bg-[#02167F] hover:bg-[#0320b3] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <span>{isSubmittingLesson ? 'Recording Progress...' : 'Mark as Completed & Continue'}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-slate-400 space-y-2">
                      <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold">Select a lesson from the outline to begin reading.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* COURSE CATALOGUE VIEW */
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {['All', 'Safety & Ethics', 'Merchant Acquisition', 'Field Operations'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        categoryFilter === cat ? 'bg-[#02167F] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses or SOP codes..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#02167F] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Course Cards Grid */}
              {loading ? (
                <div className="text-center py-16 text-xs text-slate-400">Loading Academy Curriculum...</div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                  No courses matching current filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCourses.map((c) => {
                    const isEnrolled = Boolean(c.enrollment);
                    const progress = c.enrollment?.progressPercent || 0;
                    const isCert = Boolean(c.certificate);

                    return (
                      <div
                        key={c.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                      >
                        {c.isMandatory && (
                          <div className="absolute top-0 right-0 bg-[#FFD014] text-[#02167F] text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
                            Mandatory Foundation
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-slate-400">{c.courseCode}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                                {c.category}
                              </span>
                            </div>
                            <h4 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
                              {c.title}
                            </h4>
                          </div>

                          <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">
                            {c.description}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {c.estimatedMinutes} mins
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {c.lessonsCount || 0} Lessons
                            </span>
                            <span className="flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              {c.passingScore}% Pass
                            </span>
                          </div>

                          {/* Progress bar if enrolled */}
                          {isEnrolled && (
                            <div className="space-y-1 pt-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-slate-600">Progress</span>
                                <span className="font-bold text-[#02167F]">{progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${isCert ? 'bg-emerald-600' : 'bg-[#02167F]'}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action CTA */}
                        <div className="pt-4 mt-4 border-t border-slate-100">
                          {isCert ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenCourse(c.id)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-xl transition-colors"
                              >
                                Review SOP
                              </button>
                              <button
                                onClick={() => setViewingCertificate(c.certificate!)}
                                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Certificate</span>
                              </button>
                            </div>
                          ) : isEnrolled ? (
                            <button
                              onClick={() => handleOpenCourse(c.id)}
                              className="w-full bg-[#02167F] hover:bg-[#0320b3] text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>{progress > 0 ? 'Resume Learning' : 'Start Course'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnroll(Number(c.id))}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>Enroll Free</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 3. CERTIFICATES TAB */}
      {activeTab === 'certificates' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Official Field Certifications</h3>
              <p className="text-xs text-slate-500">Verifiable credentials issued by We Onboard Operational Academy</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
              {certificates.length} Credentials Earned
            </span>
          </div>

          {certificates.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <Award className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">No certificates earned yet.</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Enroll in foundational courses from the catalogue, complete all lessons, and score $\ge 80\%$ on the certification exam.
              </p>
              <button
                onClick={() => setActiveTab('courses')}
                className="bg-[#02167F] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#0320b3] transition-colors"
              >
                Browse Course Catalogue
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-[#FFD014] transition-all shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono font-bold block">
                        REF: {cert.certificateRef}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {cert.courseTitle}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                      {cert.scorePercent}%
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Issued Date</span>
                      <span className="font-semibold text-slate-800">{cert.issueDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Verification Code</span>
                      <span className="font-mono font-bold text-[#02167F]">{cert.verificationCode}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingCertificate(cert)}
                    className="w-full bg-[#02167F] hover:bg-[#0320b3] text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>View Digital Certificate</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. VERIFIER TAB */}
      {activeTab === 'verifier' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 max-w-xl mx-auto space-y-6 shadow-sm">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-50 text-[#02167F] rounded-full mx-auto flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Certificate Authenticity Verification
            </h3>
            <p className="text-xs text-slate-500">
              Verify credentials issued to We Onboard field associates and team leaders. Enter the unique reference number or verification code.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="e.g. WO-CERT-2026-F81A9B or V-894215"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-1 focus:ring-[#02167F] focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying || !verifyInput.trim()}
              className="w-full bg-[#02167F] hover:bg-[#0320b3] disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
            >
              {isVerifying ? 'Verifying with Authority Database...' : 'Verify Credential'}
            </button>
          </form>

          {verifyResult && (
            <div className={`p-5 rounded-2xl border text-xs space-y-3 ${
              verifyResult.verified 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                : 'bg-red-50 border-red-200 text-red-950'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {verifyResult.verified ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Valid & Authentic Certificate</span>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-red-600" />
                    <span>Verification Failed</span>
                  </>
                )}
              </div>

              {verifyResult.verified && verifyResult.certificate ? (
                <div className="bg-white rounded-xl p-4 border border-emerald-200 space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recipient:</span>
                    <span className="font-bold text-slate-900">{verifyResult.certificate.recipient}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Course Title:</span>
                    <span className="font-semibold">{verifyResult.certificate.courseTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Course Code:</span>
                    <span className="font-mono">{verifyResult.certificate.courseCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Score Achieved:</span>
                    <span className="font-bold text-emerald-700">{verifyResult.certificate.scorePercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Issue Date:</span>
                    <span>{verifyResult.certificate.issueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Issuer Authority:</span>
                    <span className="font-bold text-[#02167F]">{verifyResult.certificate.issuer}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-red-800">
                  {verifyResult.error || 'The entered code does not correspond to any active credential in the We Onboard registry.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. DIGITAL CERTIFICATE MODAL */}
      {viewingCertificate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Certificate Header Banner */}
            <div className="bg-[#02167F] text-white p-6 sm:p-8 text-center relative border-b-4 border-[#FFD014]">
              <button
                onClick={() => setViewingCertificate(null)}
                className="absolute right-4 top-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="bg-[#FFD014] text-[#02167F] font-black text-sm px-2.5 py-0.5 rounded">
                  we
                </div>
                <span className="font-black text-lg tracking-tight">Onboard Operational Academy</span>
              </div>
              <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">
                Official Certificate of Competence & Operational Authorization
              </p>
            </div>

            {/* Certificate Body */}
            <div className="p-8 sm:p-10 space-y-6 text-center">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">This is proudly awarded to</span>
                <h3 className="text-2xl font-black text-slate-900">
                  {viewingCertificate.freelancerName || 'Verified Field Associate'}
                </h3>
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <p className="text-xs text-slate-600">
                  for successfully mastering the operational SOPs, field ethics, and compliance standards for
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <h4 className="text-sm font-extrabold text-[#02167F]">
                    {viewingCertificate.courseTitle}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono font-bold block">
                    {viewingCertificate.courseCode} · Exam Score: {viewingCertificate.scorePercent}%
                  </span>
                </div>
              </div>

              {/* Certificate Security Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left pt-4 border-t border-slate-100 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Issue Date</span>
                  <span className="font-bold text-slate-900">{viewingCertificate.issueDate}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Certificate Ref</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px] truncate block">
                    {viewingCertificate.certificateRef}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block uppercase">Verification Code</span>
                  <span className="font-mono font-bold text-[#02167F]">{viewingCertificate.verificationCode}</span>
                </div>
              </div>

              {/* Signature Block */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-left text-xs">
                <div>
                  <span className="font-serif italic font-bold text-slate-800 text-sm block">Gousiya Fathima</span>
                  <span className="text-[10px] text-slate-500 block">Lead Academy Director</span>
                  <span className="text-[9px] text-slate-400">We Onboard Operations</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <div className="text-[10px] text-slate-500">
                    <span className="font-bold text-emerald-700 block">Cryptographically Sealed</span>
                    <span>Hostinger Sovereign Storage</span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <QrCode className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Official credential valid across all We Onboard projects.
              </span>
              <button
                onClick={() => setViewingCertificate(null)}
                className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
