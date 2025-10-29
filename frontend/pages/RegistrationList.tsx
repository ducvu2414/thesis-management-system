import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import backend from "~backend/client";

export function RegistrationList() {
  const { data, isLoading } = useQuery({
    queryKey: ["registrations"],
    queryFn: () => backend.registration.list({}),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "default";
      case "PENDING": return "secondary";
      case "REJECTED": return "destructive";
      default: return "outline";
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Registrations</h1>
        <p className="text-muted-foreground mt-1">View all topic registrations</p>
      </div>

      <div className="space-y-4">
        {data?.registrations.map((registration) => (
          <Card key={registration.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{registration.topicTitle}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Group: {registration.groupName}
                  </p>
                </div>
                <Badge variant={getStatusColor(registration.status)}>
                  {registration.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Registered on {new Date(registration.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.registrations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No registrations found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
