import { BackButton } from "@/components/shared/back-button";
import { type DashboardLink, DashboardSidebar } from "@/components/shared/dashboard-sidebar";

const LINKS: DashboardLink[] = [
  { href: "/dashboard/banquet", label: "Dashboard", icon: "gauge" },
  { href: "/dashboard/banquet/bookings", label: "Bookings", icon: "calendar" },
  { href: "/dashboard/banquet/profile", label: "My Profile", icon: "user" },
  { href: "/dashboard/banquet/contact", label: "Contact Us", icon: "message" },
];

export default function BanquetDashboardLayout({ children }: LayoutProps<"/dashboard/banquet">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <DashboardSidebar title="Banquet" links={LINKS} />
      <div className="min-w-0 flex-1">
        <div className="px-6 pt-4">
          <BackButton />
        </div>
        {children}
      </div>
    </div>
  );
}
