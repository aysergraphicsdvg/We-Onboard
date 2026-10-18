import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, User, MapPin, Briefcase, ShieldCheck, FileUp } from 'lucide-react';
import { store } from '../../services/store';
import { FreelancerRole } from '../../types';

interface FreelancerRegisterPageProps {
  onBack: () => void;
  onOpenPortal: () => void;
}

export const FreelancerRegisterPage: React.FC<FreelancerRegisterPageProps> = ({ onBack, onOpenPortal }) => {
  const [step, setStep] = useState(1);

  // Step 1: Personal
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('2000-01-01');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pinCode, setPinCode] = useState('560038');

  // Step 2: Eligibility
  const [isAdult, setIsAdult] = useState(true);
  const [hasSmartphone, setHasSmartphone] = useState(true);
  const [languages, setLanguages] = useState<string[]>(['Kannada', 'English']);
  const [preferredAreas, setPreferredAreas] = useState<string[]>(['Indiranagar', 'Koramangala']);
  const [workType, setWorkType] = useState<'Full-time' | 'Part-time' | 'Flexible'>('Full-time');

  // Step 3: Professional
  const [education, setEducation] = useState('Graduate / Degree');
  const [experienceYears, setExperienceYears] = useState(2);
  const [salesExperience, setSalesExperience] = useState(true);
  const [preferredRole, setPreferredRole] = useState<FreelancerRole>('Team Member / Field Executive');
  const [skills, setSkills] = useState('Merchant Onboarding, Rider Verification, Local Navigation');
  const [previousEmployer, setPreviousEmployer] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');

  // Step 4: Consent
  const [consentAccurate, setConsentAccurate] = useState(true);
  const [consentPrivacy, setConsentPrivacy] = useState(true);

  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !email || !isAdult || !hasSmartphone) {
      alert('Please fill all mandatory fields and confirm eligibility requirements.');
      return;
    }

    const newFreelancer = store.registerFreelancer({
      fullName,
      email,
      phone,
      dob,
      gender,
      residentialAddress: address || 'Indiranagar, Bengaluru',
      city,
      state,
      pinCode,
      isAdult,
      hasSmartphone,
      languages: languages.length ? languages : ['Kannada', 'English'],
      preferredAreas: preferredAreas.length ? preferredAreas : ['Indiranagar'],
      preferredWorkType: workType,
      education,
      previousExperienceYears: Number(experienceYears) || 0,
      salesFieldExperience: salesExperience,
      skills: skills.split(',').map((s) => s.trim()),
      preferredRole,
      previousEmployer: previousEmployer || undefined,
      verificationNotes: 'Candidate registered through public portal. Verification pending.'
    });

    setSubmittedId(newFreelancer.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-[#02167F] hover:text-[#031d99] bg-white border border-slate-200 px-3.5 py-2 rounded-lg shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to We Onboard Website</span>
          </button>

          <span className="text-xs font-mono bg-blue-50 text-[#02167F] px-3 py-1.5 rounded-md font-bold border border-blue-200">
            Route: /join-as-freelancer.php
          </span>
        </div>

        {submittedId ? (
          /* Confirmation Receipt Screen */
          <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-xl text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <h2 className="text-3xl font-extrabold text-[#02167F]">
              Application Submitted Successfully!
            </h2>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-md mx-auto text-left space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Your Freelancer Reference ID
              </span>
              <strong className="text-2xl font-mono text-[#02167F] font-black block">
                {submittedId}
              </strong>
              <div className="text-xs text-slate-600 pt-2 border-t border-slate-200 space-y-1">
                <p><strong>Name:</strong> {fullName}</p>
                <p><strong>Preferred Role:</strong> {preferredRole}</p>
                <p><strong>City / Hub:</strong> {city}</p>
                <p><strong>Initial Status:</strong> <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Submitted</span></p>
              </div>
            </div>

            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Our Freelancer Operations Coordinator in Bangalore will review your credentials within 24–48 hours. 
              The <strong>Freelancer Portal</strong> is currently under development with exciting new options being added and will be available soon!
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={onOpenPortal}
                className="w-full sm:w-auto bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-6 py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow"
              >
                <span>Check Portal Status (Under Development)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onBack}
                className="w-full sm:w-auto border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-6 py-3.5 rounded-xl text-sm transition-colors"
              >
                Return to Homepage
              </button>
            </div>
          </div>
        ) : (
          /* Multi-Step Registration Form */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            
            {/* Header Banner */}
            <div className="bg-[#02167F] text-white p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FFD014] mb-2 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero Candidate Fees &bull; Official Registration</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Join the We Onboard Field Network
              </h1>
              <p className="text-slate-200 text-xs sm:text-sm mt-1">
                Earn flexible, transparent project payouts with hands-on training and clear operational leadership tracks.
              </p>

              {/* Progress Stepper */}
              <div className="grid grid-cols-4 gap-2 mt-6">
                {[
                  { num: 1, label: 'Personal' },
                  { num: 2, label: 'Eligibility' },
                  { num: 3, label: 'Experience' },
                  { num: 4, label: 'Consent' }
                ].map((s) => (
                  <div
                    key={s.num}
                    onClick={() => setStep(s.num)}
                    className={`cursor-pointer pb-2 text-center border-b-2 text-xs font-bold transition-colors ${
                      step === s.num
                        ? 'border-[#FFD014] text-[#FFD014]'
                        : step > s.num
                        ? 'border-emerald-400 text-emerald-300'
                        : 'border-white/20 text-white/40'
                    }`}
                  >
                    <span>{s.num}. {s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              
              {/* STEP 1: Personal Details */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <h3 className="text-lg font-bold text-[#02167F] flex items-center gap-2">
                    <User className="w-5 h-5 text-[#FFD014]" />
                    <span>Personal & Contact Information</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Legal Name (as per Aadhaar) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Arun Prakash"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98450 XXXXX"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@gmail.com"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none bg-white"
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other / Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Residential Address
                    </label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, locality, landmarks..."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="bg-[#02167F] hover:bg-[#031d99] text-white font-bold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"
                    >
                      <span>Continue to Eligibility</span>
                      <ArrowRight className="w-4 h-4 text-[#FFD014]" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Eligibility & Working Preferences */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <h3 className="text-lg font-bold text-[#02167F] flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#FFD014]" />
                    <span>Eligibility & Availability</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="adult-check"
                        checked={isAdult}
                        onChange={(e) => setIsAdult(e.target.checked)}
                        className="h-5 w-5 text-[#02167F] rounded"
                      />
                      <label htmlFor="adult-check" className="text-xs font-bold text-slate-800">
                        I confirm I am at least 18 years old. <span className="text-red-500">*</span>
                      </label>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="phone-check"
                        checked={hasSmartphone}
                        onChange={(e) => setHasSmartphone(e.target.checked)}
                        className="h-5 w-5 text-[#02167F] rounded"
                      />
                      <label htmlFor="phone-check" className="text-xs font-bold text-slate-800">
                        I own an active Android / iOS smartphone. <span className="text-red-500">*</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Languages Known (Select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Kannada', 'English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Urdu'].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                            languages.includes(lang)
                              ? 'bg-[#02167F] text-[#FFD014] border-[#02167F]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {languages.includes(lang) ? '✓ ' : '+ '}{lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Availability Mode
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['Full-time', 'Part-time', 'Flexible'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setWorkType(mode)}
                          className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-colors text-center ${
                            workType === mode
                              ? 'bg-[#FFD014] text-[#02167F] border-[#FFD014] shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Preferred Working Areas in Bengaluru
                    </label>
                    <input
                      type="text"
                      value={preferredAreas.join(', ')}
                      onChange={(e) => setPreferredAreas(e.target.value.split(',').map((s) => s.trim()))}
                      placeholder="e.g. Indiranagar, Koramangala, HSR Layout, Whitefield"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="border border-slate-300 px-5 py-2.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      &larr; Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="bg-[#02167F] hover:bg-[#031d99] text-white font-bold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"
                    >
                      <span>Continue to Experience</span>
                      <ArrowRight className="w-4 h-4 text-[#FFD014]" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Professional Experience & Preferred Role */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <h3 className="text-lg font-bold text-[#02167F] flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[#FFD014]" />
                    <span>Professional Background</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Preferred Role Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={preferredRole}
                        onChange={(e) => setPreferredRole(e.target.value as FreelancerRole)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                      >
                        <option value="Team Member / Field Executive">Team Member / Field Executive</option>
                        <option value="Team Leader">Team Leader</option>
                        <option value="Project Manager">Project Manager</option>
                        <option value="Freelancer / Independent Field Associate">Freelancer / Independent Field Associate</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Education Qualification
                      </label>
                      <select
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                      >
                        <option>10th Standard / Matriculation</option>
                        <option>12th / Pre-University (PUC)</option>
                        <option>Diploma / ITI</option>
                        <option>Graduate / Degree (B.Com, B.Sc, B.A, BBA)</option>
                        <option>Postgraduate (MBA, MCA, M.Com)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Years of Work Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Previous Employer or Client (Optional)
                      </label>
                      <input
                        type="text"
                        value={previousEmployer}
                        onChange={(e) => setPreviousEmployer(e.target.value)}
                        placeholder="e.g. Swiggy, Zomato, Dunzo, Retail Store"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Field & Operations Skills
                    </label>
                    <input
                      type="text"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="Merchant Onboarding, Rider Verification, KYC..."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>

                  <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 text-center">
                    <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-bold text-slate-700 block">
                      Resume Upload (Optional)
                    </span>
                    <span className="text-[11px] text-slate-500 block mb-2">
                      PDF, DOC or DOCX up to 5MB. Private and secured.
                    </span>
                    <input
                      type="file"
                      id="resume-file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setResumeFileName(e.target.files[0].name);
                      }}
                    />
                    <label
                      htmlFor="resume-file"
                      className="cursor-pointer bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold px-4 py-1.5 rounded-md text-xs inline-block"
                    >
                      {resumeFileName ? `Selected: ${resumeFileName}` : 'Choose Document'}
                    </label>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="border border-slate-300 px-5 py-2.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      &larr; Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="bg-[#02167F] hover:bg-[#031d99] text-white font-bold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"
                    >
                      <span>Continue to Consent</span>
                      <ArrowRight className="w-4 h-4 text-[#FFD014]" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Legal Consent & Submit */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in">
                  <h3 className="text-lg font-bold text-[#02167F] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Consent & Candidate Declarations</span>
                  </h3>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
                    <strong className="block text-sm font-bold text-[#02167F]">
                      Important Zero Joining Fee Policy:
                    </strong>
                    <p>
                      We Onboard never asks for registration fees, training fees, laptop security deposits, or UPI PINs. 
                      If anyone claims to represent We Onboard and asks for money, immediately notify our office.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="c1"
                        checked={consentAccurate}
                        onChange={(e) => setConsentAccurate(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded text-[#02167F]"
                      />
                      <label htmlFor="c1" className="text-xs text-slate-700 font-medium">
                        I solemnly declare that all personal and professional details provided in this application are authentic and accurate.
                      </label>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="c2"
                        checked={consentPrivacy}
                        onChange={(e) => setConsentPrivacy(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded text-[#02167F]"
                      />
                      <label htmlFor="c2" className="text-xs text-slate-700 font-medium">
                        I authorize We Onboard to process my information for project assignments, field verification and operational communications.
                      </label>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="border border-slate-300 px-5 py-2.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      &larr; Back
                    </button>

                    <button
                      type="submit"
                      disabled={!consentAccurate || !consentPrivacy}
                      className="bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-extrabold px-8 py-3.5 rounded-xl text-base transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
                    >
                      <span>Submit Freelancer Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        )}

      </div>
    </div>
  );
};
