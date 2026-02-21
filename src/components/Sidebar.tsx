"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    TrendingUp,
    Briefcase,
    Newspaper,
    Settings,
    ChevronLeft,
    ChevronRight,
    Zap,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/" },
    { icon: <TrendingUp size={20} />, label: "Markets", href: "/markets" },
    { icon: <Briefcase size={20} />, label: "Portfolio", href: "/portfolio" },
    { icon: <Newspaper size={20} />, label: "News", href: "/news" },
    { icon: <Settings size={20} />, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    return (
        <aside
            className={clsx(
                "relative flex flex-col border-r transition-all duration-300 shrink-0",
                "border-[#1e2d45] bg-[#0f1629]",
                collapsed ? "w-16" : "w-56"
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1e2d45]">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 shrink-0">
                    <Zap size={16} className="text-white" />
                </div>
                {!collapsed && (
                    <span className="font-bold text-lg tracking-tight text-white">
                        Trade<span className="text-cyan-400">Pulse</span>
                    </span>
                )}
            </div>

            {/* Nav Items */}
            <nav className="flex flex-col gap-1 p-2 flex-1 mt-2">
                {navItems.map((item) => {
                    const isActive =
                        item.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={clsx(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                                isActive
                                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                    : "text-[#94a3b8] hover:bg-[#1a2235] hover:text-white"
                            )}
                        >
                            <span className="shrink-0">{item.icon}</span>
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed((c) => !c)}
                className="absolute -right-3 top-20 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-[#1e2d45] border border-[#1e2d45] text-[#94a3b8] hover:text-white transition-colors"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>

            {/* Footer */}
            {!collapsed && (
                <div className="p-4 border-t border-[#1e2d45]">
                    <div className="flex items-center gap-2 text-xs text-[#475569]">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
                        Market data streaming
                    </div>
                </div>
            )}
        </aside>
    );
}
