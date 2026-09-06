/**
 * API Routes Directory & Documentation
 * 
 * This file serves as a reference for all API endpoints
 * organized by domain and functionality.
 */

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                            AUTHENTICATION
 * ═══════════════════════════════════════════════════════════════════════════
 */

// POST /api/auth/signin           (NextAuth) - Sign in with provider
// POST /api/auth/signout          (NextAuth) - Sign out
// POST /api/auth/callback/*       (NextAuth) - OAuth callback
// GET  /api/auth/session          (NextAuth) - Get current session

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                            ORDERS & PAYMENTS
 * ═══════════════════════════════════════════════════════════════════════════
 */

// POST   /api/v1/orders
//   Create pending order for plan purchase
//   Auth: REQUIRED
//   Body: { planType: 'BASIC' | 'PRO' | 'EXPERT' }
//   Response: { orderId, transferCode, amount, bankAccount, qrUrl, expiresAt }
//   Rate Limit: 5 req/min per user
export interface CreateOrderResponse {
  orderId: string
  transferCode: string
  amount: number
  bankAccount: string
  bankName: string
  qrUrl: string
  expiresAt: Date
  instructions: string
}

// GET    /api/v1/orders/:id
//   Get order details (owner only)
//   Auth: REQUIRED
//   Params: orderId
//   Response: { id, transferCode, amount, status, createdAt, expiresAt, paidAt }
export interface GetOrderResponse {
  id: string
  transferCode: string
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
  createdAt: Date
  expiresAt: Date
  paidAt?: Date
}

// GET    /api/v1/orders/:id/status
//   Poll payment status
//   Auth: REQUIRED
//   Response: { status, verified, message }
export interface OrderStatusResponse {
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED'
  verified: boolean
  message: string
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                          COURSE & LESSONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

// GET    /api/v1/modules
//   List courses (paginated)
//   Auth: REQUIRED (BASIC+ plan)
//   Query: { limit, offset, category? }
export interface ListCoursesResponse {
  courses: Array<{
    id: string
    title: string
    thumbnail: string
    progress: number
  }>
  pagination: { limit: number; offset: number; total: number }
}

// GET    /api/v1/modules/:id
//   Get course with lessons
//   Auth: OPTIONAL (full content requires BASIC+)
//   Response: { courseId, lessons, stats }
export interface GetCourseResponse {
  courseId: string
  lessons: Array<{
    id: string
    title: string
    order: number
    duration?: number
    description?: string
    progress?: { completed: boolean; watchTime: number; lastPosition: number }
  }>
  stats: { total: number; completed: number }
}

// GET    /api/v1/lessons/:id/url
//   Get signed video URL
//   Auth: REQUIRED (BASIC+)
//   Response: { url, expiresAt }
export interface GetVideoUrlResponse {
  url: string
  expiresAt: Date
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                           USER PROGRESS
 * ═══════════════════════════════════════════════════════════════════════════
 */

// GET    /api/v1/progress
//   Get overall progress summary
//   Auth: REQUIRED
export interface GetProgressResponse {
  summary: {
    total: number
    completed: number
    inProgress: number
    percentage: number
  }
  stats: {
    totalLessons: number
    completedLessons: number
    enrolledCourses: number
  }
}

// POST   /api/v1/progress
//   Update lesson progress
//   Auth: REQUIRED
//   Body: { lessonId, watchTimeDelta?, lastPosition?, completed? }
//   Rate Limit: 60 req/min per user
export interface UpdateProgressResponse {
  lessonId: string
  watchTime: number
  lastPosition: number
  completed: boolean
  lastWatched: Date
}

// GET    /api/v1/progress/lessons
//   Get all lesson progress
//   Auth: REQUIRED
export interface GetLessonsProgressResponse {
  lessons: Array<{
    lessonId: string
    courseId: string
    watchTime: number
    completed: boolean
    lastWatched: Date
  }>
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                      SUBMISSIONS (PRO+ PLAN)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// GET    /api/v1/submissions
//   List user's submissions
//   Auth: REQUIRED (PRO+)
export interface GetSubmissionsResponse {
  submissions: Array<{
    id: string
    lessonId: string
    status: 'PENDING' | 'GRADED' | 'REJECTED'
    score?: number
    feedback?: string
    createdAt: Date
    gradedAt?: Date
  }>
}

// POST   /api/v1/submissions
//   Submit assignment video
//   Auth: REQUIRED (PRO+)
//   Body: { lessonId, fileUrl }
export interface SubmitAssignmentResponse {
  submissionId: string
  status: 'PENDING'
  message: string
}

// GET    /api/v1/submissions/:id
//   Get submission details
//   Auth: REQUIRED (owner or admin)
export interface GetSubmissionResponse {
  id: string
  lessonId: string
  videoUrl: string
  status: 'PENDING' | 'GRADED' | 'REJECTED'
  score?: number
  feedback?: string
  createdAt: Date
  gradedAt?: Date
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                       QUIZ (PRO+ PLAN)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// GET    /api/v1/quiz
//   Get quiz questions
//   Auth: REQUIRED (PRO+)
export interface GetQuizResponse {
  questions: Array<{
    id: string
    text: string
    type: 'multiple_choice' | 'short_answer'
    options?: string[]
  }>
}

// POST   /api/v1/quiz/submit
//   Submit quiz answers
//   Auth: REQUIRED (PRO+)
export interface SubmitQuizResponse {
  score: number
  percentage: number
  passed: boolean
  feedback?: string
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                      CERTIFICATES (EXPERT PLAN)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// POST   /api/v1/certificate
//   Request certificate (must meet requirements)
//   Auth: REQUIRED (EXPERT+)
//   Response: { status, certCode, downloadUrl }
//   Rate Limit: 1 req/hour
export interface IssueCertificateResponse {
  status: 'requested' | 'ready'
  message: string
  certCode: string
  downloadUrl?: string
}

// GET    /api/v1/certificate
//   Get user's certificate
//   Auth: REQUIRED (EXPERT+)
export interface GetCertificateResponse {
  certCode: string
  issuedAt: Date
  downloadUrl: string
  verifyUrl: string
}

// GET    /api/v1/certificate/download
//   Download certificate PDF
//   Auth: REQUIRED (EXPERT+)

// GET    /api/verify/:certCode
//   Verify certificate (public endpoint)
//   Auth: OPTIONAL
export interface VerifyCertificateResponse {
  valid: boolean
  certCode: string
  userName: string
  issuedAt: Date
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                        WEBHOOKS
 * ═══════════════════════════════════════════════════════════════════════════
 */

// POST   /api/webhook/bank
//   Bank transaction webhook from Casso
//   Auth: HMAC signature verification
//   Body: { data: Array<{ id, amount, senderName, description, transactionDate }> }
export interface WebhookBankResponse {
  processed: number
  results: Array<{
    status: 'SUCCESS' | 'DUPLICATE' | 'NO_MATCH' | 'AMOUNT_MISMATCH'
    orderId?: string
  }>
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                        ADMIN ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════════════
 */

// GET    /api/v1/admin/dashboard
//   Admin dashboard stats
//   Auth: REQUIRED (ADMIN)
export interface AdminDashboardResponse {
  totalUsers: number
  totalRevenue: number
  monthlyRevenue: number
  averageOrderValue: number
  topCourses: Array<{ courseId: string; enrollments: number }>
  recentOrders: Array<any>
}

// GET    /api/v1/admin/students
//   List all students with filters
//   Auth: REQUIRED (ADMIN)
//   Query: { plan?, search?, limit, offset }
export interface AdminStudentsResponse {
  students: Array<{
    id: string
    name: string
    email: string
    planType: string
    completedLessons: number
    createdAt: Date
  }>
  pagination: { limit: number; offset: number; total: number }
}

// PUT    /api/v1/admin/students/:id/plan
//   Manually upgrade student plan
//   Auth: REQUIRED (ADMIN)
//   Body: { planType, reason }
export interface AdminUpgradeResponse {
  userId: string
  newPlan: string
  message: string
}

// GET    /api/v1/admin/orders
//   List all orders
//   Auth: REQUIRED (ADMIN)
export interface AdminOrdersResponse {
  orders: Array<any>
  pagination: { limit: number; offset: number; total: number }
}

// PUT    /api/v1/admin/orders/:id/verify
//   Manually verify payment
//   Auth: REQUIRED (ADMIN)
export interface AdminVerifyOrderResponse {
  orderId: string
  status: 'COMPLETED'
  message: string
}

// GET    /api/v1/admin/submissions
//   Get pending submissions for grading
//   Auth: REQUIRED (ADMIN)
export interface AdminSubmissionsResponse {
  submissions: Array<any>
}

// POST   /api/v1/admin/submissions/:id/feedback
//   Grade submission
//   Auth: REQUIRED (ADMIN)
export interface AdminGradeResponse {
  submissionId: string
  score: number
  message: string
}

// GET    /api/v1/admin/export
//   Export students as Excel/CSV
//   Auth: REQUIRED (ADMIN)
//   Query: { format: 'xlsx' | 'csv', plan? }

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                          CRON JOBS (Vercel)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// GET    /api/cron/payment-reminder
//   Send payment reminders for expiring orders
//   Auth: CRON_SECRET header
//   Schedule: Every 30 minutes

// GET    /api/cron/expire-orders
//   Expire stale pending orders
//   Auth: CRON_SECRET header
//   Schedule: Every 15 minutes

// GET    /api/cron/monthly-report
//   Generate monthly statistics report
//   Auth: CRON_SECRET header
//   Schedule: 1st of month at 7:00 AM

// GET    /api/cron/progress-digest
//   Send weekly progress digests to users
//   Auth: CRON_SECRET header
//   Schedule: Every Sunday at 7:00 PM

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                          ERROR RESPONSES
 * ═══════════════════════════════════════════════════════════════════════════
 */

// All errors follow standard format:
export interface ApiErrorResponse {
  success: false
  error: {
    code: string // Machine-readable error code
    message: string // Human-readable message (localized)
    fields?: Array<{ field: string; message: string }> // Validation errors
    details?: Record<string, any> // Additional context
  }
  meta: {
    timestamp: string
    path: string
  }
}

// Common error codes:
// - UNAUTHORIZED: Not authenticated
// - FORBIDDEN: Authenticated but no permission
// - VALIDATION_ERROR: Input validation failed (422)
// - NOT_FOUND: Resource not found (404)
// - CONFLICT: Business rule violated (409)
// - RATE_LIMITED: Too many requests (429)
// - INTERNAL_ERROR: Server error (500)
