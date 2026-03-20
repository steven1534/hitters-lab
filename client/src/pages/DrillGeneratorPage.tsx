import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Home, Sparkles } from "lucide-react";
import { Link } from "wouter";
import DrillGenerator from "@/components/DrillGenerator";
import { Card, CardContent } from "@/components/ui/card";

export default function DrillGeneratorPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="container py-12 text-center">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto border-2">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Only coaches can access the AI Drill Generator.</p>
            <Link href="/">
              <Button variant="outline">Back to Directory</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-8 mb-8">
        <div className="container">
          <Link href="/coach-dashboard">
            <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4 pl-0">
              <Home className="mr-2 h-4 w-4" />
              Back to Coach Dashboard
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-heading font-black flex items-center gap-3">
              <Sparkles className="h-12 w-12" />
              AI Drill Generator
            </h1>
            <p className="text-primary-foreground/90">Create custom drills powered by AI to address specific player issues and skill gaps.</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl pb-12">
        <DrillGenerator />
      </main>
    </div>
  );
}
