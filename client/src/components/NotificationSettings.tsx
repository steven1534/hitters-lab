/**
 * NotificationSettings — Coach email & in-app alert preferences.
 * Lets coach toggle which athlete activities trigger email notifications.
 */
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bell, Mail, Smartphone, Activity, LogIn, Eye, Play, CheckCircle, Video, MessageCircle, UserX, Clock } from "lucide-react";

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ icon, label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/90">{label}</p>
          <p className="text-xs text-white/35 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ml-4 ${
          checked ? "bg-[#DC143C]" : "bg-white/[0.12]"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
        style={{ minWidth: "2.5rem", height: "1.375rem" }}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`} />
      </button>
    </div>
  );
}

export function NotificationSettings() {
  const utils = trpc.useUtils();
  const { data: prefs, isLoading } = trpc.activity.getAlertPreferences.useQuery();

  const updateMutation = trpc.activity.updateAlertPreferences.useMutation({
    onSuccess: () => {
      utils.activity.getAlertPreferences.invalidate();
      toast.success("Notification preferences saved.");
    },
    onError: () => toast.error("Failed to save preferences."),
  });

  const update = (key: string, value: boolean) => {
    updateMutation.mutate({ [key]: value ? 1 : 0 } as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-[#DC143C]/30 border-t-[#DC143C] animate-spin" />
      </div>
    );
  }

  const p = prefs as any;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#DC143C]" />
          Notification Settings
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Choose which athlete activities send you an email at <span className="text-white/70">coach@coachstevebaseball.com</span>. Emails are sent within ~1 minute of activity.
        </p>
      </div>

      {/* Delivery channels */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-[#DC143C]" />
          Delivery Channels
        </h3>
        <div>
          <ToggleRow
            icon={<Mail className="h-4 w-4 text-[#DC143C]" />}
            label="Email Alerts"
            description="Receive email notifications at coach@coachstevebaseball.com"
            checked={!!p?.emailAlerts}
            onChange={(v) => update("emailAlerts", v)}
          />
          <ToggleRow
            icon={<Smartphone className="h-4 w-4 text-white/50" />}
            label="In-App Notifications"
            description="Show notification badges inside the dashboard"
            checked={!!p?.inAppAlerts}
            onChange={(v) => update("inAppAlerts", v)}
          />
        </div>
      </div>

      {/* Activity types */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#DC143C]" />
          Activity Types
        </h3>
        <div>
          <ToggleRow
            icon={<LogIn className="h-4 w-4 text-blue-400" />}
            label="Athlete Login"
            description="When an athlete logs into their portal"
            checked={!!p?.alertOnPortalLogin}
            onChange={(v) => update("alertOnPortalLogin", v)}
          />
          <ToggleRow
            icon={<Eye className="h-4 w-4 text-purple-400" />}
            label="Drill Viewed"
            description="When an athlete opens a drill page"
            checked={!!p?.alertOnDrillView}
            onChange={(v) => update("alertOnDrillView", v)}
          />
          <ToggleRow
            icon={<Eye className="h-4 w-4 text-indigo-400" />}
            label="Assignments Viewed"
            description="When an athlete views their assignment list"
            checked={!!p?.alertOnAssignmentView}
            onChange={(v) => update("alertOnAssignmentView", v)}
          />
          <ToggleRow
            icon={<Play className="h-4 w-4 text-amber-400" />}
            label="Drill Started"
            description="When an athlete marks a drill in-progress"
            checked={!!p?.alertOnDrillStart}
            onChange={(v) => update("alertOnDrillStart", v)}
          />
          <ToggleRow
            icon={<CheckCircle className="h-4 w-4 text-green-400" />}
            label="Drill Completed"
            description="When an athlete completes a drill"
            checked={!!p?.alertOnDrillComplete}
            onChange={(v) => update("alertOnDrillComplete", v)}
          />
          <ToggleRow
            icon={<Video className="h-4 w-4 text-[#DC143C]" />}
            label="Video Submitted"
            description="When an athlete uploads a swing video"
            checked={!!p?.alertOnVideoSubmit}
            onChange={(v) => update("alertOnVideoSubmit", v)}
          />
          <ToggleRow
            icon={<MessageCircle className="h-4 w-4 text-cyan-400" />}
            label="Message Sent"
            description="When an athlete sends you a message"
            checked={!!p?.alertOnMessageSent}
            onChange={(v) => update("alertOnMessageSent", v)}
          />
          <ToggleRow
            icon={<UserX className="h-4 w-4 text-orange-400" />}
            label="Athlete Inactivity"
            description={`Alert when an athlete hasn't logged in for ${p?.inactivityDays || 3} days`}
            checked={!!p?.alertOnInactivity}
            onChange={(v) => update("alertOnInactivity", v)}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 px-1">
        <div className={`w-2 h-2 rounded-full ${!!p?.emailAlerts ? "bg-green-400 animate-pulse" : "bg-white/20"}`} />
        <span className="text-xs text-white/40">
          {!!p?.emailAlerts
            ? "Email notifications are active — emails send within ~1 minute of activity"
            : "Email notifications are paused"}
        </span>
      </div>
    </div>
  );
}
