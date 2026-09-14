import { DeleteMessageButton } from "@/components/shared/delete-message-button";
import { listContactMessages } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await listContactMessages();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-heading text-3xl">Contact messages</h1>
      <p className="mt-2 text-muted-foreground">
        Submissions from the public Contact Us form. Each one is also emailed directly.
      </p>
      <div className="mt-6 divide-y divide-border rounded-lg border border-border">
        {messages.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No messages yet.</p>
        )}
        {messages.slice(0, 50).map((m) => (
          <div key={m.id} className="p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {m.name} · {m.email}
                {m.phone && ` · ${m.phone}`}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </span>
                <DeleteMessageButton id={m.id} />
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{m.message}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
