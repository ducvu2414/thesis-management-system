import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import backend from "~backend/client";
import { Plus, Users } from "lucide-react";

export function GroupList() {
  const userId = "user1";

  const { data, isLoading } = useQuery({
    queryKey: ["myGroups", userId],
    queryFn: () => backend.group.listMyGroups({ userId }),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Groups</h1>
          <p className="text-muted-foreground mt-1">Manage your student groups</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.groups.map((group) => (
          <Link key={group.id} to={`/groups/${group.id}`}>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{group.groupName}</span>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Members:</span>{" "}
                    <span className="text-muted-foreground">{group.memberCount}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Owner:</span>{" "}
                    <span className="text-muted-foreground">
                      {group.ownerId === userId ? "You" : group.ownerId}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {data?.groups.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You haven't joined any groups yet</p>
            <Button className="mt-4">Create Your First Group</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
