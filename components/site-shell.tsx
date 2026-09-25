"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, CalendarDays, Home, Images, MapPinned, Settings2, Sprout } from "lucide-react";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Trang chính", icon: Home },
  { href: "/album", label: "Album", icon: Images },
  { href: "/calendar", label: "Lịch", icon: CalendarDays },
  { href: "/map", label: "Bản đồ", icon: MapPinned },
  { href: "/garden", label: "Khu vườn", icon: Sprout },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="site-frame">
      <aside className="sidebar" aria-label="Điều hướng chính">
        <Link className="brand brand-sidebar" href="/" aria-label="Cuốn Sổ tình iu — Trang chính">
          <span className="brand-mark"><BookHeart size={24} strokeWidth={1.8} /></span>
          <span>Cuốn Sổ<br />tình iu</span>
        </Link>
        <nav className="sidebar-nav" aria-label="Các trang">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link${pathname === href ? " active" : ""}`} aria-current={pathname === href ? "page" : undefined}>
              <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <Link href="/settings" className={`nav-link settings-link${pathname === "/settings" ? " active" : ""}`} aria-current={pathname === "/settings" ? "page" : undefined}>
          <Settings2 size={19} strokeWidth={1.8} /><span>Cài đặt</span>
        </Link>
      </aside>

      <div className="app-column">
        <header className="mobile-header">
          <Link className="brand" href="/" aria-label="Cuốn Sổ tình iu — Trang chính">
            <span className="brand-mark"><BookHeart size={20} strokeWidth={1.8} /></span>
            <span>Cuốn Sổ tình iu</span>
          </Link>
          <Link className="icon-link" href="/settings" aria-label="Cài đặt"><Settings2 size={21} /></Link>
        </header>
        <main id="noi-dung" className="site-content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Điều hướng điện thoại">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`bottom-nav-link${pathname === href ? " active" : ""}`} aria-current={pathname === href ? "page" : undefined}>
            <Icon size={21} strokeWidth={pathname === href ? 2.2 : 1.8} /><span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
