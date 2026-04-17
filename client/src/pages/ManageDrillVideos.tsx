import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Video, Search } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import drillsData from "@/data/drills";
import { VideoUrlManager } from "@/components/VideoUrlManager";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DrillEntry {
  id: string;
  name: string;
  categories: string[];
}

export function ManageDrillVideos({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [drillVideos, setDrillVideos] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const { data: videosData } = trpc.videos.getAllVideos.useQuery();
  const { data: customDrills = [] } = trpc.drillDetails.getCustomDrills.useQuery();
  
  useEffect(() => {
    if (videosData) {
      const videoMap: Record<string, string> = {};
      videosData.forEach((v: any) => {
        videoMap[v.drillId] = v.videoUrl;
      });
      setDrillVideos(videoMap);
      setIsLoading(false);
    }
  }, [videosData]);

  const allDrills: DrillEntry[] = useMemo(() => {
    const builtIn: DrillEntry[] = drillsData.map(d => ({
      id: String(d.id),
      name: d.name,
      categories: d.categories,
    }));
    const custom: DrillEntry[] = customDrills.map((cd: any) => ({
      id: cd.drillId,
      name: cd.name,
      categories: [cd.category],
    }));
    return [...builtIn, ...custom].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [customDrills]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    cats.add("All");
    allDrills.forEach(drill => {
      drill.categories.forEach(cat => cats.add(cat));
    });
    return Array.from(cats).sort();
  }, [allDrills]);

  const filteredDrills = useMemo(() => {
    return allDrills.filter(drill => {
      const matchesSearch = drill.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || drill.categories.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, allDrills]);

  const utils = trpc.useUtils();
  const saveVideoMutation = trpc.videos.saveVideo.useMutation();
  
  const handleSaveVideo = (drillId: string, videoUrl: string) => {
    saveVideoMutation.mutate(
      { drillId, videoUrl },
      {
        onSuccess: () => {
          toast.success("Video URL saved");
          const updated = { ...drillVideos, [drillId]: videoUrl };
          setDrillVideos(updated);
          utils.videos.getAllVideos.invalidate();
        },
        onError: (e) => {
          toast.error(e.message || "Failed to save video");
        },
      }
    );
  };

  if (!user || (user.role !== "coach" && user.role !== "admin")) {
    return (
      <div className="coach-dark min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Only coaches and admins can manage drill videos.</p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mainContent = (
    <>
      {/* Search and Filter */}
      <div className="grid gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search drills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              size="sm"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{Object.keys(drillVideos).length}</span> drills have videos
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{filteredDrills.length}</span> drills shown
        </div>
      </div>

      {/* Drills Grid */}
      <div className="grid gap-6 pb-4">
        {filteredDrills.map(drill => (
          <VideoUrlManager
            key={drill.id}
            drillId={drill.id}
            drillName={drill.name}
            currentVideoUrl={drillVideos[drill.id]}
            onSave={(videoUrl) => handleSaveVideo(drill.id, videoUrl)}
          />
        ))}
      </div>
    </>
  );

  if (embedded) return <div className="space-y-4">{mainContent}</div>;

  return (
    <div className="coach-dark min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-6 mb-8">
        <div className="container">
          <Link href="/coach-dashboard">
            <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4 pl-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Coach Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Video className="h-8 w-8" />
            <h1 className="text-4xl font-heading font-black">Manage Drill Videos</h1>
          </div>
          <p className="text-primary-foreground/80 mt-2">Add instructional videos to your drills</p>
        </div>
      </header>
      <div className="container max-w-6xl pb-12">{mainContent}</div>
    </div>
  );
}
