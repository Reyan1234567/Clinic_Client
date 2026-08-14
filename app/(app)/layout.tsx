import { RequireAuth } from "@/components/layout/require-auth";
import { Header } from "@/components/layout/header";
import { PageTransition } from "@/components/layout/page-transition";
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex h-svh overflow-hidden">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
