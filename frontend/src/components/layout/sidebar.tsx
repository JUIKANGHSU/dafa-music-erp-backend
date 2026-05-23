"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Calendar,
    GraduationCap,
    LayoutDashboard,
    Music2,
    Users,
    CheckCircle2,
    LogOut,
    BarChart3,
} from "lucide-react"

const routes = [
    { label: "儀表板", icon: LayoutDashboard, href: "/" },
    { label: "學生管理", icon: Users, href: "/students" },
    { label: "教師管理", icon: GraduationCap, href: "/teachers" },
    { label: "課程行事曆", icon: Calendar, href: "/calendar" },
    { label: "課程方案", icon: Music2, href: "/plans" },
    { label: "學生簽到", icon: CheckCircle2, href: "/checkin" },
    { label: "月報表", icon: BarChart3, href: "/reports" },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = () => {
        localStorage.removeItem("token")
        router.push("/login")
    }

    return (
        <div className="flex flex-col h-full bg-zinc-900 text-white">
            {/* Logo */}
            <div className="px-4 py-5 border-b border-zinc-800">
                <Link href="/" className="flex items-center gap-3">
                    <div className="relative w-8 h-8 flex-shrink-0">
                        <Music2 className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <p className="font-bold text-white text-sm leading-tight">大發音樂</p>
                        <p className="text-zinc-400 text-xs">Discover Music ERP</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {routes.map((route) => {
                    const isActive = route.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(route.href)
                    return (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                isActive
                                    ? "bg-indigo-600 text-white"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                            )}
                        >
                            <route.icon className="h-4 w-4 flex-shrink-0" />
                            {route.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout */}
            <div className="px-3 py-4 border-t border-zinc-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all w-full"
                >
                    <LogOut className="h-4 w-4" />
                    登出
                </button>
            </div>
        </div>
    )
}
