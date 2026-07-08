"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { syncEngine } from '@/lib/sync';
import { v4 as uuidv4 } from 'uuid';

export default function HouseholdSurvey() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  
  useEffect(() => {
    if (!user || user.role !== 'student') {
      router.push('/login');
    }
  }, [user, router]);
  
  const [popTotal, setPopTotal] = useState('');
  const [male, setMale] = useState('');
  const [female, setFemale] = useState('');
  const [households, setHouseholds] = useState('');
  
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('Submitting...');
    
    const p = parseInt(popTotal);
    const m = parseInt(male);
    const f = parseInt(female);
    const h = parseInt(households);
    
    if (isNaN(p) || isNaN(m) || isNaN(f) || isNaN(h)) {
      setError("All fields must be valid numbers");
      setStatus('');
      return;
    }
    
    if (p < m + f) {
      setError("Total population cannot be less than male + female count.");
      setStatus('');
      return;
    }
    
    if (!token) {
      setError("Authentication token missing. Please log in again.");
      setStatus('');
      return;
    }

    const unique_id = uuidv4();
    const data = {
      population_total: p,
      male: m,
      female: f,
      households: h,
      dependency_ratio_inputs: {}
    };

    const isOnline = navigator.onLine;
    const queued = await syncEngine.queueSubmission('Household', data, unique_id, token);
    
    if (queued === false && !isOnline) {
      setStatus('Saved offline. Will sync when connection is restored.');
    } else {
      setStatus('Submitted successfully!');
    }
    
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white p-8 border border-gray-200 rounded shadow-sm">
        
        <div className="mb-6 flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Household Survey</h1>
            <p className="text-sm text-gray-500 mt-1">Community Data Collection Form</p>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600 hover:underline">
            &larr; Back
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded">{error}</div>}
        {status && <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm border border-blue-200 rounded">{status}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Population</label>
              <input required type="number" min="0" value={popTotal} onChange={e => setPopTotal(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Households</label>
              <input required type="number" min="0" value={households} onChange={e => setHouseholds(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Male Count</label>
              <input required type="number" min="0" value={male} onChange={e => setMale(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Female Count</label>
              <input required type="number" min="0" value={female} onChange={e => setFemale(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded-md hover:bg-green-700 text-sm font-medium">
              Submit Survey
            </button>
            <button type="button" onClick={() => router.push('/dashboard')} className="flex-1 bg-gray-100 text-gray-700 border border-gray-300 p-2 rounded-md hover:bg-gray-200 text-sm font-medium">
              Save Draft
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
