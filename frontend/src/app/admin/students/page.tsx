"use client";

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAdminAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import jsPDF from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';

if (typeof window !== 'undefined') {
  try {
    applyPlugin(jsPDF);
  } catch {
    // Already applied
  }
}

interface Student {
  id: string;
  name: string;
  student_id: string;
  email?: string;
  faculty?: string;
  program?: string;
  level?: number;
  gender?: string;
  phone_number?: string;
  community_id?: string;
  community_name?: string;
  group_number?: number;
  group_label?: string;
  district?: string;
  region?: string;
}

export default function AdminStudentsPage() {
  const token = useAdminAuthStore((state) => state.token);
  const [hydrated, setHydrated] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [communityFilter, setCommunityFilter] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const fetchStudents = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/admin/students', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setStudents(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hydrated && token) {
      fetchStudents();
    }
  }, [hydrated, token]);

  const [exportError, setExportError] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const communities = useMemo(() => {
    const comms = new Set(students.map(s => s.community_name).filter(Boolean));
    return Array.from(comms).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCommunity = communityFilter === '' || student.community_name === communityFilter;
      return matchesSearch && matchesCommunity;
    });
  }, [students, searchTerm, communityFilter]);

  const groupedCommunities = useMemo(() => {
    const map = new Map<string, {
      group_number: number;
      group_label: string;
      community_name: string;
      district: string;
      region: string;
      students: Student[];
    }>();

    filteredStudents.forEach((student) => {
      const commKey = student.community_name || 'Unassigned';
      if (!map.has(commKey)) {
        map.set(commKey, {
          group_number: student.group_number ?? 9999,
          group_label: student.group_label || (student.group_number ? `Group ${student.group_number}` : 'Unassigned'),
          community_name: commKey,
          district: student.district || '—',
          region: student.region || '—',
          students: []
        });
      }
      map.get(commKey)!.students.push(student);
    });

    // Sort students by student_id inside each group
    map.forEach((g) => {
      g.students.sort((a, b) => (a.student_id || '').localeCompare(b.student_id || ''));
    });

    // Sort groups numerically by canonical group_number
    return Array.from(map.values()).sort((a, b) => a.group_number - b.group_number);
  }, [filteredStudents]);

  const generateStudentReportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;

    const primaryColor = [9, 60, 34]; // CFSS Institutional Green #093C22
    const textColor = [30, 41, 59];

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let currentY = 18;

    // Official Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('CFSS — STUDENT GROUP REGISTER', margin, currentY);

    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('Academic Year: 2025/2026 Academic Year', margin, currentY);

    currentY += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Report Generation Date: ${dateStr} at ${timeStr} | Total Students: ${filteredStudents.length} | Total Groups: ${groupedCommunities.length}`, margin, currentY);

    currentY += 4;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    if (groupedCommunities.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('No student records found matching the current filter criteria.', margin, currentY + 4);
    } else {
      for (const group of groupedCommunities) {
        if (currentY > pageHeight - 45) {
          doc.addPage();
          currentY = 20;
        }

        const groupTitle = group.group_number !== 9999
          ? `GROUP ${group.group_number} — ${group.community_name.toUpperCase()}`
          : `${group.community_name.toUpperCase()}`;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(groupTitle, margin, currentY);
        currentY += 4.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`District: ${group.district || '—'}   |   Region: ${group.region || '—'}   |   Number of students: ${group.students.length}`, margin, currentY);
        currentY += 3.5;

        const tableRows = group.students.map((s) => [
          s.student_id || '—',
          s.name || '—',
          s.faculty || '—',
          s.program || '—',
          s.gender || '—'
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [[
            'Index No.',
            'Student Name',
            'Faculty',
            'Programme',
            'Gender'
          ]],
          body: tableRows,
          margin: { left: margin, right: margin, top: 20, bottom: 18 },
          showHead: 'everyPage',
          theme: 'plain',
          styles: {
            fontSize: 8,
            cellPadding: 2.5,
            textColor: [30, 41, 59],
            overflow: 'linebreak',
            lineColor: [226, 232, 240],
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            fontSize: 8
          },
          columnStyles: {
            0: { cellWidth: 32, fontStyle: 'bold' },
            1: { cellWidth: 50 },
            2: { cellWidth: 42 },
            3: { cellWidth: 44 },
            4: { cellWidth: 14, halign: 'center' }
          },
          didDrawPage: (data: any) => {
            if (data.pageNumber > 1) {
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(100, 116, 139);
              doc.text('CFSS — STUDENT GROUP REGISTER', margin, 12);
              doc.setDrawColor(226, 232, 240);
              doc.line(margin, 14, pageWidth - margin, 14);
            }
          }
        });

        const finalY = (doc as any).lastAutoTable?.finalY;
        currentY = finalY ? finalY + 8 : currentY + 30;
      }
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.text('CONFIDENTIAL — COMMUNITY FIELD STUDY SYSTEM (CFSS)', margin, pageHeight - 7);
      const pageText = `Page ${i} of ${totalPages}`;
      doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 7);
    }

    return doc;
  };

  const exportToPDF = () => {
    try {
      setExportError('');
      const doc = generateStudentReportPDF();
      doc.save(`CFSS_Student_Group_Register_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      console.error(err);
      setExportError(err.message || 'Failed to export PDF');
    }
  };

  const handleStudentClick = async (studentId: string) => {
    setStudentDetailsLoading(true);
    setError('');
    try {
      const activeToken = token || useAdminAuthStore.getState().token;
      const res = await api.get(`/api/admin/students/${studentId}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setSelectedStudent(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to load student details');
    } finally {
      setStudentDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Students</h1>
          <p className="text-secondary mt-1 text-sm">Manage enrolled students and community assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowPreviewModal(true)} variant="outline" className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview Report
          </Button>
          <Button onClick={exportToPDF} variant="default" className="flex items-center gap-2 bg-[#093C22] hover:bg-[#0c512e] text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export PDF
          </Button>
        </div>
      </div>

      {exportError && (
        <Alert variant="destructive">
          <span>{exportError}</span>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => fetchStudents()}>Retry</Button>
        </Alert>
      )}

      {loading && students.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-secondary">
            <div className="inline-block w-8 h-8 border-4 border-cfss-green border-t-transparent rounded-full animate-spin mb-3"></div>
            <p>Loading students...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by name or index number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="sm:w-64">
              <select
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cfss-green"
                value={communityFilter}
                onChange={(e) => setCommunityFilter(e.target.value)}
              >
                <option value="">All Communities</option>
                {communities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-sm text-secondary mb-4">
            Showing {filteredStudents.length} of {students.length} students
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-page">
              <p className="text-secondary">No students found matching your filters.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { setSearchTerm(''); setCommunityFilter(''); }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-x-auto bg-surface">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-page">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Student
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Community Assignment
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Group
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {filteredStudents.map((student) => (
                    <tr 
                      key={student.id} 
                      className="hover:bg-page cursor-pointer transition-colors"
                      onClick={() => handleStudentClick(student.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-primary">{student.name}</div>
                          <div className="text-sm text-secondary">{student.student_id}</div>
                          <div className="text-sm text-muted">{student.email || "No email"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary font-medium">{student.community_name || 'Unassigned'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-cfss-green-soft text-cfss-green">
                          {student.group_label || (student.group_number ? `Group ${student.group_number}` : 'Unassigned')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Student Details Modal */}
      {(selectedStudent || studentDetailsLoading) && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedStudent(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-surface rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              {studentDetailsLoading ? (
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cfss-green"></div>
                </div>
              ) : selectedStudent ? (
                <>
                  <div className="bg-surface px-6 pt-6 pb-4 sm:p-6 sm:pb-4 border-b border-border">
                    <h3 className="text-lg leading-6 font-bold text-primary mb-4" id="modal-title">
                      Student Details
                    </h3>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Profile</h4>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                          <div>
                            <dt className="text-sm font-medium text-muted">Name</dt>
                            <dd className="text-sm text-primary font-medium">{selectedStudent.name}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-muted">Index Number</dt>
                            <dd className="text-sm text-primary font-medium">{selectedStudent.student_id}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-muted">Gender</dt>
                            <dd className="text-sm text-primary">{selectedStudent.gender || 'Not provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-muted">Phone</dt>
                            <dd className="text-sm text-primary">{selectedStudent.phone_number || 'Not provided'}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-muted">Email</dt>
                            <dd className="text-sm text-primary">{selectedStudent.email || 'N/A'}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-muted">Department</dt>
                            <dd className="text-sm text-primary">{selectedStudent.program || 'N/A'}</dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Assignment</h4>
                        <div className="bg-page border border-border rounded p-4">
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                            <div className="sm:col-span-2">
                              <dt className="text-sm font-medium text-muted">Community</dt>
                              <dd className="text-sm text-primary font-semibold">{selectedStudent.community_name || 'Unassigned'}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted">Group</dt>
                              <dd className="text-sm text-primary">{selectedStudent.group_label || (selectedStudent.group_number ? `Group ${selectedStudent.group_number}` : 'Unassigned')}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted">Location</dt>
                              <dd className="text-sm text-primary">
                                {selectedStudent.district && selectedStudent.region
                                  ? `${selectedStudent.district}, ${selectedStudent.region}`
                                  : "N/A"}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-page px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <Button onClick={() => setSelectedStudent(null)} variant="outline">
                      Close
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* REPORT PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-border">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border bg-page flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-primary">Student Enrollment Report — Print Preview</h2>
                <p className="text-xs text-secondary mt-0.5">A4 Administrative Document Layout</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => window.print()} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </Button>
                <Button 
                  onClick={exportToPDF} 
                  variant="default" 
                  size="sm"
                  className="flex items-center gap-1.5 bg-[#093C22] hover:bg-[#0c512e] text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </Button>
                <Button 
                  onClick={() => setShowPreviewModal(false)} 
                  variant="ghost" 
                  size="sm"
                  className="text-secondary hover:text-primary ml-2"
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Modal Body: A4 Paper emulation */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100 flex justify-center">
              <div className="w-full max-w-[210mm] bg-white p-8 sm:p-12 rounded shadow border border-slate-200 text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
                {/* Official Header */}
                <div className="border-b border-slate-200 pb-5 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-xl font-bold tracking-tight text-[#093C22]">CFSS — STUDENT GROUP REGISTER</h1>
                      <p className="text-xs text-slate-600 mt-1">Academic Year: 2025/2026 Academic Year</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">Official Administrative Register</p>
                      <p>Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-5 text-xs text-slate-600">
                    <span><strong className="text-slate-800">Total Enrolled:</strong> {filteredStudents.length} Students</span>
                    <span><strong className="text-slate-800">Total Groups:</strong> {groupedCommunities.length} Groups</span>
                    <span><strong className="text-slate-800">Scope:</strong> {communityFilter ? `Community "${communityFilter}"` : 'All Communities'}</span>
                  </div>
                </div>

                {/* Content: Grouped by Community in canonical group order */}
                {groupedCommunities.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic">
                    No student records matching the selected criteria.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {groupedCommunities.map((group) => (
                      <div key={group.community_name} className="break-inside-avoid">
                        {/* Group Header */}
                        <div className="border-b border-slate-200 pb-2 mb-3">
                          <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                            {group.group_number !== 9999 ? `GROUP ${group.group_number} — ${group.community_name.toUpperCase()}` : group.community_name.toUpperCase()}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            District: {group.district || '—'} &nbsp;|&nbsp; Region: {group.region || '—'} &nbsp;|&nbsp; Number of students: {group.students.length}
                          </p>
                        </div>

                        <div className="border border-slate-200 rounded overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800">
                              <tr>
                                <th className="py-2 px-3 font-semibold w-36">Index No.</th>
                                <th className="py-2 px-3 font-semibold">Student Name</th>
                                <th className="py-2 px-3 font-semibold">Faculty</th>
                                <th className="py-2 px-3 font-semibold">Programme</th>
                                <th className="py-2 px-3 font-semibold text-center w-20">Gender</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.students.map((s, idx) => (
                                <tr key={s.id || idx} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-3 font-mono font-medium text-slate-900">{s.student_id || '—'}</td>
                                  <td className="py-2 px-3 text-slate-800">{s.name || '—'}</td>
                                  <td className="py-2 px-3 text-slate-600">{s.faculty || '—'}</td>
                                  <td className="py-2 px-3 text-slate-600">{s.program || '—'}</td>
                                  <td className="py-2 px-3 text-center text-slate-600">{s.gender || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer notes */}
                <div className="mt-12 pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center">
                  <span>CONFIDENTIAL — COMMUNITY FIELD STUDY SYSTEM</span>
                  <span>Administrative Use Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
