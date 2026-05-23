"use client"

import { usePathname } from "next/navigation"
import Image from "next/image"

const pageTitles: Record<string, string> = {
    "/": "儀表板",
    "/students": "學生管理",
    "/teachers": "教師管理",
    "/calendar": "課程行事曆",
    "/plans": "課程方案",
    "/checkin": "學生簽到",
    "/reports": "月報表",
}

export function TopBar() {
    const pathname = usePathname()
    const title = Object.entries(pageTitles).findLast(([key]) => pathname.startsWith(key))?.[1] ?? ""

    return (
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm"
            style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <div className="flex items-center gap-3 px-4 h-14">
                <Image
                    src="/logo.png"
                    alt="大發音樂"
                    width={80}
                    height={32}
                    className="object-contain"
                    priority
                />
                {title && (
                    <>
                        <div className="w-px h-5 bg-gray-200" />
                        <span className="text-sm font-semibold text-gray-700">{title}</span>
                    </>
                )}
            </div>
        </header>
    )
}
