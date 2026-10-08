"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { UserStatusSelect } from "@/components/shared/user-status-select";
import { Button } from "@/components/ui/button";
import { deleteUserAction, deleteUsersAction } from "@/server/actions/admin";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
};

export function UserList({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const selectableIds = users.filter((u) => u.role !== "ADMIN").map((u) => u.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  async function deleteOne(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? They will no longer be able to sign in.`)) return;
    setPending(true);
    const result = await deleteUserAction(id);
    setPending(false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selected.size} user${selected.size > 1 ? "s" : ""}? They will no longer be able to sign in.`,
      )
    ) {
      return;
    }
    setPending(true);
    const result = await deleteUsersAction(Array.from(selected));
    setPending(false);
    if (result.ok) {
      setSelected(new Set());
      if (result.data.skipped > 0) {
        window.alert(`Deleted ${result.data.deleted}, skipped ${result.data.skipped}.`);
      }
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 py-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={selectableIds.length === 0}
            className="size-4"
          />
          Select all
        </label>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={selected.size === 0 || pending}
          onClick={deleteSelected}
        >
          Delete selected ({selected.size})
        </Button>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {users.map((u) => {
          const isAdmin = u.role === "ADMIN";
          return (
            <div key={u.id} className="flex items-center gap-3 p-3 text-sm">
              <input
                type="checkbox"
                checked={selected.has(u.id)}
                onChange={() => toggle(u.id)}
                disabled={isAdmin}
                className="size-4"
              />
              <div className="flex-1">
                <p className="font-medium">{u.name ?? "—"}</p>
                <p className="text-muted-foreground">
                  {u.email ?? u.phone} · {u.role}
                </p>
              </div>
              <UserStatusSelect userId={u.id} status={u.status} />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isAdmin || pending}
                onClick={() => deleteOne(u.id, u.name ?? u.email ?? u.phone ?? "this user")}
              >
                Delete
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
