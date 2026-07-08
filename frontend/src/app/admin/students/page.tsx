"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Student {
  id: string;
  student_id: string;
  name: string;
  email: string;
  program: string;
  level: number;
  role: string;
  community_id: string;
  community_name: string;
  group_label: string;
  group_number: number;
  district: string;
  region: string;
}

export default function AdminStudentsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string>('All');

  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    fetchStudents();
  }, [user, router, token]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchStudents = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch students. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (studentId: string) => {
    setStudentDetailsLoading(true);
    setSelectedStudent(null);
    try {
      // Fetch full details if needed, or just use the existing row data
      // The requirement states to fetch from GET /admin/students/{id}
      const res = await api.get(`/api/admin/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedStudent(res.data);
    } catch (err: any) {
      alert("Failed to fetch student details.");
    } finally {
      setStudentDetailsLoading(false);
    }
  };

  // Extract unique communities for the filter dropdown
  const uniqueCommunities = useMemo(() => {
    const comms = new Set(students.map(s => s.community_name).filter(Boolean));
    return Array.from(comms).sort();
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Community filter
      if (selectedCommunity !== 'All' && student.community_name !== selectedCommunity) {
        return false;
      }
      // Search by email
      if (debouncedSearch && (!student.email || !student.email.toLowerCase().includes(debouncedSearch.toLowerCase()))) {
        return false;
      }
      return true;
    });
  }, [students, selectedCommunity, debouncedSearch]);

  if (!user || user.role !== 'admin') {
    return null; // Will redirect
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500 mt-1">Manage all assigned students</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm disabled:opacity-50"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Filter */}
          <select
            className="block w-full sm:w-48 pl-3 pr-10 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm disabled:opacity-50"
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            disabled={loading}
          >
            <option value="All">All Communities</option>
            {uniqueCommunities.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-700 font-medium text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-900 mb-1">No students found</h3>
          <p className="text-slate-500">
            {students.length === 0 
              ? "There are no students assigned to any communities yet." 
              : "No students match your current search and filter criteria."}
          </p>
          {(searchTerm || selectedCommunity !== 'All') && (
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCommunity('All'); }}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Student / Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Community
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Group
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    onClick={() => handleRowClick(student.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{student.name}</div>
                          <div className="text-sm text-slate-500">{student.email || "No email"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 font-medium">{student.community_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        {student.group_label || `Group ${student.group_number}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {(selectedStudent || studentDetailsLoading) && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedStudent(null)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              {studentDetailsLoading ? (
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : selectedStudent ? (
                <>
                  <div className="bg-white px-6 pt-6 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-xl leading-6 font-bold text-slate-900" id="modal-title">
                          Student Details
                        </h3>
                        <div className="mt-4 space-y-4">
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-sm font-medium text-slate-500">Name:</span>
                              <span className="text-sm font-semibold text-slate-900 col-span-2">{selectedStudent.name}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-sm font-medium text-slate-500">Email:</span>
                              <span className="text-sm text-slate-900 col-span-2">{selectedStudent.email || "N/A"}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-sm font-medium text-slate-500">Program:</span>
                              <span className="text-sm text-slate-900 col-span-2">{selectedStudent.program || "N/A"}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-sm font-medium text-slate-500">Level:</span>
                              <span className="text-sm text-slate-900 col-span-2">{selectedStudent.level || "N/A"}</span>
                            </div>
                          </div>
                          
                          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-3">
                            <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-2">Assignment</h4>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-sm font-medium text-indigo-700">Community:</span>
                              <span className="text-sm font-bold text-indigo-900 col-span-2">{selectedStudent.community_name}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-sm font-medium text-indigo-700">Group:</span>
                              <span className="text-sm font-bold text-indigo-900 col-span-2">{selectedStudent.group_label || `Group ${selectedStudent.group_number}`}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-sm font-medium text-indigo-700">Location:</span>
                              <span className="text-sm text-indigo-900 col-span-2">
                                {selectedStudent.district && selectedStudent.region 
                                  ? `${selectedStudent.district}, ${selectedStudent.region}` 
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200">
                    <button 
                      type="button" 
                      className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-slate-900 text-base font-medium text-white hover:bg-slate-800 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                      onClick={() => setSelectedStudent(null)}
                    >
                      Close
                    </button>
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
