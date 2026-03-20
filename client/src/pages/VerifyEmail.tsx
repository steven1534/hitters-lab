import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function VerifyEmail() {
  const [, params] = useRoute("/verify-email/:token");
  const [, setLocation] = useLocation();
  const token = params?.token;

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify email mutation
  const verifyEmailMutation = trpc.invites.verifyEmail.useMutation({
    onSuccess: () => {
      setVerified(true);
      toast.success("Email verified successfully!");
      setTimeout(() => {
        setLocation("/athlete-portal");
      }, 2000);
    },
    onError: (error) => {
      setError(error.message || "Email verification failed");
      toast.error(error.message || "Email verification failed");
      setVerifying(false);
    },
  });

  // Auto-verify on mount
  useEffect(() => {
    if (token && !verifying && !verified && !error) {
      setVerifying(true);
      verifyEmailMutation.mutate({ token });
    }
  }, [token, verifying, verified, error, verifyEmailMutation]);

  if (verifying || verifyEmailMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying your email...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Email Verified
            </CardTitle>
            <CardDescription>Your email has been successfully verified</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Thank you for verifying your email! You now have full access to all drills and features.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your athlete portal...
            </p>
            <Button onClick={() => setLocation("/athlete-portal")} className="w-full">
              Go to Athlete Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Verification Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                If your verification link has expired, you can request a new one from your account settings or contact your coach.
              </p>
              <Button onClick={() => setLocation("/")} className="w-full">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}
