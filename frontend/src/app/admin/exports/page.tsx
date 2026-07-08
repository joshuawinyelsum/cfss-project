"use client";

import { useState } from 'react';
import { downloadExport } from '@/lib/export';
import { Download, Users, ClipboardList, Loader2 } from 'lucide-react';

import { useAuthStore } from '@/lib/store';

export default function ExportsPage() {
  const { token } = useAuthStore();
  const [exportingStudents, setExportingStudents] = useState(false);
  const [exportingSurveys, setExportingSurveys] = useState(false);

  const handleExportStudents = async () => {
    try {
      setExportingStudents(true);
      await downloadExport('/admin/export/students', 'students_export.csv', token!);
    } catch (e) {
      alert("Export failed. Check server.");
    } finally {
      setExportingStudents(false);
    }
  };

  const handleExportSurveys = async () => {
    try {
      setExportingSurveys(true);
      await downloadExport('/admin/export/surveys', 'surveys_export.csv', token!);
    } catch (e) {
      alert("Export failed. Check server.");
    } finally {
      setExportingSurveys(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Exports</h1>
        <p className="text-sm text-slate-500 mt-1">Export system data into CSV format for offline analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Students Export */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">Students Export</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                Download a complete list of all registered students, including their programs, levels, and verification status.
              </p>
              <button
                onClick={handleExportStudents}
                disabled={exportingStudents}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {exportingStudents ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportingStudents ? "Exporting..." : "Export Students (CSV)"}
              </button>
            </div>
          </div>
        </div>

        {/* Surveys Export */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">Surveys Export</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                Download all submitted surveys, linked to their respective communities and students, including raw JSON data.
              </p>
              <button
                onClick={handleExportSurveys}
                disabled={exportingSurveys}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {exportingSurveys ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportingSurveys ? "Exporting..." : "Export Surveys (CSV)"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
