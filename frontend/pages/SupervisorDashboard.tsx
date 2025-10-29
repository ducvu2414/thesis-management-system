import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Clock } from "lucide-react";
import backend from "~backend/client";

export function SupervisorDashboard() {
  const userId = "user2";

  const { data: topics } = useQuery({
    queryKey: ["myTopics", userId],
    queryFn: () => backend.topic.list({ supervisorId: userId }),
  });

  const { data: registrations } = useQuery({
    queryKey: ["myRegistrations", userId],
    queryFn: () => backend.registration.list({ supervisorId: userId }),
  });

  const pendingCount = registrations?.registrations.filter(r => r.status === "PENDING").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Supervisor Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your topics and student registrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Topics</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topics?.topics.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total topics created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Student Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registrations?.registrations.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total registrations</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
