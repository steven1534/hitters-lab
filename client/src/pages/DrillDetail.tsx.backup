import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";;
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Users, Dumbbell, Target, ExternalLink, Lock, LogIn } from "lucide-react";
import { getLoginUrl, PREVIEW_MODE } from "@/const";
import { Link, useRoute } from "wouter";
import drillsData from "@/data/drills.json";

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
}

export default function DrillDetail() {
  const { user, loading } = useAuth();
  const [match, params] = useRoute("/drill/:id");
  const id = params?.id;
  const drill = drillsData.find(d => d.id.toString() === id);
  const details = id && drillDetails[id as keyof typeof drillDetails];

  // Check if user has access (or if preview mode is enabled)
  const hasAccess = PREVIEW_MODE || (user && (user.role === 'admin' || user.isActiveClient === 1));

  if (loading) {
    return (
      <div className="container py-12 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!drill) {
    return (
      <div className="container py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Drill not found</h2>
        <Link href="/">
          <Button>Back to Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Access Control Check */}
      {!hasAccess && (
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
                  <Link href="/">
                    <Button variant="outline">Return to Directory</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      {hasAccess && (
      <>
      <header className="bg-primary text-primary-foreground py-8 mb-8">
        <div className="container">
          <Link href="/">
            <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4 pl-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  {drill.difficulty}
                </Badge>
                {drill.categories.map(cat => (
                  <Badge key={cat} variant="outline" className="text-primary-foreground border-primary-foreground/30">
                    {cat}
                  </Badge>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold">{drill.name}</h1>
            </div>
            
            {/* Fallback to external link if we don't have internal details */}
            {!details && (
              <a href={drill.url} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">
                  View on USA Baseball <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="container max-w-4xl">
        {details ? (
          <div className="grid gap-8">
            {/* Video Section - Moved to Top */}
            {details.videoUrl ? (
              <div className="rounded-xl overflow-hidden shadow-lg aspect-video bg-black w-full">
                <iframe 
                  src={details.videoUrl} 
                  title={`${drill.name} Video`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="bg-muted rounded-xl aspect-video flex items-center justify-center border-2 border-dashed border-muted-foreground/20 w-full">
                <div className="text-center p-4">
                  <p className="text-muted-foreground font-medium">Video / Diagram Placeholder</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Media content would appear here</p>
                </div>
              </div>
            )}



            {/* Goal */}
            <Card className="border-l-4 border-l-secondary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Target className="h-5 w-5 text-secondary" />
                  Drill Purpose
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">{details.goal}</p>
              </CardContent>
            </Card>

            {/* Instructions */}
            <div className="grid md:grid-cols-1 gap-8">
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-heading font-bold mb-4 flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center text-sm">1</span>
                    Instructions
                  </h2>
                  <div className="bg-card rounded-xl border p-6 shadow-sm space-y-4">
                    <ul className="space-y-3">
                      {details.description.map((step: string, i: number) => (
                        <li key={i} className="flex gap-3">
                          <div className="h-2 w-2 bg-secondary rounded-full mt-2 shrink-0" />
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

              </div>
            </div>
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
      </div>
      </>
      )}
    </div>
  );
}
