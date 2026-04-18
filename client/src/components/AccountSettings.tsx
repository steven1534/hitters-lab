import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { User, Lock, Mail, Save, Loader2, Eye, EyeOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AccountSettings() {
  const { user, refresh } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);

  const updateAccountMutation = trpc.auth.updateMyAccount.useMutation({
    onSuccess: async () => {
      toast.success("Account details updated");
      await refresh();
    },
    onError: (err) => toast.error(err.message || "Failed to update account"),
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => toast.error(err.message || "Failed to change password"),
  });

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!email.trim()) { toast.error("Email is required"); return; }
    updateAccountMutation.mutate({ name: name.trim(), email: email.trim() });
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) { toast.error("Enter your current password"); return; }
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (newPassword === currentPassword) { toast.error("New password must be different from current password"); return; }
    setConfirmPasswordOpen(true);
  }

  function confirmChangePassword() {
    setConfirmPasswordOpen(false);
    changePasswordMutation.mutate({ currentPassword, newPassword });
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Profile section */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <User className="w-4 h-4 text-white/50" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white/90">Profile</h3>
              <p className="text-xs text-white/35">Update your name and email address</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#DC143C]/40 focus:border-[#DC143C]/40"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#DC143C]/40 focus:border-[#DC143C]/40"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={updateAccountMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DC143C] text-white text-sm font-medium hover:bg-[#c41236] transition disabled:opacity-50"
          >
            {updateAccountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </form>
      </div>

      {/* Password section */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <Lock className="w-4 h-4 text-white/50" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white/90">Change Password</h3>
              <p className="text-xs text-white/35">Update your admin password</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#DC143C]/40 focus:border-[#DC143C]/40"
                placeholder="Enter current password"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#DC143C]/40 focus:border-[#DC143C]/40"
                placeholder="Minimum 8 characters"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#DC143C]/40 focus:border-[#DC143C]/40"
              placeholder="Re-enter new password"
            />
          </div>
          <button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DC143C] text-white text-sm font-medium hover:bg-[#c41236] transition disabled:opacity-50"
          >
            {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>

      <AlertDialog open={confirmPasswordOpen} onOpenChange={setConfirmPasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change your password?</AlertDialogTitle>
            <AlertDialogDescription>
              You&rsquo;ll use the new password next time you sign in. Make sure you have it saved somewhere safe before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmChangePassword}
              className="bg-[#DC143C] hover:bg-[#c41236]"
            >
              Yes, update password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
