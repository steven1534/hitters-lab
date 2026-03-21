import { Button } from "@/components/ui/button";;
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Users, Dumbbell, Target, ExternalLink, Lock, LogIn, ChevronDown, AlertCircle, TrendingUp, Lightbulb, Star } from "lucide-react";
import { getCategoryConfig } from "@/lib/categoryColors";
import { getLoginUrl, PREVIEW_MODE } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useRoute, useSearch } from "wouter";
import { useState, useMemo, useEffect } from "react";
import drillsData from "@/data/drills";
import { filterOptions } from "@/data/drills";
import { VideoPlayer } from "@/components/VideoPlayer";
import { EditDrillDetailsModal } from "@/components/EditDrillDetailsModal";
import { InstructionsEditor } from "@/components/InstructionsEditor";
import { TiptapEditor, TiptapRenderer } from "@/components/TiptapEditor";
import { EditableStatBar, type StatCard } from "@/components/EditableStatBar";
import { trpc } from "@/lib/trpc";
import { Edit, Trash2, Pencil, Check, X } from "lucide-react";
import { DrillQAForm } from "@/components/DrillQAForm";
import { DrillPageBuilderNotion } from "@/components/DrillPageBuilderNotion";
import { CustomDrillLayout } from "@/components/CustomDrillLayout";
import { Layout } from "lucide-react";
import { usePreviewLimit, MAX_FREE_PREVIEWS } from "@/hooks/usePreviewLimit";
import { DrillPreviewWall } from "@/components/DrillPreviewWall";
import { InlineEdit } from "@/components/InlineEdit";

// Collapsible section component
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors font-semibold text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-secondary" />
          {title}
        </div>
        <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 bg-background border-t">
          {children}
        </div>
      )}
    </div>
  );
}

// Drill details with video URLs and content
// Keys are the drill IDs from drills.json
const drillDetails: Record<string, {
  skillSet: string;
  difficulty: string;
  athletes: string;
  time: string;
  equipment: string;
  goal: string;
  description: string[];
  addDifficulty?: string[];
  videoUrl: string | null;
}> = {
  "1-2-3-drill": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "10 minutes",
    equipment: "Tee, baseballs, net or screen to hit into",
    goal: "Load so that weight is shifted mostly to back foot, stride while staying balanced",
    description: [
      "Tee set up slightly in front of the middle of the plate",
      "Hitter sets up even with the plate, while other partner puts a ball on the tee",
      "Hitter gets ready, looks forward to visualize a pitcher",
      "Partner then calls out \"1, 2, 3\" pausing after each number, on each number hitter will:",
      "1: Hitter loads shifting weight to back foot",
      "2: Hitter strides while staying balanced, hands separate to move back from the shoulder",
      "3: Hitter swings and hits the ball",
      "Hitter tries to hit the ball back up the middle",
      "Partners switch after 5 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/r4eylEht9Fk"
  },
  "angle-flips": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "10 minutes",
    equipment: "Bat, helmet, home plate, and a bucket of baseballs",
    goal: "Focus on driving the ball up the middle by hitting the inside of the ball",
    description: [
      "Hitter sets up even with the plate",
      "Coach sets up to the opposite side of the hitter at an angle, about 10 feet away from the hitter",
      "Coach should make sure to be at a far enough angle to not get hit by the ball",
      "Coach underhand tosses the ball across the middle of the plate",
      "Hitter tries to hit the ball back up the middle, working on timing with the coach's pitches and being sure not to rush through the drill",
      "Focus should be hitting the ball back up the middle, staying inside the baseball",
      "Partners switch after 10 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/DbceoWEor9c"
  },
  "behind-the-hitter-toss-1-2-3": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "10 minutes",
    equipment: "Bat, baseballs, screen for coach to throw behind",
    goal: "Develop timing and rhythm with pitches coming from behind",
    description: [
      "Coach sets up behind the hitter at a safe distance",
      "Coach underhand tosses the ball from behind the hitter",
      "Hitter focuses on timing and tracking the ball",
      "Use the 1-2-3 rhythm: 1-Load, 2-Stride, 3-Swing",
      "Partners switch after 10 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/QUR1x6V73yQ"
  },
  "belly-button-tee": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "5 minutes",
    equipment: "Tee, baseballs, net or screen to hit into",
    goal: "Develop proper contact point at the belly button area",
    description: [
      "Set up the tee at belly button height",
      "Hitter focuses on making contact at the optimal point",
      "Drive the ball back up the middle",
      "Partners switch after 5 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/P0f_jlz6LKA"
  },
  "bottom-hand-tee": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "5 minutes",
    equipment: "Tee, baseballs, net or screen to hit into",
    goal: "Strengthen the bottom hand and develop proper swing mechanics",
    description: [
      "Hitter grips the bat with only the bottom hand",
      "Tee set up at waist height",
      "Focus on driving through the ball with the bottom hand",
      "Maintain proper body position throughout the swing",
      "Partners switch after 5 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/r4eylEht9Fk"
  },
  "change-up-front-toss": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "10 minutes",
    equipment: "Screen for coach to throw behind, home plate, and a bucket of baseballs",
    goal: "Focus on not anticipating pitches and being under control when hitting",
    description: [
      "Screen set up 30 feet from the plate, hitter sets up even with the plate",
      "Coach underhand throws the ball down the middle of the plate on a line at a medium to fast speed from behind the screen",
      "Hitter hits the ball back up the middle of the cage",
      "Every couple of tosses, the coach throws a change-up at a slow speed",
      "The coach should check the position the player is in, making sure they have not started their swing before the change-up gets to them",
      "If the player has already started their swing, the player should focus on being under better control and not anticipating and jumping at pitches",
      "Partners switch after 10 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/SfP2RcIwaZQ"
  },
  "change-up-tee": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "5 minutes",
    equipment: "Tee, baseballs, net or screen to hit into",
    goal: "Practice timing adjustments for off-speed pitches",
    description: [
      "Set up the tee slightly back from normal contact point",
      "Hitter focuses on staying back and waiting for the ball",
      "Practice the feel of hitting a change-up",
      "Drive the ball to the opposite field",
      "Partners switch after 5 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/Ql72Xq2DX9U"
  },
  "color-front-toss": {
    skillSet: "Hitting",
    difficulty: "Hard",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "10 minutes",
    equipment: "Screen for coach to throw behind, home plate, bucket of baseballs, markers",
    goal: "Focus on tracking the balls and colors, pitch recognition, and reacting quickly",
    description: [
      "Screen set up 30 feet from the plate, hitter sets up even with the plate",
      "The balls in the bucket should each have a green, blue, or red circle on them",
      "Coach overhand throws the ball down from behind the screen",
      "Hitter hits the green and blue balls, calling out the color, and takes the red balls",
      "If a player is struggling seeing the colors, slow down the speed of the pitches",
      "Hitter should focus on tracking the balls and seeing their colors and then reacting quickly to hit or take the pitch",
      "Partners switch after 10 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/QUR1x6V73yQ"
  },
  "decline-swings": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "5 minutes",
    equipment: "Bat, tee or soft toss setup, baseballs",
    goal: "Decline Swings train an efficient swing plane and consistent barrel path by swinging on a slight downward angle. The drill reinforces posture, balance, and line-drive contact.",
    description: [
      "Purpose: Improve barrel control, Match bat path to pitch plane, Reduce steep or looping swings",
      "Coaching Emphasis: Maintain strong posture, Keep hands inside the ball, Finish through the middle",
      "How to Perform: Set up on a slight decline or emphasize a declined bat path",
      "Swing under control, focusing on clean contact",
      "Drive the ball on a line and repeat",
      "Usage: Best used as a mechanical reinforcement or early cage drill"
    ],
    videoUrl: "https://www.youtube.com/embed/sgRnq_8G2XI"
  },
  "defense-stance": {
    skillSet: "Infield",
    difficulty: "Easy",
    athletes: "1+ athletes",
    time: "5 minutes",
    equipment: "Glove",
    goal: "Develop proper defensive ready position",
    description: [
      "Feet shoulder-width apart, knees bent",
      "Weight on the balls of the feet",
      "Glove out in front, ready position",
      "Practice getting into stance quickly from standing",
      "Hold position for 5-10 seconds at a time"
    ],
    videoUrl: "https://www.youtube.com/embed/l62xR2rGWrA"
  },
  "double-tee": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "5 minutes",
    equipment: "Bat, two tees, baseballs, net or screen to hit into",
    goal: "Keep the bat on the plane of the baseball, and drive the baseball up the middle",
    description: [
      "Tee set up in front of the middle of the plate, roughly 6 inches out front of the plate (shown below)",
      "Another tee set up about 6 inches in front of the first tee",
      "Hitter sets up even with the plate, while other partner puts balls on the tees",
      "Hitter hits the ball, trying to hit a low line drive back up the middle, keeping the bat on the plane of the ball and the barrel behind the hands and extends their swing path to hit the second ball off the second tee with a smooth swing",
      "Partners switch after 5 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/6NT-D_z3r94"
  },
  "double-tee-decision-making": {
    skillSet: "Hitting",
    difficulty: "Hard",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "10 minutes",
    equipment: "Tees, baseballs, net or screen to hit into",
    goal: "Adjustability in the swing, maintain proper body position throughout the process",
    description: [
      "One tee set up to hit the ball to the pullside field",
      "One tee is set up on the outside corner to hit the ball to the opposite field - the outside tee must be higher than the inside tee",
      "Hitter sets up even with the plate, while partner places a ball on the tees",
      "Hitter begins loading phase, partner then calls out \"outside\" or \"inside\"",
      "Hitter then hits off the corresponding tee, missing the other tee",
      "Focus is to have adjustability in the swing, maintaining proper body position throughout the process",
      "Objective is to be able to hit either pitch called effectively in the desired location",
      "Partner resets the ball on the tee that was called out and repeats process",
      "Great for hitters that cannot maintain proper body position without committing early to a pitch location",
      "Partners switch after 10 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/Ql72Xq2DX9U"
  },
  "extended-tee": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "5 minutes",
    equipment: "Tee, baseballs, net or screen to hit into",
    goal: "Keep the bat on the plane of the baseball, and drive the baseball up the middle",
    description: [
      "Tee set up in front of the middle of the plate, roughly 6 inches out front of the plate",
      "Hitter sets up even with the plate, while other partner puts a ball on the tee",
      "Hitter hits the ball, trying to hit a low line drive back up the middle, keeping the bat on the plane of the ball and the barrel behind the hands",
      "Partners switch after 5 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/sgRnq_8G2XI"
  },
  "fastball-front-toss": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "10 minutes",
    equipment: "Screen for coach to throw behind, home plate, and a bucket of baseballs",
    goal: "Focus on rhythm of the hitter with the pitcher and driving the ball up the middle",
    description: [
      "Screen set up 30 feet from the plate",
      "Hitter sets up even with the plate",
      "Coach underhand throws the ball down the middle of the plate on a line at a slow to medium speed from behind the screen",
      "Hitter tries to hit the ball back up the middle, working on timing with the coach's pitches",
      "Focus should be on good quality swings, with hitters finishing their swing and staying balanced",
      "Partners switch after 10 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/l62xR2rGWrA"
  },
  "flaw-casting-the-hands-outside-of-the-ball": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10 minutes",
    equipment: "Bat, tee or soft toss setup, baseballs",
    goal: "Correct the flaw of casting hands outside the ball",
    description: [
      "Identify the casting flaw in the hitter's swing",
      "Focus on keeping hands inside the ball",
      "Use inside toss drills to reinforce proper hand path",
      "Video analysis can help identify the issue"
    ],
    videoUrl: "https://www.youtube.com/embed/xMVojRcf5p0"
  },
  "flaw-chopping-at-the-ball": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10 minutes",
    equipment: "Bat, tee or soft toss setup, baseballs",
    goal: "Correct the flaw of chopping at the ball",
    description: [
      "Identify the chopping flaw in the hitter's swing",
      "Focus on staying through the ball with a level swing",
      "Use extension drills to promote proper follow-through",
      "Practice hitting line drives back up the middle"
    ],
    videoUrl: "https://www.youtube.com/embed/gGriRVDyGI4"
  },
  "flaw-collapsing-the-backside": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10 minutes",
    equipment: "Bat, tee or soft toss setup, baseballs",
    goal: "Correct the flaw of collapsing the backside",
    description: [
      "Identify when the hitter's back leg collapses during the swing",
      "Focus on maintaining a strong back side throughout the swing",
      "Use balance drills to strengthen the lower half",
      "Practice keeping weight back until contact"
    ],
    videoUrl: "https://www.youtube.com/embed/r365LTS6JUI"
  },
  "flaw-contact-point-too-far-out-front": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10 minutes",
    equipment: "Bat, tee or soft toss setup, baseballs",
    goal: "Correct the flaw of contact point being too far out front",
    description: [
      "Identify when the hitter is making contact too far out front",
      "Focus on letting the ball travel deeper into the zone",
      "Use opposite field hitting drills",
      "Practice patience at the plate"
    ],
    videoUrl: "https://www.youtube.com/embed/xE6d7WyVnJc"
  },
  "flaw-hands-dropping-too-low": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10 minutes",
    equipment: "Bat, tee or soft toss setup, baseballs",
    goal: "Correct the flaw of hands dropping too low",
    description: [
      "Identify when the hitter's hands drop before the swing",
      "Focus on keeping hands at shoulder height through load",
      "Use high tee drills to reinforce proper hand position",
      "Practice short, compact swings"
    ],
    videoUrl: "https://www.youtube.com/embed/2-GSXHCtXBU"
  },
  "flaw-improper-stance": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach",
    time: "5 minutes",
    equipment: "Bat",
    goal: "Correct improper batting stance",
    description: [
      "Evaluate the hitter's current stance",
      "Check feet positioning - shoulder width apart",
      "Ensure proper weight distribution",
      "Check hand position and grip",
      "Make adjustments as needed for comfort and power"
    ],
    videoUrl: "https://www.youtube.com/embed/lKRM1GTczuI"
  },
  "front-hip-toss": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "10 minutes",
    equipment: "Bat, screen for coach to throw behind, home plate, and a bucket of baseballs",
    goal: "Get the barrel to an extreme inside pitch while working through the ball",
    description: [
      "Screen set up 20 feet from the plate",
      "Hitter sets up even with the plate",
      "Coach sets up screen to the left side of the cage",
      "Coach underhand tosses from the left side of the screen directly at the hitter's front hip",
      "Hitter works on keeping their hands inside the baseball while rotating their hips through the swing, effectively pulling the ball",
      "Objective is to be able to get the barrel to an extreme inside pitch while working through the ball",
      "Ideal for hitters that do not use their lower half or they cast their hands when swinging",
      "Partners switch after 10 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/P0f_jlz6LKA"
  },
  "interval-throwing": {
    skillSet: "Throwing",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners (all players)",
    time: "12-15 minutes",
    equipment: "Gloves and balls",
    goal: "Prepare arm for pitching by going through a proper warm up routine",
    description: [
      "Players in partners spread out along the right or left field foul line",
      "The player on the foul line will stay in that spot as their partner moves back to each distance",
      "One Knee (5-10 ft.): Players down on their throwing side knee, glove side knee is up, shoulders square to their partner and throw back and forth, following through on each throw. Players each make 10 throws, then move back to next progression",
      "Close Squared Throwing (10-15 ft.): Players stand with shoulders square to their partner, feet shoulder width apart, starting with their hands together and throw back and forth, letting the elbows close on release. Players each make 10 throws, then move back to next progression",
      "Squared Throwing (15-20 ft.): Players stand with shoulders square to their partner, feet shoulder width apart, starting with their hands rotating together and throw back and forth, letting the elbows close on release. Players each make 10 throws, then move back to next progression",
      "Standing Throwing Position (30-40 ft.): Players stand in normal starting position of throwing, take a deep breath, and throw to their partner, rotating and following through. Players take their time throwing back and forth. Players each make 10 throws",
      "Players 45 feet apart: Players throw the ball back and forth using good throwing mechanics. Players each make 10 throws, then move back to next progression",
      "Players 60 feet apart: Players throw the ball back and forth using good throwing mechanics. Players each make 9 throws, then move back to next progression",
      "Players 90 feet apart: Players throw the ball back and forth using good throwing mechanics. Players each make 8 throws, then move back to next progression",
      "Players 120 feet apart: Players throw the ball back and forth using good throwing mechanics. A crow hop should be used to reduce strain on the arm. Players each make 5 throws, then move back to next progression",
      "Players 130-140 feet apart: Players throw the ball back and forth using good throwing mechanics. A crow hop should be used to reduce strain on the arm. Players each make 5 throws, then move back to next progression",
      "Cool Down: Players should slow start working their way back to the 45 foot distance, making throws on their way back in"
    ],
    videoUrl: "https://www.youtube.com/embed/X7Vxv4bxKBs"
  },
  "1-2-3-rhythm-tee": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "5 minutes",
    equipment: "Tee, baseballs, net or screen to hit into",
    goal: "Develop rhythm and timing in the swing with proper sequencing",
    description: [
      "Tee set up slightly in front of the middle of the plate",
      "Hitter sets up even with the plate",
      "Coach or partner calls out 1, 2, 3 with pauses between each number",
      "On 1: Hitter loads and shifts weight to back foot",
      "On 2: Hitter strides while keeping hands back",
      "On 3: Hitter swings and makes contact",
      "Focus on rhythm and timing rather than power",
      "Partners switch after 5 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/BHfyJQLujhs"
  },
  "1st-base-flip-to-pitcher": {
    skillSet: "Infield",
    difficulty: "Medium",
    athletes: "1 athlete and 1 coach, or 2 athletes as partners",
    time: "5 minutes",
    equipment: "Baseballs, glove, base",
    goal: "Develop proper footwork and hand positioning for flipping to pitcher",
    description: [
      "1st baseman positions on the bag",
      "Coach or partner rolls ground balls to the right of 1st base",
      "1st baseman fields the ball and flips it to the pitcher covering the bag",
      "Focus on quick footwork and accurate flip",
      "Flip should be chest-high and on the inside of the bag",
      "Repeat for multiple ground balls"
    ],
    videoUrl: "https://www.youtube.com/embed/ks7qctrCuHg"
  },
  "2nd-baseman-forehand-spin": {
    skillSet: "Infield",
    difficulty: "Medium",
    athletes: "1 athlete and 1 coach, or 2 athletes as partners",
    time: "5 minutes",
    equipment: "Baseballs, glove, base",
    goal: "Develop proper footwork for backhand flips from the 2nd base position",
    description: [
      "2nd baseman positions in the field",
      "Coach or partner rolls ground balls to the left of 2nd base",
      "2nd baseman fields the ball with a backhand and flips to the pitcher",
      "Focus on quick footwork and accurate backhand flip",
      "Flip should be chest-high and on the inside of the bag",
      "Repeat for multiple ground balls"
    ],
    videoUrl: "https://www.youtube.com/embed/nRKx7jcbnIU"
  },
  "advanced-batting-practice": {
    skillSet: "Infield",
    difficulty: "Easy",
    athletes: "4+ athletes",
    time: "10 minutes",
    equipment: "Baseballs, gloves, bases or cones",
    goal: "Develop footwork and communication in a four-corner drill",
    description: [
      "Set up four bases or cones in a square pattern",
      "Players position at each corner",
      "Coach or partner hits or throws ground balls to each position",
      "Players field the ball and throw to the next corner",
      "Rotate positions after each round",
      "Focus on proper footwork, throwing mechanics, and communication"
    ],
    videoUrl: "https://www.youtube.com/embed/ZbZSe6N_BXs"
  },
  "arm-path-drill": {
    skillSet: "Infield",
    difficulty: "Easy",
    athletes: "1 athlete and 1 coach",
    time: "1 minute",
    equipment: "Baseballs, glove",
    goal: "Develop quick reflexes and hand-eye coordination for quick tosses",
    description: [
      "Player stands in ready position",
      "Coach stands 10-15 feet away",
      "Coach tosses the ball quickly to the player",
      "Player fields the ball and throws it back",
      "Focus on quick reaction time and accuracy",
      "Complete as many tosses as possible in 30 seconds"
    ],
    videoUrl: "https://www.youtube.com/embed/aqz-KE-bpKQ"
  },
  "no-stride-tee": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach, or 2 athletes as partners",
    time: "5 minutes",
    equipment: "Tee, baseballs, net or screen to hit into",
    goal: "Develop a compact swing by eliminating stride and focusing on upper body rotation",
    description: [
      "Set up the tee at a comfortable height for the hitter",
      "Hitter takes stance at the plate without any stride movement",
      "Hitter keeps feet planted and focuses on rotating the upper body",
      "Emphasis on using hip and shoulder rotation to generate power",
      "Hitter swings and hits the ball back up the middle",
      "Focus on compact swing mechanics and bat control",
      "Partners switch after 10 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/mrrBuwWawL4"
  },
  "9045even-progression-tee": {
    skillSet: "Hitting",
    difficulty: "Hard",
    athletes: "1-2 athletes and 1 coach",
    time: "5 minutes",
    equipment: "Tee, baseballs, net or screen",
    goal: "Rotate the front shoulder and drive the ball back up the middle",
    description: [
      "Hitter progresses through three stages using a tee",
      "Stage 1: Hitter stands open at a 90 degree angle to the tee",
      "Focus is on keeping the front shoulder closed, not flying open",
      "Stage 2: Hitter stands at a 45 degree angle",
      "Stage 3: Hitter progress to standard batting stance",
      "This drill is great for hitters that need help loading into their back hip",
      "Hitter should perform 5 reps at each stage before moving to the next stage"
    ],
    videoUrl: "https://www.youtube.com/embed/zHQ1-4hblnk"
  },
  "location-tee": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach",
    time: "5 minutes",
    equipment: "Tee, baseballs, net or screen",
    goal: "Hit the ball up the middle, pull side, and opposite field based on contact point",
    description: [
      "Tee set up in front of the middle of the plate",
      "Hitter sets up even with the plate, while partner places a ball on the tee",
      "Hitter hits the ball at the middle contact point for 3 swings",
      "Then moves the tee to the inside contact point for 3 swings",
      "Then moves the tee to the outside contact point for 3 swings",
      "Focus on hitting the middle ball up the middle, inside ball to pull side, outside pitch to opposite field",
      "Partners switch after 9 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/jDVgIQvuaXQ"
  },
  "random-front-toss": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10 minutes",
    equipment: "Bat, screen, home plate, baseballs",
    goal: "Focus on identifying the pitch, strikes and taking good quality swings",
    description: [
      "Screen set up 18-20 feet from the plate",
      "Hitter sets up even with the plate",
      "Coach underhand throws the ball down at varying speeds and locations",
      "Coach mixes up pitches to keep the hitter focused",
      "Hitter should work on seeing the pitch out of the coach's hand",
      "Focus on identifying the speed of the pitch, strikes and quality swings",
      "Partners switch after 10 swings"
    ],
    videoUrl: "https://www.youtube.com/embed/wkyOsDsGpA8"
  },
  "three-plate-front-toss": {
    skillSet: "Hitting",
    difficulty: "Hard",
    athletes: "1-2 athletes and 1 coach",
    time: "10 minutes",
    equipment: "Screen, 3 home plates, baseballs",
    goal: "Keep good rhythm and timing with the pitcher at each plate distance",
    description: [
      "Screen set up 30 feet from the plate",
      "Plates are set at roughly 30, 20, and 15 feet away from the screen",
      "Hitter sets up even with the furthest plate (plate 1)",
      "Coach throws overhand at a consistent speed from all plate distances",
      "Hitter gets 3 swings at a plate, then moves to another",
      "Focus on keeping rhythm and timing with the coach",
      "Hit the ball back up the middle",
      "Partners switch after rotating to all plates twice"
    ],
    videoUrl: "https://www.youtube.com/embed/WQnBi1-4riw"
  },
  "two-ball-front-toss": {
    skillSet: "Hitting",
    difficulty: "Hard",
    athletes: "1-2 athletes and 1 coach",
    time: "10m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/wT1rnXTHX8U"
  },
  "one-handed-hitting": {
    skillSet: "Hitting",
    difficulty: "Hard",
    athletes: "1-2 athletes and 1 coach",
    time: "15m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/MxoNAJAp1Oc"
  },
  "high-tee": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach",
    time: "5m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/UPvLzEv81go"
  },
  "double-ball-toss": {
    skillSet: "Hitting",
    difficulty: "Hard",
    athletes: "1-2 athletes and 1 coach",
    time: "10m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/dWJhVoP4T-8"
  },
  "knob-inside-the-ball-toss": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/622uNsPEfs8"
  },
  "short-bat-bottom-hand-tee": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/b0fEHcXTsVA"
  },
  "short-bat-top-hand-tee": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/GMwc7OtTHfU"
  },
  "balance-pause-drill": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach",
    time: "5m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/39H9sv-_UVU"
  },
  "balanced-stationary-drill": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach",
    time: "5m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/IVyjtnacgaE"
  },
  "change-up-catch": {
    skillSet: "Throwing",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/Jt_2Znyv7xE"
  },
  "crow-hops": {
    skillSet: "Throwing",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/3Xb2Hqr-cbE"
  },
  "daily-band-work": {
    skillSet: "Throwing",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach",
    time: "5m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/xV8PY67NWiw"
  },
  "daily-flat-ground-work": {
    skillSet: "Throwing",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach",
    time: "5m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/MnDGnwKUq34"
  },
  "daily-throwing-program": {
    skillSet: "Throwing",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach",
    time: "5m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/jYp0511ckBA"
  },
  "drag-bunt": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/vpp6Snputsk"
  },
  "heavy-front-side-drill": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "1-2 athletes and 1 coach",
    time: "10m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/rZYnNQX9Zlc"
  },
  "hook-ems": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "1-2 athletes and 1 coach",
    time: "5m",
    equipment: "Baseballs, bat, tee or coach",
    goal: "Develop proper technique and timing",
    description: [
      "Watch the video for detailed instructions",
      "Follow the progression shown in the video",
      "Practice with proper form and focus"
    ],
    videoUrl: "https://www.youtube.com/embed/Hdw8h4y4eS0"
  },
  "30-second-backhand": {
    skillSet: "Infield",
    difficulty: "Easy",
    athletes: "1 athlete and 1 coach",
    time: "5 minutes",
    equipment: "Baseballs, glove",
    goal: "Develop quick reflexes and hand-eye coordination with rapid backhand ground balls",
    description: [
      "Player stands in ready position at shortstop or second base",
      "Coach or partner rolls ground balls to the backhand side",
      "Player fields the ball with proper backhand technique",
      "Focus on quick footwork and smooth fielding motion",
      "Complete as many ground balls as possible in 30 seconds",
      "Rest and repeat for multiple sets",
      "Emphasize proper glove positioning and body alignment"
    ],
    videoUrl: null
  },
  "ball-in-the-sun": {
    skillSet: "Outfield",
    difficulty: "Easy",
    athletes: "1 athlete and 1 coach",
    time: "5 minutes",
    equipment: "Baseballs, glove",
    goal: "Develop ability to track and catch fly balls in difficult lighting conditions",
    description: [
      "Athlete positions in outfield facing the sun or bright light",
      "Coach throws or hits fly balls at varying heights and distances",
      "Athlete must track the ball while dealing with sun glare",
      "Focus on proper positioning and glove placement",
      "Practice calling for the ball and communicating with teammates",
      "Repeat for multiple sets"
    ],
    videoUrl: null
  },
  "1st-base-inside-receiving": {
    skillSet: "Infield",
    difficulty: "Medium",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "1st Base Inside Receiving",
    description: [
      "Step 1: Set up the drill",
      "Step 2: Execute the drill",
      "Step 3: Focus on proper technique",
      "Step 4: Repeat for multiple sets"
    ],
    videoUrl: null
  },
  "backside-angle-toss": {
    skillSet: "Hitting",
    difficulty: "Hard",
    athletes: "1-2 athletes and 1 coach",
    time: "10 minutes",
    equipment: "Bat, helmet, baseballs",
    goal: "Develop ability to hit pitches from the backside angle with proper timing and mechanics",
    description: [
      "Coach sets up at an angle behind the hitter's backside",
      "Coach tosses the ball from the backside angle",
      "Hitter focuses on tracking the ball and adjusting swing mechanics",
      "Work on hitting the ball with proper extension and follow-through",
      "Practice for multiple sets with focus on consistency"
    ],
    videoUrl: "https://www.youtube.com/embed/OmgHRRPompU"
  },
  "1st-base-off-bag": {
    skillSet: "Infield",
    difficulty: "Medium",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "1st Base Off Bag",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "30-second-backhand-cross": {
    skillSet: "Infield",
    difficulty: "Medium",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "30 Second Backhand Cross",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "30-second-crow-hops": {
    skillSet: "Outfield",
    difficulty: "Easy",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "30 Second Crow Hops",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "7-ball-front-toss": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "Varies",
    time: "10m",
    equipment: "Varies",
    goal: "7 Ball Front Toss",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "back-hip-load-tee": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "Back Hip Load Tee",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "back-net-constraint-tee": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "Back Net Constraint Tee",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "backhand-cross-and-throw": {
    skillSet: "Infield",
    difficulty: "Medium",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "Backhand Cross and Throw",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "ball-hit-front-toss": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "Varies",
    time: "10m",
    equipment: "Varies",
    goal: "Ball-Hit Front Toss",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "box-drill-2nd-baseman-double-play-feeds": {
    skillSet: "Infield",
    difficulty: "Hard",
    athletes: "Varies",
    time: "15m",
    equipment: "Varies",
    goal: "Box Drill- 2nd Baseman Double Play Feeds",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },

  "flaw-lack-of-separation": {
    skillSet: "Hitting",
    difficulty: "Hard",
    athletes: "Varies",
    time: "Unknown",
    equipment: "Varies",
    goal: "Flaw- Lack of Separation",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "flaw-loop-in-the-barrel": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "Varies",
    time: "Unknown",
    equipment: "Varies",
    goal: "Flaw- Loop in the Barrel",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "flaw-lunging-to-the-ball": {
    skillSet: "Hitting",
    difficulty: "Medium",
    athletes: "Varies",
    time: "Unknown",
    equipment: "Varies",
    goal: "Flaw- Lunging to the Ball",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "flaw-no-lower-half": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "Varies",
    time: "Unknown",
    equipment: "Varies",
    goal: "Flaw- No Lower Half",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "flaw-soft-front-knee": {
    skillSet: "Hitting",
    difficulty: "Hard",
    athletes: "Varies",
    time: "Unknown",
    equipment: "Varies",
    goal: "Flaw- Soft Front Knee",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "flaw-stepping-in-the-bucket": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "Varies",
    time: "Unknown",
    equipment: "Varies",
    goal: "Flaw- Stepping in the Bucket",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "fly-balls": {
    skillSet: "Outfield",
    difficulty: "Easy",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "Fly Balls",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "offensive-stations-tee-and-live-hitting": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "Varies",
    time: "30m",
    equipment: "Varies",
    goal: "Offensive Stations - Tee and Live Hitting",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "overload-bat-soft-toss": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "Varies",
    time: "10m",
    equipment: "Varies",
    goal: "Overload Bat Soft Toss",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "rapid-fire-fungo": {
    skillSet: "Infield",
    difficulty: "Medium",
    athletes: "Varies",
    time: "10m",
    equipment: "Varies",
    goal: "Rapid Fire Fungo",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "read-and-react": {
    skillSet: "Outfield",
    difficulty: "Easy",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "Read and React",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "rhythm-tee": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "Rhythm Tee",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "short-base-team-bunt-drill": {
    skillSet: "Bunting",
    difficulty: "Hard",
    athletes: "Varies",
    time: "20m",
    equipment: "Varies",
    goal: "Short Base Team Bunt Drill",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "stride-to-spot": {
    skillSet: "Pitching",
    difficulty: "Easy",
    athletes: "Varies",
    time: "3m",
    equipment: "Varies",
    goal: "Stride to Spot",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
  "top-hand-tee": {
    skillSet: "Hitting",
    difficulty: "Easy",
    athletes: "Varies",
    time: "5m",
    equipment: "Varies",
    goal: "Top Hand Tee",
    description: ["Watch the video for detailed instructions"],
    videoUrl: null
  },
}

export default function DrillDetail() {
  const { user, loading } = useAuth();
  const [match, params] = useRoute("/drill/:id");
  const id = params?.id;

  // Free preview tracking for unauthenticated visitors
  const { viewCount, isLimitReached, recordView } = usePreviewLimit();

  // Preserve query params for back navigation to drill list
  // wouter's useSearch() strips the '?' prefix, returning e.g. 'page=2&category=Hitting'
  const searchString = useSearch();
  const backHref = searchString ? `/?${searchString}` : '/';
  
  // Fetch custom drills from database
  const { data: customDrills = [] } = trpc.drillDetails.getCustomDrills.useQuery();
  
  // Look for drill in static data first, then in custom drills
  const staticDrill = drillsData.find(d => d.id.toString() === id);
  const customDrill = customDrills.find((cd: any) => cd.drillId === id);
  
  // Create a unified drill object
  const drill = staticDrill || (customDrill ? {
    id: customDrill.drillId,
    name: customDrill.name,
    difficulty: customDrill.difficulty,
    categories: [customDrill.category],
    duration: customDrill.duration,
    url: `/drill/${customDrill.drillId}`,
    is_direct_link: true,
  } : null);
  
  // Try to load from database first, fallback to hardcoded details
  const { data: dbDetails } = trpc.drillDetails.getDrillDetail.useQuery(
    { drillId: id || '' },
    { enabled: !!id }
  );
  
  const details = dbDetails || (id && drillDetails[id as keyof typeof drillDetails]);
  
  const [savedVideos, setSavedVideos] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [showPageBuilder, setShowPageBuilder] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoalText, setEditGoalText] = useState('');
  
  // Load video from database
  const { data: videoData } = trpc.videos.getVideo.useQuery(
    { drillId: id || '' },
    { enabled: !!id }
  );
  
  // Load instructions from database
  const { data: drillDetailData } = trpc.drillDetails.getDrillDetail.useQuery(
    { drillId: id || '' },
    { enabled: !!id }
  );
  
  // Load custom page layout
  const { data: pageLayout } = trpc.drillDetails.getPageLayout.useQuery(
    { drillId: id || '' },
    { enabled: !!id }
  );
  
  useEffect(() => {
    if (videoData) {
      setSavedVideos({ [videoData.drillId]: videoData.videoUrl });
    }
  }, [videoData]);
  
  useEffect(() => {
    if (drillDetailData?.instructions) {
      setCustomInstructions(drillDetailData.instructions);
    }
  }, [drillDetailData]);

  // Favorites functionality
  const { data: favoritesData } = trpc.favorites.getAll.useQuery(undefined, {
    enabled: !!user?.id
  });
  const toggleFavoriteMutation = trpc.favorites.toggle.useMutation({
    onSuccess: () => {
      trpcUtils.favorites.getAll.invalidate();
    }
  });
  const trpcUtils = trpc.useUtils();
  
  // Check if current drill is favorited
  const isFavorited = useMemo(() => {
    if (!favoritesData?.drillIds || !id) return false;
    const numericId = parseInt(id);
    return favoritesData.drillIds.includes(numericId) || favoritesData.drillIds.includes(id as any);
  }, [favoritesData?.drillIds, id]);
  
  const handleToggleFavorite = () => {
    if (!id) return;
    const numericId = parseInt(id) || 0;
    toggleFavoriteMutation.mutate({ drillId: numericId });
  };

  // Activity logging mutation
  const logActivityMutation = trpc.activity.logActivity.useMutation();

  // Log drill view when athlete views the page
  useEffect(() => {
    if (user?.id && user?.role === 'athlete' && drill && id) {
      logActivityMutation.mutate({
        activityType: "drill_view",
        relatedId: id,
        relatedType: "drill",
        metadata: { drillName: drill.name }
      });
    }
  }, [user?.id, user?.role, id, drill?.name]);

  // Save custom instructions
  const saveInstructionsMutation = trpc.drillDetails.saveDrillInstructions.useMutation();
  
  const saveCustomInstructions = async () => {
    if (!id || !customInstructions.trim()) return;
    try {
      await saveInstructionsMutation.mutateAsync({
        drillId: id,
        instructions: customInstructions
      });
    } catch (error) {
      console.error('Failed to save instructions:', error);
    }
  };

  // Save goal inline
  const saveGoalMutation = trpc.drillDetails.saveDrillInstructions.useMutation({
    onSuccess: () => {
      trpcUtils.drillDetails.getDrillDetail.invalidate({ drillId: id || '' });
    }
  });

  const handleStartEditGoal = () => {
    const goalText = details && typeof details === 'object' && 'goal' in details ? details.goal : '';
    setEditGoalText(goalText || '');
    setIsEditingGoal(true);
  };

  const handleSaveGoal = async () => {
    if (!id) return;
    try {
      await saveGoalMutation.mutateAsync({
        drillId: id,
        goal: editGoalText,
      });
      setIsEditingGoal(false);
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const handleCancelEditGoal = () => {
    setIsEditingGoal(false);
    setEditGoalText('');
  };

  // Check if user has access (or if preview mode is enabled)
  const hasAccess = PREVIEW_MODE || (user && (user.role === 'admin' || user.isActiveClient === 1));

  const isAnonymous = !user && !loading;

  // Each drill page load by an anonymous visitor counts as one view.
  // After the first free view, any subsequent visit (same or different drill)
  // sends them straight to login.
  useEffect(() => {
    if (isAnonymous && id && drill) {
      if (isLimitReached) {
        // Already used their free view — redirect to login immediately
        window.location.href = "/login";
      } else {
        // This is their first (free) view — record it
        recordView();
      }
    }
  }, [isAnonymous, id, drill?.name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-[#DC143C]/30 border-t-[#DC143C] animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading drill...</p>
        </div>
      </div>
    );
  }

  if (!drill) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-heading font-bold">Drill not found</h2>
          <p className="text-muted-foreground">The drill you're looking for doesn't exist or has been removed.</p>
          <Link href={backHref}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // If anonymous and already at the limit, the useEffect above will redirect;
  // render nothing while that navigation happens.
  if (isAnonymous && isLimitReached) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-8 md:pb-12">
      {/* Access Control Check - for logged-in users without active client status */}
      {!hasAccess && !isAnonymous && (
        <div className="container py-12">
          <Card className="max-w-2xl mx-auto border-2">
            <CardHeader className="text-center">
              <div className="mx-auto bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Client Access Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                This drill content is only available to active clients. Please log in with an authorized account to view the full drill details.
              </p>
              {!user ? (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="gap-2">
                    <LogIn className="h-5 w-5" />
                    Login to Access
                  </Button>
                </a>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Your account does not have active client access. Please contact the administrator.
                  </p>
                  <Link href={backHref}>
                    <Button variant="outline">Return to Directory</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      {(hasAccess || isAnonymous) && (
      <>
      <header className="relative overflow-hidden mb-6 md:mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.18_0.01_25)] via-[oklch(0.15_0.005_0)] to-[oklch(0.12_0.01_20)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.45_0.15_250/0.15),transparent_60%)]" />
        <div className="container relative z-10 py-6 md:py-10">
          <Link href={backHref}>
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 mb-4 pl-0 gap-2 text-sm">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Directory</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 w-full">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className={`font-bold text-xs px-3 py-1 ${
                  drill.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  drill.difficulty === 'Medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-red-500/20 text-red-400 border-red-500/30'
                }`} variant="outline">
                  {drill.difficulty}
                </Badge>
                {drill.categories.map(cat => (
                  <Badge key={cat} variant="outline" className="bg-white/[0.06] text-white/80 border-white/[0.12] font-medium text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
              <InlineEdit contentKey={`drill.detail.${id}.title`} defaultValue={drill.name} as="h1" className="text-3xl md:text-5xl font-heading font-black text-white leading-tight tracking-tight" />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              {/* Add to Favorites Button */}
              {user && (
                <Button
                  onClick={handleToggleFavorite}
                  disabled={toggleFavoriteMutation.isPending}
                  variant="outline"
                  className={`flex-1 md:flex-none gap-2 ${
                    isFavorited 
                      ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30" 
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border-white/[0.12]"
                  }`}
                >
                  <Star className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                  {isFavorited ? "Favorited" : "Favorite"}
                </Button>
              )}
              
              {/* Fallback to external link */}
              {!details && (
                <a href={drill.url} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none">
                  <Button variant="outline" className="w-full bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border-white/[0.12] gap-2">
                    <span className="hidden sm:inline">View on USA Baseball</span>
                    <span className="sm:hidden">View</span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-4xl px-3 md:px-4">
        {/* Check if custom page layout exists - if so, render ONLY that */}
        {pageLayout?.blocks && Array.isArray(pageLayout.blocks) && pageLayout.blocks.length > 0 ? (
          <div className="grid gap-6 md:gap-8">
            {/* Admin/Coach edit buttons */}
            {user && (user.role === 'admin' || user.role === 'coach') && (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPageBuilder(true)}
                  className="flex items-center gap-1 px-3 py-2 rounded-md bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors text-sm font-medium"
                >
                  <Layout className="h-4 w-4" />
                  Edit Page
                </button>
              </div>
            )}
            {/* Render the custom page layout */}
            <CustomDrillLayout blocks={pageLayout.blocks as any[]} />

            {/* Editable Stat Cards Bar - shown on custom layouts too */}
            {details && (
              <EditableStatBar
                drillId={id || "unknown"}
                isCoach={!!(user && (user.role === 'admin' || user.role === 'coach'))}
                defaultCards={[
                  { id: `${id}-time`, label: "Time", value: details.time, icon: "clock" },
                  { id: `${id}-athletes`, label: "Athletes", value: details.athletes.split(',')[0], icon: "users" },
                  { id: `${id}-equipment`, label: "Equipment", value: details.equipment.split(',')[0], icon: "dumbbell" },
                  { id: `${id}-skill`, label: "Skill Set", value: details.skillSet, icon: "target" },
                ]}
              />
            )}

            {/* Instructions Editor - shown on custom layouts too */}
            <section>
              <h2 className="text-2xl md:text-3xl font-heading font-black mb-3 md:mb-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-400" />
                </div>
                <InlineEdit contentKey={`drill.detail.${id}.instructionsHeading`} defaultValue="Instructions" as="span" />
              </h2>
              <div className="glass-card rounded-xl p-4 md:p-6">
                {user && (user.role === 'admin' || user.role === 'coach') ? (
                  <TiptapEditor
                    value={customInstructions}
                    onChange={setCustomInstructions}
                    onSave={saveCustomInstructions}
                    isSaving={saveInstructionsMutation.isPending}
                    placeholder="Write drill instructions here..."
                  />
                ) : (
                  <div className="min-h-[60px]">
                    {customInstructions ? (
                      <TiptapRenderer content={customInstructions} />
                    ) : (
                      <p className="text-muted-foreground italic">No instructions provided for this drill yet.</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Q&A Section for Athletes - also show on custom layouts */}
            {user?.role === 'athlete' && (
              <DrillQAForm drillId={id || ''} drillName={drill?.name || ''} />
            )}
          </div>
        ) : details ? (
          <div className="grid gap-6 md:gap-8">
            {/* Video Section - Moved to Top */}
            {(savedVideos[drill.id] || (details && 'videoUrl' in details && details.videoUrl)) ? (
              <VideoPlayer videoUrl={(savedVideos[drill.id] || (details && 'videoUrl' in details && details.videoUrl)) as string} title={`${drill.name} Video`} />
            ) : (
              <div className="bg-muted rounded-lg md:rounded-xl aspect-video flex items-center justify-center border-2 border-dashed border-muted-foreground/20 w-full">
                <div className="text-center p-3 md:p-4">
                  <p className="text-muted-foreground font-medium text-sm md:text-base">Video / Diagram Placeholder</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Media content would appear here</p>
                </div>
              </div>
            )}

            {/* Coaching Cues - Above the Fold */}
            <div className="glass-card rounded-xl border-l-4 border-l-[#DC143C] overflow-hidden">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="flex items-center gap-2 text-xl md:text-2xl font-heading font-black">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center">
                      <Lightbulb className="h-4 w-4 text-[#E8425A]" />
                    </div>
                    <InlineEdit contentKey={`drill.detail.${id}.goalHeading`} defaultValue="Goal of Drill" as="span" />
                  </h3>
                  {user && (user.role === 'admin' || user.role === 'coach') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPageBuilder(true)}
                        className="flex items-center gap-1 px-3 py-2 rounded-md bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors text-sm font-medium"
                      >
                        <Layout className="h-4 w-4" />
                        Page Builder
                      </button>
                      <button
                        onClick={() => setEditModalOpen(true)}
                        className="flex items-center gap-1 px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-sm font-medium"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-1 px-3 py-2 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                {isEditingGoal ? (
                  <div className="space-y-3">
                    <textarea
                      value={editGoalText}
                      onChange={(e) => setEditGoalText(e.target.value)}
                      className="w-full min-h-[80px] p-3 rounded-lg bg-background/80 border border-border text-base md:text-lg font-medium text-foreground/90 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[#DC143C]/50 focus:border-[#DC143C]"
                      placeholder="Enter the goal of this drill..."
                      autoFocus
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={handleCancelEditGoal}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors text-sm font-medium"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveGoal}
                        disabled={saveGoalMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#DC143C] hover:bg-[#DC143C]/90 text-white transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {saveGoalMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group/goal relative">
                    <p className="text-base md:text-lg font-medium text-foreground/90 leading-relaxed pr-8">{details.goal}</p>
                    {user && (user.role === 'admin' || user.role === 'coach') && (
                      <button
                        onClick={handleStartEditGoal}
                        className="absolute top-0 right-0 p-1.5 rounded-md opacity-0 group-hover/goal:opacity-100 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all"
                        title="Edit goal"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Editable Stat Cards Bar */}
            <EditableStatBar
              drillId={id || "unknown"}
              isCoach={!!(user && (user.role === 'admin' || user.role === 'coach'))}
              defaultCards={[
                { id: `${id}-time`, label: "Time", value: details.time, icon: "clock" },
                { id: `${id}-athletes`, label: "Athletes", value: details.athletes.split(',')[0], icon: "users" },
                { id: `${id}-equipment`, label: "Equipment", value: details.equipment.split(',')[0], icon: "dumbbell" },
                { id: `${id}-skill`, label: "Skill Set", value: details.skillSet, icon: "target" },
              ]}
            />

            {/* Custom Instructions */}
            <section>
              <h2 className="text-2xl md:text-3xl font-heading font-black mb-3 md:mb-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-400" />
                </div>
                <InlineEdit contentKey={`drill.detail.${id}.instructionsHeading`} defaultValue="Instructions" as="span" />
              </h2>
              <div className="glass-card rounded-xl p-4 md:p-6">
                {user && (user.role === 'admin' || user.role === 'coach') ? (
                  <TiptapEditor
                    value={customInstructions}
                    onChange={setCustomInstructions}
                    onSave={saveCustomInstructions}
                    isSaving={saveInstructionsMutation.isPending}
                    placeholder="Write drill instructions here... Use the toolbar for bold, headings, lists, and more. Toggle &lt;/&gt; to paste raw HTML."
                  />
                ) : (
                  <div className="min-h-[60px]">
                    {customInstructions ? (
                      <TiptapRenderer content={customInstructions} />
                    ) : (
                      <p className="text-muted-foreground italic">No instructions provided for this drill yet.</p>
                    )}
                  </div>
                )}
              </div>
            </section>


          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
            <h3 className="text-xl font-bold mb-2">Content Not Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We haven't extracted the detailed content for this drill yet. You can view it on the official website.
            </p>
            <a href={drill.url} target="_blank" rel="noopener noreferrer">
              <Button>
                View on USA Baseball <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        )}

        {/* ── New Metadata Fields: always shown for static drills ── */}
        {staticDrill && (staticDrill.drillType || (staticDrill.ageLevel?.length ?? 0) > 0 || (staticDrill.tags?.length ?? 0) > 0 || (staticDrill.problem?.length ?? 0) > 0 || (staticDrill.goal?.length ?? 0) > 0) && (
          <div className="grid gap-4 mt-6">

            {/* Drill Type + Age Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {staticDrill.drillType && (
                <div className="glass-card rounded-xl p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Drill Type</div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {staticDrill.drillType}
                  </span>
                </div>
              )}
              {(staticDrill.ageLevel?.length ?? 0) > 0 && (
                <div className="glass-card rounded-xl p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Age / Level</div>
                  <div className="flex flex-wrap gap-2">
                    {(staticDrill.ageLevel ?? []).filter((v: string) => v !== 'all').map((level: string) => {
                      const label = filterOptions.ageLevel.find(o => o.value === level)?.label ?? level;
                      return (
                        <span key={level} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Focus Area Tags */}
            {(staticDrill.tags?.length ?? 0) > 0 && (
              <div className="glass-card rounded-xl p-4">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Focus Areas</div>
                <div className="flex flex-wrap gap-2">
                  {(staticDrill.tags ?? []).map((tag: string) => (
                    <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-white/70 border border-white/[0.12]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Problems + Goals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(staticDrill.problem?.length ?? 0) > 0 && (
                <div className="glass-card rounded-xl p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fixes These Problems</div>
                  <div className="flex flex-wrap gap-2">
                    {(staticDrill.problem ?? []).map((p: string) => {
                      const label = filterOptions.problem.find(o => o.value === p)?.label ?? p;
                      return (
                        <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-300 border border-red-500/25">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {(staticDrill.goal?.length ?? 0) > 0 && (
                <div className="glass-card rounded-xl p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Helps You</div>
                  <div className="flex flex-wrap gap-2">
                    {(staticDrill.goal ?? []).map((g: string) => {
                      const label = filterOptions.goal.find(o => o.value === g)?.label ?? g;
                      return (
                        <span key={g} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-300 border border-green-500/25">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
      </>
      )}
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Delete Drill Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete the drill details for "{drill?.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    // Delete mutation would go here
                    alert("Delete functionality coming soon");
                    setShowDeleteConfirm(false);
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Q&A Section for Athletes */}
      {hasAccess && user?.role === 'athlete' && (
        <div className="container max-w-4xl mx-auto mb-8">
          <DrillQAForm drillId={id || ''} drillName={drill?.name || ''} />
        </div>
      )}
      
      {/* Edit Drill Details Modal */}
      <EditDrillDetailsModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        drillId={id || ''}
        drillName={drill?.name || ''}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          // Refetch drill details
        }}
      />
      
      {/* Drill Page Builder - Notion Style */}
      {showPageBuilder && (
        <DrillPageBuilderNotion
          drillId={id || ''}
          drillName={drill?.name || ''}
          onClose={() => setShowPageBuilder(false)}
        />
      )}
    </div>
  );
}
