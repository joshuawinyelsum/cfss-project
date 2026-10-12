"use client";

import { useState } from 'react';
import { downloadExport } from '@/lib/export';
import Link from 'next/link';
import { useAdminAuthStore } from '@/lib/store';

export default function ExportsPage() {
  const { token } = useAdminAuthStore();
  const [exportingStudents, setExportingStudents] = useState(false);
  const [exportingSurveys, setExportingSurveys] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleExportStudents = async () => {
    try {
      setExportingStudents(true);
      await downloadExport('/admin/export/students', 'cfss_students_roster.csv', token!);
      showToast('Student directory exported successfully (CSV)', 'success');
    } catch {
      showToast('Student export failed. Check server connectivity.', 'error');
    } finally {
      setExportingStudents(false);
    }
  };

  const handleExportSurveys = async () => {
    try {
      setExportingSurveys(true);
      await downloadExport('/admin/export/surveys', 'cfss_surveys_data.csv', token!);
      showToast('Field survey submissions exported successfully (CSV)', 'success');
    } catch {
      showToast('Survey export failed. Check server connectivity.', 'error');
    } finally {
      setExportingSurveys(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-5xl mx-auto text-primary">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-2.5 rounded-lg shadow-lg text-white text-xs font-semibold transition-all z-50 ${
          toast.type === 'success' ? 'bg-[#093C22]' : 'bg-red-600'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border-strong pb-4">
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          Data Export Center
        </h1>
        <p className="text-secondary text-sm mt-1">
          Generate and download institutional datasets in standardized CSV format for statistical and offline analysis.
        </p>
      </div>

      {/* Main Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Students Roster Export */}
        <div className="bg-surface rounded-xl border border-border-strong overflow-hidden flex flex-col justify-between shadow-xs">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-primary">Student Directory & Profiles</h3>
              <span className="px-2 py-0.5 rounded-md text-2xs font-mono bg-page text-secondary border border-border">
                .CSV
              </span>
            </div>
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              Complete register of all registered students, including academic index numbers, full names, faculty, programmes, community assignments, and verification states.
            </p>

            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-2xs text-secondary">
              <div>
                <span className="block font-semibold text-primary">Output Format:</span>
                <span>Comma-separated values</span>
              </div>
              <div>
                <span className="block font-semibold text-primary">Columns:</span>
                <span>ID, Name, Faculty, Program, Community</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-page/60 border-t border-border flex items-center justify-between">
            <span className="text-2xs text-muted">Deterministic SQL query</span>
            <button
              onClick={handleExportStudents}
              disabled={exportingStudents}
              className="bg-[#093C22] hover:bg-[#0c512e] text-white text-xs font-semibold py-2 px-3.5 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
            >
              {exportingStudents ? "Generating CSV..." : "Export student roster"}
            </button>
          </div>
        </div>

        {/* Card 2: Surveys Export */}
        <div className="bg-surface rounded-xl border border-border-strong overflow-hidden flex flex-col justify-between shadow-xs">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-primary">Survey Submissions Dataset</h3>
              <span className="px-2 py-0.5 rounded-md text-2xs font-mono bg-page text-secondary border border-border">
                .CSV
              </span>
            </div>
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              Full dataset of field surveys submitted by students across all designated communities, complete with submission timestamps, community linkage, and serialized responses.
            </p>

            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-2xs text-secondary">
              <div>
                <span className="block font-semibold text-primary">Output Format:</span>
                <span>Raw flattened CSV dataset</span>
              </div>
              <div>
                <span className="block font-semibold text-primary">Columns:</span>
                <span>Submission ID, Community, Survey Type, Timestamp</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-page/60 border-t border-border flex items-center justify-between">
            <span className="text-2xs text-muted">Streamed from database</span>
            <button
              onClick={handleExportSurveys}
              disabled={exportingSurveys}
              className="bg-[#093C22] hover:bg-[#0c512e] text-white text-xs font-semibold py-2 px-3.5 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
            >
              {exportingSurveys ? "Generating CSV..." : "Export survey dataset"}
            </button>
          </div>
        </div>
      </div>

      {/* Additional Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Whitelist Cohort Export link */}
        <div className="bg-surface p-5 rounded-xl border border-border-strong flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-primary">Cohort Whitelist Exports</h4>
            <p className="text-xs text-secondary">
              Export specific admission cohorts or class rosters individually with member validation.
            </p>
          </div>
          <Link
            href="/admin/whitelist"
            className="text-xs font-semibold text-[#093C22] hover:underline shrink-0 ml-4"
          >
            Manage Whitelists
          </Link>
        </div>

        {/* PDF Group Register link */}
        <div className="bg-surface p-5 rounded-xl border border-border-strong flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-primary">Official Group Registers (PDF)</h4>
            <p className="text-xs text-secondary">
              Generate formatted university registers with signature columns and verification seals.
            </p>
          </div>
          <Link
            href="/admin/students"
            className="text-xs font-semibold text-[#093C22] hover:underline shrink-0 ml-4"
          >
            Generate from Students
          </Link>
        </div>
      </div>
    </div>
  );
}
