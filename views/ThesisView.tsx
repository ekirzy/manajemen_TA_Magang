import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Input, FileUpload, StatusBadge, Modal } from '../components/UI';
import { Lecturer, ThesisRegistration, ThesisDefense, SeminarRegistration, ApplicationStatus, UserRole, Notification, DocumentTemplate, RequirementType } from '../types';
import { dataService } from '../services/dataService';

export const ThesisView: React.FC = () => {
  const user = dataService.getCurrentUser();
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshData = () => setRefreshKey(prev => prev + 1);

  if (user?.role === UserRole.STUDENT) {
    return <StudentThesisView user={user} refreshTrigger={refreshKey} onUpdate={refreshData} />;
  }

  if (user?.role === UserRole.LECTURER) {
    return <LecturerThesisView refreshTrigger={refreshKey} onUpdate={refreshData} />;
  }

  return <div>Unauthorized</div>;
};

// ======================= STUDENT COMPONENT =======================

const StudentThesisView: React.FC<{ user: any, refreshTrigger: number, onUpdate: () => void }> = ({ user, refreshTrigger, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'proposal' | 'sempro' | 'semhas' | 'defense' | 'inbox'>('proposal');

  // Data State
  const [proposal, setProposal] = useState<ThesisRegistration | null>(null);
  const [sempro, setSempro] = useState<SeminarRegistration | null>(null);
  const [semhas, setSemhas] = useState<SeminarRegistration | null>(null);
  const [defense, setDefense] = useState<ThesisDefense | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);

  // Requirements Text
  const [reqSempro, setReqSempro] = useState('');
  const [reqSemhas, setReqSemhas] = useState('');
  const [reqSidang, setReqSidang] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLecturers(await dataService.getLecturers());
      setReqSempro(await dataService.getRequirement('SEMPRO'));
      setReqSemhas(await dataService.getRequirement('SEMHAS'));
      setReqSidang(await dataService.getRequirement('SIDANG'));

      // Init Proposal
      const proposals = await dataService.getProposals(user.id);
      const p = proposals[0];
      setProposal(p || {
        id: `th-${Date.now()}`,
        studentId: user.id,
        studentName: user.name,
        title: '',
        advisor1Id: '',
        advisor2Id: '',
        status: ApplicationStatus.DRAFT
      });

      // Init Sempro
      const sempros = await dataService.getSeminars('PROPOSAL', user.id);
      const sp = sempros[0];
      setSempro(sp || {
        id: `spr-${Date.now()}`,
        type: 'PROPOSAL',
        studentId: user.id,
        studentName: user.name,
        title: p?.title || '',
        fileReport: null,
        advisor1Id: p?.advisor1Id || '',
        advisor2Id: p?.advisor2Id || '',
        status: ApplicationStatus.DRAFT
      });

      // Init Semhas
      const semhases = await dataService.getSeminars('HASIL', user.id);
      const sh = semhases[0];
      setSemhas(sh || {
        id: `shs-${Date.now()}`,
        type: 'HASIL',
        studentId: user.id,
        studentName: user.name,
        title: p?.title || '',
        fileReport: null,
        advisor1Id: p?.advisor1Id || '',
        advisor2Id: p?.advisor2Id || '',
        status: ApplicationStatus.DRAFT
      });

      // Init Defense
      const defenses = await dataService.getDefenses(user.id);
      const d = defenses[0];
      setDefense(d || {
        id: `def-${Date.now()}`,
        thesisId: p?.id || '',
        studentId: user.id,
        studentName: user.name,
        fileFixed: null,
        filePlagiarism: null,
        fileTranscript: null,
        sksCount: 0,
        adminRequirementsMet: false,
        status: ApplicationStatus.DRAFT
      });

      setNotifications(await dataService.getNotifications(user.id));
    };

    fetchData();
  }, [refreshTrigger, user.id, activeTab]);

  const lecturerOptions = lecturers.map(l => ({ value: l.id, label: `${l.name} - ${l.specialization}` }));

  // Handlers
  const handleProposalSubmit = async () => {
    if (!proposal?.title || !proposal.advisor1Id || !proposal.advisor2Id) return alert("Harap lengkapi judul dan pembimbing.");
    const updated = { ...proposal, status: ApplicationStatus.SUBMITTED };
    await dataService.saveProposal(updated);
    setProposal(updated);
    onUpdate();
    alert("Proposal berhasil diajukan!");
  };

  const handleSeminarSubmit = async (type: 'PROPOSAL' | 'HASIL', data: SeminarRegistration) => {
    if (!data.fileReport && !data.fileReportUrl) return alert("Harap upload file laporan/proposal.");
    // Sync title/advisors if changed in proposal
    const proposals = await dataService.getProposals(user.id);
    const currentProposal = proposals[0];
    const updated = {
      ...data,
      title: currentProposal?.title || data.title,
      advisor1Id: currentProposal?.advisor1Id || '',
      advisor2Id: currentProposal?.advisor2Id || '',
      status: ApplicationStatus.SUBMITTED
    };
    await dataService.saveSeminar(updated);
    if (type === 'PROPOSAL') setSempro(updated); else setSemhas(updated);
    onUpdate();
    alert(`Pendaftaran Seminar ${type === 'PROPOSAL' ? 'Proposal' : 'Hasil'} berhasil!`);
  };

  const handleDefenseSubmit = async () => {
    if (defense!.sksCount < 138) return alert("SKS belum mencukupi (Min 138).");
    if ((!defense!.fileFixed && !defense!.fileFixedUrl) ||
      (!defense!.filePlagiarism && !defense!.filePlagiarismUrl) ||
      (!defense!.fileTranscript && !defense!.fileTranscriptUrl)) return alert("Harap upload semua file.");

    const updated = { ...defense!, status: ApplicationStatus.SUBMITTED };
    await dataService.saveDefense(updated);
    setDefense(updated);
    onUpdate();
    alert("Pendaftaran Sidang berhasil diajukan!");
  };

  const handleDownloadAttachment = (content: Blob, mimeType: string, filename: string) => {
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-gray-200 pb-2 overflow-x-auto">
        <button onClick={() => setActiveTab('proposal')} className={`pb-2 px-1 whitespace-nowrap ${activeTab === 'proposal' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>1. Proposal</button>
        <button onClick={() => setActiveTab('sempro')} className={`pb-2 px-1 whitespace-nowrap ${activeTab === 'sempro' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>2. Sem. Proposal</button>
        <button onClick={() => setActiveTab('semhas')} className={`pb-2 px-1 whitespace-nowrap ${activeTab === 'semhas' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>3. Sem. Hasil</button>
        <button onClick={() => setActiveTab('defense')} className={`pb-2 px-1 whitespace-nowrap ${activeTab === 'defense' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>4. Sidang Akhir</button>
        <button onClick={() => setActiveTab('inbox')} className={`pb-2 px-1 whitespace-nowrap ${activeTab === 'inbox' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>
          Inbox {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">{unreadCount}</span>}
        </button>
      </div>

      {activeTab === 'proposal' && proposal && (
        <Card title="Pendaftaran Judul & Pembimbing">
          <div className="space-y-4">
            <Input label="Judul Tugas Akhir" value={proposal.title} onChange={(e) => setProposal({ ...proposal, title: e.target.value })} disabled={proposal.status !== ApplicationStatus.DRAFT} />
            <Select label="Pembimbing 1" options={lecturerOptions} value={proposal.advisor1Id || ''} onChange={(e) => setProposal({ ...proposal, advisor1Id: e.target.value })} disabled={proposal.status !== ApplicationStatus.DRAFT} />
            <Select label="Pembimbing 2" options={lecturerOptions} value={proposal.advisor2Id || ''} onChange={(e) => setProposal({ ...proposal, advisor2Id: e.target.value })} disabled={proposal.status !== ApplicationStatus.DRAFT} />
            <div className="flex justify-between items-center mt-4">
              <StatusBadge status={proposal.status} />
              <Button onClick={handleProposalSubmit} disabled={proposal.status !== ApplicationStatus.DRAFT}>Ajukan Proposal</Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'sempro' && sempro && (
        <Card title="Pendaftaran Seminar Proposal">
          <div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <h4 className="font-bold text-yellow-800 text-sm mb-1">Persyaratan & Keterangan:</h4>
            <div className="text-sm text-yellow-800 whitespace-pre-line">{reqSempro}</div>
          </div>

          {sempro.status === ApplicationStatus.SCHEDULED ? (
            <div className="bg-green-50 p-4 rounded text-green-800 border border-green-200">
              <strong>Jadwal Sempro:</strong> {sempro.scheduledDate} {sempro.scheduledTime} di {sempro.scheduledRoom}
            </div>
          ) : (
            <div className="space-y-4">
              <Input label="Judul (Otomatis)" value={sempro.title} disabled />
              <FileUpload label="Upload File Proposal (.pdf)" onChange={(e) => e.target.files && setSempro({ ...sempro, fileReport: e.target.files[0] })} />
              {sempro.fileReport && <p className="text-xs text-green-600 -mt-3">{sempro.fileReport.name}</p>}
              {sempro.fileReportUrl && !sempro.fileReport && <p className="text-xs text-blue-600 -mt-3"><a href={sempro.fileReportUrl} target="_blank" rel="noreferrer">Lihat File Terupload</a></p>}
              <div className="flex justify-between items-center mt-4">
                <StatusBadge status={sempro.status} />
                <Button onClick={() => handleSeminarSubmit('PROPOSAL', sempro)} disabled={sempro.status !== ApplicationStatus.DRAFT}>Daftar Sempro</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'semhas' && semhas && (
        <Card title="Pendaftaran Seminar Hasil">
          <div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <h4 className="font-bold text-yellow-800 text-sm mb-1">Persyaratan & Keterangan:</h4>
            <div className="text-sm text-yellow-800 whitespace-pre-line">{reqSemhas}</div>
          </div>

          {semhas.status === ApplicationStatus.SCHEDULED ? (
            <div className="bg-green-50 p-4 rounded text-green-800 border border-green-200">
              <strong>Jadwal Semhas:</strong> {semhas.scheduledDate} {semhas.scheduledTime} di {semhas.scheduledRoom}
            </div>
          ) : (
            <div className="space-y-4">
              <Input label="Judul (Otomatis)" value={semhas.title} disabled />
              <FileUpload label="Upload Draft Laporan (.pdf)" onChange={(e) => e.target.files && setSemhas({ ...semhas, fileReport: e.target.files[0] })} />
              {semhas.fileReport && <p className="text-xs text-green-600 -mt-3">{semhas.fileReport.name}</p>}
              {semhas.fileReportUrl && !semhas.fileReport && <p className="text-xs text-blue-600 -mt-3"><a href={semhas.fileReportUrl} target="_blank" rel="noreferrer">Lihat File Terupload</a></p>}
              <div className="flex justify-between items-center mt-4">
                <StatusBadge status={semhas.status} />
                <Button onClick={() => handleSeminarSubmit('HASIL', semhas)} disabled={semhas.status !== ApplicationStatus.DRAFT}>Daftar Semhas</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'defense' && defense && (
        <Card title="Pendaftaran Sidang Tugas Akhir">
          <div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <h4 className="font-bold text-yellow-800 text-sm mb-1">Persyaratan & Keterangan:</h4>
            <div className="text-sm text-yellow-800 whitespace-pre-line">{reqSidang}</div>
          </div>

          {defense.status === ApplicationStatus.SCHEDULED ? (
            <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
              <h3 className="text-xl font-bold text-green-800 mb-2">Jadwal Sidang Dikonfirmasi</h3>
              <p className="text-sm text-green-700">Sidang: <strong>{defense.defenseDate} {defense.defenseTime}</strong></p>
              <p className="text-sm text-green-700">Cek Inbox untuk dokumen lengkap.</p>
              <Button variant="secondary" onClick={() => setActiveTab('inbox')} className="mt-4">Buka Inbox</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input label="SKS Lulus" type="number" value={defense.sksCount} onChange={(e) => setDefense({ ...defense, sksCount: parseInt(e.target.value) || 0 })} disabled={defense.status === ApplicationStatus.SUBMITTED} />

              <FileUpload label="Transkrip Nilai" onChange={(e) => e.target.files && setDefense({ ...defense, fileTranscript: e.target.files[0] })} />
              {defense.fileTranscript && <p className="text-xs text-green-600 -mt-3">{defense.fileTranscript.name}</p>}
              {defense.fileTranscriptUrl && !defense.fileTranscript && <p className="text-xs text-blue-600 -mt-3"><a href={defense.fileTranscriptUrl} target="_blank" rel="noreferrer">Lihat File Terupload</a></p>}

              <FileUpload label="Naskah TA (Fixed)" onChange={(e) => e.target.files && setDefense({ ...defense, fileFixed: e.target.files[0] })} />
              {defense.fileFixed && <p className="text-xs text-green-600 -mt-3">{defense.fileFixed.name}</p>}
              {defense.fileFixedUrl && !defense.fileFixed && <p className="text-xs text-blue-600 -mt-3"><a href={defense.fileFixedUrl} target="_blank" rel="noreferrer">Lihat File Terupload</a></p>}

              <FileUpload label="Bukti Bebas Plagiasi" onChange={(e) => e.target.files && setDefense({ ...defense, filePlagiarism: e.target.files[0] })} />
              {defense.filePlagiarism && <p className="text-xs text-green-600 -mt-3">{defense.filePlagiarism.name}</p>}
              {defense.filePlagiarismUrl && !defense.filePlagiarism && <p className="text-xs text-blue-600 -mt-3"><a href={defense.filePlagiarismUrl} target="_blank" rel="noreferrer">Lihat File Terupload</a></p>}

              <div className="flex justify-between items-center mt-4">
                <StatusBadge status={defense.status} />
                <Button onClick={handleDefenseSubmit} variant="success" disabled={defense.status === ApplicationStatus.SUBMITTED}>Daftar Sidang</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'inbox' && (
        <Card title="Kotak Masuk">
          {notifications.length === 0 ? <p className="text-gray-500 py-4 text-center">Belum ada pesan.</p> : (
            <div className="space-y-4">
              {notifications.map(notif => (
                <div key={notif.id} onClick={async () => { await dataService.markNotificationRead(notif.id); onUpdate(); }} className={`border p-4 rounded-lg cursor-pointer ${notif.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex justify-between mb-2">
                    <h4 className={`font-bold ${notif.isRead ? 'text-gray-800' : 'text-blue-800'}`}>{notif.subject}</h4>
                    <span className="text-xs text-gray-500">{new Date(notif.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 whitespace-pre-line">{notif.message}</p>
                  {notif.attachments && notif.attachments.length > 0 && (
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Dokumen Lampiran ({notif.attachments.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {notif.attachments.map((att, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); handleDownloadAttachment(att.content, att.mimeType, att.name); }}
                            className="flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-blue-600 font-medium"
                          >
                            📄 {att.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

// ======================= LECTURER COMPONENT =======================

const LecturerThesisView: React.FC<{ refreshTrigger: number, onUpdate: () => void }> = ({ refreshTrigger, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('defense');
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [masterTemplate, setMasterTemplate] = useState<DocumentTemplate>({ id: '', name: '', blob: null, lastModified: '-' });

  // Requirements Edit State
  const [reqSempro, setReqSempro] = useState('');
  const [reqSemhas, setReqSemhas] = useState('');
  const [reqSidang, setReqSidang] = useState('');

  // Lists
  const [proposals, setProposals] = useState<ThesisRegistration[]>([]);
  const [defenses, setDefenses] = useState<ThesisDefense[]>([]);
  const [scheduledDefenses, setScheduledDefenses] = useState<ThesisDefense[]>([]);
  const [semproReqs, setSemproReqs] = useState<SeminarRegistration[]>([]);
  const [semhasReqs, setSemhasReqs] = useState<SeminarRegistration[]>([]);

  // Modal States
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedDefense, setSelectedDefense] = useState<ThesisDefense | null>(null);
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    room: '',
    examiner1: '',
    examiner2: '',
    letterNumber: ''
  });

  // Lecturer CRUD State
  const [lecturerForm, setLecturerForm] = useState<Lecturer>({ id: '', name: '', nip: '', specialization: '' });
  const [isEditingLecturer, setIsEditingLecturer] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLecturers(await dataService.getLecturers());
      setMasterTemplate(dataService.getMasterTemplate()); // Sync
      // Load reqs
      setReqSempro(await dataService.getRequirement('SEMPRO'));
      setReqSemhas(await dataService.getRequirement('SEMHAS'));
      setReqSidang(await dataService.getRequirement('SIDANG'));

      const allProposals = await dataService.getProposals();
      setProposals(allProposals.filter(p => p.status === ApplicationStatus.SUBMITTED));

      const allDefenses = await dataService.getDefenses();
      setDefenses(allDefenses.filter(d => d.status === ApplicationStatus.SUBMITTED));
      setScheduledDefenses(allDefenses.filter(d => d.status === ApplicationStatus.SCHEDULED));

      const allSeminars = await dataService.getSeminars('PROPOSAL'); // Fetch all types if needed, but here split
      const allSemhas = await dataService.getSeminars('HASIL');
      setSemproReqs(allSeminars.filter(s => s.status === ApplicationStatus.SUBMITTED));
      setSemhasReqs(allSemhas.filter(s => s.status === ApplicationStatus.SUBMITTED));
    };
    fetchData();
  }, [refreshTrigger, activeTab]);

  const getLecturerName = (id?: string) => lecturers.find(l => l.id === id)?.name || '-';

  // --- Actions ---

  const handleProposalValidate = async (id: string, ok: boolean) => {
    const p = proposals.find(x => x.id === id);
    if (p) {
      p.status = ok ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
      await dataService.saveProposal(p);
      onUpdate();
    }
  };

  const handleSeminarValidate = async (item: SeminarRegistration) => {
    // Simplification: Direct Approve & Schedule same time for demo
    const date = prompt("Masukkan Tanggal (YYYY-MM-DD):", "2024-06-20");
    const time = prompt("Masukkan Jam (HH:MM):", "09:00");
    const room = prompt("Masukkan Ruangan:", "R. Sidang 1");

    if (date && time && room) {
      item.status = ApplicationStatus.SCHEDULED;
      item.scheduledDate = date;
      item.scheduledTime = time;
      item.scheduledRoom = room;
      await dataService.saveSeminar(item);
      onUpdate();
      alert("Jadwal Seminar tersimpan.");
    }
  };

  const openScheduleModal = (defense: ThesisDefense) => {
    setSelectedDefense(defense);
    setScheduleData({ date: '', time: '', room: '', examiner1: '', examiner2: '', letterNumber: '' });
    setScheduleModalOpen(true);
  };

  const handleConfirmDefenseSchedule = async () => {
    if (!selectedDefense || !scheduleData.date || !scheduleData.examiner1 || !scheduleData.letterNumber) {
      return alert("Lengkapi data jadwal dan Nomor Surat.");
    }

    selectedDefense.status = ApplicationStatus.SCHEDULED;
    selectedDefense.defenseDate = scheduleData.date;
    selectedDefense.defenseTime = scheduleData.time;
    selectedDefense.defenseRoom = scheduleData.room;
    selectedDefense.examiner1Id = scheduleData.examiner1;
    selectedDefense.examiner2Id = scheduleData.examiner2;
    selectedDefense.letterNumber = scheduleData.letterNumber;

    await dataService.saveDefense(selectedDefense);

    // Generate DOCX
    const docBlob = await dataService.generateDefenseDocument(selectedDefense, scheduleData.letterNumber);

    const attachments = [];
    if (docBlob) {
      attachments.push({
        name: `${selectedDefense.studentName}_Undangan_Sidang.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        content: docBlob
      });
    }

    await dataService.sendEmailNotification(
      selectedDefense.studentId,
      "Undangan & Berkas Sidang Tugas Akhir",
      `Yth. ${selectedDefense.studentName},\n\nSidang Anda dijadwalkan pada ${scheduleData.date}, Pukul ${scheduleData.time}.\n\nSilahkan unduh dokumen terlampir (Undangan & Berita Acara) yang telah digenerate dari Template sistem.\nHarap dicetak dan dibawa saat sidang.`,
      attachments
    );

    setScheduleModalOpen(false);
    onUpdate();
    alert("Jadwal tersimpan & Dokumen (.docx) telah dikirim ke mahasiswa.");
  };

  // Lecturer CRUD
  const saveLecturer = async () => {
    if (!lecturerForm.name || !lecturerForm.nip) return alert("Nama dan NIP wajib.");
    if (isEditingLecturer) {
      await dataService.updateLecturer(lecturerForm);
    } else {
      await dataService.addLecturer({ ...lecturerForm, id: `lec-${Date.now()}` });
    }
    setLecturerForm({ id: '', name: '', nip: '', specialization: '' });
    setIsEditingLecturer(false);
    setLecturers(await dataService.getLecturers());
    onUpdate();
  };

  const deleteLecturer = async (id: string) => {
    if (confirm("Hapus dosen ini?")) {
      await dataService.deleteLecturer(id);
      setLecturers(await dataService.getLecturers());
      onUpdate();
    }
  };

  const handleMasterTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.docx')) {
        alert("Harap upload file .docx");
        return;
      }
      dataService.setMasterTemplate(file);
      setMasterTemplate(dataService.getMasterTemplate());
      alert("Master Template berhasil diupload!");
    }
  };

  const handleExportExcel = () => {
    const blob = dataService.generateExcelBlob(scheduledDefenses, getLecturerName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jadwal_Sidang_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const saveRequirements = async () => {
    await dataService.saveRequirement('SEMPRO', reqSempro);
    await dataService.saveRequirement('SEMHAS', reqSemhas);
    await dataService.saveRequirement('SIDANG', reqSidang);
    alert("Persyaratan berhasil diperbarui");
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 border-b border-gray-200 pb-2 overflow-x-auto text-sm">
        <button onClick={() => setActiveTab('defense')} className={`px-3 py-1 rounded-t-lg ${activeTab === 'defense' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500'}`}>Sidang ({defenses.length})</button>
        <button onClick={() => setActiveTab('sempro')} className={`px-3 py-1 rounded-t-lg ${activeTab === 'sempro' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500'}`}>Sempro ({semproReqs.length})</button>
        <button onClick={() => setActiveTab('semhas')} className={`px-3 py-1 rounded-t-lg ${activeTab === 'semhas' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500'}`}>Semhas ({semhasReqs.length})</button>
        <button onClick={() => setActiveTab('proposal')} className={`px-3 py-1 rounded-t-lg ${activeTab === 'proposal' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500'}`}>Proposal ({proposals.length})</button>
        <button onClick={() => setActiveTab('lecturers')} className={`px-3 py-1 rounded-t-lg ${activeTab === 'lecturers' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500'}`}>Data Dosen</button>
        <button onClick={() => setActiveTab('settings')} className={`px-3 py-1 rounded-t-lg ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500'}`}>Template</button>
        <button onClick={() => setActiveTab('requirements')} className={`px-3 py-1 rounded-t-lg ${activeTab === 'requirements' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500'}`}>Persyaratan</button>
      </div>

      {activeTab === 'requirements' && (
        <Card title="Edit Persyaratan / Keterangan untuk Mahasiswa">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Seminar Proposal</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm h-32"
                value={reqSempro}
                onChange={e => setReqSempro(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Seminar Hasil</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm h-32"
                value={reqSemhas}
                onChange={e => setReqSemhas(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Sidang Akhir</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm h-32"
                value={reqSidang}
                onChange={e => setReqSidang(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveRequirements}>Simpan Perubahan</Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'lecturers' && (
        <Card title="Manajemen Data Dosen">
          <div className="mb-6 p-4 bg-gray-50 rounded border">
            <h4 className="font-bold mb-2">{isEditingLecturer ? 'Edit Dosen' : 'Tambah Dosen Baru'}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input placeholder="Nama Lengkap" value={lecturerForm.name} onChange={e => setLecturerForm({ ...lecturerForm, name: e.target.value })} className="mb-0" />
              <Input placeholder="NIP" value={lecturerForm.nip} onChange={e => setLecturerForm({ ...lecturerForm, nip: e.target.value })} className="mb-0" />
              <Input placeholder="Keahlian" value={lecturerForm.specialization} onChange={e => setLecturerForm({ ...lecturerForm, specialization: e.target.value })} className="mb-0" />
            </div>
            <div className="mt-2 flex justify-end space-x-2">
              {isEditingLecturer && <Button variant="secondary" onClick={() => { setIsEditingLecturer(false); setLecturerForm({ id: '', name: '', nip: '', specialization: '' }); }} className="py-1">Batal</Button>}
              <Button onClick={saveLecturer} className="py-1">{isEditingLecturer ? 'Simpan Perubahan' : 'Tambah'}</Button>
            </div>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100"><tr><th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Nama</th><th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">NIP</th><th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Keahlian</th><th className="px-4 py-2"></th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lecturers.map(l => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.name}</td>
                  <td className="px-4 py-2">{l.nip}</td>
                  <td className="px-4 py-2">{l.specialization}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button onClick={() => { setLecturerForm(l); setIsEditingLecturer(true); }} className="text-blue-600 hover:text-blue-900 text-xs font-bold">Edit</button>
                    <button onClick={() => deleteLecturer(l.id)} className="text-red-600 hover:text-red-900 text-xs font-bold">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card title="Upload Master Template (.docx)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Upload <strong>satu file .docx</strong> yang berisi seluruh format surat (Undangan, Berita Acara, dll).
                Sistem akan otomatis mengganti <em>placeholders</em> berikut:
              </p>
              <ul className="text-xs bg-gray-50 p-3 rounded border border-gray-200 space-y-1 font-mono text-blue-700">
                <li>&lt;&lt;no_surat&gt;&gt; : Nomor Surat (Input saat jadwal)</li>
                <li>&lt;&lt;nama&gt;&gt; : Nama Mahasiswa</li>
                <li>&lt;&lt;nim&gt;&gt; : NIM Mahasiswa</li>
                <li>&lt;&lt;judul&gt;&gt; : Judul Tugas Akhir</li>
                <li>&lt;&lt;hari&gt;&gt; : Hari Sidang (Senin, dll)</li>
                <li>&lt;&lt;tgl&gt;&gt; : Tanggal Sidang (12 Januari 2024)</li>
                <li>&lt;&lt;waktu&gt;&gt; : Jam Sidang</li>
                <li>&lt;&lt;ruang&gt;&gt; : Ruangan Sidang</li>
                <li>&lt;&lt;dosen1&gt;&gt; : Pembimbing 1 / Ketua Sidang</li>
                <li>&lt;&lt;dosen2&gt;&gt; : Pembimbing 2</li>
                <li>&lt;&lt;dosen3&gt;&gt; : Penguji 1</li>
                <li>&lt;&lt;dosen4&gt;&gt; : Penguji 2</li>
              </ul>
            </div>
            <div className="border-l pl-4">
              <h4 className="font-bold mb-2">Current Template</h4>
              <div className="bg-blue-50 p-3 rounded mb-4">
                <p className="font-medium">{masterTemplate.name}</p>
                <p className="text-xs text-gray-500">Last Modified: {masterTemplate.lastModified}</p>
              </div>
              <FileUpload label="Ganti Template (.docx)" accept=".docx" onChange={handleMasterTemplateUpload} />
            </div>
          </div>
        </Card>
      )}

      {/* Validation Tabs */}
      {activeTab === 'proposal' && (
        <Card title="Validasi Proposal">
          {proposals.length === 0 ? <div className="text-gray-500">Kosong</div> : proposals.map(p => (
            <div key={p.id} className="flex justify-between items-center p-3 border-b">
              <div><div className="font-bold">{p.studentName}</div><div className="text-sm text-gray-500">{p.title}</div></div>
              <div className="space-x-2"><Button onClick={() => handleProposalValidate(p.id, true)} className="py-1 px-3 text-sm">Terima</Button><Button variant="danger" onClick={() => handleProposalValidate(p.id, false)} className="py-1 px-3 text-sm">Tolak</Button></div>
            </div>
          ))}
        </Card>
      )}

      {(activeTab === 'sempro' || activeTab === 'semhas') && (
        <Card title={`Validasi & Jadwal ${activeTab === 'sempro' ? 'Seminar Proposal' : 'Seminar Hasil'}`}>
          {(activeTab === 'sempro' ? semproReqs : semhasReqs).length === 0 ? <div className="text-gray-500">Kosong</div> : (activeTab === 'sempro' ? semproReqs : semhasReqs).map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 border-b">
              <div>
                <div className="font-bold">{s.studentName}</div>
                <div className="text-xs text-gray-500">File: {s.fileReport ? s.fileReport.name : (s.fileReportUrl ? 'File Uploaded' : 'No File')}</div>
                {s.fileReportUrl && <a href={s.fileReportUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600">Lihat File</a>}
              </div>
              <Button variant="success" onClick={() => handleSeminarValidate(s)} className="text-xs">Validasi & Jadwalkan</Button>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'defense' && (
        <Card title="Validasi Sidang Tugas Akhir">
          {defenses.length === 0 ? <div className="text-gray-500">Kosong</div> : defenses.map(d => (
            <div key={d.id} className="p-4 border border-gray-200 rounded mb-4 bg-gray-50">
              <div className="flex justify-between mb-2">
                <h4 className="font-bold">{d.studentName}</h4>
                <Button onClick={() => openScheduleModal(d)} variant="success">Jadwalkan Sidang</Button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                <div className="bg-white p-2 border">Transkrip: {d.fileTranscript?.name || (d.fileTranscriptUrl ? <a href={d.fileTranscriptUrl} target="_blank" rel="noreferrer">Lihat</a> : '-')}</div>
                <div className="bg-white p-2 border">Naskah: {d.fileFixed?.name || (d.fileFixedUrl ? <a href={d.fileFixedUrl} target="_blank" rel="noreferrer">Lihat</a> : '-')}</div>
                <div className="bg-white p-2 border">Plagiasi: {d.filePlagiarism?.name || (d.filePlagiarismUrl ? <a href={d.filePlagiarismUrl} target="_blank" rel="noreferrer">Lihat</a> : '-')}</div>
              </div>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold">Jadwal Terekam</h4>
              <Button variant="secondary" onClick={handleExportExcel} className="text-xs">Export Excel</Button>
            </div>
            {scheduledDefenses.map(d => (
              <div key={d.id} className="text-sm p-2 border-b bg-green-50 rounded mb-1">
                <div><strong>{d.studentName}</strong></div>
                <div className="text-xs text-gray-600">
                  {d.defenseDate}, {d.defenseTime} | R. {d.defenseRoom} | No. Surat: {d.letterNumber}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Schedule Modal */}
      <Modal isOpen={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Jadwalkan & Generate Dokumen">
        <div className="space-y-3">
          <Input label="Nomor Surat (Undangan/Berita Acara)" placeholder="Contoh: 123/UN/2024" value={scheduleData.letterNumber} onChange={e => setScheduleData({ ...scheduleData, letterNumber: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" label="Tanggal" value={scheduleData.date} onChange={e => setScheduleData({ ...scheduleData, date: e.target.value })} />
            <Input type="time" label="Jam" value={scheduleData.time} onChange={e => setScheduleData({ ...scheduleData, time: e.target.value })} />
          </div>
          <Input label="Ruangan" value={scheduleData.room} onChange={e => setScheduleData({ ...scheduleData, room: e.target.value })} />
          <Select label="Penguji 1" options={lecturers.map(l => ({ value: l.id, label: l.name }))} value={scheduleData.examiner1} onChange={e => setScheduleData({ ...scheduleData, examiner1: e.target.value })} />
          <Select label="Penguji 2" options={lecturers.map(l => ({ value: l.id, label: l.name }))} value={scheduleData.examiner2} onChange={e => setScheduleData({ ...scheduleData, examiner2: e.target.value })} />

          <div className="bg-blue-50 p-3 text-xs text-blue-800 rounded border border-blue-200">
            <strong>Info:</strong> Sistem akan menggunakan template <em>{masterTemplate.name}</em> dan mengisi data mahasiswa, dosen, dan jadwal secara otomatis.
          </div>
          <Button onClick={handleConfirmDefenseSchedule} className="w-full">Simpan & Kirim Dokumen</Button>
        </div>
      </Modal>
    </div>
  );
};