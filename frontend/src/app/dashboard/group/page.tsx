"use client";
import Link from 'next/link';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Users, User as UserIcon, Loader2, AlertCircle , ArrowLeft } from 'lucide-react';

interface GroupMember {
  id: number;
  student_id: string;
  full_name: string;
  faculty: string | null;
  program: string | null;
  gender: string | null;
  phone_number: string | null;
  community_name: string;
  group_number: number;
}

export default function MyGroupPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    if (!user) return;
    if (user.role !== 'student') { router.push('/login'); return; }

    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/student/community/members', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMembers(res.data);
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'response' in err) {
           const axiosErr = err as { response?: { data?: { detail?: string } } };
           setError(axiosErr.response?.data?.detail || 'Failed to load group members.');
        } else {
           setError('Failed to load group members.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, token, router]);

  if (!user) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile Back Navigation */}
      <div className="lg:hidden mb-4">
        <Link href="/dashboard/more" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Back to More
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <Users size={24} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Group
              {user.group_number != null && (
                <span className="ml-3 text-lg font-semibold text-emerald-700">
                  GROUP {String(user.group_number).padStart(2, '0')}
                </span>
              )}
            </h1>
            <p className="text-gray-500 mt-0.5">
              Community: <strong className="text-gray-800">{user.community || 'Not assigned'}</strong>
              {!loading && members.length > 0 && (
                <span className="ml-3 text-gray-400">· {members.length} member{members.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
          <UserIcon size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No group members found.</p>
          <p className="text-sm text-gray-400 mt-1">You may not yet be assigned to a community.</p>
        </div>
      )}

      {/* Member Table */}
      {!loading && !error && members.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 w-16">#</th>
                  <th className="px-6 py-3">Full Name</th>
                  <th className="px-6 py-3">Gender</th>
                  <th className="px-6 py-3">Index Number</th>
                  <th className="px-6 py-3">Faculty/School</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {members.map((member, i) => {
                  const isMe = member.id === user.id;
                  return (
                    <tr key={member.id} className={isMe ? 'bg-emerald-50/50' : 'hover:bg-gray-50/50 transition-colors'}>
                      <td className="px-6 py-4 text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {member.full_name}
                        {isMe && <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">(You)</span>}
                      </td>
                      <td className="px-6 py-4">{member.gender || '-'}</td>
                      <td className="px-6 py-4 font-mono text-gray-500">{member.student_id}</td>
                      <td className="px-6 py-4">{member.faculty || '-'}</td>
                      <td className="px-6 py-4">{member.program || '-'}</td>
                      <td className="px-6 py-4">
                        {member.phone_number ? (
                          <a href={`tel:${member.phone_number.replace(/\s/g, '')}`} className="text-emerald-600 hover:text-emerald-700 font-medium">
                            {member.phone_number}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
