/**
 * ImpersonationBanner — shown at the top of the screen when Coach Steve
 * is viewing the app as another user. One click returns to admin view.
 */
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export function ImpersonationBanner() {
  const utils = trpc.useUtils();
  const { data } = trpc.auth.isImpersonating.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const stopMutation = trpc.auth.stopImpersonating.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      await utils.auth.isImpersonating.invalidate();
      window.location.href = "/coach-dashboard";
    },
  });
  const { data: me } = trpc.auth.me.useQuery();

  if (!data?.impersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-sm font-medium shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-lg">👁️</span>
        <span>
          Viewing as <strong>{me?.name || me?.email}</strong>
          {" "}— you are seeing exactly what this athlete sees
        </span>
      </div>
      <button
        onClick={() => stopMutation.mutate()}
        disabled={stopMutation.isPending}
        className="bg-black text-white px-4 py-1 rounded-md text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 ml-4 shrink-0"
      >
        {stopMutation.isPending ? "Returning..." : "← Exit — Back to My View"}
      </button>
    </div>
  );
}
