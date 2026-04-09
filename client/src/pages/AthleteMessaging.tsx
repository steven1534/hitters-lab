import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageCircle, Search, Home, LogOut, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function AthleteMessaging() {
  const { user, loading, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch athlete's questions
  const { data: athleteQuestions = [], isLoading: questionsLoading } = trpc.qa.getAthleteQuestions.useQuery(undefined, {
    enabled: user?.role === 'athlete',
  });

  // Filter questions
  const filteredQuestions = useMemo(() => {
    let filtered = athleteQuestions;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((q: any) =>
        q.question.toLowerCase().includes(query) ||
        q.drillId.toLowerCase().includes(query)
      );
    }

    // Sort by newest first
    filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  }, [athleteQuestions, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading || questionsLoading) {
    return (
      <div className="coach-dark min-h-screen bg-background flex items-center justify-center">
        <div className="container py-12 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'athlete') {
    return (
      <div className="coach-dark min-h-screen bg-background">
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto border-2">
          <CardHeader className="text-center">
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Only athletes can access their messages.</p>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    );
  }

  return (
    <div className="coach-dark min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-8 mb-8">
        <div className="container">
          <div className="flex items-center justify-between mb-4">
            <Link href="/athlete-portal">
              <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 pl-0">
                <Home className="mr-2 h-4 w-4" />
                Athlete Portal
              </Button>
            </Link>
            <Button onClick={() => logout()} variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-heading font-black">My Messages</h1>
            <p className="text-primary-foreground/90">View your questions and Coach Steve's responses</p>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl pb-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{filteredQuestions.length}</div>
                <p className="text-sm text-muted-foreground">Total Questions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary">
                  {filteredQuestions.filter((q: any) => q.answers.length > 0).length}
                </div>
                <p className="text-sm text-muted-foreground">Answered</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">
                  {filteredQuestions.filter((q: any) => q.answers.length === 0).length}
                </div>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your questions by drill or content..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Questions List */}
        <Card>
          <CardHeader>
            <CardTitle>Questions & Responses</CardTitle>
          </CardHeader>
          <CardContent>
            {paginatedQuestions.length > 0 ? (
              <div className="space-y-3">
                {paginatedQuestions.map((question: any) => (
                  <div
                    key={question.id}
                    onClick={() => setSelectedQuestion(selectedQuestion?.id === question.id ? null : question)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedQuestion?.id === question.id ? "border-secondary bg-secondary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">Drill: {question.drillId}</h3>
                          {question.answers.length > 0 && (
                            <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                              Answered
                            </Badge>
                          )}
                          {question.answers.length === 0 && (
                            <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mb-2 line-clamp-2">{question.question}</p>
                        <p className="text-xs text-muted-foreground">
                          Asked {new Date(question.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground flex-shrink-0 mt-1 transition-transform ${
                        selectedQuestion?.id === question.id ? 'rotate-90' : ''
                      }`} />
                    </div>

                    {/* Expanded Details */}
                    {selectedQuestion?.id === question.id && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div>
                          <p className="text-sm font-semibold mb-2">Your Question</p>
                          <p className="text-sm text-muted-foreground p-3 bg-muted rounded">{question.question}</p>
                        </div>

                        {question.answers.length > 0 ? (
                          <div>
                            <p className="text-sm font-semibold mb-2">Coach Steve's Response</p>
                            <div className="space-y-2">
                              {question.answers.map((answer: any) => (
                                <div key={answer.id} className="p-3 bg-red-500/10 rounded border border-red-500/20">
                                  <p className="text-sm text-red-200">{answer.answer}</p>
                                  <p className="text-xs text-red-400/80 mt-2">
                                    {new Date(answer.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-500/10 rounded border border-amber-500/20">
                            <p className="text-sm text-amber-200">
                              Coach Steve hasn't responded yet. Check back soon!
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No messages yet</p>
                <p className="text-sm">Ask Coach Steve questions about drills from the drill detail page!</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
