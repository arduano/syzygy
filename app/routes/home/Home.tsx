import { Card } from "@/components/ui/card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { trpc } from "@/utils/trpc.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { Label } from "@/components/ui/label.tsx";
import { Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export function Home() {
  const { data: projects, isLoading } = trpc.listProjects.useQuery();
  const createProject = trpc.createProject.useMutation();
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [workdir, setWorkdir] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      setIsRedirecting(true);
      const result = await createProject.mutateAsync({
        name: projectName,
        workdir: workdir.trim(),
      });
      navigate(`/chat/${result.projectName}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      setIsRedirecting(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-md p-4">
        <h1 className="mb-6 text-center text-3xl font-bold">Projects</h1>
        <div className="flex flex-col space-y-3">
          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : projects?.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No projects yet
            </div>
          ) : (
            projects?.map((project) => (
              <Link
                key={project.name}
                to={`/chat/${encodeURIComponent(project.name)}`}
                className="transition-transform hover:scale-[1.02]"
              >
                <Card className="flex h-12 items-center px-4">
                  <h2 className="text-lg font-semibold">
                    {project.config.name}
                  </h2>
                </Card>
              </Link>
            ))
          )}

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
                    "Create"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
