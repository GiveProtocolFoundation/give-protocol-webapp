import React from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

interface AdminShellProps {
  children: React.ReactNode;
}

/**
 * Operations shell for the admin console: a fixed sidebar plus a scrolling main
 * column with a sticky top bar. Existing admin pages render inside `children`
 * with their data fetching, auth guards, and mutations untouched.
 */
export function AdminShell({ children }: AdminShellProps): React.ReactElement {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6f5] font-display text-[#16201c]">
      <AdminSidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <AdminTopbar />
        {children}
      </main>
    </div>
  );
}
