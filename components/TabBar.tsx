"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "今日", icon: "M12 4v2m0 12v2m8-8h-2M6 12H4m13.66-5.66-1.42 1.42M7.76 16.24l-1.42 1.42m0-11.32 1.42 1.42m8.48 8.48 1.42 1.42M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" },
  { href: "/reports", label: "报告", icon: "M6 4h9l3 3v13H6zM9 10h6M9 14h6M9 18h3" },
  { href: "/chat", label: "问事", icon: "M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 4v-4h0A2 2 0 0 1 5 14Z" },
  { href: "/divine", label: "占卦", icon: "M5 7h14M5 12h5m4 0h5M5 17h14" },
  { href: "/me", label: "档案", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" },
];

export const TAB_PATHS = TABS.map((t) => t.href);

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line/70 bg-paper/85 backdrop-blur-xl">
      <div className="flex h-[58px]">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] transition ${active ? "text-ink" : "text-muted"}`}
            >
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={active ? 1.9 : 1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
