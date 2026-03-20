import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, LogIn, Eye, Sparkles, ArrowLeft } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

interface DrillPreviewWallProps {
  /** The drill name to show in the teaser */
  drillName: string;
  /** How many free previews the visitor already used */
  viewedCount: number;
  /** Max free previews allowed */
  maxPreviews: number;
  /** Back href to return to the directory */
  backHref: string;
}

export function DrillPreviewWall({
  drillName,
  viewedCount,
  maxPreviews,
  backHref,
}: DrillPreviewWallProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Main Card */}
        <Card className="border-2 border-secondary/30 overflow-hidden">
          {/* Gradient top bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#DC143C] via-[#FF4444] to-[#DC143C]" />

          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/5 border border-[#DC143C]/20 flex items-center justify-center mb-4">
              <Lock className="h-9 w-9 text-[#DC143C]" />
            </div>
            <CardTitle className="text-2xl font-heading">
              You've Used Your Free Previews
            </CardTitle>
          </CardHeader>

          <CardContent className="text-center space-y-6 pb-8">
            <p className="text-muted-foreground leading-relaxed">
              You've previewed <span className="text-foreground font-semibold">{viewedCount}</span> of{" "}
              <span className="text-foreground font-semibold">{maxPreviews}</span> free drills.
              Sign up to unlock the full library of <span className="text-foreground font-semibold">190+</span> professional
              baseball drills with video breakdowns, instructions, and more.
            </p>

            {/* What you get */}
            <div className="bg-muted/50 rounded-xl p-5 text-left space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#DC143C]" />
                Full access includes:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#DC143C] mt-0.5">•</span>
                  Complete drill library with video demonstrations
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#DC143C] mt-0.5">•</span>
                  Step-by-step instructions and coaching tips
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#DC143C] mt-0.5">•</span>
                  Personalized practice plans and drill assignments
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#DC143C] mt-0.5">•</span>
                  Progress tracking and performance metrics
                </li>
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <a href={getLoginUrl()} className="block">
                <Button
                  size="lg"
                  className="w-full gap-2 bg-[#DC143C] hover:bg-[#B01030] text-white font-semibold text-base py-6"
                >
                  <LogIn className="h-5 w-5" />
                  Sign Up for Full Access
                </Button>
              </a>

              <Link href={backHref}>
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Drill Directory
                </Button>
              </Link>
            </div>

            {/* Subtle note */}
            <p className="text-xs text-muted-foreground/60">
              Already have an account?{" "}
              <a href={getLoginUrl()} className="text-[#DC143C]/80 hover:text-[#DC143C] underline">
                Log in here
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Preview counter badge */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>
            {viewedCount} of {maxPreviews} free previews used
          </span>
        </div>
      </div>
    </div>
  );
}
