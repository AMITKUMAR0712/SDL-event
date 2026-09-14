import { AdminSidebar } from "@/components/shared/admin-sidebar";
import { BackButton } from "@/components/shared/back-button";

export default function AdminLayout({ children }: LayoutProps<"/dashboard/admin">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <div className="px-6 pt-4">
          <BackButton />
        </div>
        {children}
      </div>
    </div>
  );
}
