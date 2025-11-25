import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Input, StatusBadge } from '../components/UI';
import { InternshipRegistration, ApplicationStatus, Lecturer, UserRole } from '../types';
import { dataService } from '../services/dataService';

const MOCK_LECTURERS: Lecturer[] = [
  { id: '1', name: 'Dr. Budi Santoso', nip: '12345678', specialization: 'AI & Data Science' },
  { id: '2', name: 'Prof. Siti Aminah', nip: '87654321', specialization: 'Software Engineering' },
];

export const InternshipView: React.FC = () => {
  const user = dataService.getCurrentUser();
  const [refreshKey, setRefreshKey] = useState(0);
  const [applications, setApplications] = useState<InternshipRegistration[]>([]);

  useEffect(() => {
    const fetchApps = async () => {
      if (user?.role === UserRole.LECTURER) {
        const apps = await dataService.getInternships();
        setApplications(apps.filter(i => i.status === ApplicationStatus.SUBMITTED));
      }
    };
    fetchApps();
  }, [user, refreshKey]);

  if (!user) return <div>Error: Not logged in</div>;

  if (user.role === UserRole.LECTURER) {
    const handleValidate = async (id: string, approve: boolean) => {
      const app = applications.find(i => i.id === id);
      if (app) {
        app.status = approve ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
        await dataService.saveInternship(app);
        setRefreshKey(k => k + 1);
      }
    }

    return (
      <Card title="Validasi Pendaftaran Magang">
        {applications.length === 0 ? <p className="text-gray-500">Tidak ada pengajuan magang baru.</p> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mahasiswa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perusahaan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map(app => (
                <tr key={app.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{app.studentName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{app.companyName}</td>
                  <td className="px-6 py-4 space-x-2">
                    <Button className="text-xs" onClick={() => handleValidate(app.id, true)}>Terima</Button>
                    <Button className="text-xs" variant="danger" onClick={() => handleValidate(app.id, false)}>Tolak</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    );
  }

  // Student View
  return <StudentInternshipView user={user} />;
};

const StudentInternshipView: React.FC<{ user: any }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'advisor' | 'seminar'>('advisor');
  const [internship, setInternship] = useState<InternshipRegistration>({
    id: `kp-${Date.now()}`,
    studentId: user.id,
    studentName: user.name,
    companyName: '',
    advisorId: '',
    status: ApplicationStatus.DRAFT
  });

  useEffect(() => {
    const fetchMyInternship = async () => {
      const myInternships = await dataService.getInternships(user.id);
      if (myInternships.length > 0) {
        setInternship(myInternships[0]);
      }
    };
    fetchMyInternship();
  }, [user.id]);

  const lecturerOptions = MOCK_LECTURERS.map(l => ({ value: l.id, label: l.name }));

  const handleSubmit = async () => {
    if (!internship.companyName || !internship.advisorId) {
      alert("Lengkapi data magang.");
      return;
    }
    const updated = { ...internship, status: ApplicationStatus.SUBMITTED };
    await dataService.saveInternship(updated);
    setInternship(updated);
    alert("Pendaftaran Magang berhasil diajukan.");
  }

  const handleSeminarSubmit = () => {
    alert("Pendaftaran Seminar Magang Berhasil. Menunggu jadwal.");
  }

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-gray-200 pb-2">
        <button onClick={() => setActiveTab('advisor')} className={`pb-2 px-1 ${activeTab === 'advisor' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>Pendaftaran Magang</button>
        <button onClick={() => setActiveTab('seminar')} className={`pb-2 px-1 ${activeTab === 'seminar' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>Seminar Magang</button>
      </div>

      {activeTab === 'advisor' && (
        <Card title="Form Pendaftaran Kerja Praktik / Magang">
          <div className="mb-4">
            <StatusBadge status={internship.status} />
          </div>
          <Input
            label="Nama Perusahaan / Instansi"
            value={internship.companyName}
            onChange={(e) => setInternship({ ...internship, companyName: e.target.value })}
            placeholder="Contoh: PT. Google Indonesia"
            disabled={internship.status !== ApplicationStatus.DRAFT}
          />

          <Select
            label="Usulan Pembimbing Magang"
            options={lecturerOptions}
            value={internship.advisorId || ''}
            onChange={(e) => setInternship({ ...internship, advisorId: e.target.value })}
            disabled={internship.status !== ApplicationStatus.DRAFT}
          />

          <div className="flex justify-end mt-4">
            <Button onClick={handleSubmit} disabled={internship.status !== ApplicationStatus.DRAFT}>
              {internship.status === ApplicationStatus.DRAFT ? 'Daftar Magang' : 'Telah Diajukan'}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'seminar' && (
        <Card title="Daftar Seminar Magang">
          <div className="text-gray-600 mb-4 text-sm">
            Pastikan laporan magang telah disetujui oleh pembimbing lapangan dan pembimbing akademik.
          </div>
          <Input label="Judul Laporan Magang" placeholder="Implementasi Sistem..." />
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSeminarSubmit} variant="success">Daftar Seminar</Button>
          </div>
        </Card>
      )}
    </div>
  );
};
