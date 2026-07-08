"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function RegisterPage() {
  const [studentId, setStudentId] = useState('');
  const [program, setProgram] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const payload = {
        student_id: studentId.trim().toUpperCase(),
        program: program.trim().toLowerCase(),
        password
      };
      
      console.log("Register payload:", { ...payload, password: "***" });
      
      const res = await axios.post('http://127.0.0.1:8000/api/v2/students/register', payload);
      console.log("Register response:", res.data);
      
      router.push('/login?registered=true');
    } catch (err: any) {
      console.error("Register error:", err?.response?.data || err.message);
      
      const detail = err?.response?.data?.detail;
      if (!detail) {
        setError('Registration failed due to an unexpected error.');
        return;
      }
      
      // Map exact backend detail strings to user-friendly messages
      if (detail === 'Registration is closed') {
        setError('Registration is currently closed. Please try again later.');
      } else if (detail === 'Not authorized') {
        setError('Your student ID is not on the approved list. Contact administration.');
      } else if (detail === 'Program mismatch') {
        setError('Your program does not match our records. Please check and try again.');
      } else if (detail === 'Already registered') {
        setError('This student ID is already registered. Please log in instead.');
      } else if (detail === 'All communities full') {
        setError('Registration temporarily unavailable. All communities are full.');
      } else {
        setError(detail); // Fallback to raw message (e.g., password too short)
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">CFSS Registration</h1>
          <p className="text-sm text-gray-500 mt-2">Level 100/200 Students Only</p>
        </div>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded">{error}</div>}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Student ID</label>
            <input 
              type="text" 
              required 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
              placeholder="e.g. ABC/1234/5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Program of Study</label>
            <input 
              type="text" 
              required 
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
              placeholder="e.g. Computer Science"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
              placeholder="Minimum 6 characters"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 text-sm font-medium"
          >
            Register
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  );
}
