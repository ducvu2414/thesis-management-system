import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import backend from "~backend/client";
import { Plus } from "lucide-react";

export function TopicList() {
  const { data, isLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: () => backend.topic.list({}),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "default";
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Topics</h1>
          <p className="text-muted-foreground mt-1">Browse available thesis topics</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Topic
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.topics.map((topic) => (
          <Link key={topic.id} to={`/topics/${topic.id}`}>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{topic.title}</CardTitle>
                  <Badge variant={getStatusColor(topic.status)}>{topic.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {topic.description}
                </p>
                <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                  <span>{topic.currentStudents}/{topic.maxStudents} students</span>
                  <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
