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
        <Link href="/dashboard/more" className="inline-flex items-center text-sm font-medium text-muted hover:text-primary transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Back to More
        </Link>
      </div>

      {/* Header */}
      <div className="bg-surface rounded-xl shadow-xs border border-border-strong p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cfss-green-soft rounded-xl flex items-center justify-center shrink-0 text-cfss-green">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">
              My Fieldwork Group
              {user.group_number != null && (
                <span className="ml-3 text-sm font-semibold px-2.5 py-1 rounded-full bg-cfss-green-soft text-cfss-green border border-cfss-green/20">
                  Group {String(user.group_number).padStart(2, '0')}
                </span>
              )}
            </h1>
            <p className="text-xs text-secondary mt-1">
              Assigned Community: <strong className="text-primary font-semibold">{user.community || 'Not assigned'}</strong>
              {!loading && members.length > 0 && (
                <span className="ml-2 text-muted">&bull; {members.length} registered member{members.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-cfss-green" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <div className="py-16 text-center border-2 border-dashed border-border-strong rounded-xl bg-surface">
          <UserIcon size={36} className="mx-auto text-muted mb-3 opacity-50" />
          <p className="text-sm text-primary font-semibold">No group members found</p>
          <p className="text-xs text-secondary mt-1">You may not yet be assigned to an active fieldwork community.</p>
        </div>
      )}

      {/* Member Table */}
      {!loading && !error && members.length > 0 && (
        <div className="bg-surface rounded-xl shadow-xs border border-border-strong overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-surface-elevated/60 text-secondary font-semibold border-b border-border-strong">
                <tr>
                  <th className="px-5 py-3 w-12 text-muted">#</th>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Gender</th>
                  <th className="px-5 py-3">Student ID</th>
                  <th className="px-5 py-3">Faculty / School</th>
                  <th className="px-5 py-3">Program</th>
                  <th className="px-5 py-3">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-secondary">
                {members.map((member, i) => {
                  const isMe = member.id === user.id;
                  return (
                    <tr key={member.id} className={isMe ? 'bg-cfss-green-soft/60 font-medium' : 'hover:bg-surface-elevated/40 transition-colors'}>
                      <td className="px-5 py-3.5 text-muted">{i + 1}</td>
                      <td className="px-5 py-3.5 font-semibold text-primary">
                        {member.full_name}
                        {isMe && <span className="ml-2 text-[10px] font-bold text-cfss-green bg-cfss-green-soft border border-cfss-green/20 px-1.5 py-0.5 rounded-full">(You)</span>}
                      </td>
                      <td className="px-5 py-3.5">{member.gender || '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-muted">{member.student_id}</td>
                      <td className="px-5 py-3.5">{member.faculty || '—'}</td>
                      <td className="px-5 py-3.5 capitalize">{member.program || '—'}</td>
                      <td className="px-5 py-3.5">
                        {member.phone_number ? (
                          <a href={`tel:${member.phone_number.replace(/\s/g, '')}`} className="text-cfss-green font-semibold hover:underline">
                            {member.phone_number}
                          </a>
                        ) : (
                          <span className="text-muted italic">Not provided</span>
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
