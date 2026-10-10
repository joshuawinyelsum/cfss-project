"use client";

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Student {
  id: string;
  name: string;
  student_id: string;
  email: string;
  faculty: string;
  program: string;
  level: number;
  gender: string;
  phone_number: string;
  community_id: string;
  community_name: string;
  group_number: number;
  group_label: string;
  district: string;
  region: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [communityFilter, setCommunityFilter] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/api/admin/students');
      setStudents(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new (jsPDF as any)();
    doc.setFontSize(16);
    doc.text('Students List', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
    
    const tableColumn = ["Index Number", "Name", "Email", "Department", "Community", "Group"];
    const tableRows = filteredStudents.map(student => [
      student.student_id || 'N/A',
      student.name || 'N/A',
      student.email || 'N/A',
      student.program || 'N/A',
      student.community_name || 'N/A',
      student.group_number || 'N/A'
    ]);
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`cfss_students_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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

  const handleStudentClick = async (studentId: string) => {
    setStudentDetailsLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/admin/students/${studentId}`);
      setSelectedStudent(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load student details');
    } finally {
      setStudentDetailsLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-secondary">Loading students...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Students</h1>
          <p className="text-secondary mt-1 text-sm">Manage enrolled students and community assignments.</p>
        </div>
        <Button onClick={exportToPDF} variant="outline" className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export PDF
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

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
                        <div className="text-sm text-primary font-medium">{student.community_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-cfss-green-soft text-cfss-green">
                          {student.group_label || `Group ${student.group_number}`}
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
                              <dd className="text-sm text-primary font-semibold">{selectedStudent.community_name}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted">Group</dt>
                              <dd className="text-sm text-primary">{selectedStudent.group_label || `Group ${selectedStudent.group_number}`}</dd>
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
    </div>
  );
}
