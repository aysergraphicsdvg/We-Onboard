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
import { Enquiry, Freelancer, MsmeRequest, AdminUser } from '../../types';

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
          return user;
        }
      }
    } catch {
      // API unreachable
    }
    return null;
  }
}

export const api = new ApiService();
