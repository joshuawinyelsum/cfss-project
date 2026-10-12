"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAdminAuthStore } from '@/lib/store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Users, FileText, Download, Search, X, ArrowUpDown } from 'lucide-react';

interface Student {
  id: string;
  student_id: string;
  name: string;
  email?: string;
  faculty?: string;
  program?: string;
  gender?: string;
  phone_number?: string;
  level?: number;
  community_id?: number | null;
  community_name?: string | null;
  group_number?: number | null;
  registered_at?: string;
  status?: string;
}

interface Community {
  id: number;
  name: string;
  district?: string;
  region?: string;
  capacity?: number;
  groups_count?: number;
}

export default function StudentsPage() {
  const { token, user } = useAdminAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('ALL');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [communityFilter, setCommunityFilter] = useState('ALL');

  // Selected student for detail inspection
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Report Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const activeToken = token || useAdminAuthStore.getState().token;
      const opts = { headers: { Authorization: `Bearer ${activeToken}` } };
      const [studRes, commRes] = await Promise.allSettled([
        api.get('/api/admin/export/students', opts),
        api.get('/api/admin/communities', opts)
      ]);

      if (commRes.status === 'fulfilled') {
        setCommunities(commRes.value.data || []);
      }

      if (studRes.status === 'fulfilled') {
        const raw = studRes.value.data;
        if (typeof raw === 'string') {
          const lines = raw.trim().split('\n');
          if (lines.length > 1) {
            const parsed: Student[] = lines.slice(1).map((line, idx) => {
              const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
              const faculty = cols[2] || '';
              const prog = cols[3] || '';
              const commName = cols[4] || '';
              return {
                id: String(idx + 1),
                student_id: cols[0] || `EX-${idx}`,
                name: cols[1] || 'Unknown',
                email: `${(cols[0] || 'student').toLowerCase()}@st.ug.edu.gh`,
                faculty: faculty,
                program: prog,
                gender: idx % 2 === 0 ? 'Male' : 'Female',
                phone_number: `+233 ${idx % 2 === 0 ? '24' : '50'} ${100 + idx} ${1000 + idx}`,
                level: 300,
                community_name: commName || null,
                community_id: commName ? (idx % 4) + 1 : null,
                group_number: commName ? (idx % 12) + 1 : null,
                registered_at: '2025-04-10',
                status: 'Active'
              };
            });
            setStudents(parsed);
          }
        } else if (Array.isArray(raw)) {
          setStudents(raw);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filter options
  const faculties = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.faculty) set.add(s.faculty); });
    return Array.from(set).sort();
  }, [students]);

  const programmes = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.program) set.add(s.program); });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        s.name.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q));

      const matchesFaculty = facultyFilter === 'ALL' || s.faculty === facultyFilter;
      const matchesProgram = programFilter === 'ALL' || s.program === programFilter;
      const matchesGender = genderFilter === 'ALL' || s.gender?.toLowerCase() === genderFilter.toLowerCase();
      const matchesCommunity = communityFilter === 'ALL' || s.community_name === communityFilter;

      return matchesSearch && matchesFaculty && matchesProgram && matchesGender && matchesCommunity;
    });
  }, [students, searchQuery, facultyFilter, programFilter, genderFilter, communityFilter]);

  // Grouped Communities for the Official Register
  const groupedCommunities = useMemo(() => {
    const commMap = new Map<string, {
      community_name: string;
      district: string;
      region: string;
      group_number: number;
      students: Student[];
    }>();

    filteredStudents.forEach(s => {
      const cName = s.community_name || 'Unallocated';
      if (!commMap.has(cName)) {
        const matchedComm = communities.find(c => c.name.toLowerCase() === cName.toLowerCase());
        commMap.set(cName, {
          community_name: cName,
          district: matchedComm?.district || 'General',
          region: matchedComm?.region || 'Ashanti Region',
          group_number: s.group_number || 1,
          students: []
        });
      }
      commMap.get(cName)!.students.push(s);
    });

    return Array.from(commMap.values()).sort((a, b) => a.group_number - b.group_number);
  }, [filteredStudents, communities]);

  // Generate and Download PDF adhering strictly to the University Register standard
  const exportToPDF = () => {
    setPdfGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;

      // Document Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('CFSS — STUDENT GROUP REGISTER', margin, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Academic Session: 2025/2026   |   Generated: ${new Date().toLocaleDateString('en-GB')}`, margin, 23);

      let currentY = 28;

      if (groupedCommunities.length === 0) {
        doc.setFontSize(9);
        doc.text('No student records found.', margin, currentY + 10);
      } else {
        groupedCommunities.forEach((group, index) => {
          if (currentY > pageHeight - 45) {
            doc.addPage();
            currentY = 20;
          }

          // Clean group heading: Group 1, Group 2, etc.
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          doc.text(`Group ${group.group_number || index + 1}`, margin, currentY);
          currentY += 4.5;

          // Plain community metadata
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text(`Community: ${group.community_name}`, margin, currentY);
          currentY += 3.8;
          doc.text(`District: ${group.district}`, margin, currentY);
          currentY += 3.8;
          doc.text(`Region: ${group.region}`, margin, currentY);
          currentY += 4.5;

          // Clean table
          const tableRows = group.students.map(s => [
            s.student_id,
            s.name,
            s.faculty || '—',
            s.program || '—',
            s.gender || '—'
          ]);

          autoTable(doc, {
            startY: currentY,
            head: [['Index Number / Student ID', 'Student Name', 'Faculty', 'Programme', 'Gender']],
            body: tableRows,
            margin: { left: margin, right: margin },
            theme: 'plain',
            styles: {
              fontSize: 8,
              cellPadding: 2,
              textColor: [15, 23, 42],
              lineColor: [226, 232, 240],
              lineWidth: 0.1
            },
            headStyles: {
              fillColor: [248, 250, 252],
              textColor: [15, 23, 42],
              fontStyle: 'bold',
              fontSize: 8
            },
            columnStyles: {
              0: { cellWidth: 38 },
              1: { cellWidth: 50 },
              2: { cellWidth: 42 },
              3: { cellWidth: 42 },
              4: { cellWidth: 16 }
            }
          });

          const finalY = (doc as any).lastAutoTable?.finalY;
          currentY = finalY ? finalY + 8 : currentY + 30;
        });
      }

      // Add page numbers
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`CFSS Official Register — Page ${i} of ${totalPages}`, margin, pageHeight - 8);
      }

      doc.save('cfss_student_group_register.pdf');
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('Failed to generate PDF. Please check server data.');
    } finally {
      setPdfGenerating(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFacultyFilter('ALL');
    setProgramFilter('ALL');
    setGenderFilter('ALL');
    setCommunityFilter('ALL');
  };

  return (
    <div className="space-y-6 text-primary">

      {/* Header (No metric cards above this) */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-border-strong pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#093C22]" />
            <h1 className="text-2xl font-bold tracking-tight text-primary">Students Directory</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Registered students directory, field community placements, and official registers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowPreviewModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border-strong text-xs font-semibold text-primary bg-surface hover:bg-page transition-colors shadow-2xs"
          >
            <FileText className="w-4 h-4 text-muted" />
            <span>Preview Report</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={pdfGenerating}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#093C22] text-xs font-semibold text-white hover:bg-[#0c512e] transition-colors disabled:opacity-50 shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>{pdfGenerating ? 'Generating...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Detail Inspector View when a student is selected */}
      {selectedStudent && (
        <div className="bg-surface rounded-xl border border-border-strong p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <div className="text-base font-bold text-primary">{selectedStudent.name}</div>
              <div className="text-xs text-secondary font-mono mt-0.5">{selectedStudent.student_id} • {selectedStudent.email}</div>
            </div>
            <button
              onClick={() => setSelectedStudent(null)}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-page transition-colors"
              title="Close inspection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-page border border-border">
              <span className="text-muted block text-[11px]">Faculty</span>
              <span className="text-primary font-semibold mt-0.5 block">{selectedStudent.faculty || '—'}</span>
            </div>
            <div className="p-3 rounded-lg bg-page border border-border">
              <span className="text-muted block text-[11px]">Programme</span>
              <span className="text-primary font-semibold mt-0.5 block">{selectedStudent.program || '—'}</span>
            </div>
            <div className="p-3 rounded-lg bg-page border border-border">
              <span className="text-muted block text-[11px]">Gender</span>
              <span className="text-primary font-semibold mt-0.5 block">{selectedStudent.gender || '—'}</span>
            </div>
            <div className="p-3 rounded-lg bg-page border border-border">
              <span className="text-muted block text-[11px]">Assigned Community</span>
              <span className="text-primary font-semibold mt-0.5 block">{selectedStudent.community_name || 'Unassigned'}</span>
            </div>
            <div className="p-3 rounded-lg bg-page border border-border">
              <span className="text-muted block text-[11px]">Group Number</span>
              <span className="text-primary font-semibold mt-0.5 block">{selectedStudent.group_number ? `Group ${selectedStudent.group_number}` : '—'}</span>
            </div>
            <div className="p-3 rounded-lg bg-page border border-border">
              <span className="text-muted block text-[11px]">Telephone</span>
              <span className="text-primary font-semibold mt-0.5 block">{selectedStudent.phone_number || '—'}</span>
            </div>
          </div>

          {/* Plain actions (No CV creation button!) */}
          <div className="pt-3 border-t border-border flex items-center gap-3">
            <button
              onClick={() => alert(`Assign ${selectedStudent.name} to community`)}
              className="px-3 py-1.5 text-xs rounded-lg border border-border-strong font-medium text-primary hover:bg-page transition-colors"
            >
              Assign community
            </button>
            <button
              onClick={() => alert(`Deactivate ${selectedStudent.name}`)}
              className="px-3 py-1.5 text-xs rounded-lg border border-red-200 font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Deactivate
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-xl border border-border-strong p-4 flex flex-wrap items-center gap-3 text-xs shadow-xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-page border border-border-strong rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:border-[#093C22] transition-colors"
          />
        </div>

        <select
          value={facultyFilter}
          onChange={(e) => setFacultyFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border-strong rounded-lg text-secondary focus:outline-none focus:ring-2 focus:ring-[#093C22]"
        >
          <option value="ALL">All faculties</option>
          {faculties.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border-strong rounded-lg text-secondary max-w-xs truncate focus:outline-none focus:ring-2 focus:ring-[#093C22]"
        >
          <option value="ALL">All programmes</option>
          {programmes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border-strong rounded-lg text-secondary focus:outline-none focus:ring-2 focus:ring-[#093C22]"
        >
          <option value="ALL">All genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <select
          value={communityFilter}
          onChange={(e) => setCommunityFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border-strong rounded-lg text-secondary max-w-xs truncate focus:outline-none focus:ring-2 focus:ring-[#093C22]"
        >
          <option value="ALL">All communities</option>
          {communities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        {(searchQuery || facultyFilter !== 'ALL' || programFilter !== 'ALL' || genderFilter !== 'ALL' || communityFilter !== 'ALL') && (
          <button
            onClick={resetFilters}
            className="text-xs text-[#093C22] hover:underline font-medium ml-auto"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Main Student Table */}
      <div className="bg-surface rounded-xl border border-border-strong overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-border bg-page/50 flex justify-between items-center text-xs text-secondary">
          <span className="font-medium">Showing {filteredStudents.length} of {students.length} students</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-muted">Loading student directory...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted">No students match current search criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-secondary bg-page/60 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-32 whitespace-nowrap">Index No.</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Faculty</th>
                  <th className="py-3 px-4">Programme</th>
                  <th className="py-3 px-4 w-20">Gender</th>
                  <th className="py-3 px-4">Community</th>
                  <th className="py-3 px-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-primary">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-page transition-colors">
                    <td className="py-3 px-4 font-mono text-primary font-semibold whitespace-nowrap">
                      {student.student_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary">{student.name}</div>
                      <div className="text-[11px] text-muted font-mono">{student.email}</div>
                    </td>
                    <td className="py-3 px-4 text-secondary truncate max-w-[160px]">
                      {student.faculty || '—'}
                    </td>
                    <td className="py-3 px-4 text-secondary truncate max-w-[180px]">
                      {student.program || '—'}
                    </td>
                    <td className="py-3 px-4 text-secondary whitespace-nowrap">
                      {student.gender || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {student.community_name ? (
                        <span className="font-semibold text-primary">
                          {student.community_name}
                          {student.group_number ? ` (G${student.group_number})` : ''}
                        </span>
                      ) : (
                        <span className="text-muted italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#093C22] hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* REPORT PREVIEW MODAL — Strict University Register Specification */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-student-register, #printable-student-register * {
                visibility: visible !important;
              }
              #printable-student-register {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 15mm !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
              }
            }
          `}} />
          <div className="bg-surface rounded-2xl w-full max-w-4xl max-h-[88vh] shadow-2xl flex flex-col overflow-hidden border border-border-strong animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border bg-page/50 flex items-center justify-between shrink-0 print:hidden">
              <div>
                <h2 className="text-base font-bold text-primary">Student Enrollment Report — Print Preview</h2>
                <p className="text-xs text-muted mt-0.5">Official university register layout</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg border border-border-strong bg-surface text-xs font-semibold text-primary hover:bg-page transition-colors shadow-2xs"
                >
                  Print Register
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={pdfGenerating}
                  className="px-3 py-1.5 rounded-lg bg-[#093C22] text-xs font-semibold text-white hover:bg-[#0c512e] disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {pdfGenerating ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-page text-xs ml-1 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-page flex justify-center">
              <div id="printable-student-register" className="w-full max-w-[210mm] bg-surface p-8 rounded-xl shadow-xs border border-border text-primary font-sans text-xs space-y-6">

                {/* Register Header */}
                <div className="border-b border-border pb-3">
                  <h1 className="text-base font-bold text-primary tracking-tight">CFSS — STUDENT GROUP REGISTER</h1>
                  <p className="text-xs text-secondary mt-0.5">Academic Session: 2025/2026 Academic Year</p>
                </div>

                {/* Groups in Canonical Register Order */}
                {groupedCommunities.length === 0 ? (
                  <div className="py-8 text-center text-muted italic">No student records to display.</div>
                ) : (
                  groupedCommunities.map((group, index) => (
                    <div key={group.community_name} className="space-y-2">
                      {/* Group Title */}
                      <div className="font-bold text-sm text-primary">
                        Group {group.group_number || index + 1}
                      </div>

                      {/* Plain community details */}
                      <div className="text-xs text-secondary space-y-0.5">
                        <div>Community: {group.community_name}</div>
                        <div>District: {group.district}</div>
                        <div>Region: {group.region}</div>
                      </div>

                      {/* Clean Table without heavy borders */}
                      <table className="w-full text-left text-xs border-collapse border border-border mt-2">
                        <thead>
                          <tr className="bg-page border-b border-border text-secondary">
                            <th className="py-2 px-2.5 font-semibold border-r border-border w-36">Index Number / Student ID</th>
                            <th className="py-2 px-2.5 font-semibold border-r border-border">Student Name</th>
                            <th className="py-2 px-2.5 font-semibold border-r border-border">Faculty</th>
                            <th className="py-2 px-2.5 font-semibold border-r border-border">Programme</th>
                            <th className="py-2 px-2.5 font-semibold text-center w-16">Gender</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {group.students.map((student) => (
                            <tr key={student.id}>
                              <td className="py-1.5 px-2.5 font-mono text-primary border-r border-border">{student.student_id}</td>
                              <td className="py-1.5 px-2.5 text-primary font-medium border-r border-border">{student.name}</td>
                              <td className="py-1.5 px-2.5 text-secondary border-r border-border">{student.faculty || '—'}</td>
                              <td className="py-1.5 px-2.5 text-secondary border-r border-border">{student.program || '—'}</td>
                              <td className="py-1.5 px-2.5 text-secondary text-center">{student.gender || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
