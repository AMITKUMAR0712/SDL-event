import { BackButton } from "@/components/shared/back-button";
import { type DashboardLink, DashboardSidebar } from "@/components/shared/dashboard-sidebar";

const LINKS: DashboardLink[] = [
  { href: "/dashboard/vendor", label: "Dashboard", icon: "gauge" },
  { href: "/dashboard/vendor/bookings", label: "Bookings", icon: "calendar" },
  { href: "/dashboard/vendor/profile", label: "My Profile", icon: "user" },
  { href: "/dashboard/vendor/contact", label: "Contact Us", icon: "message" },
];

export default function VendorDashboardLayout({ children }: LayoutProps<"/dashboard/vendor">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <DashboardSidebar title="Vendor" links={LINKS} />
      <div className="min-w-0 flex-1">
        <div className="px-6 pt-4">
          <BackButton />
        </div>
        {children}
      </div>
    </div>
  );
}
