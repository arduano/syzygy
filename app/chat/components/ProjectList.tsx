import { Card } from "@/components/ui/card.tsx";
import { Loader } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/utils/trpc.ts";

export function ProjectList() {
  const { data: projects, isLoading } = trpc.listProjects.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {projects?.map((project) => (
        <Link
          key={project.name}
          href={`/chat/${encodeURIComponent(project.name)}`}
          className="transition-transform hover:scale-[1.02]"
        >
          <Card className="flex h-12 items-center px-4">
            <h2 className="text-lg font-semibold">{project.config.name}</h2>
          </Card>
        </Link>
      ))}
    </>
  );
}
