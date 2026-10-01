import { BottomNavBar } from "@/components/shared/bottom-nav-bar";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      <BottomNavBar />
    </>
  );
}
