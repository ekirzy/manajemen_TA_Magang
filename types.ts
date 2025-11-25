export enum UserRole {
  STUDENT = 'STUDENT',
  LECTURER = 'LECTURER'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  identifier: string; // NIP or NPM
}

export interface Notification {
  id: string;
  userId: string;
  subject: string;
  message: string;
  timestamp: string;
  attachments?: { name: string, content: Blob, mimeType: string }[];
  isRead: boolean;
}

export enum ApplicationStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Diajukan',
  APPROVED = 'Disetujui',
  REJECTED = 'Ditolak',
  SCHEDULED = 'Dijadwalkan',
  COMPLETED = 'Selesai'
}

export interface Lecturer {
  id: string;
  name: string;
  nip: string;
  specialization: string;
}

export enum DocumentType {
  MASTER_TEMPLATE = 'Master Template'
}

export interface DocumentTemplate {
  id: string;
  name: string;
  blob: Blob | null; // Changed to Blob for binary DOCX
  lastModified: string;
}

export type RequirementType = 'SEMPRO' | 'SEMHAS' | 'SIDANG';

export interface ThesisRegistration {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  advisor1Id: string | null;
  advisor2Id: string | null;
  status: ApplicationStatus;
}

// Reusable interface for Sempro and Semhas
export interface SeminarRegistration {
  id: string;
  type: 'PROPOSAL' | 'HASIL';
  studentId: string;
  studentName: string;
  title: string;
  fileReport: File | null; // Proposal or Draft Thesis
  fileReportUrl?: string; // URL from Supabase
  advisor1Id: string; // Snapshot from thesis registration
  advisor2Id: string; // Snapshot from thesis registration
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledRoom?: string;
  examiner1Id?: string; // Often Sempro has 1 or 2 examiners
  examiner2Id?: string;
  status: ApplicationStatus;
}

export interface ThesisDefense {
  id: string;
  thesisId: string;
  studentId: string;
  studentName: string;
  fileFixed: File | null;
  fileFixedUrl?: string;
  filePlagiarism: File | null;
  filePlagiarismUrl?: string;
  fileTranscript: File | null;
  fileTranscriptUrl?: string;
  sksCount: number;
  adminRequirementsMet: boolean;
  examiner1Id?: string;
  examiner2Id?: string;
  defenseDate?: string;
  defenseTime?: string;
  defenseRoom?: string;
  letterNumber?: string; // Added No Surat
  status: ApplicationStatus;
}

export interface InternshipRegistration {
  id: string;
  studentId: string;
  studentName: string;
  companyName: string;
  advisorId: string | null;
  status: ApplicationStatus;
}