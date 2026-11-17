"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/timetable", label: "시간표" },
  { href: "/hours", label: "시수" },
  { href: "/progress", label: "진도" },
  { href: "/assessments", label: "평가" },
  { href: "/settings/school", label: "설정" },
];

/** 상단 메뉴. 현재 화면을 강조한다. */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="주 메뉴" className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              isActive ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
