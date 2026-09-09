"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/console/console-shell";
import { CommandPalette } from "@/components/console/command-palette";
import { useLeaveRequests } from "@/components/console/data";
import "./console.css";

// Same admin cookie gate as the legacy panel — /console needs no separate
// login. Unauthenticated users are bounced to the existing /admin/login.
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ambient blob parallax — the field leans gently away from the cursor.
  const blobFieldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = blobFieldRef.current;
        if (!el) return;
        const dx = e.clientX / window.innerWidth - 0.5;
        const dy = e.clientY / window.innerHeight - 0.5;
        el.style.setProperty("--blob-px", `${(dx * -22).toFixed(1)}px`);
        el.style.setProperty("--blob-py", `${(dy * -16).toFixed(1)}px`);
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/check-auth");
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [router]);

  // Sidebar badge — pending leave queue depth.
  const pending = useLeaveRequests("pending");

  if (isLoading) {
    return (
      <div className="main-typography flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="main-typography console-root relative min-h-screen">
      <div ref={blobFieldRef} className="ambient-blobs" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="relative z-10">
        <ConsoleShell
          counts={{ leave: pending.data?.leaveRequests?.length ?? 0 }}
        >
          {children}
        </ConsoleShell>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
