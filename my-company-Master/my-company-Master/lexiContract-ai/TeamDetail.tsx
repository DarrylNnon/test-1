'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Team, TeamMember } from '@/types';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Trash2 } from 'lucide-react';

interface TeamDetailProps {
  teamId: string;
}

export default function TeamDetail({ teamId }: TeamDetailProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) return;
      try {
        const response = await api.get(`/teams/${teamId}`);
        setTeam(response.data);
      } catch (err) {
        toast.error('Failed to fetch team details.');
        router.push('/dashboard/settings/teams');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeam();
  }, [teamId, router]);

  const handleRemoveMember = async (member: TeamMember) => {
    if (!team) return;
    try {
      await api.delete(`/teams/${team.id}/members/${member.user.id}`);
      setTeam(prevTeam => prevTeam ? {
        ...prevTeam,
        members: prevTeam.members.filter(m => m.user.id !== member.user.id)
      } : null);
      toast.success(`Removed ${member.user.email} from the team.`);
    } catch (err) {
      toast.error('Failed to remove member.');
    }
  };

  if (isLoading) {
    return <p>Loading team details...</p>;
  }

  if (!team) {
    return <p>Team not found.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
      <div className="grid auto-rows-max items-start gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{team.name}</CardTitle>
            <CardDescription>Manage team members and settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">Members ({team.members.length})</h3>
            <div className="space-y-4">
              {team.members.map(member => (
                <div key={member.user.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="font-medium">{member.user.email}</p>
                    <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid auto-rows-max items-start gap-4 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button>Add Member</Button>
            <Button variant="outline">Rename Team</Button>
            <Button variant="destructive">Delete Team</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
