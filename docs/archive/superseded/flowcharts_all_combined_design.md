> **SUPERSEDED 2026-05-08** — pre-Aadhaar-lock spec containing v2 features (escrow, AI document verification, skill assessments, WhatsApp, auto-moderation). **v1 source of truth: [`docs/_context/02-scope-locked.md`](../../_context/02-scope-locked.md).** Kept for v2 reference.

# Flowchart Diagrams

## 1_job_seeker_onboarding.mmd

```mermaid
flowchart TD
  A[User Opens App/Website] --> B[Select Language]
  B --> C[Enter Phone Number]
  C --> D[Receive OTP]
  D --> E{OTP Correct?}
  E -->|No| F[Resend OTP]
  F --> D
  E -->|Yes| G[Create Basic Profile]
  G --> H[Enter Name]
  H --> I[Upload Profile Photo]
  I --> J[Allow Location Access]
  J --> K[Select Skills from Categories]
  K --> L[Add Work Experience Optional]
  L --> M[Upload Documents Optional]
  M --> N[Profile Created Successfully]
  N --> O[Show Tutorial/Welcome]
  O --> P[Navigate to Job Feed]
```

## 2_job_discovery.mmd

```mermaid
flowchart TD
  A[Open Job Feed] --> B[View Location-Based Jobs]
  B --> C{Want to Search?}
  C -->|Yes| D[Use Search/Filter]
  C -->|No| E[Browse Recommended Jobs]
  D --> F[Enter Search Keywords]
  F --> G[Apply Filters Distance/Salary/Type]
  G --> H[View Search Results]
  E --> H
  H --> I[Select Job to View]
  I --> J[View Job Details]
  J --> K{Interested in Job?}
  K -->|No| L[Go Back to Results]
  K -->|Save for Later| M[Add to Saved Jobs]
  K -->|Yes| N{Profile Complete Enough?}
  N -->|No| O[Complete Profile Prompt]
  O --> P[Update Required Fields]
  P --> Q[One-Click Apply]
  N -->|Yes| Q
  Q --> R[Add Optional Voice Message]
  R --> S[Confirm Application]
  S --> T[Application Submitted]
  T --> U[Add to My Applications]
  U --> V[Receive Confirmation SMS]
  L --> H
  M --> H
```

## 3_job_provider_registration.mmd

```mermaid
flowchart TD
  A[Visit Employer Portal] --> B[Click Sign Up]
  B --> C{Individual or Business?}
  C -->|Individual| D[Enter Personal Details]
  C -->|Business| E[Enter Business Details]
  D --> F[Phone Number Verification]
  E --> G[Business Registration Number]
  G --> H[Upload Business Documents]
  H --> I[Business Verification Pending]
  I --> J[Admin Review]
  J --> K{Verification Approved?}
  K -->|No| L[Request Additional Documents]
  L --> H
  K -->|Yes| F
  F --> M[Enter OTP]
  M --> N{OTP Correct?}
  N -->|No| O[Resend OTP]
  O --> M
  N -->|Yes| P[Set Password]
  P --> Q[Account Created]
  Q --> R[Email Confirmation]
  R --> S[Access Employer Dashboard]
```

## 4_job_posting.mmd

```mermaid
flowchart TD
  A[Employer Dashboard] --> B[Click Post New Job]
  B --> C[Select Job Category]
  C --> D[Choose Subcategory]
  D --> E[Enter Job Title]
  E --> F[Write Job Description]
  F --> G[Add Job Requirements]
  G --> H[Set Location & Radius]
  H --> I[Define Salary Range]
  I --> J[Select Payment Type]
  J --> K{Hourly/Daily/Fixed?}
  K --> L[Set Urgency Level]
  L --> M[Add Job Duration]
  M --> N[Review Job Details]
  N --> O{Details Correct?}
  O -->|No| P[Edit Job Details]
  P --> N
  O -->|Yes| Q[Publish Job]
  Q --> R[Job Goes Live]
  R --> S[Notify Relevant Workers]
  S --> T[Job Added to Dashboard]
```

## 5_candidate_management.mmd

```mermaid
flowchart TD
  A[Job Posted] --> B[Receive Applications]
  B --> C[View Applications List]
  C --> D[Sort/Filter Applications]
  D --> E[Select Application to Review]
  E --> F[View Worker Profile]
  F --> G[Check Ratings & Reviews]
  G --> H[Listen to Voice Message]
  H --> I{Interested in Candidate?}
  I -->|No| J[Mark as Rejected]
  I -->|Maybe| K[Request More Information]
  I -->|Yes| L[Shortlist Candidate]
  J --> M[Send Rejection Message]
  K --> N[Send Message to Worker]
  L --> O[Schedule Interview/Meeting]
  O --> P[Send Interview Details]
  P --> Q[Conduct Interview]
  Q --> R{Hire This Candidate?}
  R -->|No| S[Decline with Feedback]
  R -->|Yes| T[Send Job Offer]
  T --> U{Offer Accepted?}
  U -->|No| V[Continue with Other Candidates]
  U -->|Yes| W[Mark Job as Filled]
  W --> X[Start Work Process]
  X --> Y[Job Completion & Rating]
  M --> Z[Continue Reviewing Applications]
  N --> AA[Wait for Worker Response]
  S --> Z
  V --> Z
  Z --> C
  AA --> C
```

## 6_admin_user_management.mmd

```mermaid
flowchart TD
  A[New User Registration] --> B[Auto-Profile Check]
  B --> C{Profile Complete?}
  C -->|No| D[Send Completion Reminder]
  C -->|Yes| E[Document Verification Check]
  E --> F{Documents Uploaded?}
  F -->|No| G[Request Document Upload]
  F -->|Yes| H[AI Document Screening]
  H --> I{AI Verification Pass?}
  I -->|No| J[Manual Review Required]
  I -->|Yes| K[Auto-Approve Account]
  J --> L[Admin Agent Review]
  L --> M{Manual Verification Pass?}
  M -->|No| N[Request Document Resubmission]
  M -->|Yes| K
  K --> O[Send Approval Notification]
  O --> P[Account Status: Active]
  N --> Q[Send Rejection Notification]
  Q --> R[Account Status: Pending]
  D --> S[Monitor Profile Updates]
  G --> S
  S --> C
```

## 7_content_moderation.mmd

```mermaid
flowchart TD
  A[Content Posted] --> B[AI Content Scanning]
  B --> C{Inappropriate Content?}
  C -->|No| D[Content Approved]
  C -->|Yes| E[Flag for Manual Review]
  D --> F[Content Visible to Users]
  E --> G[Admin Review Queue]
  G --> H[Manual Content Review]
  H --> I{Violates Guidelines?}
  I -->|No| J[Remove Flag]
  I -->|Minor Violation| K[Issue Warning]
  I -->|Major Violation| L[Remove Content]
  J --> D
  K --> M[Log Warning]
  L --> N[Notify Content Creator]
  M --> O[Monitor User Activity]
  N --> P{Repeat Offender?}
  P -->|No| Q[Content Removed]
  P -->|Yes| R[Suspend Account]
  R --> S[Review Account History]
  S --> T{Permanent Ban?}
  T -->|No| U[Temporary Suspension]
  T -->|Yes| V[Permanent Account Ban]
  O --> W[User Report Received]
  W --> E
```

## 8_document_verification.mmd

```mermaid
flowchart TD
  A[User Uploads Documents] --> B[File Format Check]
  B --> C{Valid Format?}
  C -->|No| D[Request Reupload]
  C -->|Yes| E[OCR Text Extraction]
  E --> F[Document Type Detection]
  F --> G[AI Authenticity Check]
  G --> H{Auto-Verification Pass?}
  H -->|Yes| I[Mark as Verified]
  H -->|No| J[Queue for Manual Review]
  I --> K[Add Verification Badge]
  K --> L[Notify User - Approved]
  J --> M[Agent Manual Review]
  M --> N[Cross-check with Database]
  N --> O{Documents Valid?}
  O -->|Yes| I
  O -->|No| P[Request Additional Documents]
  O -->|Unclear| Q[Request Phone Verification]
  P --> R[Notify User - Resubmit]
  Q --> S[Schedule Verification Call]
  S --> T[Conduct Phone Verification]
  T --> U{Phone Verification Pass?}
  U -->|Yes| I
  U -->|No| V[Mark as Unverified]
  V --> W[Notify User - Rejected]
  D --> X[User Resubmits]
  R --> X
  X --> A
```

## 9_skill_verification.mmd

```mermaid
flowchart TD
  A[Worker Claims Skill] --> B[Select Skill Category]
  B --> C{Skill Requires Test?}
  C -->|No| D[Self-Declaration]
  C -->|Yes| E[Online Skill Assessment]
  D --> F[Add to Profile - Unverified]
  E --> G[Take Online Test]
  G --> H{Test Score > Threshold?}
  H -->|No| I[Test Failed]
  H -->|Yes| J[Practical Assessment Required?]
  I --> K[Allow Retake After 24hrs]
  J -->|No| L[Skill Verified - Badge Added]
  J -->|Yes| M[Schedule Field Assessment]
  M --> N[Field Agent Assignment]
  N --> O[On-site Skill Demonstration]
  O --> P[Agent Evaluation]
  P --> Q{Practical Assessment Pass?}
  Q -->|Yes| L
  Q -->|No| R[Additional Training Suggested]
  R --> S[Link to Training Resources]
  S --> T[Allow Re-assessment]
  L --> U[Update Worker Profile]
  U --> V[Notify Potential Employers]
  F --> W[Track Work Performance]
  W --> X[Employer Ratings]
  X --> Y{Good Ratings?}
  Y -->|Yes| Z[Auto-Verify Skill]
  Y -->|No| AA[Keep Unverified]
  Z --> L
  K --> E
  T --> M
```

## 10_communication_messaging.mmd

```mermaid
flowchart TD
  A[Message Initiated] --> B{Message Type?}
  B -->|Text| C[Text Message]
  B -->|Voice| D[Voice Message]
  B -->|System| E[Automated Notification]
  C --> F[Text Processing]
  D --> G[Audio Processing]
  E --> H[Template Selection]
  F --> I{Inappropriate Content?}
  G --> I
  H --> J[Personalize Message]
  I -->|Yes| K[Block Message]
  I -->|No| L[Message Approved]
  K --> M[Notify Sender]
  L --> N{Recipient Online?}
  N -->|Yes| O[Instant Delivery]
  N -->|No| P[Queue for Delivery]
  O --> Q[Mark as Delivered]
  P --> R[Push Notification]
  R --> S[SMS Backup if Critical]
  S --> Q
  Q --> T[Recipient Reads Message]
  T --> U[Mark as Read]
  U --> V[Update Conversation]
  J --> W[Send Notification]
  W --> X{User Preferences?}
  X -->|SMS Enabled| Y[Send SMS]
  X -->|Push Only| Z[Send Push Notification]
  X -->|WhatsApp| AA[Send WhatsApp Message]
  Y --> BB[Delivery Confirmation]
  Z --> BB
  AA --> BB
  M --> CC[Log Blocked Message]
```

## 11_payment_transactions.mmd

```mermaid
flowchart TD
  A[Job Completed] --> B[Employer Confirms Work Done]
  B --> C{Payment Method?}
  C -->|Cash| D[Mark as Cash Payment]
  C -->|Digital| E[Initiate Digital Payment]
  D --> F[Payment Confirmation]
  E --> G[Select Payment Gateway]
  G --> H[Process Payment]
  H --> I{Payment Successful?}
  I -->|No| J[Payment Failed]
  I -->|Yes| K[Payment Confirmed]
  J --> L[Retry Payment]
  L --> M{Max Retries Reached?}
  M -->|No| G
  M -->|Yes| N[Manual Payment Resolution]
  K --> O[Platform Commission Deducted]
  O --> P[Worker Payment Released]
  P --> Q[Payment Notification Sent]
  F --> R[Record Cash Transaction]
  R --> S[Both Parties Rate Each Other]
  Q --> S
  S --> T[Update Profiles with Ratings]
  T --> U[Job Marked as Complete]
  N --> V[Admin Intervention]
  V --> W[Resolve Payment Issue]
  W --> O
```


---
## System Integration Points

### Key Integration Requirements:
1. **SMS Gateway** - OTP verification, notifications
2. **Payment Gateway** - UPI, cards, digital wallets
3. **Maps API** - Location services, distance calculations
4. **Cloud Storage** - Document and media storage
5. **Push Notification Service** - Real-time alerts
6. **Voice Services** - Speech-to-text, text-to-speech
7. **Document Verification APIs** - Aadhaar, PAN verification
8. **Analytics Platform** - User behavior tracking

### Mobile App Specific Considerations:
- **Offline Capability** - Core functions work without internet
- **Low Bandwidth Optimization** - Compressed images, minimal data usage
- **Regional Language Support** - UI and voice in local languages
- **Accessibility Features** - Voice navigation, large text options
- **Battery Optimization** - Efficient background processes


