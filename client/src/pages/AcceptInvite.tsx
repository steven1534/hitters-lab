import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvite() {
  const [, params] = useRoute("/accept-invite/:token");
  const [, setLocation] = useLocation();
  const token = params?.token;

  const { refresh } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: inviteData, isLoading: isLoadingInvite, error: inviteError } = trpc.invites.getInviteByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  useEffect(() => {
    if (!token || isLoadingInvite || !inviteData) return;

    if (inviteError || !inviteData.valid) {
      setStatus("error");
      setErrorMsg(inviteError?.message || "This invite is invalid or has expired.");
      return;
    }

    async function acceptInvite() {
      try {
        const res = await fetch("/api/auth/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setErrorMsg(data.error || "Failed to activate account");
          return;
        }

        await refresh();
        setStatus("success");
        toast.success("Account activated! Redirecting...");
        setTimeout(() => {
          setLocation("/athlete-portal");
        }, 1500);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Something went wrong");
      }
    }

    acceptInvite();
  }, [token, inviteData, inviteError, isLoadingInvite]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Invite Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Button onClick={() => setLocation("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Account Activated!</h2>
            <p className="text-muted-foreground text-center">
              Your default password is <strong>player123</strong>
              <br />
              <span className="text-xs">You can change it in your profile settings.</span>
            </p>
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
          <p className="text-muted-foreground">Activating your account...</p>
          {inviteData?.email && (
            <p className="text-sm text-muted-foreground mt-2">{inviteData.email}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
