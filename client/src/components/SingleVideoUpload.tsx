import { useState, useMemo } from "react";
import { isValidVideoUrl, toEmbedUrl } from "@/lib/youtubeUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Video, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAllDrills } from "@/hooks/useAllDrills";
import { cn } from "@/lib/utils";

export function SingleVideoUpload() {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const saveVideoMutation = trpc.videos.saveVideo.useMutation();

  const allDrills = useAllDrills();

  // Filter drills based on search (now includes custom drills, sorted alphabetically)
  const filteredDrills = useMemo(() => {
    if (!searchValue) return allDrills.slice(0, 20); // Show first 20 by default
    return allDrills.filter(drill =>
      drill.name.toLowerCase().includes(searchValue.toLowerCase())
    ).slice(0, 20);
  }, [searchValue, allDrills]);

  const selectedDrillName = useMemo(() => {
    const drill = allDrills.find(d => d.id.toString() === selectedDrill);
    return drill?.name || "";
  }, [selectedDrill, allDrills]);

  const handleSave = () => {
    if (!selectedDrill) {
      toast.error("Please select a drill");
      return;
    }
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    // Validate YouTube/Vimeo URL
    if (!isValidVideoUrl(videoUrl)) {
      toast.error("Please enter a valid YouTube or Vimeo URL");
      return;
    }

    const drill = allDrills.find(d => d.id.toString() === selectedDrill);
    const drillId = drill?.name.toLowerCase().replace(/\s+/g, "-") || selectedDrill;

    saveVideoMutation.mutate(
      { drillId, videoUrl },
      {
        onSuccess: () => {
          toast.success(`Video saved for "${selectedDrillName}"`);
          setSelectedDrill("");
          setVideoUrl("");
          setDialogOpen(false);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to save video");
        },
      }
    );
  };

  const handleReset = () => {
    setSelectedDrill("");
    setVideoUrl("");
    setSearchValue("");
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Video className="h-4 w-4" />
          Add Single Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Add Video to Drill
          </DialogTitle>
          <DialogDescription>
            Select a drill and paste the YouTube video URL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drill Selector */}
          <div className="space-y-2">
            <Label>Select Drill</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedDrillName || "Search for a drill..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Type to search drills..." 
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>No drill found.</CommandEmpty>
                    <CommandGroup>
                      {filteredDrills.map((drill) => (
                        <CommandItem
                          key={drill.id}
                          value={drill.name}
                          onSelect={() => {
                            setSelectedDrill(drill.id.toString());
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedDrill === drill.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {drill.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Video URL Input */}
          <div className="space-y-2">
            <Label htmlFor="videoUrl">YouTube Video URL</Label>
            <Input
              id="videoUrl"
              placeholder="https://youtu.be/... or https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste the YouTube URL for this drill's instructional video
            </p>
          </div>

          {/* Preview */}
          {selectedDrill && videoUrl && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm font-medium mb-1">Preview:</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedDrillName}</span>
                <br />
                <span className="text-xs break-all">{videoUrl}</span>
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveVideoMutation.isPending || !selectedDrill || !videoUrl}
          >
            {saveVideoMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Video"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
