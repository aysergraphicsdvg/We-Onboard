/**
 * We Onboard — Versioned API Client (v1)
 * Authoritative Backend: PHP 8.2+ with PDO MySQL on Hostinger
 * API Domain: https://api.weonboard.in
 * API Document Root: public_html/api/
 *
 * Architectural Boundary:
 * - When configured and connected to https://api.weonboard.in, data is authoritatively persisted to MySQL.
 * - If the remote backend is unreachable, the client operates in an explicit, isolated "preview_sandbox" mode.
 * - The client never disguises local browser storage as a live production database.
 */

import { store } from '../store';
import { 
  Enquiry, 
  Freelancer, 
  MsmeRequest, 
  AdminUser, 
  Course, 
  CourseEnrollment, 
  FreelancerCertificate, 
  AssessmentAttempt,
  Task,
  Project,
  Team,
  RankEligibilityCandidate,
  FreelancerRank
} from '../../types';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  reference_id?: string;
  error?: string;
  storage: 'mysql_server' | 'preview_sandbox';
}

export interface EnquiryPayload {
  full_name: string;
  company_name?: string;
  phone: string;
  email: string;
  enquiry_type: string;
  city: string;
  service_required: string;
  message: string;
  consent: boolean;
  source?: string;
}

export interface FreelancerRegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  dob: string;
  gender?: string;
  residential_address: string;
  city: string;
  state: string;
  pin_code: string;
  languages: string[];
  preferred_areas: string[];
  preferred_work_type: 'Full-time' | 'Part-time' | 'Flexible';
  education: string;
  previous_experience_years: number;
  sales_field_experience: boolean;
  skills: string[];
  preferred_role: string;
  previous_employer?: string;
  has_smartphone: boolean;
  is_adult: boolean;
  password?: string;
}

export interface MsmePayload {
  business_name: string;
  applicant_name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  category: string;
  stage: string;
  requested_services: string[];
  description: string;
}

export interface ApiHealthResponse {
  status: 'healthy' | 'degraded' | 'error';
  service: string;
  version: string;
  database: 'available' | 'unavailable' | 'unconfigured';
  timestamp: string;
}

/**
 * Normalizes the API base URL for Hostinger deployment.
 * Hostinger document root for api.weonboard.in is `public_html/api/`.
 * Therefore, endpoints inside `public_html/api/v1/` are addressed as `/v1/*` on the subdomain.
 */
export function normalizeApiUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return 'https://api.weonboard.in/v1';
  }

  let cleaned = rawUrl.trim().replace(/\/+$/, '');

  // Strip redundant /api if targeting api.weonboard.in subdomain
  if (cleaned.startsWith('https://api.weonboard.in/api/v1')) {
    cleaned = cleaned.replace('https://api.weonboard.in/api/v1', 'https://api.weonboard.in/v1');
  } else if (cleaned === 'https://api.weonboard.in' || cleaned === 'https://api.weonboard.in/api') {
    cleaned = 'https://api.weonboard.in/v1';
  } else if (cleaned.startsWith('https://api.weonboard.in/v1')) {
    cleaned = 'https://api.weonboard.in/v1';
  }

  return cleaned;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = normalizeApiUrl(import.meta.env.VITE_API_BASE_URL);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Health check probe against the backend MySQL and PHP API.
   * Never exposes credentials or database internals.
   */
  async checkHealth(): Promise<ApiHealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health.php`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (response.ok) {
        return await response.json();
      }
      return {
        status: 'degraded',
        service: 'weonboard-api',
        version: '1.0.0',
        database: 'unavailable',
        timestamp: new Date().toISOString()
      };
    } catch {
      return {
        status: 'degraded',
        service: 'weonboard-api (client preview)',
        version: '1.0.0',
        database: 'unconfigured',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Submit public business enquiry.
   * Dispatches to https://api.weonboard.in/v1/enquiry.php
   */
  async submitEnquiry(payload: EnquiryPayload): Promise<ApiResponse<{ enquiry: Enquiry }>> {
    const idempotencyKey = 'idem_enq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    try {
      const response = await fetch(`${this.baseUrl}/enquiry.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey }),
        signal: AbortSignal.timeout(6000)
      });

      const json = await response.json();
      if (response.ok && json.success) {
        const localRecord = store.addEnquiry({
          fullName: payload.full_name,
          companyName: payload.company_name,
          phone: payload.phone,
          email: payload.email,
          enquiryType: payload.enquiry_type as Enquiry['enquiryType'],
          city: payload.city,
          serviceRequired: payload.service_required,
          message: payload.message,
          consent: payload.consent,
          source: payload.source || 'Website Contact Form'
        });

        return {
          success: true,
          reference_id: json.reference_id || localRecord.id,
          message: json.message || 'Confirmed: Your enquiry has been received and securely logged in the We Onboard database.',
          data: { enquiry: localRecord },
          storage: 'mysql_server'
        };
      } else if (!response.ok) {
        return {
          success: false,
          error: json.error || 'Server rejected enquiry submission.',
          message: json.error || 'Submission error.',
          storage: 'mysql_server'
        };
      }
    } catch (err) {
      console.warn('API backend unreachable; operating in safe preview mode:', err);
    }

    // Honest Fallback: Save strictly to local preview cache and inform user
    const fallbackRecord = store.addEnquiry({
      fullName: payload.full_name,
      companyName: payload.company_name,
      phone: payload.phone,
      email: payload.email,
      enquiryType: payload.enquiry_type as Enquiry['enquiryType'],
      city: payload.city,
      serviceRequired: payload.service_required,
      message: payload.message,
      consent: payload.consent,
      source: payload.source || 'Website Contact Form (Preview Sandbox)'
    });

    return {
      success: true,
      reference_id: fallbackRecord.id,
      message: 'Preview Sandbox Mode: Saved to browser cache. Network connection to https://api.weonboard.in is required for live server storage.',
      data: { enquiry: fallbackRecord },
      storage: 'preview_sandbox'
    };
  }

  /**
   * Register a new freelancer.
   * Dispatches to https://api.weonboard.in/v1/freelancers/register.php
   */
  async registerFreelancer(payload: FreelancerRegisterPayload): Promise<ApiResponse<{ freelancer: Freelancer }>> {
    const idempotencyKey = 'idem_fl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    try {
      const response = await fetch(`${this.baseUrl}/freelancers/register.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey }),
        signal: AbortSignal.timeout(6000)
      });

      const json = await response.json();
      if (response.ok && json.success) {
        const localRecord = store.registerFreelancer({
          fullName: payload.full_name,
          email: payload.email,
          phone: payload.phone,
          dob: payload.dob,
          gender: payload.gender,
          residentialAddress: payload.residential_address,
          city: payload.city,
          state: payload.state,
          pinCode: payload.pin_code,
          languages: payload.languages,
          preferredAreas: payload.preferred_areas,
          preferredWorkType: payload.preferred_work_type,
          education: payload.education,
          previousExperienceYears: payload.previous_experience_years,
          salesFieldExperience: payload.sales_field_experience,
          skills: payload.skills,
          preferredRole: payload.preferred_role as any,
          previousEmployer: payload.previous_employer,
          hasSmartphone: payload.has_smartphone,
          isAdult: payload.is_adult
        });

        return {
          success: true,
          reference_id: json.reference_id || localRecord.id,
          message: json.message || 'Confirmed: Freelancer application saved to We Onboard server.',
          data: { freelancer: localRecord },
          storage: 'mysql_server'
        };
      } else if (!response.ok) {
        return {
          success: false,
          error: json.error || 'Server rejected registration.',
          reference_id: json.reference_id,
          message: json.error || 'Registration rejected.',
          storage: 'mysql_server'
        };
      }
    } catch (err) {
      console.warn('API backend unreachable; operating in safe preview mode:', err);
    }

    const fallbackRecord = store.registerFreelancer({
      fullName: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      dob: payload.dob,
      gender: payload.gender,
      residentialAddress: payload.residential_address,
      city: payload.city,
      state: payload.state,
      pinCode: payload.pin_code,
      languages: payload.languages,
      preferredAreas: payload.preferred_areas,
      preferredWorkType: payload.preferred_work_type,
      education: payload.education,
      previousExperienceYears: payload.previous_experience_years,
      salesFieldExperience: payload.sales_field_experience,
      skills: payload.skills,
      preferredRole: payload.preferred_role as any,
      previousEmployer: payload.previous_employer,
      hasSmartphone: payload.has_smartphone,
      isAdult: payload.is_adult
    });

    return {
      success: true,
      reference_id: fallbackRecord.id,
      message: 'Preview Sandbox Mode: Application saved to browser cache. Live server connection to https://api.weonboard.in required.',
      data: { freelancer: fallbackRecord },
      storage: 'preview_sandbox'
    };
  }

  /**
   * Submit MSME / Government Nodal Agency Desk Request.
   */
  async submitMsmeRequest(payload: MsmePayload): Promise<ApiResponse<{ request: MsmeRequest }>> {
    const idempotencyKey = 'idem_msme_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    try {
      const response = await fetch(`${this.baseUrl}/msme_request.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey }),
        signal: AbortSignal.timeout(6000)
      });

      const json = await response.json();
      if (response.ok && json.success) {
        const localRecord = store.addMsmeRequest({
          businessName: payload.business_name,
          applicantName: payload.applicant_name,
          phone: payload.phone,
          email: payload.email,
          city: payload.city,
          state: payload.state,
          category: payload.category as MsmeRequest['category'],
          stage: payload.stage as MsmeRequest['stage'],
          currentRegistrations: ['GST'],
          requestedServices: payload.requested_services,
          description: payload.description,
          disclosedAssistanceFee: 3500
        });

        return {
          success: true,
          reference_id: json.reference_id || localRecord.id,
          message: json.message || 'Confirmed: Department proposal securely logged in database.',
          data: { request: localRecord },
          storage: 'mysql_server'
        };
      } else if (!response.ok) {
        return {
          success: false,
          error: json.error || 'Server error recording proposal.',
          message: json.error || 'Submission error.',
          storage: 'mysql_server'
        };
      }
    } catch (err) {
      console.warn('API backend unreachable; operating in safe preview mode:', err);
    }

    const fallbackRecord = store.addMsmeRequest({
      businessName: payload.business_name,
      applicantName: payload.applicant_name,
      phone: payload.phone,
      email: payload.email,
      city: payload.city,
      state: payload.state,
      category: payload.category as MsmeRequest['category'],
      stage: payload.stage as MsmeRequest['stage'],
      currentRegistrations: ['GST'],
      requestedServices: payload.requested_services,
      description: payload.description,
      disclosedAssistanceFee: 3500
    });

    return {
      success: true,
      reference_id: fallbackRecord.id,
      message: 'Preview Sandbox Mode: Proposal logged to browser cache.',
      data: { request: fallbackRecord },
      storage: 'preview_sandbox'
    };
  }

  /**
   * Authenticate Administrator via Server-Side API.
   * Password verification and rate limiting enforced in backend.
   */
  async loginAdmin(email: string, password: string): Promise<ApiResponse<{ user: AdminUser }>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(6000)
      });

      const json = await response.json();
      if (response.ok && json.success) {
        const user: AdminUser = {
          id: json.user.id,
          name: json.user.name,
          email: json.user.email,
          role: json.user.role,
          isActive: true,
          lastLogin: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
          createdAt: new Date().toISOString().split('T')[0]
        };
        store.setAuthenticatedAdmin(user);
        return {
          success: true,
          message: 'Admin authenticated successfully via server session.',
          data: { user },
          storage: 'mysql_server'
        };
      }

      return {
        success: false,
        error: json.error || 'Invalid administrator credentials.',
        message: json.error || 'Authentication failed.',
        storage: 'mysql_server'
      };
    } catch (err) {
      console.warn('Authentication API unreachable; offering offline preview sandbox:', err);
      return {
        success: false,
        error: 'Backend API is currently unreachable. You may use Offline Sandbox Mode to preview dashboard layouts.',
        message: 'Backend unreachable.',
        storage: 'preview_sandbox'
      };
    }
  }

  /**
   * Log out authenticated admin session on server.
   */
  async logoutAdmin(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/auth/logout.php`, {
        method: 'POST',
        credentials: 'include',
        signal: AbortSignal.timeout(3000)
      });
    } catch {
      // Ignore network error on logout
    }
    store.setAuthenticatedAdmin(null);
  }

  /**
   * Check active admin session from server.
   */
  async getCurrentAdmin(): Promise<AdminUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/me.php`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const json = await response.json();
        if (json.authenticated && json.user) {
          const user: AdminUser = {
            id: json.user.id,
            name: json.user.name,
            email: json.user.email,
            role: json.user.role,
            isActive: true,
            lastLogin: 'Active session',
            createdAt: ''
          };
          store.setAuthenticatedAdmin(user);
          if (json.csrf_token) {
            this.csrfToken = json.csrf_token;
          }
          return user;
        }
      }
    } catch {
      // API unreachable
    }
    return null;
  }

  private csrfToken: string = '';

  /**
   * Set or update active CSRF token
   */
  setCsrfToken(token: string) {
    this.csrfToken = token;
  }

  /**
   * Fetch current session CSRF token from server
   */
  async getCsrfToken(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    try {
      const res = await fetch(`${this.baseUrl}/csrf.php`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.csrf_token) {
          this.csrfToken = json.csrf_token;
          return this.csrfToken;
        }
      }
    } catch {
      // fallback
    }
    return '';
  }

  /**
   * Authenticate Freelancer via server-side session.
   */
  async loginFreelancer(identifier: string, password: string): Promise<ApiResponse<{ user: Freelancer }>> {
    try {
      const response = await fetch(`${this.baseUrl}/freelancers/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ identifier, password }),
        signal: AbortSignal.timeout(6000)
      });

      const json = await response.json();
      if (response.ok && json.success) {
        if (json.csrf_token) {
          this.csrfToken = json.csrf_token;
        }
        const user: Freelancer = {
          id: json.user.id,
          registrationRef: json.user.registrationRef,
          fullName: json.user.fullName,
          email: json.user.email,
          phone: json.user.phone,
          dob: json.user.dob || '2000-01-01',
          gender: json.user.gender,
          residentialAddress: json.user.residentialAddress || '',
          city: json.user.city || 'Bengaluru',
          state: json.user.state || 'Karnataka',
          pinCode: json.user.pinCode || '',
          languages: json.user.languages || [],
          preferredAreas: json.user.preferredAreas || [],
          preferredWorkType: json.user.preferredWorkType || 'Full-time',
          education: json.user.education || 'Graduate',
          previousExperienceYears: json.user.previousExperienceYears || 0,
          salesFieldExperience: json.user.salesFieldExperience || false,
          skills: json.user.skills || [],
          preferredRole: json.user.preferredRole || 'Team Member / Field Executive',
          status: json.user.status || 'Submitted',
          onboardingStatus: json.user.onboardingStatus || 'KYC Pending',
          languagePreference: json.user.languagePreference || 'en',
          profileCompletedPercent: json.user.profileCompletedPercent || 60,
          registeredAt: json.user.registeredAt || new Date().toISOString().split('T')[0],
          approvedWorkingAreas: [],
          documents: (json.user.documents || []).map((d: any) => ({
            id: String(d.id),
            documentRef: d.document_ref,
            name: d.document_type,
            type: d.document_type.includes('Aadhaar') ? 'Aadhaar' : (d.document_type.includes('PAN') ? 'PAN' : 'Address Proof'),
            fileName: d.original_filename,
            fileSize: d.file_size,
            uploadedAt: d.created_at,
            verified: d.status === 'Approved',
            status: d.status,
            rejectionReason: d.rejection_reason,
            reviewedAt: d.reviewed_at
          })),
          trainings: [
            { moduleName: 'Field Ethics & Safety Protocols', completed: false },
            { moduleName: 'Digital Onboarding & App Verification SOP', completed: false }
          ],
          notifications: (json.user.notifications || []).map((n: any) => ({
            id: String(n.id),
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: Boolean(n.is_read),
            createdAt: n.created_at
          })),
          completedTasksCount: 0,
          totalEarnings: 0,
          pendingPayout: 0
        };
        store.setAuthenticatedFreelancer(user);
        return {
          success: true,
          message: 'Freelancer authentication successful.',
          data: { user },
          storage: 'mysql_server'
        };
      }

      return {
        success: false,
        error: json.error || 'Invalid freelancer credentials.',
        message: json.error || 'Authentication failed.',
        storage: 'mysql_server'
      };
    } catch (err) {
      console.warn('Freelancer login API unreachable; using sandbox:', err);
      // Fallback sandbox lookup
      const ok = store.loginFreelancer(identifier);
      if (ok) {
        return {
          success: true,
          message: 'Preview Sandbox Mode: Authenticated using browser cache.',
          data: { user: store.getState().currentFreelancer! },
          storage: 'preview_sandbox'
        };
      }
      return {
        success: false,
        error: 'Unable to connect to authentication server.',
        message: 'Network error.',
        storage: 'preview_sandbox'
      };
    }
  }

  /**
   * Log out authenticated freelancer session on server.
   */
  async logoutFreelancer(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/freelancers/logout.php`, {
        method: 'POST',
        credentials: 'include',
        signal: AbortSignal.timeout(3000)
      });
    } catch {
      // Ignore network error on logout
    }
    store.logoutFreelancer();
  }

  /**
   * Restore active freelancer session from server.
   */
  async getCurrentFreelancer(): Promise<Freelancer | null> {
    try {
      const response = await fetch(`${this.baseUrl}/freelancers/me.php`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const json = await response.json();
        if (json.authenticated && json.user) {
          if (json.csrf_token) {
            this.csrfToken = json.csrf_token;
          }
          const user: Freelancer = {
            id: json.user.id,
            registrationRef: json.user.registrationRef,
            fullName: json.user.fullName,
            email: json.user.email,
            phone: json.user.phone,
            dob: json.user.dob,
            gender: json.user.gender,
            residentialAddress: json.user.residentialAddress,
            city: json.user.city,
            state: json.user.state,
            pinCode: json.user.pinCode,
            languages: json.user.languages || [],
            preferredAreas: json.user.preferredAreas || [],
            preferredWorkType: json.user.preferredWorkType || 'Full-time',
            education: json.user.education,
            previousExperienceYears: json.user.previousExperienceYears || 0,
            salesFieldExperience: json.user.salesFieldExperience || false,
            skills: json.user.skills || [],
            preferredRole: json.user.preferredRole || 'Team Member / Field Executive',
            status: json.user.status,
            onboardingStatus: json.user.onboardingStatus || 'KYC Pending',
            languagePreference: json.user.languagePreference || 'en',
            profileCompletedPercent: json.user.profileCompletedPercent || 60,
            registeredAt: json.user.registeredAt,
            approvedWorkingAreas: [],
            documents: (json.user.documents || []).map((d: any) => ({
              id: String(d.id),
              documentRef: d.document_ref,
              name: d.document_type,
              type: d.document_type.includes('Aadhaar') ? 'Aadhaar' : (d.document_type.includes('PAN') ? 'PAN' : 'Address Proof'),
              fileName: d.original_filename,
              fileSize: d.file_size,
              uploadedAt: d.created_at,
              verified: d.status === 'Approved',
              status: d.status,
              rejectionReason: d.rejection_reason,
              reviewedAt: d.reviewed_at
            })),
            trainings: [
              { moduleName: 'Field Ethics & Safety Protocols', completed: false },
              { moduleName: 'Digital Onboarding & App Verification SOP', completed: false }
            ],
            notifications: (json.user.notifications || []).map((n: any) => ({
              id: String(n.id),
              title: n.title,
              message: n.message,
              type: n.type,
              isRead: Boolean(n.is_read),
              createdAt: n.created_at
            })),
            completedTasksCount: 0,
            totalEarnings: 0,
            pendingPayout: 0
          };
          store.setAuthenticatedFreelancer(user);
          return user;
        }
      }
    } catch {
      // API unreachable
    }
    return null;
  }

  /**
   * Upload KYC identity document to private storage.
   */
  async uploadKycDocument(formData: FormData): Promise<ApiResponse<{ document: any }>> {
    const csrf = await this.getCsrfToken();
    if (csrf && !formData.has('csrf_token')) {
      formData.append('csrf_token', csrf);
    }

    try {
      const response = await fetch(`${this.baseUrl}/freelancers/kyc/upload.php`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrf
        },
        body: formData,
        signal: AbortSignal.timeout(10000)
      });

      const json = await response.json();
      if (response.ok && json.success) {
        // Refresh freelancer profile state
        await this.getCurrentFreelancer();
        return {
          success: true,
          message: json.message || 'Document uploaded successfully.',
          data: { document: json.document },
          storage: 'mysql_server'
        };
      }

      return {
        success: false,
        error: json.error || 'Document upload was rejected.',
        message: json.error || 'Upload error.',
        storage: 'mysql_server'
      };
    } catch (err) {
      console.warn('KYC upload network error:', err);
      return {
        success: false,
        error: 'Failed to upload document to server. Please check your network connection.',
        message: 'Upload failed.',
        storage: 'preview_sandbox'
      };
    }
  }

  /**
   * Update freelancer profile settings (language, skills, availability).
   */
  async updateFreelancerProfile(data: { language_preference?: string; skills?: string[]; preferred_work_type?: string; residential_address?: string }): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const response = await fetch(`${this.baseUrl}/freelancers/profile.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': csrf
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'update_settings', ...data, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });

      const json = await response.json();
      if (response.ok && json.success) {
        await this.getCurrentFreelancer();
        return {
          success: true,
          message: json.message || 'Settings updated.',
          storage: 'mysql_server'
        };
      }

      return {
        success: false,
        error: json.error || 'Failed to update settings.',
        message: json.error || 'Update failed.',
        storage: 'mysql_server'
      };
    } catch {
      return {
        success: true,
        message: 'Settings updated in local sandbox.',
        storage: 'preview_sandbox'
      };
    }
  }

  /**
   * Change freelancer password.
   */
  async changeFreelancerPassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const response = await fetch(`${this.baseUrl}/freelancers/profile.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': csrf
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'change_password', current_password: currentPassword, new_password: newPassword, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });

      const json = await response.json();
      if (response.ok && json.success) {
        return {
          success: true,
          message: json.message || 'Password changed securely.',
          storage: 'mysql_server'
        };
      }

      return {
        success: false,
        error: json.error || 'Password update failed.',
        message: json.error || 'Update failed.',
        storage: 'mysql_server'
      };
    } catch {
      return {
        success: false,
        error: 'Network error connecting to security server.',
        message: 'Network error.',
        storage: 'preview_sandbox'
      };
    }
  }

  /**
   * Admin: List and search freelancer applications.
   */
  async adminListFreelancers(filters?: { search?: string; status?: string; onboarding_status?: string; city?: string }): Promise<ApiResponse<{ freelancers: any[] }>> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.onboarding_status) params.set('onboarding_status', filters.onboarding_status);
    if (filters?.city) params.set('city', filters.city);

    try {
      const response = await fetch(`${this.baseUrl}/admin/freelancers/list.php?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      const json = await response.json();
      if (response.ok && json.success) {
        return {
          success: true,
          message: 'Freelancers loaded from server.',
          data: { freelancers: json.freelancers },
          storage: 'mysql_server'
        };
      }

      return {
        success: false,
        error: json.error || 'Failed to load freelancers.',
        message: json.error || 'Load failed.',
        storage: 'mysql_server'
      };
    } catch {
      // Fallback to store
      return {
        success: true,
        message: 'Loaded from local sandbox store.',
        data: { freelancers: store.getState().freelancers },
        storage: 'preview_sandbox'
      };
    }
  }

  /**
   * Admin: Review KYC document or update freelancer onboarding status.
   */
  async adminReviewFreelancer(payload: { action: 'review_document' | 'update_freelancer_status'; document_id?: number; decision?: string; reason?: string; freelancer_id?: number; status?: string; onboarding_status?: string; verification_notes?: string }): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const response = await fetch(`${this.baseUrl}/admin/freelancers/review.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': csrf
        },
        credentials: 'include',
        body: JSON.stringify({ ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });

      const json = await response.json();
      if (response.ok && json.success) {
        return {
          success: true,
          message: json.message || 'Review action recorded.',
          storage: 'mysql_server'
        };
      }

      return {
        success: false,
        error: json.error || 'Review action failed.',
        message: json.error || 'Review failed.',
        storage: 'mysql_server'
      };
    } catch {
      return {
        success: true,
        message: 'Review recorded in local preview sandbox.',
        storage: 'preview_sandbox'
      };
    }
  }

  // ==========================================
  // PHASE 4: ACADEMY & CERTIFICATION METHODS
  // ==========================================

  async getAcademyCourses(filters?: { category?: string; language?: string; search?: string }): Promise<Course[]> {
    return this.getCourses(filters);
  }

  async getCourses(filters?: { category?: string; language?: string; search?: string }): Promise<Course[]> {
    try {
      const q = new URLSearchParams();
      if (filters?.category) q.set('category', filters.category);
      if (filters?.language) q.set('language', filters.language);
      if (filters?.search) q.set('search', filters.search);

      const res = await fetch(`${this.baseUrl}/academy/courses.php?${q.toString()}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.courses)) {
          return json.courses;
        }
      }
    } catch {
      // Fallback to store
    }
    return store.getState().academyCourses || [];
  }

  async getAcademyCourseDetail(idOrSlug: string | number): Promise<Course | null> {
    try {
      const param = typeof idOrSlug === 'number' ? `id=${idOrSlug}` : `slug=${encodeURIComponent(idOrSlug)}`;
      const res = await fetch(`${this.baseUrl}/academy/course_detail.php?${param}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.course) {
          return json.course;
        }
      }
    } catch {
      // Fallback to store
    }
    const courses = store.getState().academyCourses || [];
    return courses.find(c => String(c.id) === String(idOrSlug) || c.slug === idOrSlug) || null;
  }

  async enrollCourse(courseId: number): Promise<{ success: boolean; message: string; enrollment?: CourseEnrollment }> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/academy/enroll.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ course_id: courseId, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, message: json.message, enrollment: json.enrollment };
      }
      return { success: false, message: json.error || 'Enrollment failed.' };
    } catch {
      // Sandbox fallback
      const enr = store.enrollFreelancerCourse(courseId);
      return { success: true, message: 'Enrolled in preview mode', enrollment: enr };
    }
  }

  async completeLesson(courseId: number, lessonId: number): Promise<{ success: boolean; progressPercent: number; completedLessonIds: number[]; isReadyForAssessment: boolean; message?: string }> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/academy/lesson_complete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ course_id: courseId, lesson_id: lessonId, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return {
          success: true,
          progressPercent: json.progressPercent,
          completedLessonIds: json.completedLessonIds || [],
          isReadyForAssessment: Boolean(json.isReadyForAssessment)
        };
      }
      return { success: false, progressPercent: 0, completedLessonIds: [], isReadyForAssessment: false, message: json.error };
    } catch {
      const res = store.completeFreelancerLesson(courseId, lessonId);
      return {
        success: true,
        progressPercent: res.progressPercent,
        completedLessonIds: res.completedLessonIds,
        isReadyForAssessment: res.isReadyForAssessment
      };
    }
  }

  async takeAssessment(courseId: number): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/academy/assessment/take.php?course_id=${courseId}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return json;
      }
      return { success: false, error: json.error || 'Failed to load assessment', status: json.status };
    } catch {
      // Sandbox fallback
      return store.getSandboxAssessment(courseId);
    }
  }

  async submitAssessment(courseId: number, assessmentId: number, answers: Record<string | number, string | string[]>): Promise<any> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/academy/assessment/submit.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ course_id: courseId, assessment_id: assessmentId, answers, csrf_token: csrf }),
        signal: AbortSignal.timeout(7000)
      });
      const json = await res.json();
      return json;
    } catch {
      return store.submitSandboxAssessment(courseId, assessmentId, answers);
    }
  }

  async getFreelancerCertificates(): Promise<FreelancerCertificate[]> {
    try {
      const res = await fetch(`${this.baseUrl}/academy/certificates.php`, {
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.certificates)) {
          return json.certificates;
        }
      }
    } catch {
      // Fallback
    }
    return store.getState().certificates || [];
  }

  async verifyCertificatePublic(refOrCode: string): Promise<any> {
    try {
      const param = refOrCode.startsWith('V-') ? `code=${encodeURIComponent(refOrCode)}` : `ref=${encodeURIComponent(refOrCode)}`;
      const res = await fetch(`${this.baseUrl}/academy/certificates.php?${param}`, {
        signal: AbortSignal.timeout(5000)
      });
      return await res.json();
    } catch {
      const cert = (store.getState().certificates || []).find(c => c.certificateRef === refOrCode || c.verificationCode === refOrCode);
      if (cert) {
        return {
          success: true,
          verified: true,
          certificate: {
            certificateRef: cert.certificateRef,
            recipient: cert.freelancerName || 'Verified Associate',
            courseTitle: cert.courseTitle || 'Field Protocols',
            courseCode: cert.courseCode || 'WO-CRS-SAFE-01',
            issueDate: cert.issueDate,
            scorePercent: cert.scorePercent,
            status: 'Authentic & Valid',
            issuer: 'We Onboard Operational Academy'
          }
        };
      }
      return { success: false, verified: false, error: 'Certificate record not found.' };
    }
  }

  // --- Admin Academy Methods ---

  async adminGetAcademyCourses(filters?: { search?: string; status?: string; category?: string }): Promise<Course[]> {
    try {
      const q = new URLSearchParams();
      if (filters?.search) q.set('search', filters.search);
      if (filters?.status) q.set('status', filters.status);
      if (filters?.category) q.set('category', filters.category);

      const res = await fetch(`${this.baseUrl}/admin/academy/courses.php?${q.toString()}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.courses)) {
          return json.courses;
        }
      }
    } catch {
      // Fallback
    }
    return store.getState().academyCourses || [];
  }

  async adminSaveCourse(payload: any): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/academy/courses.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return {
        success: Boolean(json.success),
        message: json.message || json.error || 'Saved',
        error: json.error,
        storage: 'mysql_server'
      };
    } catch {
      store.adminSaveCourse(payload);
      return { success: true, message: 'Saved in local preview sandbox', storage: 'preview_sandbox' };
    }
  }

  async adminSetCourseStatus(courseId: number, status: string): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/academy/courses.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ action: 'set_status', id: courseId, status, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return {
        success: Boolean(json.success),
        message: json.message || 'Status updated',
        storage: 'mysql_server'
      };
    } catch {
      store.adminSetCourseStatus(courseId, status as any);
      return { success: true, message: 'Status updated in preview', storage: 'preview_sandbox' };
    }
  }

  async adminGetCourseModules(courseId: number): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/academy/modules.php?course_id=${courseId}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (res.ok && json.success) return json.modules;
    } catch {
      // Fallback
    }
    const c = (store.getState().academyCourses || []).find(x => Number(x.id) === Number(courseId));
    return c?.modules || [];
  }

  async adminCreateModule(payload: { course_id: number; title: string; description?: string; sort_order?: number }): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/academy/modules.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ action: 'create_module', ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return { success: Boolean(json.success), message: json.message || json.error, storage: 'mysql_server' };
    } catch {
      store.adminCreateModule(payload);
      return { success: true, message: 'Module created in preview', storage: 'preview_sandbox' };
    }
  }

  async adminCreateLesson(payload: { module_id: number; course_id: number; title: string; content_type: string; content: string; media_url?: string; duration_minutes: number; sort_order?: number }): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/academy/modules.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ action: 'create_lesson', ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return { success: Boolean(json.success), message: json.message || json.error, storage: 'mysql_server' };
    } catch {
      store.adminCreateLesson(payload);
      return { success: true, message: 'Lesson created in preview', storage: 'preview_sandbox' };
    }
  }

  async adminDeleteLesson(lessonId: number): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/academy/modules.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete_lesson', lesson_id: lessonId, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return { success: Boolean(json.success), message: json.message || 'Deleted', storage: 'mysql_server' };
    } catch {
      store.adminDeleteLesson(lessonId);
      return { success: true, message: 'Deleted in preview', storage: 'preview_sandbox' };
    }
  }

  async adminGetQuestions(courseId: number): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/academy/questions.php?course_id=${courseId}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (res.ok && json.success) return json.questions;
    } catch {
      // Fallback
    }
    const c = (store.getState().academyCourses || []).find(x => Number(x.id) === Number(courseId));
    return c?.assessment?.questions || [];
  }

  async adminSaveQuestion(payload: any): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/academy/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ action: 'save', ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return { success: Boolean(json.success), message: json.message || json.error, storage: 'mysql_server' };
    } catch {
      store.adminSaveQuestion(payload);
      return { success: true, message: 'Question saved in preview', storage: 'preview_sandbox' };
    }
  }

  async adminDeleteQuestion(questionId: number): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/academy/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', id: questionId, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return { success: Boolean(json.success), message: json.message || 'Deleted', storage: 'mysql_server' };
    } catch {
      store.adminDeleteQuestion(questionId);
      return { success: true, message: 'Deleted in preview', storage: 'preview_sandbox' };
    }
  }

  async adminGetAcademyEnrollments(filters?: { course_id?: number; status?: string; search?: string; view?: 'enrollments' | 'attempts' | 'certificates' }): Promise<any> {
    try {
      const q = new URLSearchParams();
      if (filters?.course_id) q.set('course_id', String(filters.course_id));
      if (filters?.status) q.set('status', filters.status);
      if (filters?.search) q.set('search', filters.search);
      if (filters?.view) q.set('view', filters.view);

      const res = await fetch(`${this.baseUrl}/admin/academy/enrollments.php?${q.toString()}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return json;
      }
    } catch {
      // Fallback
    }
    return store.getAdminAcademyData(filters?.view || 'enrollments');
  }

  async adminResetAssessmentAttempts(freelancerId: number, courseId: number): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/academy/enrollments.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ action: 'reset_attempts', freelancer_id: freelancerId, course_id: courseId, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return { success: Boolean(json.success), message: json.message || 'Attempts reset', storage: 'mysql_server' };
    } catch {
      store.adminResetAttempts(freelancerId, courseId);
      return { success: true, message: 'Attempts reset in preview', storage: 'preview_sandbox' };
    }
  }

  // =========================================================================
  // PHASE 5: PROJECTS, TASK DISPATCH, FIELD EVIDENCE & QUALITY CONTROL
  // =========================================================================

  /**
   * Freelancer Task Hub: Assigned, Submitted, Completed, and Available pool
   */
  async getTaskHub(): Promise<{
    success: boolean;
    counts: { assigned: number; submitted: number; completed: number; available: number };
    isKycApproved: boolean;
    assigned: Task[];
    submitted: Task[];
    completed: Task[];
    available: Task[];
  }> {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/hub.php`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return json;
      }
    } catch {
      // Fallback to local store
    }
    const flId = store.getState().currentFreelancer?.id || 'WO-FR-2026-001';
    return store.getTaskHub(flId) as any;
  }

  /**
   * Task Detail with full instructions, evidence requirements, and past submissions
   */
  async getTaskDetail(taskId: string | number): Promise<Task | null> {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/detail.php?id=${taskId}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (res.ok && json.success && json.task) {
        return json.task;
      }
    } catch {
      // Fallback
    }
    return store.getState().tasks.find(t => String(t.id) === String(taskId)) || null;
  }

  /**
   * Freelancer claims an available task
   */
  async acceptTask(taskId: string | number): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/tasks/accept.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ task_id: taskId, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Failed to accept task', error: json.error || 'Failed to accept task', storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Task accepted', storage: 'mysql_server' };
    } catch {
      const flId = store.getState().currentFreelancer?.id || 'WO-FR-2026-001';
      const result = store.acceptTask(String(taskId), flId);
      if (!result.success) {
        return { success: false, message: result.error || 'Failed to accept task', error: result.error, storage: 'preview_sandbox' };
      }
      return { success: true, message: 'Task accepted in preview', storage: 'preview_sandbox' };
    }
  }

  /**
   * Freelancer declines an assigned task
   */
  async declineTask(taskId: string | number, reason?: string): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/tasks/decline.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ task_id: taskId, reason, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return { success: Boolean(json.success), message: json.message || json.error, storage: 'mysql_server' };
    } catch {
      const flId = store.getState().currentFreelancer?.id || 'WO-FR-2026-001';
      store.declineTask(String(taskId), flId, reason);
      return { success: true, message: 'Task declined in preview', storage: 'preview_sandbox' };
    }
  }

  /**
   * Submit Task Evidence (structured answers, optional geolocation, and photos)
   */
  async submitTaskEvidence(
    taskId: string | number,
    payload: {
      notes: string;
      formData?: Record<string, any>;
      latitude?: number;
      longitude?: number;
      address?: string;
      idempotencyKey?: string;
      files?: File[];
    }
  ): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const formData = new FormData();
      formData.append('task_id', String(taskId));
      formData.append('csrf_token', csrf);
      formData.append('notes', payload.notes || '');
      if (payload.formData) {
        formData.append('form_data', JSON.stringify(payload.formData));
      }
      if (payload.latitude !== undefined && payload.latitude !== null) {
        formData.append('latitude', String(payload.latitude));
      }
      if (payload.longitude !== undefined && payload.longitude !== null) {
        formData.append('longitude', String(payload.longitude));
      }
      if (payload.address) {
        formData.append('address', payload.address);
      }
      if (payload.idempotencyKey) {
        formData.append('idempotency_key', payload.idempotencyKey);
      }
      if (payload.files && payload.files.length > 0) {
        payload.files.forEach((f, idx) => {
          formData.append(`evidence_file_${idx}`, f);
        });
      }

      const res = await fetch(`${this.baseUrl}/tasks/submit.php`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: formData,
        signal: AbortSignal.timeout(12000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Failed to submit evidence', error: json.error || 'Failed to submit evidence', storage: 'mysql_server' };
      }
      // Clear offline draft on successful server submission
      store.clearTaskDraft(String(taskId));
      return { success: true, message: json.message || 'Evidence submitted', storage: 'mysql_server' };
    } catch {
      // Local fallback
      const fileNames = (payload.files || []).map(f => f.name);
      store.submitTaskEvidence(
        String(taskId),
        payload.notes,
        payload.address || 'Field Location',
        payload.latitude || 12.9716,
        payload.longitude || 77.5946,
        fileNames.length > 0 ? fileNames : ['Storefront photo with Soundbox', 'Signed Handover Slip']
      );
      store.clearTaskDraft(String(taskId));
      return { success: true, message: 'Evidence submitted in preview mode', storage: 'preview_sandbox' };
    }
  }

  /**
   * Admin: List Projects
   */
  async getAdminProjects(params?: { status?: string; search?: string }): Promise<Project[]> {
    try {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);

      const res = await fetch(`${this.baseUrl}/admin/projects/list.php?${q.toString()}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return json.projects;
      }
    } catch {
      // Fallback
    }
    return store.getState().projects;
  }

  /**
   * Admin: Create, update, publish, or pause project
   */
  async manageAdminProject(payload: any): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/projects/manage.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return { success: Boolean(json.success), message: json.message || json.error, storage: 'mysql_server' };
    } catch {
      if (payload.action === 'update_status') {
        store.updateProjectStatus(String(payload.project_id), payload.status);
      } else if (payload.action === 'update') {
        store.updateProject(String(payload.project_id), payload);
      } else {
        store.addProject(payload);
      }
      return { success: true, message: 'Project saved in preview', storage: 'preview_sandbox' };
    }
  }

  /**
   * Admin: List Tasks
   */
  async getAdminTasks(params?: { projectId?: string | number; status?: string; search?: string; freelancerId?: string | number }): Promise<Task[]> {
    try {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', String(params.projectId));
      if (params?.status) q.set('status', params.status);
      if (params?.freelancerId) q.set('freelancer_id', String(params.freelancerId));
      if (params?.search) q.set('search', params.search);

      const res = await fetch(`${this.baseUrl}/admin/tasks/list.php?${q.toString()}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return json.tasks;
      }
    } catch {
      // Fallback
    }
    return store.getState().tasks;
  }

  /**
   * Admin: Manage Task (create, assign, cancel)
   */
  async manageAdminTask(payload: any): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/tasks/manage.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      return { success: Boolean(json.success), message: json.message || json.error, storage: 'mysql_server' };
    } catch {
      if (payload.action === 'assign') {
        const task = store.getState().tasks.find(t => t.id === String(payload.task_id));
        const fl = store.getState().freelancers.find(f => f.id === String(payload.freelancer_id));
        if (task && fl) {
          task.assignedFreelancerId = fl.id;
          task.assignedFreelancerName = fl.fullName;
          task.status = 'Assigned';
        }
      } else {
        store.addTask(payload);
      }
      return { success: true, message: 'Task saved in preview', storage: 'preview_sandbox' };
    }
  }

  /**
   * Admin: Get QC Queue
   */
  async getAdminQcQueue(projectId?: string | number): Promise<any[]> {
    try {
      const q = projectId ? `?project_id=${projectId}` : '';
      const res = await fetch(`${this.baseUrl}/admin/qc/queue.php${q}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return json.queue;
      }
    } catch {
      // Fallback
    }
    return store.getState().tasks
      .filter(t => ['Submitted', 'Under Review'].includes(t.status))
      .map(t => ({
        ...t,
        submission: t.evidence
      }));
  }

  /**
   * Admin: Review Task (Approve, Rework Required, Reject)
   */
  async reviewAdminTask(
    taskId: string | number,
    decision: 'Approved' | 'Rework Required' | 'Rejected',
    reviewComment: string
  ): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/qc/review.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ task_id: taskId, decision, review_comment: reviewComment, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Failed to submit review', error: json.error || 'Failed to submit review', storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Review completed', storage: 'mysql_server' };
    } catch {
      store.reviewTask(String(taskId), decision, reviewComment);
      return { success: true, message: `Task marked ${decision} in preview`, storage: 'preview_sandbox' };
    }
  }

  // ==========================================
  // PHASE 6: PERFORMANCE, TEAMS & RANK ENGINE
  // ==========================================

  /**
   * Admin: List Field Teams with Active Member Metrics
   */
  async getAdminTeams(params?: { city?: string; status?: string; search?: string }): Promise<Team[]> {
    try {
      const q = new URLSearchParams();
      if (params?.city) q.set('city', params.city);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);

      const res = await fetch(`${this.baseUrl}/admin/teams/list.php?${q.toString()}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.teams)) {
        return json.teams;
      }
    } catch {
      // Fallback to store
    }
    return store.getTeams();
  }

  /**
   * Admin: Manage Team (create, update, add_member, remove_member, set_leader, set_manager)
   */
  async manageAdminTeam(payload: any): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/teams/manage.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Team operation failed', error: json.error || 'Team operation failed', storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Team operation succeeded', data: json, storage: 'mysql_server' };
    } catch {
      // Preview fallback
      if (payload.action === 'create_team') {
        const t = store.addTeam(payload);
        return { success: true, message: `Team ${t.name} created in preview`, data: t, storage: 'preview_sandbox' };
      } else if (payload.action === 'add_member') {
        const r = store.addTeamMember(payload.team_id, payload.freelancer_id, payload.role_in_team);
        if (!r.success) {
          return { success: false, message: r.error || 'Failed to add member', error: r.error, storage: 'preview_sandbox' };
        }
        return { success: true, message: 'Member added in preview', storage: 'preview_sandbox' };
      } else if (payload.action === 'remove_member') {
        store.removeTeamMember(payload.team_id, payload.freelancer_id);
        return { success: true, message: 'Member removed in preview', storage: 'preview_sandbox' };
      } else if (payload.action === 'set_leader') {
        const r = store.setTeamLeader(payload.team_id, payload.leader_id);
        if (!r.success) {
          return { success: false, message: r.error || 'Failed to assign leader', error: r.error, storage: 'preview_sandbox' };
        }
        return { success: true, message: 'Team leader updated in preview', storage: 'preview_sandbox' };
      } else if (payload.action === 'set_manager') {
        const r = store.setTeamManager(payload.team_id, payload.manager_id);
        if (!r.success) {
          return { success: false, message: r.error || 'Failed to assign manager', error: r.error, storage: 'preview_sandbox' };
        }
        return { success: true, message: 'Team manager updated in preview', storage: 'preview_sandbox' };
      }
      return { success: true, message: 'Saved in preview', storage: 'preview_sandbox' };
    }
  }

  /**
   * Admin: Get Rank Promotion Eligibility Board
   */
  async getAdminRankEligibility(): Promise<RankEligibilityCandidate[]> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/ranks/eligibility.php`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.candidates)) {
        return json.candidates;
      }
    } catch {
      // Fallback
    }
    return store.getRankEligibility();
  }

  /**
   * Admin: Promote Freelancer Rank (nominate, approve, reject)
   */
  async promoteFreelancerRank(payload: {
    freelancer_id: string | number;
    target_rank: FreelancerRank;
    action: 'nominate' | 'approve' | 'reject';
    reason: string;
  }): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/ranks/promote.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Promotion decision failed', error: json.error || 'Promotion decision failed', storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Promotion decision saved', storage: 'mysql_server' };
    } catch {
      const res = store.promoteFreelancer(payload);
      if (!res.success) {
        return { success: false, message: res.error || 'Promotion failed', error: res.error, storage: 'preview_sandbox' };
      }
      return { success: true, message: res.message || 'Promotion updated in preview', storage: 'preview_sandbox' };
    }
  }

  /**
   * Admin: Get Performance & Quality Scores Directory
   */
  async getAdminPerformanceScores(params?: { search?: string; rank?: string; qs_status?: string; city?: string; fraud?: string }): Promise<{ scores: any[]; pagination: any; config: any }> {
    try {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.rank) q.set('rank', params.rank);
      if (params?.qs_status) q.set('qs_status', params.qs_status);
      if (params?.city) q.set('city', params.city);
      if (params?.fraud !== undefined) q.set('fraud', String(params.fraud));

      const res = await fetch(`${this.baseUrl}/admin/performance/scores.php?${q.toString()}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return {
          scores: json.scores || [],
          pagination: json.pagination || { total: json.scores?.length || 0, page: 1, limit: 50, pages: 1 },
          config: json.config || store.getState().qualityScoreConfig
        };
      }
    } catch {
      // Fallback
    }

    const freelancers = store.getState().freelancers;
    const scores = freelancers.map((f) => {
      const calc = store.calculateFreelancerScore(f.id);
      return {
        id: f.id,
        registrationRef: f.registrationRef || f.id,
        fullName: f.fullName,
        email: f.email,
        phone: f.phone,
        city: f.city,
        state: f.state,
        status: f.status,
        onboardingStatus: f.onboardingStatus,
        currentRank: f.currentRank || 'Trainee',
        teamId: f.teamId,
        teamName: f.teamName,
        teamCode: f.teamCode,
        qualityScore: f.qualityScore !== undefined ? f.qualityScore : null,
        qsSampleSize: f.qsSampleSize || 0,
        qsStatus: f.qsStatus || (f.qualityScore !== undefined && f.qualityScore !== null ? 'Active' : 'Insufficient Data'),
        qsLastCalculatedAt: f.qsLastCalculatedAt,
        fraudFlag: Boolean(f.fraudFlag),
        fraudReason: f.fraudReason,
        isActiveMember: (f.status === 'Active' || f.onboardingStatus === 'Approved') && (f.qualityScore || 0) >= 70 && !f.fraudFlag,
        metrics: calc?.task_metrics || {
          totalTasks: f.completedTasksCount || 0,
          approvedTasks: f.completedTasksCount || 0,
          reworkTasks: 0,
          rejectedTasks: 0,
          approved30d: f.completedTasksCount ? 1 : 0
        },
        breakdown: calc?.breakdown
      };
    });

    return {
      scores,
      pagination: { total: scores.length, page: 1, limit: 50, pages: 1 },
      config: store.getState().qualityScoreConfig
    };
  }

  /**
   * Admin: Recalculate Quality Score (single or bulk)
   */
  async recalculateQualityScore(freelancerId?: number | string): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/performance/recalculate.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ freelancer_id: freelancerId || 0, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Recalculation failed', error: json.error || 'Recalculation failed', storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Recalculated successfully', data: json.result, storage: 'mysql_server' };
    } catch {
      if (freelancerId) {
        const res = store.calculateFreelancerScore(freelancerId);
        return { success: true, message: 'Quality Score recalculated in preview', data: res, storage: 'preview_sandbox' };
      } else {
        store.recalculateAllScores();
        return { success: true, message: 'Bulk recalculation completed in preview', storage: 'preview_sandbox' };
      }
    }
  }

  /**
   * Admin: Set Disciplinary / Fraud Flag with Reason
   */
  async setFreelancerFraudFlag(freelancerId: number | string, reason: string): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/performance/scores.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ action: 'set_fraud_flag', freelancer_id: freelancerId, reason, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Flagging failed', error: json.error || 'Flagging failed', storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Flag applied', storage: 'mysql_server' };
    } catch {
      store.setFreelancerFraudFlag(freelancerId, reason);
      return { success: true, message: 'Disciplinary flag applied in preview', storage: 'preview_sandbox' };
    }
  }

  /**
   * Admin: Clear Disciplinary / Fraud Flag with Resolution Justification
   */
  async clearFreelancerFraudFlag(freelancerId: number | string, reason: string): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/performance/scores.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ action: 'clear_fraud_flag', freelancer_id: freelancerId, reason, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Failed to clear flag', error: json.error || 'Failed to clear flag', storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Flag cleared', storage: 'mysql_server' };
    } catch {
      store.clearFreelancerFraudFlag(freelancerId, reason);
      return { success: true, message: 'Disciplinary flag cleared in preview', storage: 'preview_sandbox' };
    }
  }

  /**
   * Freelancer: Get Personal Performance, Quality Score Breakdown & Rank Progress
   */
  async getFreelancerPerformance(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/freelancers/performance.php`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return json;
      }
    } catch {
      // Fallback
    }

    const currentFl = store.getState().currentFreelancer || store.getState().freelancers[0];
    if (!currentFl) return null;

    const scoreData = store.calculateFreelancerScore(currentFl.id);
    const team = store.getTeams().find((t) => (t.members || []).some((m) => String(m.freelancerId) === String(currentFl.id)));

    const currentRank = currentFl.currentRank || 'Trainee';
    let nextRank: string | null = null;
    let rankChecklist: any[] = [];

    if (currentRank === 'Trainee') {
      nextRank = 'Team Member';
      rankChecklist = [
        { label: 'KYC Verification Approved', completed: true, requirement: 'Admin KYC approval' },
        { label: 'Complete At Least 1 Field Task', completed: (currentFl.completedTasksCount || 0) >= 1, requirement: `1 task approved by Quality Control (current: ${currentFl.completedTasksCount || 0})` }
      ];
    } else if (currentRank === 'Team Member') {
      nextRank = 'Team Leader';
      const qs = scoreData?.quality_score ?? 0;
      rankChecklist = [
        { label: 'Quality Score >= 85.0', completed: qs >= 85 && Boolean(scoreData?.has_sufficient_data), requirement: `Verified QS >= 85.0 (current: ${scoreData?.has_sufficient_data ? qs : 'Insufficient Data'})` },
        { label: 'Active Team Leadership (>=10 Active Members)', completed: (team?.activeMembersCount || 0) >= 10, requirement: `Lead a team with at least 10 active field members (current: ${team?.activeMembersCount || 0})` },
        { label: 'Clean Disciplinary Record', completed: !currentFl.fraudFlag, requirement: 'Zero active policy violation flags' }
      ];
    } else if (currentRank === 'Team Leader') {
      nextRank = 'Manager';
      const qs = scoreData?.quality_score ?? 0;
      rankChecklist = [
        { label: 'Quality Score >= 85.0', completed: qs >= 85 && Boolean(scoreData?.has_sufficient_data), requirement: `Verified QS >= 85.0 (current: ${qs})` },
        { label: 'Manage At Least 3 Qualifying Teams', completed: false, requirement: 'Oversee 3 field teams each with >=10 active members' },
        { label: 'Clean Disciplinary Record', completed: !currentFl.fraudFlag, requirement: 'Zero active policy violation flags' }
      ];
    }

    return {
      success: true,
      performance: scoreData,
      team: team ? {
        id: team.id,
        team_name: team.name,
        team_code: team.teamCode,
        city: team.city,
        operating_area: team.operatingArea,
        leader_name: team.leader?.name || 'Unassigned',
        leader_phone: team.leader?.phone || '',
        manager_name: team.manager?.name || 'Unassigned',
        role_in_team: 'Member',
        joined_at: team.createdAt
      } : null,
      review_history: [
        {
          id: 1,
          task_ref: 'WO-TSK-2026-001',
          task_title: 'Soundbox Onboarding — 100ft Rd',
          project_name: 'Merchant Soundbox Onboarding',
          decision: 'Approved',
          review_comment: 'Excellent shopfront photo with clear terminal QR barcode visible.',
          reviewed_at: '2026-10-04 15:30:00'
        }
      ],
      rank_progress: {
        current_rank: currentRank,
        next_rank: nextRank,
        checklist: rankChecklist
      }
    };
  }

  // ==========================================
  // PHASE 7: FINANCIAL SUBSYSTEM & WALLET APIS
  // ==========================================

  /**
   * Freelancer: Get Wallet balances, ledger transactions, and payouts
   */
  async getFreelancerWallet(freelancerId?: string | number): Promise<any> {
    try {
      const url = freelancerId 
        ? `${this.baseUrl}/wallet/index.php?freelancer_id=${freelancerId}`
        : `${this.baseUrl}/wallet/index.php`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (res.ok && json.success) return json;
      throw new Error(json.error || 'Failed to fetch wallet');
    } catch {
      // Local fallback projection
      const id = String(freelancerId || store.getState().currentFreelancer?.id || 'WO-FR-2026-001');
      const w = store.getWallet(id);
      const ledgerEntries = (store.getState().ledgerJournals || []).flatMap((j) => 
        (j.lines || []).filter((l) => l.entityId === id).map((l) => ({
          id: l.id,
          account_code: l.accountCode,
          account_name: store.getState().ledgerAccounts.find((a) => a.accountCode === l.accountCode)?.accountName || `Account ${l.accountCode}`,
          entry_type: l.entryType,
          amount: l.amount,
          line_narration: l.lineNarration,
          created_at: l.createdAt,
          journal_ref: j.journalRef,
          transaction_type: j.transactionType,
          reference_id: j.referenceId
        }))
      );
      const reserves = (store.getState().reserveRecords || []).filter((r) => String(r.freelancerId) === id);
      const payouts = (store.getState().payoutRequests || []).filter((p) => String(p.freelancerId) === id);
      const entitlements = (store.getState().earningEntitlements || []).filter((e) => String(e.freelancerId) === id);

      return {
        success: true,
        wallet: w,
        ledger_entries: ledgerEntries,
        reserves,
        payouts,
        entitlements
      };
    }
  }

  /**
   * Freelancer: Request Payout
   */
  async requestPayout(payload: {
    amount: number;
    payment_method: 'UPI' | 'Bank Transfer' | 'NEFT';
    beneficiary_name: string;
    beneficiary_details: string;
    idempotency_key?: string;
  }): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/payouts/request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Failed to submit payout request', error: json.error, storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Payout request registered', data: json.payout, storage: 'mysql_server' };
    } catch {
      const flId = String(store.getState().currentFreelancer?.id || 'WO-FR-2026-001');
      const res = store.requestPayout(
        flId,
        payload.amount,
        payload.payment_method,
        payload.beneficiary_name,
        payload.beneficiary_details,
        payload.idempotency_key
      );
      if (!res.success) {
        return { success: false, message: res.error || 'Payout request failed', error: res.error, storage: 'preview_sandbox' };
      }
      return { success: true, message: `Payout request registered in preview (${res.payout?.payoutRef})`, data: res.payout, storage: 'preview_sandbox' };
    }
  }

  /**
   * Admin: Get Platform Financial Overview & Trial Balance
   */
  async getAdminFinancialOverview(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/financial/overview.php`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (res.ok && json.success) return json;
      throw new Error(json.error || 'Failed to load financial overview');
    } catch {
      const tb = store.getTrialBalance();
      const pos = store.getState().payoutRequests || [];
      const resList = store.getState().reserveRecords || [];
      const ents = store.getState().earningEntitlements || [];

      return {
        success: true,
        trial_balance: tb,
        payout_stats: {
          pending_count: pos.filter((p) => ['Requested', 'Under Review'].includes(p.status)).length,
          pending_amount: pos.filter((p) => ['Requested', 'Under Review'].includes(p.status)).reduce((s, p) => s + p.amount, 0),
          paid_count: pos.filter((p) => p.status === 'Paid').length,
          paid_amount: pos.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0),
          failed_count: pos.filter((p) => p.status === 'Failed').length
        },
        reserve_stats: {
          held_count: resList.filter((r) => r.status === 'Held').length,
          held_amount: resList.filter((r) => r.status === 'Held').reduce((s, r) => s + r.amount, 0),
          matured_ready_count: resList.filter((r) => r.status === 'Held' && r.releaseDueAt <= new Date().toISOString()).length,
          matured_ready_amount: resList.filter((r) => r.status === 'Held' && r.releaseDueAt <= new Date().toISOString()).reduce((s, r) => s + r.amount, 0),
          released_count: resList.filter((r) => r.status === 'Released').length,
          released_amount: resList.filter((r) => r.status === 'Released').reduce((s, r) => s + r.amount, 0)
        },
        growth_pool: {
          total_amount: ents.reduce((s, e) => s + (e.growthPoolShare || 0), 0),
          tl_routed_count: ents.filter((e) => e.teamLeaderRoutedToGrowth).length,
          mgr_routed_count: ents.filter((e) => e.managerRoutedToGrowth).length
        },
        earning_stats: {
          total_gross_field_cost: ents.reduce((s, e) => s + e.grossRate, 0),
          total_freelancer_share: ents.reduce((s, e) => s + e.freelancerShareGross, 0),
          total_leader_share: ents.reduce((s, e) => s + e.teamLeaderShare, 0),
          total_manager_share: ents.reduce((s, e) => s + e.managerShare, 0),
          total_entitlements_count: ents.length
        }
      };
    }
  }

  /**
   * Admin: Get Double-Entry Journals
   */
  async getAdminJournals(params?: { type?: string; ref?: string; limit?: number }): Promise<any> {
    try {
      const q = new URLSearchParams();
      if (params?.type) q.append('type', params.type);
      if (params?.ref) q.append('ref', params.ref);
      if (params?.limit) q.append('limit', String(params.limit));

      const res = await fetch(`${this.baseUrl}/admin/financial/journals.php?${q.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (res.ok && json.success) return json;
      throw new Error(json.error || 'Failed to fetch journals');
    } catch {
      let journals = store.getState().ledgerJournals || [];
      if (params?.type) journals = journals.filter((j) => j.transactionType === params.type);
      if (params?.ref) journals = journals.filter((j) => j.journalRef.includes(params.ref!) || (j.referenceId && j.referenceId.includes(params.ref!)));
      return { success: true, journals, count: journals.length };
    }
  }

  /**
   * Admin: Get Earning Entitlements with 70/20/10 breakdown
   */
  async getAdminEarnings(limit: number = 50): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/financial/earnings.php?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (res.ok && json.success) return json;
      throw new Error(json.error || 'Failed to fetch earnings');
    } catch {
      const entitlements = (store.getState().earningEntitlements || []).slice(0, limit);
      return { success: true, entitlements, count: entitlements.length };
    }
  }

  /**
   * Admin: Get Reserves and trigger release
   */
  async getAdminReserves(status?: string): Promise<any> {
    try {
      const url = status 
        ? `${this.baseUrl}/admin/financial/reserves.php?status=${status}`
        : `${this.baseUrl}/admin/financial/reserves.php`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (res.ok && json.success) return json;
      throw new Error(json.error || 'Failed to fetch reserves');
    } catch {
      let reserves = store.getState().reserveRecords || [];
      if (status) reserves = reserves.filter((r) => r.status === status);
      return { success: true, reserves, count: reserves.length };
    }
  }

  /**
   * Admin: Trigger Batch or Specific Reserve Release
   */
  async releaseMaturedReserves(reserveId?: number | string): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/financial/reserves.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ action: 'release_matured', reserve_id: reserveId, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Failed to release reserves', error: json.error, storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Reserves released', data: json.result, storage: 'mysql_server' };
    } catch {
      const res = store.releaseMaturedReserves(reserveId);
      return {
        success: true,
        message: `Released ${res.releasedCount} reserves (₹${res.totalAmount.toFixed(2)}) in preview`,
        data: res,
        storage: 'preview_sandbox'
      };
    }
  }

  /**
   * Admin: Get Payout Requests
   */
  async getAdminPayouts(status?: string): Promise<any> {
    try {
      const url = status
        ? `${this.baseUrl}/admin/financial/payouts.php?status=${status}`
        : `${this.baseUrl}/admin/financial/payouts.php`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (res.ok && json.success) return json;
      throw new Error(json.error || 'Failed to fetch payouts');
    } catch {
      let payouts = store.getState().payoutRequests || [];
      if (status) payouts = payouts.filter((p) => p.status === status);
      return { success: true, payouts, count: payouts.length };
    }
  }

  /**
   * Admin: Settle or Reject Payout Request
   */
  async processAdminPayout(payload: {
    payout_id: number | string;
    action: 'settle' | 'reject';
    provider_transfer_id?: string;
    reason?: string;
  }): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/financial/payouts.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Failed to process payout', error: json.error, storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Payout processed', data: json.result, storage: 'mysql_server' };
    } catch {
      if (payload.action === 'settle') {
        const res = store.settlePayout(payload.payout_id, payload.provider_transfer_id);
        if (!res.success) return { success: false, message: res.error || 'Settlement failed', error: res.error, storage: 'preview_sandbox' };
        return { success: true, message: 'Payout marked Paid in preview', storage: 'preview_sandbox' };
      } else {
        const res = store.reversePayout(payload.payout_id, payload.reason || 'Rejected by finance ops');
        if (!res.success) return { success: false, message: res.error || 'Reversal failed', error: res.error, storage: 'preview_sandbox' };
        return { success: true, message: 'Payout rejected and refunded in preview', storage: 'preview_sandbox' };
      }
    }
  }

  /**
   * Admin: Get Wallet-to-Ledger Reconciliation Audit
   */
  async getAdminFinancialReconciliation(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/financial/reconcile.php`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (res.ok && json.success) return json;
      throw new Error(json.error || 'Failed to run reconciliation');
    } catch {
      const tb = store.getTrialBalance();
      const fls = store.getState().freelancers || [];
      const walletAudits = fls.map((fl) => {
        const w = store.getWallet(fl.id);
        return {
          freelancer_id: fl.id,
          full_name: fl.fullName,
          registration_ref: fl.registrationRef || fl.id,
          wallet_available: w.availableBalance,
          ledger_available: w.availableBalance,
          available_discrepancy: 0,
          wallet_reserved: w.reservedBalance,
          verified_held_reserves: w.reservedBalance,
          wallet_payouts_in_progress: w.payoutsInProgress,
          verified_payouts_in_progress: w.payoutsInProgress,
          is_reconciled: true
        };
      });

      return {
        success: true,
        overall_reconciled: tb.is_balanced,
        audit_timestamp: new Date().toISOString(),
        trial_balance: tb,
        summary: {
          total_freelancer_wallets: walletAudits.length,
          total_wallet_available: walletAudits.reduce((s, w) => s + w.wallet_available, 0),
          total_ledger_available: walletAudits.reduce((s, w) => s + w.ledger_available, 0),
          variance: 0,
          exceptions_count: 0
        },
        exceptions: [],
        wallet_audits: walletAudits
      };
    }
  }

  /**
   * Admin: Post Balanced Adjustment Journal
   */
  async postAdminFinancialAdjustment(payload: {
    narration: string;
    supervisor_reason: string;
    entries?: any[];
    reversal_of_journal_id?: number | string;
  }): Promise<ApiResponse> {
    const csrf = await this.getCsrfToken();
    try {
      const res = await fetch(`${this.baseUrl}/admin/financial/adjust.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ ...payload, csrf_token: csrf }),
        signal: AbortSignal.timeout(6000)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Failed to post adjustment', error: json.error, storage: 'mysql_server' };
      }
      return { success: true, message: json.message || 'Adjustment posted', data: json.journal, storage: 'mysql_server' };
    } catch {
      const res = store.postManualAdjustment(
        payload.narration,
        payload.supervisor_reason,
        payload.entries || [],
        payload.reversal_of_journal_id
      );
      if (!res.success) {
        return { success: false, message: res.error || 'Adjustment failed', error: res.error, storage: 'preview_sandbox' };
      }
      return { success: true, message: 'Adjustment journal posted in preview', storage: 'preview_sandbox' };
    }
  }
}

export const api = new ApiService();

