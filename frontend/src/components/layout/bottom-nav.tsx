"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, CheckCircle2, Calendar, GraduationCap, BookOpen, BarChart3, LogOut, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const mainTabs = [
    { label: "儀表板", icon: LayoutDashboard, href: "/" },
    { label: "學生", icon: Users, href: "/students" },
    { label: "簽到", icon: CheckCircle2, href: "/checkin" },
    { label: "行事曆", icon: Calendar, href: "/calendar" },
]

const moreItems = [
    { label: "教師管理", icon: GraduationCap, href: "/teachers" },
    { label: "課程方案", icon: BookOpen, href: "/plans" },
    { label: "月報表", icon: BarChart3, href: "/reports" },
]

const ACCENT = "#F5A41B"
const NAVY = "#0F1F5C"

export function BottomNav() {
    const pathname = usePathname()
    const router = useRouter()
    const [showMore, setShowMore] = useState(false)

    const isMoreActive = moreItems.some(m => pathname.startsWith(m.href))

    const handleLogout = () => {
        localStorage.removeItem("token")
        router.push("/login")
    }

    return (
        <>
            {/* Overlay */}
            {showMore && (
                <div
                    className="fixed inset-0 z-40 bg-black/40"
                    onClick={() => setShowMore(false)}
                />
            )}

            {/* More popup menu */}
            {showMore && (
                <div className="fixed bottom-20 right-3 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 w-52 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">其他功能</span>
                        <button onClick={() => setShowMore(false)}>
                            <X className="h-4 w-4 text-gray-400" />
                        </button>
                    </div>
                    {moreItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setShowMore(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors",
                                pathname.startsWith(item.href)
                                    ? "text-[#0F1F5C] bg-orange-50"
                                    : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <item.icon className="h-4 w-4" style={{ color: pathname.startsWith(item.href) ? ACCENT : "#9ca3af" }} />
                            {item.label}
                        </Link>
                    ))}
                    <div className="border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-500 hover:bg-red-50 w-full"
                        >
                            <LogOut className="h-4 w-4" />
                            登出
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Tab Bar */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                <div className="flex items-stretch h-16 max-w-lg mx-auto">
                    {mainTabs.map((tab) => {
                        const isActive = tab.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(tab.href)
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className="flex-1 flex flex-col items-center justify-center gap-1"
                            >
                                <tab.icon
                                    className="h-5 w-5"
                                    style={{ color: isActive ? ACCENT : "#9ca3af" }}
                                />
                                <span
                                    className="text-xs font-medium"
                                    style={{ color: isActive ? NAVY : "#9ca3af" }}
                                >
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <span
                                        className="absolute bottom-0 h-0.5 w-8 rounded-full"
                                        style={{ backgroundColor: ACCENT }}
                                    />
                                )}
                            </Link>
                        )
                    })}

                    {/* 更多 button */}
                    <button
                        onClick={() => setShowMore(v => !v)}
                        className="flex-1 flex flex-col items-center justify-center gap-1"
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                            showMore || isMoreActive ? "bg-orange-100" : "bg-transparent"
                        )}>
                            <span className="text-lg font-bold leading-none" style={{ color: showMore || isMoreActive ? ACCENT : "#9ca3af" }}>
                                ···
                            </span>
                        </div>
                        <span
                            className="text-xs font-medium"
                            style={{ color: showMore || isMoreActive ? NAVY : "#9ca3af" }}
                        >
                            更多
                        </span>
                    </button>
                </div>
            </nav>
        </>
    )
}
