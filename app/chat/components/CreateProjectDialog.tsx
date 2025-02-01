import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { trpc } from "@/utils/trpc.ts";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IoMdAdd } from "react-icons/io";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [workdir, setWorkdir] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const createProject = trpc.createProject.useMutation();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      setIsRedirecting(true);
      const result = await createProject.mutateAsync({
        name: projectName,
        workdir: workdir.trim()
      });
      router.push(`/chat/${result.projectName}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      setIsRedirecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
        >
          <IoMdAdd className="w-5 h-5" />
          Create New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="My Project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isRedirecting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workdir">Working Directory (Optional)</Label>
            <Input
              id="workdir"
              placeholder="/path/to/project"
              value={workdir}
              onChange={(e) => setWorkdir(e.target.value)}
              disabled={isRedirecting}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isRedirecting}
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
