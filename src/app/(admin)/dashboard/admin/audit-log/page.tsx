import { listAuditLog } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage() {
  const logs = await listAuditLog();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-heading text-3xl">Audit log</h1>
      <div className="mt-6 divide-y divide-border rounded-lg border border-border">
        {logs.slice(0, 50).map((l) => (
          <div key={l.id} className="p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{l.action}</span>
              <span className="text-muted-foreground">
                {new Date(l.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </span>
            </div>
            <p className="text-muted-foreground">
              {l.actor?.name ?? l.actor?.email ?? "system"} · {l.entityType}:{l.entityId}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
