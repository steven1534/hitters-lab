import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function AcceptInvite() {
  const [, params] = useRoute("/accept-invite/:token");
  const [, setLocation] = useLocation();
  const token = params?.token;

  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [autoAccepting, setAutoAccepting] = useState(false);

  // Fetch invite details
  const { data: inviteData, isLoading: isLoadingInvite, error: inviteError } = trpc.invites.getInviteByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  // Accept invite mutation
  const acceptInviteMutation = trpc.invites.acceptInvite.useMutation({
    onSuccess: () => {
      toast.success("Account activated! Redirecting to athlete portal...");
      setTimeout(() => {
        setLocation("/athlete-portal");
      }, 1500);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to activate account");
      setAutoAccepting(false);
    },
  });

  // Auto-accept invite after user logs in
  useEffect(() => {
    console.log('[AcceptInvite] Checking conditions:', { isAuthenticated, hasUser: !!user, token, autoAccepting, isPending: acceptInviteMutation.isPending });
    if (isAuthenticated && user && token && !autoAccepting && !acceptInviteMutation.isPending) {
      console.log('[AcceptInvite] Calling acceptInvite mutation');
      setAutoAccepting(true);
      acceptInviteMutation.mutate({ token });
    }
  }, [isAuthenticated, user, token, autoAccepting, acceptInviteMutation]);

  if (isLoadingInvite || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {authLoading ? "Checking your login status..." : "Validating your invite..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteError || !inviteData?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Invalid Invite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {inviteError?.message || "This invite is invalid or has expired. Please contact your coach for a new invite."}
            </p>
            <Button onClick={() => setLocation("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Activate Your Account</CardTitle>
            <CardDescription>Sign in to activate your athlete account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invite Details */}
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="font-medium">{inviteData?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expires</span>
                <span className="text-sm">
                  {inviteData?.expiresAt ? new Date(inviteData.expiresAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Valid
                </Badge>
              </div>
            </div>

            {/* Login Instructions */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the button below to sign in with your Google account. After signing in, your account will be automatically activated.
              </p>
              <Button
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
                className="w-full"
                size="lg"
              >
                Sign In to Activate Account
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-center text-muted-foreground">
              Make sure to use the same email address that received this invite.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is authenticated and invite is being accepted
  if (autoAccepting || acceptInviteMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Activating your account...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Processing...</p>
        </CardContent>
      </Card>
    </div>
  );
}
