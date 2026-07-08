"use client";

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/lib/store';
import { Loader2, Download, Trash2 } from 'lucide-react';
import { downloadExport } from '@/lib/export';

interface UploadResponse {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
  whitelist_id?: number;
}

interface Whitelist {
  id: number;
  name: string;
  status: string;
  created_at: string;
  uploaded_by: string | null;
}

export default function WhitelistUploadPage() {
  const { token } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [whitelists, setWhitelists] = useState<Whitelist[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchWhitelists = async () => {
    if (!token) return;
    try {
      setLoadingLists(true);
      const response = await axios.get<Whitelist[]>('http://127.0.0.1:8000/admin/whitelist', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWhitelists(response.data);
    } catch (error) {
      console.error(error);
      showToast('Failed to fetch whitelists', 'error');
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    fetchWhitelists();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith('.csv') && !selected.name.endsWith('.xlsx')) {
        showToast('Invalid file type. Please upload .csv or .xlsx', 'error');
        setFile(null);
        return;
      }
      setFile(selected);
      setResult(null); // Clear previous results
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (!dropped.name.endsWith('.csv') && !dropped.name.endsWith('.xlsx')) {
        showToast('Invalid file type. Please upload .csv or .xlsx', 'error');
        return;
      }
      setFile(dropped);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file || !name) {
      showToast('Please provide a name and select a file', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);

    try {
      const response = await axios.post<UploadResponse>(
        'http://127.0.0.1:8000/admin/whitelist/upload',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
        }
      );
      
      setResult(response.data);
      if (response.data.failed === 0) {
        showToast('Upload successful!', 'success');
      } else {
        showToast('Upload completed with some errors.', 'error');
      }
      // Re-fetch list
      fetchWhitelists();
      setFile(null);
      setName('');
    } catch (error: any) {
      console.error("Upload error details:", error.response?.data);
      let errorMsg = 'An error occurred during upload.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMsg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMsg = error.response.data.detail[0]?.msg || 'Validation error';
        }
      }
      showToast(errorMsg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async (id: number) => {
    try {
      setExportingId(id);
      await downloadExport(`/admin/export/whitelist/${id}`, `whitelist_${id}.csv`, token!);
    } catch (error) {
      showToast('Export failed. Check server.', 'error');
    } finally {
      setExportingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this whitelist history record? This action cannot be undone.")) return;
    
    try {
      setDeletingId(id);
      await axios.delete(`http://127.0.0.1:8000/admin/whitelist/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Whitelist deleted successfully', 'success');
      fetchWhitelists();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Failed to delete whitelist. Check server.';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg text-white font-medium transition-opacity z-50 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Whitelist Management</h1>
          <p className="text-gray-500 mt-2">Manage your registration whitelists. Only entries in the ACTIVE whitelist can register.</p>
        </div>

        {/* Upload Box */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
           <h2 className="text-xl font-bold text-gray-900 mb-4">Upload New Whitelist</h2>
           <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Whitelist Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fall 2026 CS Batch"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                />
              </div>

              <div 
                className="p-8 rounded-lg border-2 border-dashed border-gray-300 text-center hover:border-blue-500 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv, .xlsx" 
                  className="hidden" 
                />
                
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                  </div>
                  
                  {file ? (
                    <div className="text-gray-700 font-medium">Selected file: {file.name}</div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium text-gray-700">Drag & drop your file here</p>
                      <p className="text-sm text-gray-500">or click below to browse</p>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    disabled={uploading}
                  >
                    Browse Files
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleUpload}
                  disabled={!file || !name || uploading}
                  className={`px-6 py-2 rounded font-medium text-white transition-colors flex items-center space-x-2
                    ${!file || !name || uploading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload Whitelist</span>
                  )}
                </button>
              </div>
           </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Upload Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                <span className="text-gray-500 text-sm uppercase tracking-wide">Total Rows</span>
                <span className="text-3xl font-bold text-gray-800">{result.total}</span>
              </div>
              <div className="bg-white p-4 rounded shadow-sm border border-green-200 flex flex-col items-center justify-center">
                <span className="text-green-600 text-sm uppercase tracking-wide">Successful</span>
                <span className="text-3xl font-bold text-green-600">{result.success}</span>
              </div>
              <div className="bg-white p-4 rounded shadow-sm border border-red-200 flex flex-col items-center justify-center">
                <span className="text-red-600 text-sm uppercase tracking-wide">Failed</span>
                <span className="text-3xl font-bold text-red-600">{result.failed}</span>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-100">
                  <h3 className="text-red-800 font-semibold flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Error Details
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="px-6 py-3 border-b border-gray-200">Row Number</th>
                        <th className="px-6 py-3 border-b border-gray-200">Error Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium">Row {err.row}</td>
                          <td className="px-6 py-3 text-red-600">{err.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Whitelists */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
           <h2 className="text-xl font-bold text-gray-900 mb-4">Historical Whitelists</h2>
           {loadingLists ? (
             <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>
           ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 border-b">ID</th>
                      <th className="px-4 py-3 border-b">Name</th>
                      <th className="px-4 py-3 border-b">Status</th>
                      <th className="px-4 py-3 border-b">Uploaded</th>
                      <th className="px-4 py-3 border-b text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whitelists.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No whitelists found</td>
                      </tr>
                    ) : (
                      whitelists.map(w => (
                        <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3">#{w.id}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{w.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${w.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{new Date(w.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleExport(w.id)}
                              disabled={exportingId === w.id}
                              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              title="Export CSV"
                            >
                              {exportingId === w.id ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 mr-1" />
                              )}
                              Export
                            </button>
                            {w.status !== 'ACTIVE' && (
                              <button
                                onClick={() => handleDelete(w.id)}
                                disabled={deletingId === w.id}
                                className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 ml-4"
                                title="Delete Whitelist"
                              >
                                {deletingId === w.id ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-1" />
                                )}
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
