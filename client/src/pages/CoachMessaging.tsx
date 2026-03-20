import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Search, Home, LogOut, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useNotification } from "@/contexts/NotificationContext";

export default function CoachMessaging() {
  const { user, loading, logout } = useAuth();
  const { addToast } = useNotification();
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDrill, setFilterDrill] = useState("all");
  const [filterAthlete, setFilterAthlete] = useState("all");
  const [answerText, setAnswerText] = useState("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch all questions
  const { data: allQuestions = [], isLoading: questionsLoading, refetch } = trpc.qa.getAllQuestions.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });

  // Fetch all users for filtering
  const { data: allUsers = [] } = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });

  // Create answer mutation
  const createAnswerMutation = trpc.qa.createAnswer.useMutation({
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Response Sent',
        message: 'Your response has been sent to the athlete',
      });
      setAnswerText("");
      refetch();
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to send response',
      });
    },
  });

  // Filter and sort questions
  const filteredQuestions = useMemo(() => {
    let filtered = allQuestions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((q: any) =>
        q.question.toLowerCase().includes(query) ||
        q.athleteName.toLowerCase().includes(query) ||
        q.drillId.toLowerCase().includes(query)
      );
    }

    // Apply drill filter
    if (filterDrill !== "all") {
      filtered = filtered.filter((q: any) => q.drillId === filterDrill);
    }

    // Apply athlete filter
    if (filterAthlete !== "all") {
      filtered = filtered.filter((q: any) => q.athleteId.toString() === filterAthlete);
    }

    // Sort by newest first
    filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  }, [allQuestions, searchQuery, filterDrill, filterAthlete]);

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique drills
  const uniqueDrills = useMemo(() => {
    const drillSet = new Set(allQuestions.map((q: any) => q.drillId));
    return Array.from(drillSet);
  }, [allQuestions]);

  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || !selectedQuestion) return;

    setIsSubmittingAnswer(true);
    try {
      await createAnswerMutation.mutateAsync({
        questionId: selectedQuestion.id,
        answer: answerText.trim(),
      });
      setSelectedQuestion(null);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  if (loading || questionsLoading) {
    return <div className="container py-12 text-center">Loading...</div>;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto border-2">
          <CardHeader className="text-center">
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Only coaches can access the messaging dashboard.</p>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
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
          <div className="flex items-center justify-between mb-4">
            <Link href="/coach-dashboard">
              <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 pl-0">
                <Home className="mr-2 h-4 w-4" />
                Coach Dashboard
              </Button>
            </Link>
            <Button onClick={() => logout()} variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-heading font-black">Athlete Messages</h1>
            <p className="text-primary-foreground/90">Respond to athlete questions about drills</p>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl pb-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
                  {filteredQuestions.filter((q: any) => q.answers.length === 0).length}
                </div>
                <p className="text-sm text-muted-foreground">Unanswered</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Questions List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="mb-4">Questions</CardTitle>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by athlete, drill, or question..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select value={filterDrill} onValueChange={(val) => {
                    setFilterDrill(val);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by drill" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Drills</SelectItem>
                      {uniqueDrills.map((drillId: string) => (
                        <SelectItem key={drillId} value={drillId}>
                          {drillId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterAthlete} onValueChange={(val) => {
                    setFilterAthlete(val);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by athlete" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Athletes</SelectItem>
                      {allUsers.filter((u: any) => u.role === 'athlete').map((athlete: any) => (
                        <SelectItem key={athlete.id} value={athlete.id.toString()}>
                          {athlete.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                {paginatedQuestions.length > 0 ? (
                  <div className="space-y-3">
                    {paginatedQuestions.map((question: any) => (
                      <div
                        key={question.id}
                        onClick={() => setSelectedQuestion(question)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          selectedQuestion?.id === question.id ? "border-secondary bg-secondary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-2">{question.athleteName}</h3>
                            <p className="text-sm text-muted-foreground mb-2">Drill: {question.drillId}</p>
                            <p className="text-sm mb-2 line-clamp-2">{question.question}</p>
                            <div className="flex items-center gap-2">
                              {question.answers.length > 0 && (
                                <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                                  Answered ({question.answers.length})
                                </Badge>
                              )}
                              {question.answers.length === 0 && (
                                <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                                  Awaiting Response
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground ml-auto">
                                {new Date(question.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No questions found</p>
                    <p className="text-sm">Athletes haven't asked any questions yet.</p>
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
          </div>

          {/* Right: Question Details & Response */}
          <div className="lg:col-span-1">
            {selectedQuestion ? (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-lg">Question Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Info */}
                  <div className="space-y-3 p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Athlete</p>
                      <p className="text-sm font-medium">{selectedQuestion.athleteName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Drill</p>
                      <p className="text-sm font-medium">{selectedQuestion.drillId}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Asked</p>
                      <p className="text-sm">{new Date(selectedQuestion.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Question */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Question</p>
                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded">{selectedQuestion.question}</p>
                  </div>

                  {/* Previous Answers */}
                  {selectedQuestion.answers.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Your Responses</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedQuestion.answers.map((answer: any) => (
                          <div key={answer.id} className="p-2 bg-red-50 rounded border border-red-200">
                            <p className="text-xs text-red-900">{answer.answer}</p>
                            <p className="text-xs text-red-700 mt-1">
                              {new Date(answer.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response Form */}
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-semibold">Your Response</p>
                    <Textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Type your response to help the athlete..."
                      rows={3}
                      disabled={isSubmittingAnswer}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!answerText.trim() || isSubmittingAnswer}
                      className="w-full"
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmittingAnswer ? "Sending..." : "Send Response"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select a question to view details and respond</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
