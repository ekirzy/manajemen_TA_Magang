import { ThesisRegistration, ThesisDefense, InternshipRegistration, SeminarRegistration, ApplicationStatus, User, UserRole, Notification, DocumentTemplate, DocumentType, Lecturer, RequirementType } from '../types';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { supabase } from './supabaseClient';

class DataStore {
  currentUser: User | null = null;

  // Cache for requirements to avoid frequent fetches, but could be async too
  private requirementsCache: Map<RequirementType, string> = new Map();

  constructor() {
    // Initialize default requirements in cache (will be overwritten by DB)
    this.requirementsCache.set('SEMPRO', '1. File Proposal Lengkap (PDF)\n2. Kartu Bimbingan minimal 4x asistensi.\n3. KRS Aktif Semester ini.');
    this.requirementsCache.set('SEMHAS', '1. Draft Laporan Tugas Akhir Lengkap.\n2. Logbook Bimbingan minimal 8x.\n3. Bukti persetujuan pembimbing.');
    this.requirementsCache.set('SIDANG', '1. Naskah TA Fixed.\n2. Hasil cek plagiasi (Turnitin) < 20%.\n3. Transkrip Nilai Terbaru (Lulus > 138 SKS).\n4. Bebas administrasi Keuangan & Perpustakaan.');
  }

  // --- Auth & User ---

  // --- Auth & User ---

  async login(role: UserRole): Promise<User | null> {
    // This is kept for legacy/demo compatibility if needed, 
    // but UI should now call loginWithPassword or loginWithOAuth
    return this.currentUser;
  }

  async loginWithPassword(email: string, pass: string): Promise<{ user: User | null, error: any }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });

    if (error) return { user: null, error };

    if (data.user) {
      // Fetch additional user info if needed, or construct User object
      // For now, we map Supabase user to our User type
      this.currentUser = {
        id: data.user.id,
        name: data.user.user_metadata.full_name || data.user.email?.split('@')[0] || 'User',
        role: (data.user.user_metadata.role as UserRole) || UserRole.STUDENT,
        identifier: data.user.user_metadata.identifier || '-'
      };
      return { user: this.currentUser, error: null };
    }
    return { user: null, error: 'No user data' };
  }

  async register(email: string, pass: string, fullName: string, role: UserRole, identifier: string): Promise<{ user: User | null, error: any }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          role: role,
          identifier: identifier
        }
      }
    });

    if (error) return { user: null, error };

    if (data.user) {
      // Note: If email confirmation is enabled, user might not be logged in immediately
      this.currentUser = {
        id: data.user.id,
        name: fullName,
        role: role,
        identifier: identifier
      };
      return { user: this.currentUser, error: null };
    }
    return { user: null, error: 'Registration successful but no user returned (check email confirmation)' };
  }

  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin // Redirect back to app
      }
    });
    return { data, error };
  }

  async logout() {
    await supabase.auth.signOut();
    this.currentUser = null;
  }

  async fetchCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      this.currentUser = {
        id: user.id,
        name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
        role: (user.user_metadata.role as UserRole) || UserRole.STUDENT,
        identifier: user.user_metadata.identifier || '-'
      };
      return this.currentUser;
    }
    this.currentUser = null;
    return null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // --- File Upload Helper ---

  async uploadFile(file: File, path: string): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Upload exception:', error);
      return null;
    }
  }

  // --- Requirements ---

  async getRequirement(type: RequirementType): Promise<string> {
    // Ideally fetch from a 'settings' table. For now, keep using cache or simple key-value store if we had one.
    // We'll stick to memory/cache for requirements to simplify, or fetch from a 'system_settings' table if created.
    // Since we didn't create a settings table, we'll return the cache.
    return this.requirementsCache.get(type) || '-';
  }

  async saveRequirement(type: RequirementType, content: string) {
    this.requirementsCache.set(type, content);
    // TODO: Persist to DB if table exists
  }

  // --- Notifications ---

  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return []; }

    // Map snake_case to camelCase
    return data.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      subject: n.subject,
      message: n.message,
      timestamp: n.created_at,
      isRead: n.is_read,
      attachments: [] // Attachments in notification not fully implemented in schema yet
    }));
  }

  async markNotificationRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async sendEmailNotification(toUserId: string, subject: string, message: string, attachments: any[] = []) {
    // In a real app, this would trigger an Edge Function to send email.
    // Here we just insert into notifications table.
    await supabase.from('notifications').insert({
      user_id: toUserId,
      subject,
      message,
      is_read: false
    });
  }

  // --- Lecturers ---

  async getLecturers(): Promise<Lecturer[]> {
    const { data, error } = await supabase.from('lecturers').select('*');
    if (error) { console.error(error); return []; }
    return data as Lecturer[];
  }

  async addLecturer(lecturer: Lecturer) {
    await supabase.from('lecturers').insert(lecturer);
  }

  async updateLecturer(lecturer: Lecturer) {
    await supabase.from('lecturers').update(lecturer).eq('id', lecturer.id);
  }

  async deleteLecturer(id: string) {
    await supabase.from('lecturers').delete().eq('id', id);
  }

  // --- Proposals ---

  async getProposals(studentId?: string): Promise<ThesisRegistration[]> {
    let query = supabase.from('thesis_registrations').select('*');
    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query;
    if (error) { console.error(error); return []; }

    return data.map((p: any) => ({
      id: p.id,
      studentId: p.student_id,
      studentName: p.student_name,
      title: p.title,
      advisor1Id: p.advisor1_id,
      advisor2Id: p.advisor2_id,
      status: p.status
    }));
  }

  async saveProposal(proposal: ThesisRegistration) {
    const payload = {
      id: proposal.id.includes('mock') || proposal.id.includes('th-') ? undefined : proposal.id, // Let DB generate ID if it's a temp ID
      student_id: proposal.studentId,
      student_name: proposal.studentName,
      title: proposal.title,
      advisor1_id: proposal.advisor1Id,
      advisor2_id: proposal.advisor2Id,
      status: proposal.status
    };

    // If ID is valid UUID, upsert. If not, insert (and let DB gen ID).
    // Simplification: Always upsert if we have a valid-looking ID, else insert.
    // Actually, for new proposals, we might not have an ID yet.

    const { error } = await supabase.from('thesis_registrations').upsert(payload);
    if (error) console.error("Save Proposal Error", error);
  }

  // --- Seminars ---

  async getSeminars(type: 'PROPOSAL' | 'HASIL', studentId?: string): Promise<SeminarRegistration[]> {
    let query = supabase.from('seminars').select('*').eq('type', type);
    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query;
    if (error) { console.error(error); return []; }

    return data.map((s: any) => ({
      id: s.id,
      type: s.type,
      studentId: s.student_id,
      studentName: s.student_name,
      title: s.title,
      fileReport: null, // File object not available
      fileReportUrl: s.file_report_url,
      advisor1Id: s.advisor1_id,
      advisor2Id: s.advisor2_id,
      scheduledDate: s.scheduled_date,
      scheduledTime: s.scheduled_time,
      scheduledRoom: s.scheduled_room,
      status: s.status
    }));
  }

  async saveSeminar(seminar: SeminarRegistration) {
    // Handle File Upload if exists
    let fileUrl = seminar.fileReportUrl;
    if (seminar.fileReport) {
      const url = await this.uploadFile(seminar.fileReport, 'seminars');
      if (url) fileUrl = url;
    }

    const payload = {
      id: seminar.id.includes('mock') || seminar.id.includes('spr-') ? undefined : seminar.id,
      type: seminar.type,
      student_id: seminar.studentId,
      student_name: seminar.studentName,
      title: seminar.title,
      file_report_url: fileUrl,
      advisor1_id: seminar.advisor1Id,
      advisor2_id: seminar.advisor2Id,
      scheduled_date: seminar.scheduledDate,
      scheduled_time: seminar.scheduledTime,
      scheduled_room: seminar.scheduledRoom,
      status: seminar.status
    };

    await supabase.from('seminars').upsert(payload);
  }

  // --- Defenses ---

  async getDefenses(studentId?: string): Promise<ThesisDefense[]> {
    let query = supabase.from('thesis_defenses').select('*');
    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query;
    if (error) { console.error(error); return []; }

    return data.map((d: any) => ({
      id: d.id,
      thesisId: d.thesis_id,
      studentId: d.student_id,
      studentName: d.student_name,
      fileFixed: null,
      fileFixedUrl: d.file_fixed_url,
      filePlagiarism: null,
      filePlagiarismUrl: d.file_plagiarism_url,
      fileTranscript: null,
      fileTranscriptUrl: d.file_transcript_url,
      sksCount: d.sks_count,
      adminRequirementsMet: d.admin_requirements_met,
      examiner1Id: d.examiner1_id,
      examiner2Id: d.examiner2_id,
      defenseDate: d.defense_date,
      defenseTime: d.defense_time,
      defenseRoom: d.defense_room,
      letterNumber: d.letter_number,
      status: d.status
    }));
  }

  async saveDefense(defense: ThesisDefense) {
    let fixedUrl = defense.fileFixedUrl;
    if (defense.fileFixed) {
      const url = await this.uploadFile(defense.fileFixed, 'defenses');
      if (url) fixedUrl = url;
    }

    let plagUrl = defense.filePlagiarismUrl;
    if (defense.filePlagiarism) {
      const url = await this.uploadFile(defense.filePlagiarism, 'defenses');
      if (url) plagUrl = url;
    }

    let transUrl = defense.fileTranscriptUrl;
    if (defense.fileTranscript) {
      const url = await this.uploadFile(defense.fileTranscript, 'defenses');
      if (url) transUrl = url;
    }

    const payload = {
      id: defense.id.includes('mock') || defense.id.includes('def-') ? undefined : defense.id,
      thesis_id: defense.thesisId,
      student_id: defense.studentId,
      student_name: defense.studentName,
      file_fixed_url: fixedUrl,
      file_plagiarism_url: plagUrl,
      file_transcript_url: transUrl,
      sks_count: defense.sksCount,
      admin_requirements_met: defense.adminRequirementsMet,
      examiner1_id: defense.examiner1Id,
      examiner2_id: defense.examiner2Id,
      defense_date: defense.defenseDate,
      defense_time: defense.defenseTime,
      defense_room: defense.defenseRoom,
      letter_number: defense.letterNumber,
      status: defense.status
    };

    await supabase.from('thesis_defenses').upsert(payload);
  }

  // --- Internships ---

  async getInternships(studentId?: string): Promise<InternshipRegistration[]> {
    let query = supabase.from('internships').select('*');
    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query;
    if (error) { console.error(error); return []; }

    return data.map((i: any) => ({
      id: i.id,
      studentId: i.student_id,
      studentName: i.student_name,
      companyName: i.company_name,
      advisorId: i.advisor_id,
      status: i.status
    }));
  }

  async saveInternship(internship: InternshipRegistration) {
    const payload = {
      id: internship.id.includes('mock') || internship.id.includes('kp-') ? undefined : internship.id,
      student_id: internship.studentId,
      student_name: internship.studentName,
      company_name: internship.companyName,
      advisor_id: internship.advisorId,
      status: internship.status
    };
    await supabase.from('internships').upsert(payload);
  }

  // --- Template & Document Generation ---
  // Keeping this mostly client-side for now, but template should be stored in DB/Storage

  masterTemplate: DocumentTemplate = {
    id: 'master-tpl',
    name: 'Template_Sidang_Master.docx',
    blob: null,
    lastModified: '-'
  };

  getMasterTemplate() { return this.masterTemplate; }

  setMasterTemplate(file: File) {
    this.masterTemplate.name = file.name;
    this.masterTemplate.blob = file;
    this.masterTemplate.lastModified = new Date().toLocaleString();
    // TODO: Upload to Supabase Storage 'templates' bucket
  }

  // Helper: Format Date to Indonesian "Hari, dd Month yyyy"
  formatDateIndo(dateStr?: string): { hari: string, tgl: string } {
    if (!dateStr) return { hari: '-', tgl: '-' };
    const date = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    return {
      hari: days[date.getDay()],
      tgl: `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
    };
  }

  async generateDefenseDocument(defense: ThesisDefense, letterNo: string): Promise<Blob | null> {
    if (!this.masterTemplate.blob) {
      console.error("No master template uploaded");
      return null;
    }

    // Need to fetch related data since we don't have it in memory anymore
    const [proposals, lecturers] = await Promise.all([
      this.getProposals(),
      this.getLecturers()
    ]);

    const proposal = proposals.find(p => p.id === defense.thesisId);

    // Lecturer Lookups
    const getLec = (id?: string | null) => lecturers.find(l => l.id === id);
    const adv1 = getLec(proposal?.advisor1Id);
    const adv2 = getLec(proposal?.advisor2Id);
    const ex1 = getLec(defense.examiner1Id);
    const ex2 = getLec(defense.examiner2Id);

    // Student lookup (simplified)
    const student = { identifier: '20204321' }; // Mock

    const { hari, tgl } = this.formatDateIndo(defense.defenseDate);

    // Prepare tags data
    const data = {
      no_surat: letterNo,
      nama: defense.studentName,
      nim: student.identifier,
      judul: proposal?.title || '-',
      dosen1: adv1 ? `${adv1.name} (NIP: ${adv1.nip})` : '-',
      dosen2: adv2 ? `${adv2.name} (NIP: ${adv2.nip})` : '-',
      dosen3: ex1 ? `${ex1.name} (NIP: ${ex1.nip})` : '-',
      dosen4: ex2 ? `${ex2.name} (NIP: ${ex2.nip})` : '-',
      hari: hari,
      tgl: tgl,
      waktu: defense.defenseTime ? `${defense.defenseTime} WIB` : '-',
      ruang: defense.defenseRoom || '-'
    };

    try {
      const arrayBuffer = await this.masterTemplate.blob.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.setData(data);
      doc.render();
      return doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    } catch (error) {
      console.error("Docxtemplater Error:", error);
      return null;
    }
  }

  generateExcelBlob(defenses: ThesisDefense[], getLecturerName: (id?: string) => string): Blob {
    // Note: This needs to be async if we want to fetch proposals fresh, but for now we assume caller has data
    // Or we just export what's passed in
    const headers = ['Nama Mahasiswa', 'Judul Skripsi', 'SKS', 'Tanggal Sidang', 'Waktu', 'Ruangan', 'Penguji 1', 'Penguji 2', 'Status'];
    const rows = defenses.map(d => {
      // We might miss the title if we don't fetch proposal. 
      // For now, just use '-' or we need to refactor this to be async.
      return [
        `"${d.studentName}"`,
        `"-"`,
        d.sksCount,
        d.defenseDate || '-',
        d.defenseTime || '-',
        d.defenseRoom || '-',
        `"${getLecturerName(d.examiner1Id)}"`,
        `"${getLecturerName(d.examiner2Id)}"`,
        d.status
      ].join(",");
    });
    return new Blob([[headers.join(","), ...rows].join("\n")], { type: 'text/csv;charset=utf-8;' });
  }
}

export const dataService = new DataStore();