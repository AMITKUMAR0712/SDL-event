import { UserStatusSelect } from "@/components/shared/user-status-select";
import { listUsers } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl">Users</h1>
      <div className="mt-6 divide-y divide-border rounded-lg border border-border">
        {users.slice(0, 50).map((u) => (
          <div key={u.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <p className="font-medium">{u.name ?? "—"}</p>
              <p className="text-muted-foreground">
                {u.email ?? u.phone} · {u.role}
              </p>
            </div>
            <UserStatusSelect userId={u.id} status={u.status} />
          </div>
        ))}
      </div>
    </main>
  );
}
