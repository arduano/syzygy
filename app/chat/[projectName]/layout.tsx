"use client";

import { Chat } from "./Chat.tsx";
import { useParams, useRouter } from "next/navigation";

export default function ProjectLayout() {
  const params = useParams();
  const id = params.chatId as string | undefined;
  const projectName = params.projectName as string;

  const router = useRouter();

  return (
    <main className="h-screen bg-background">
      <Chat
        id={id}
        projectName={projectName}
        onUpdateConversationId={(id) => router.push(`/chat/${id}`)}
        extraArgs={{ projectName }}
      />
    </main>
  );
}
