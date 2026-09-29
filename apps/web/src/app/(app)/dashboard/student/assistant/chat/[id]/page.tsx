import { AssistantPageClient } from "../../_components/assistant-page-client";

export default async function AssistantChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssistantPageClient initialSessionId={id} />;
}
