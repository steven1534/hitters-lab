import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Status = "loading" | "form" | "submitting" | "success" | "error";

export default function AcceptInvite() {
  const [, params] = useRoute("/accept-invite/:token");
  const [, setLocation] = useLocation();
  const token = params?.token;

  const { refresh } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const {
    data: inviteData,
    isLoading: isLoadingInvite,
    error: inviteError,
  } = trpc.invites.getInviteByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  // Once we know the invite is valid, show the form.
  useEffect(() => {
    if (!token || isLoadingInvite || !inviteData) return;

    if (inviteError || !inviteData.valid) {
      setStatus("error");
      setErrorMsg(
        inviteError?.message || "This invite is invalid or has expired."
      );
      return;
    }

    // Pre-fill name from invite if available
    const invitedName = (inviteData as any)?.name as string | undefined;
    if (invitedName) setDisplayName(invitedName);

    setStatus("form");
  }, [token, inviteData, inviteError, isLoadingInvite]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!displayName.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          name: displayName.trim(),
        }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("form");
        setErrorMsg(data.error || "Failed to activate account");
        return;
      }

      await refresh();
      setStatus("success");
      toast.success("Account activated. Welcome.");
      setTimeout(() => {
        setLocation("/athlete-portal");
      }, 1500);
    } catch (err: any) {
      setStatus("form");
      setErrorMsg(err?.message || "Something went wrong");
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your invite…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h2 className="text-xl font-bold mb-2">Account Activated</h2>
            <p className="text-muted-foreground text-center">
              Taking you to your portal…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // status === "form" or "submitting"
  const submitting = status === "submitting";
  const invitedEmail = (inviteData as any)?.email as string | undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Coach Steve's Hitters Lab</CardTitle>
          <CardDescription>
            {invitedEmail ? (
              <>
                You've been invited as{" "}
                <span className="font-medium">{invitedEmail}</span>. Set your
                password to activate your account.
              </>
            ) : (
              <>Set your password to activate your account.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Your name</Label>
              <Input
                id="displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Create a password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            {errorMsg && (
              <p className="text-sm text-destructive" role="alert">
                {errorMsg}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Activating…
                </>
              ) : (
                "Activate Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
