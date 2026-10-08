import { UserList } from "@/components/shared/user-list";
import { listUsers } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl">Users</h1>
      <div className="mt-6">
        <UserList users={users.slice(0, 50)} />
      </div>
    </main>
  );
}
