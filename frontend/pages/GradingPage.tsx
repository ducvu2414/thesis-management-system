import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import backend from "~backend/client";

export function GradingPage() {
  const { registrationId } = useParams<{ registrationId: string }>();

  const { data: criteria } = useQuery({
    queryKey: ["criteria"],
    queryFn: () => backend.grading.listCriteria(),
  });

  const { data: finalScore } = useQuery({
    queryKey: ["finalScore", registrationId],
    queryFn: () => backend.grading.getFinalScore({ registrationId: registrationId! }),
    enabled: !!registrationId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Grading</h1>
        <p className="text-muted-foreground mt-1">Submit grades for this thesis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grading Criteria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {criteria?.criteria.map((criterion) => (
            <div key={criterion.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">{criterion.name}</label>
                <span className="text-sm text-muted-foreground">Weight: {criterion.weight}</span>
              </div>
              <Input type="number" min="0" max="10" step="0.1" placeholder="Score (0-10)" />
              <Textarea placeholder="Comments (optional)" rows={2} />
            </div>
          ))}
          <Button className="w-full">Submit Grades</Button>
        </CardContent>
      </Card>

      {finalScore && finalScore.grades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Final Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Score:</span>
                <span className="text-2xl text-primary">{finalScore.finalScore.toFixed(2)}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Computed Score:</span>
                  <span>{finalScore.computedScore.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Extra Points:</span>
                  <span>{finalScore.extraPoints.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Card>
      )}
    </div>
  );
}
