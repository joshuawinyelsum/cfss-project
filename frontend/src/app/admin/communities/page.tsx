"use client";

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

interface Community {
  id: string;
  name: string;
  district: string;
  region: string;
  capacity: number;
  student_count: number;
  slots_remaining: number;
  group_number: number;
  group_label: string;
  created_at: string;
}

export default function AdminCommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newComm, setNewComm] = useState({ name: '', district: '', region: '', capacity: 10 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [communityStudents, setCommunityStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const res = await api.get('/api/admin/communities');
      setCommunities(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const filteredCommunities = useMemo(() => {
    return communities.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.district.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [communities, searchTerm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await api.post('/api/admin/communities', newComm);
      await fetchCommunities();
      setShowCreateModal(false);
      setNewComm({ name: '', district: '', region: '', capacity: 10 });
    } catch (err: any) {
      console.error(err);
      setCreateError(err.response?.data?.detail || 'Failed to create community');
    } finally {
      setCreating(false);
    }
  };

  const handleViewCommunity = async (comm: Community) => {
    setSelectedCommunity(comm);
    try {
      const res = await api.get('/api/admin/users/students');
      const students = res.data.filter((s: any) => s.community_id === comm.id);
      setCommunityStudents(students);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-secondary">Loading communities...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Communities</h1>
          <p className="text-secondary mt-1 text-sm">Manage fieldwork locations and capacities.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + Add Community
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Search by community or district name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="border border-border rounded-lg overflow-x-auto bg-surface">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-page">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Community</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Location</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Group</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredCommunities.map((comm) => {
                  const isFull = comm.student_count >= comm.capacity;
                  return (
                    <tr 
                      key={comm.id} 
                      className="hover:bg-page cursor-pointer transition-colors"
                      onClick={() => handleViewCommunity(comm)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-primary">{comm.name}</div>
                        <div className="text-xs text-muted mt-1">{comm.student_count} assigned</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">{comm.district}</div>
                        <div className="text-xs text-secondary">{comm.region}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-cfss-green-soft text-cfss-green">
                          {comm.group_label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-border-strong rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full ${isFull ? 'bg-red-500' : 'bg-cfss-green'}`} 
                              style={{ width: `${Math.min(100, (comm.student_count / comm.capacity) * 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-medium ${isFull ? 'text-red-600' : 'text-secondary'}`}>
                            {comm.slots_remaining} left
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50">
          <div className="bg-surface rounded-lg w-full max-w-md shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-page">
              <h2 className="text-lg font-bold text-primary">Add New Community</h2>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <Alert variant="destructive">
                  {createError}
                </Alert>
              )}
              
              <div>
                <Label>Community Name</Label>
                <Input 
                  type="text" 
                  required
                  value={newComm.name}
                  onChange={e => setNewComm({...newComm, name: e.target.value})}
                  placeholder="e.g. Asuboi Community"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>District</Label>
                  <Input 
                    type="text" 
                    required
                    value={newComm.district}
                    onChange={e => setNewComm({...newComm, district: e.target.value})}
                    placeholder="e.g. Ayensuano"
                  />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input 
                    type="text" 
                    required
                    value={newComm.region}
                    onChange={e => setNewComm({...newComm, region: e.target.value})}
                    placeholder="e.g. Eastern"
                  />
                </div>
              </div>
              
              <div>
                <Label>Capacity</Label>
                <Input 
                  type="number" 
                  min="1"
                  required
                  value={newComm.capacity}
                  onChange={e => setNewComm({...newComm, capacity: parseInt(e.target.value) || 0})}
                />
                <p className="text-xs text-muted mt-1">Maximum number of students allowed.</p>
              </div>
              
              <div className="pt-4 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? 'Creating...' : 'Create Community'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW COMMUNITY DETAILS MODAL */}
      {selectedCommunity && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50">
          <div className="bg-surface h-full w-full max-w-md shadow-2xl flex flex-col">
            <div className="px-6 py-5 border-b border-border flex justify-between items-start bg-page">
              <div>
                <h2 className="text-xl font-bold text-primary">{selectedCommunity.name}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="bg-cfss-green-soft text-cfss-green font-bold text-xs px-2.5 py-0.5 rounded uppercase tracking-wide">
                    {selectedCommunity.group_label}
                  </span>
                  <span className="text-sm font-medium text-secondary">
                    {selectedCommunity.district}, {selectedCommunity.region}
                  </span>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setSelectedCommunity(null)}>
                X
              </Button>
            </div>
            
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-primary">Capacity Status</h3>
                <span className="text-sm font-bold text-primary">{selectedCommunity.student_count} / {selectedCommunity.capacity}</span>
              </div>
              <div className="w-full bg-border-strong rounded-full h-2 overflow-hidden mb-2">
                <div 
                  className={`h-full rounded-full transition-all ${selectedCommunity.student_count >= selectedCommunity.capacity ? 'bg-red-500' : 'bg-cfss-green'}`}
                  style={{ width: `${Math.min(100, (selectedCommunity.student_count / selectedCommunity.capacity) * 100)}%` }}
                />
              </div>
              <p className="text-xs font-medium text-secondary">{selectedCommunity.slots_remaining} slots remaining</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-page">
              <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
                Assigned Students ({communityStudents.length})
              </h3>
              
              {communityStudents.length === 0 ? (
                <div className="text-center py-8 text-secondary text-sm">
                  No students assigned to this community yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {communityStudents.map(student => (
                    <div key={student.id} className="bg-surface p-4 rounded border border-border shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-page border border-border text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {student.name.substring(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-primary truncate">{student.name}</p>
                        <p className="text-xs text-secondary truncate">{student.student_id} • {student.program}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
