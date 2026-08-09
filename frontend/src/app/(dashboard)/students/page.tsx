"use client"

import { useEffect, useState, useMemo } from "react"
import { columns, Student } from "@/components/students/columns"
import { DataTable } from "@/components/students/data-table"
import { StudentDialog } from "@/components/students/student-dialog"
import { AssignPlanDialog } from "@/components/students/assign-plan-dialog"
import { ManagePackagesDialog } from "@/components/students/manage-packages-dialog"
import { Loader2, Phone, MoreHorizontal, Search, LayoutGrid, CalendarDays, BellRing, Archive, RotateCcw, Trash2 } from "lucide-react"
import { useIsMobile } from "@/lib/use-is-mobile"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

const WEEKDAYS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"]
const COLORS = [
    "bg-[#0F1F5C]", "bg-[#F5A41B]", "bg-[#B71C1C]",
    "bg-emerald-600", "bg-violet-600", "bg-pink-600"
]

function getColor(name: string) {
    return COLORS[name.charCodeAt(0) % COLORS.length]
}

function StudentCard({ student, size = "md" }: { student: Student, size?: "sm" | "md" }) {
    const { toast } = useToast()
    const initials = student.name.slice(0, 2)
    const isLow = (student.remaining_lessons ?? 99) <= 3
    const isLastLesson = (student.remaining_lessons ?? 99) <= 1
    const color = getColor(student.name)

    async function sendReminder() {
        const { default: axios } = await import("axios")
        const token = localStorage.getItem("token")
        try {
            await axios.post(`/api/students/${student.id}/send-payment-reminder`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast({ title: "已傳送繳費提醒", description: `LINE 訊息已發送給 ${student.name}` })
        } catch (err: any) {
            toast({
                title: "傳送失敗",
                description: err.response?.data?.detail ?? "請確認學生已設定 LINE ID",
                variant: "destructive"
            })
        }
    }

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className={`${color} flex items-center justify-center ${size === "sm" ? "h-16" : "h-24"}`}>
                <span className={`font-bold text-white ${size === "sm" ? "text-xl" : "text-3xl"}`}>{initials}</span>
            </div>
            <div className="p-3">
                <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 truncate text-sm">{student.name}</p>
                        {student.nickname && <p className="text-xs text-zinc-400 truncate">「{student.nickname}」</p>}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${student.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {student.status === "active" ? "啟用" : "停用"}
                    </span>
                </div>
                {size !== "sm" && (
                    <p className="flex items-center gap-1 mt-1.5 text-xs text-zinc-500">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{student.phone}</span>
                    </p>
                )}
                <div className="mt-2 pt-2 border-t border-gray-100">
                    {student.active_plan ? (
                        <div className="flex items-center justify-between gap-1">
                            <p className="text-xs text-zinc-500 truncate">{student.active_plan}</p>
                            <p className={`text-xs font-bold flex-shrink-0 ${isLow ? "text-red-500" : "text-emerald-600"}`}>
                                剩{student.remaining_lessons}堂
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-400">尚無課程</p>
                    )}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger className="mt-2.5 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-zinc-500 font-medium transition-colors">
                        <MoreHorizontal className="h-3.5 w-3.5" /> 操作
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={e => e.preventDefault()}>
                            <StudentDialog student={student} trigger={<div className="w-full">編輯基本資料</div>} />
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={e => e.preventDefault()}>
                            <AssignPlanDialog studentId={student.id} studentName={student.name} trigger={<div className="w-full">報名課程</div>} />
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={e => e.preventDefault()}>
                            <ManagePackagesDialog studentId={student.id} studentName={student.name} trigger={<div className="w-full">管理課程</div>} />
                        </DropdownMenuItem>
                        {isLastLesson && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-amber-600 font-medium flex items-center gap-2"
                                    onSelect={sendReminder}
                                >
                                    <BellRing className="h-3.5 w-3.5" />
                                    傳送繳費提醒
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}

function ArchivedStudentCard({ student, onRestored, onDeleted }: { student: Student, onRestored: () => void, onDeleted: () => void }) {
    const { toast } = useToast()
    const initials = student.name.slice(0, 2)
    const [busy, setBusy] = useState(false)

    async function restore() {
        setBusy(true)
        try {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            await axios.patch(`/api/students/${student.id}`, { status: "active" }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast({ title: "已恢復在籍", description: `${student.name} 已移回學生列表` })
            onRestored()
        } catch (err: any) {
            toast({ title: "恢復失敗", description: err.response?.data?.detail ?? "請稍後再試", variant: "destructive" })
        } finally {
            setBusy(false)
        }
    }

    async function permanentDelete() {
        if (!confirm(`確定要永久刪除「${student.name}」嗎？這會一併刪除他的課程包、繳費與簽到紀錄，此動作無法復原。`)) return
        setBusy(true)
        try {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            await axios.delete(`/api/students/${student.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast({ title: "已永久刪除", description: `${student.name} 的所有資料已刪除` })
            onDeleted()
        } catch (err: any) {
            toast({ title: "刪除失敗", description: err.response?.data?.detail ?? "請稍後再試", variant: "destructive" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden opacity-80">
            <div className="bg-gray-300 flex items-center justify-center h-16">
                <span className="font-bold text-white text-xl">{initials}</span>
            </div>
            <div className="p-3">
                <p className="font-semibold text-zinc-900 truncate text-sm">{student.name}</p>
                {student.nickname && <p className="text-xs text-zinc-400 truncate">「{student.nickname}」</p>}
                <p className="flex items-center gap-1 mt-1.5 text-xs text-zinc-500">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{student.phone}</span>
                </p>
                <div className="mt-2.5 flex gap-1.5">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" disabled={busy} onClick={restore}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> 恢復在籍
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 text-xs" disabled={busy} onClick={permanentDelete}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function StudentsPage() {
    const [data, setData] = useState<Student[]>([])
    const [events, setEvents] = useState<{ student_id: string, start_at: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [view, setView] = useState<"all" | "byDay" | "archived">("all")
    const [archivedData, setArchivedData] = useState<Student[]>([])
    const [archivedLoading, setArchivedLoading] = useState(false)
    const isMobile = useIsMobile()

    useEffect(() => {
        const load = async () => {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            const headers = { Authorization: `Bearer ${token}` }
            try {
                const past = new Date("2020-01-01")
                const future = new Date("2030-01-01")
                const [stuRes, evtRes] = await Promise.all([
                    axios.get("/api/students/", { headers }),
                    axios.get("/api/events", {
                        headers,
                        params: { start: past.toISOString(), end: future.toISOString() }
                    })
                ])
                setData(stuRes.data)
                setEvents(evtRes.data.filter((e: any) => e.student_id && e.status !== "canceled"))
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const fetchArchived = async () => {
        setArchivedLoading(true)
        try {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            const res = await axios.get("/api/students/", {
                headers: { Authorization: `Bearer ${token}` },
                params: { status: "archived" }
            })
            setArchivedData(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setArchivedLoading(false)
        }
    }

    const switchView = (v: "all" | "byDay" | "archived") => {
        setView(v)
        if (v === "archived") fetchArchived()
    }

    // Map studentId → set of weekday indices (0=Mon ... 6=Sun)
    const studentDayMap = useMemo(() => {
        const map = new Map<string, Set<number>>()
        events.forEach(e => {
            const dow = (new Date(e.start_at).getDay() + 6) % 7 // convert Sun=0 to Mon=0
            if (!map.has(e.student_id)) map.set(e.student_id, new Set())
            map.get(e.student_id)!.add(dow)
        })
        return map
    }, [events])

    const filtered = useMemo(() =>
        data.filter(s =>
            s.name.includes(search) ||
            (s.nickname ?? "").includes(search) ||
            s.phone.includes(search)
        ), [data, search])

    const cols = isMobile ? "grid-cols-2" : "grid-cols-3 xl:grid-cols-4"

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900">學生管理</h2>
                    <p className="text-sm text-zinc-500">共 {data.length} 位學員</p>
                </div>
                <StudentDialog />
            </div>

            {/* Search + View toggle */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="搜尋姓名、暱稱、電話..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A41B]/40"
                    />
                </div>
                <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <button
                        onClick={() => switchView("all")}
                        className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === "all" ? "bg-[#0F1F5C] text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        {!isMobile && "全部"}
                    </button>
                    <button
                        onClick={() => switchView("byDay")}
                        className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === "byDay" ? "bg-[#0F1F5C] text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        <CalendarDays className="h-3.5 w-3.5" />
                        {!isMobile && "依星期"}
                    </button>
                    <button
                        onClick={() => switchView("archived")}
                        className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === "archived" ? "bg-[#0F1F5C] text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        <Archive className="h-3.5 w-3.5" />
                        {!isMobile && "非在籍"}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
                </div>
            ) : view === "all" ? (
                <div className={`grid ${cols} gap-3`}>
                    {filtered.map(s => <StudentCard key={s.id} student={s} />)}
                    {filtered.length === 0 && (
                        <p className="col-span-full text-center text-sm text-zinc-400 py-12">找不到符合的學生</p>
                    )}
                </div>
            ) : view === "archived" ? (
                archivedLoading ? (
                    <div className="flex h-40 items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className={`grid ${cols} gap-3`}>
                        {archivedData.map(s => (
                            <ArchivedStudentCard
                                key={s.id}
                                student={s}
                                onRestored={fetchArchived}
                                onDeleted={fetchArchived}
                            />
                        ))}
                        {archivedData.length === 0 && (
                            <p className="col-span-full text-center text-sm text-zinc-400 py-12">目前沒有非在籍的學生</p>
                        )}
                    </div>
                )
            ) : (
                <div className="space-y-6">
                    {WEEKDAYS.map((day, idx) => {
                        const dayStudents = filtered.filter(s => studentDayMap.get(s.id)?.has(idx))
                        if (dayStudents.length === 0) return null
                        return (
                            <div key={day}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-bold text-white bg-[#0F1F5C] px-3 py-1 rounded-full">{day}</span>
                                    <span className="text-xs text-zinc-400">{dayStudents.length} 位學生</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>
                                <div className={`grid ${cols} gap-3`}>
                                    {dayStudents.map(s => <StudentCard key={s.id} student={s} size={isMobile ? "sm" : "md"} />)}
                                </div>
                            </div>
                        )
                    })}

                    {/* 未排課學生 */}
                    {(() => {
                        const unscheduled = filtered.filter(s => !studentDayMap.has(s.id))
                        if (unscheduled.length === 0) return null
                        return (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-bold text-white bg-gray-400 px-3 py-1 rounded-full">未排課</span>
                                    <span className="text-xs text-zinc-400">{unscheduled.length} 位學生</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>
                                <div className={`grid ${cols} gap-3`}>
                                    {unscheduled.map(s => <StudentCard key={s.id} student={s} size={isMobile ? "sm" : "md"} />)}
                                </div>
                            </div>
                        )
                    })()}
                </div>
            )}
        </div>
    )
}
