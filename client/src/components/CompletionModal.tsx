import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, Flame, Trophy } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";

interface CompletionModalProps {
  isOpen: boolean;
  drillName: string;
  onClose: () => void;
  onConfirm: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  vx: number;
  vy: number;
  delay: number;
}

const COLORS = ["#00BFFF", "#DC143C", "#FFD700", "#00FF88", "#FF69B4", "#FF8C00", "#7B68EE"];

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 20,
    y: 40,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
    vx: (Math.random() - 0.5) * 80,
    vy: -30 - Math.random() * 60,
    delay: Math.random() * 0.3,
  }));
}

export function CompletionModal({ isOpen, drillName, onClose, onConfirm }: CompletionModalProps) {
  const [phase, setPhase] = useState<"hidden" | "burst" | "show">("hidden");
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isOpen) {
      setParticles(createParticles(40));
      setPhase("burst");
      const t = setTimeout(() => setPhase("show"), 400);
      return () => clearTimeout(t);
    } else {
      setPhase("hidden");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md overflow-hidden border-0 bg-transparent shadow-none p-0">
        <div className="relative glass-card rounded-2xl p-8 border border-white/10 overflow-hidden">
          {/* Confetti layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-sm"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  transform: `rotate(${p.rotation}deg)`,
                  animation: phase !== "hidden"
                    ? `confetti-fall 1.5s ease-out ${p.delay}s forwards`
                    : "none",
                  opacity: 0,
                  ["--vx" as any]: `${p.vx}px`,
                  ["--vy" as any]: `${p.vy}px`,
                }}
              />
            ))}
          </div>

          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-electric/20 rounded-full blur-3xl animate-pulse" />

          <div className="relative flex flex-col items-center text-center">
            {/* Animated icon */}
            <div
              className={`mb-5 transition-all duration-700 ease-out ${
                phase !== "hidden" ? "scale-100 opacity-100" : "scale-0 opacity-0"
              }`}
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center animate-bounce-gentle">
                  <CheckCircle className="w-10 h-10 text-emerald-400" style={{ filter: "drop-shadow(0 0 12px rgba(52, 211, 153, 0.6))" }} />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-400/30">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
              </div>
            </div>

            <h2
              className={`text-2xl font-bold text-foreground mb-1 transition-all duration-500 delay-200 ${
                phase === "show" ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              Drill Complete!
            </h2>

            <p
              className={`text-muted-foreground mb-6 transition-all duration-500 delay-300 ${
                phase === "show" ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <span className="text-electric font-semibold">{drillName}</span>
            </p>

            {/* XP reward */}
            <div
              className={`glass rounded-xl px-5 py-3 mb-6 flex items-center gap-3 border border-electric/20 transition-all duration-500 delay-[400ms] ${
                phase === "show" ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95"
              }`}
            >
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-foreground font-medium">+10 XP earned</span>
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>

            <p
              className={`text-xs text-muted-foreground mb-6 transition-all duration-500 delay-500 ${
                phase === "show" ? "opacity-100" : "opacity-0"
              }`}
            >
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>

            {/* Action buttons */}
            <div
              className={`flex gap-3 w-full transition-all duration-500 delay-[600ms] ${
                phase === "show" ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <Button variant="outline" onClick={onClose} className="flex-1 glass border-white/10 hover:bg-white/5">
                Done
              </Button>
              <Button onClick={onConfirm} className="flex-1 btn-glow bg-electric hover:bg-electric/90 text-white font-semibold">
                Next Drill
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Confetti keyframes injected once */}
      <style>{`
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate(var(--vx), calc(var(--vy) + 200px)) rotate(720deg); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
      `}</style>
    </Dialog>
  );
}
