// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error)
    throw error
  }
}

// ==========================================
// JOB SEEKER APIs
// ==========================================

export interface RegisterPhoneData {
  phoneNumber: string
}

export interface VerifyOTPData {
  phoneNumber: string
  otp: string
}

export interface CompleteProfileData {
  name: string
  email: string
  dateOfBirth: string
  gender: string
  languagePreference: string
}

export interface SelectCategoriesData {
  categories: string[]
}

export interface AddExperienceData {
  position: string
  company: string
  startDate: string
  endDate: string
  currentlyWorking: boolean
}

export interface Job {
  id: string
  title: string
  company: string
  location: string
  salary: string
  type: string
  description: string
  requirements: string[]
  postedDate: string
}

export interface Application {
  id: string
  jobId: string
  jobTitle: string
  company: string
  appliedDate: string
  status: 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'REJECTED'
}

// Job Seeker Registration Flow
export const jobSeekerAPI = {
  // Step 1: Register with phone number
  registerPhone: async (data: RegisterPhoneData) => {
    return apiRequest('/job-seeker/register/phone', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Step 2: Verify OTP
  verifyOTP: async (data: VerifyOTPData) => {
    return apiRequest('/job-seeker/register/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Step 3: Complete profile
  completeProfile: async (data: CompleteProfileData) => {
    return apiRequest('/job-seeker/register/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Step 4: Select job categories
  selectCategories: async (data: SelectCategoriesData) => {
    return apiRequest('/job-seeker/register/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Step 5: Add work experience
  addExperience: async (data: AddExperienceData) => {
    return apiRequest('/job-seeker/register/experience', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Login
  login: async (credentials: { email: string; password: string }) => {
    return apiRequest('/job-seeker/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  // Get job feed
  getJobFeed: async (filters?: {
    location?: string
    category?: string
    type?: string
    search?: string
  }) => {
    const queryParams = new URLSearchParams(filters as any).toString()
    return apiRequest<Job[]>(`/jobs${queryParams ? `?${queryParams}` : ''}`)
  },

  // Get job details
  getJobDetails: async (jobId: string) => {
    return apiRequest<Job>(`/jobs/${jobId}`)
  },

  // Apply for job
  applyForJob: async (jobId: string, applicationData: {
    resume?: File
    coverLetter?: string
  }) => {
    const formData = new FormData()
    if (applicationData.resume) {
      formData.append('resume', applicationData.resume)
    }
    if (applicationData.coverLetter) {
      formData.append('coverLetter', applicationData.coverLetter)
    }

    return apiRequest(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  },

  // Get my applications
  getMyApplications: async () => {
    return apiRequest<Application[]>('/job-seeker/applications')
  },

  // Save job
  saveJob: async (jobId: string) => {
    return apiRequest(`/job-seeker/saved-jobs/${jobId}`, {
      method: 'POST',
    })
  },

  // Unsave job
  unsaveJob: async (jobId: string) => {
    return apiRequest(`/job-seeker/saved-jobs/${jobId}`, {
      method: 'DELETE',
    })
  },

  // Get saved jobs
  getSavedJobs: async () => {
    return apiRequest<Job[]>('/job-seeker/saved-jobs')
  },

  // Update profile
  updateProfile: async (profileData: Partial<CompleteProfileData>) => {
    return apiRequest('/job-seeker/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  },

  // Upload resume
  uploadResume: async (file: File) => {
    const formData = new FormData()
    formData.append('resume', file)

    return apiRequest('/job-seeker/resume', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  },

  // Delete account
  deleteAccount: async () => {
    return apiRequest('/job-seeker/account', {
      method: 'DELETE',
    })
  },
}

// ==========================================
// EMPLOYER APIs
// ==========================================

export interface EmployerRegistrationData {
  employerType: 'INDIVIDUAL' | 'CORPORATE'
  companyName: string
  contactPerson: string
  email: string
  phoneNumber: string
  password: string
  companyAddress: string
  companySize?: string
  industry?: string
  website?: string
}

export interface PostJobData {
  title: string
  description: string
  requirements: string[]
  location: string
  salary: string
  jobType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP'
  experienceLevel: string
  category: string
  skills: string[]
  benefits?: string[]
  applicationDeadline?: string
}

export interface JobApplication {
  id: string
  applicantName: string
  applicantEmail: string
  appliedDate: string
  status: 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'REJECTED'
  resumeUrl?: string
  coverLetter?: string
}

export const employerAPI = {
  // Register employer
  register: async (data: EmployerRegistrationData) => {
    return apiRequest('/employer/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Login employer
  login: async (credentials: { email: string; password: string }) => {
    return apiRequest('/employer/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  // Get employer dashboard stats
  getDashboardStats: async () => {
    return apiRequest('/employer/dashboard/stats')
  },

  // Post a new job
  postJob: async (jobData: PostJobData) => {
    return apiRequest('/employer/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    })
  },

  // Get employer's posted jobs
  getMyJobs: async (filters?: {
    status?: 'ACTIVE' | 'CLOSED' | 'DRAFT'
    search?: string
  }) => {
    const queryParams = new URLSearchParams(filters as any).toString()
    return apiRequest<Job[]>(`/employer/jobs${queryParams ? `?${queryParams}` : ''}`)
  },

  // Update job
  updateJob: async (jobId: string, jobData: Partial<PostJobData>) => {
    return apiRequest(`/employer/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    })
  },

  // Delete job
  deleteJob: async (jobId: string) => {
    return apiRequest(`/employer/jobs/${jobId}`, {
      method: 'DELETE',
    })
  },

  // Close job posting
  closeJob: async (jobId: string) => {
    return apiRequest(`/employer/jobs/${jobId}/close`, {
      method: 'POST',
    })
  },

  // Get applications for a specific job
  getJobApplications: async (jobId: string) => {
    return apiRequest<JobApplication[]>(`/employer/jobs/${jobId}/applications`)
  },

  // Update application status
  updateApplicationStatus: async (
    applicationId: string,
    status: 'REVIEWED' | 'SHORTLISTED' | 'REJECTED'
  ) => {
    return apiRequest(`/employer/applications/${applicationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },

  // Update company profile
  updateProfile: async (profileData: Partial<EmployerRegistrationData>) => {
    return apiRequest('/employer/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  },

  // Upload company logo
  uploadLogo: async (file: File) => {
    const formData = new FormData()
    formData.append('logo', file)

    return apiRequest('/employer/logo', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  },

  // Get payment history
  getPaymentHistory: async () => {
    return apiRequest('/employer/payments')
  },
}

// ==========================================
// ADMIN APIs
// ==========================================

export const adminAPI = {
  // Admin login
  login: async (credentials: { email: string; password: string }) => {
    return apiRequest('/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  // Dashboard stats
  getDashboardStats: async () => {
    return apiRequest('/admin/dashboard/stats')
  },

  // Employee Management
  employees: {
    getAll: async (filters?: {
      status?: 'VERIFIED' | 'PENDING' | 'REJECTED'
      location?: string
      language?: string
      search?: string
    }) => {
      const queryParams = new URLSearchParams(filters as any).toString()
      return apiRequest(`/admin/employees${queryParams ? `?${queryParams}` : ''}`)
    },

    getById: async (employeeId: string) => {
      return apiRequest(`/admin/employees/${employeeId}`)
    },

    verifyDocument: async (employeeId: string, documentId: string) => {
      return apiRequest(`/admin/employees/${employeeId}/documents/${documentId}/verify`, {
        method: 'POST',
      })
    },

    rejectDocument: async (employeeId: string, documentId: string, reason?: string) => {
      return apiRequest(`/admin/employees/${employeeId}/documents/${documentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    },

    sendPaymentReminder: async (employeeId: string) => {
      return apiRequest(`/admin/employees/${employeeId}/payment-reminder`, {
        method: 'POST',
      })
    },
  },

  // Employer Management
  employers: {
    getAll: async (filters?: {
      status?: 'VERIFIED' | 'PENDING' | 'REJECTED'
      type?: 'INDIVIDUAL' | 'CORPORATE'
      search?: string
    }) => {
      const queryParams = new URLSearchParams(filters as any).toString()
      return apiRequest(`/admin/employers${queryParams ? `?${queryParams}` : ''}`)
    },

    getById: async (employerId: string) => {
      return apiRequest(`/admin/employers/${employerId}`)
    },

    verifyDocument: async (employerId: string, documentId: string) => {
      return apiRequest(`/admin/employers/${employerId}/documents/${documentId}/verify`, {
        method: 'POST',
      })
    },

    rejectDocument: async (employerId: string, documentId: string, reason?: string) => {
      return apiRequest(`/admin/employers/${employerId}/documents/${documentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    },

    sendPaymentReminder: async (employerId: string) => {
      return apiRequest(`/admin/employers/${employerId}/payment-reminder`, {
        method: 'POST',
      })
    },
  },

  // Post Moderation
  posts: {
    getAll: async (filters?: {
      status?: 'PENDING' | 'APPROVED' | 'REJECTED'
      search?: string
    }) => {
      const queryParams = new URLSearchParams(filters as any).toString()
      return apiRequest(`/admin/posts${queryParams ? `?${queryParams}` : ''}`)
    },

    getById: async (postId: string) => {
      return apiRequest(`/admin/posts/${postId}`)
    },

    approve: async (postId: string) => {
      return apiRequest(`/admin/posts/${postId}/approve`, {
        method: 'POST',
      })
    },

    reject: async (postId: string, reason?: string) => {
      return apiRequest(`/admin/posts/${postId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    },
  },
}

// Export everything
export default {
  jobSeekerAPI,
  employerAPI,
  adminAPI,
}
