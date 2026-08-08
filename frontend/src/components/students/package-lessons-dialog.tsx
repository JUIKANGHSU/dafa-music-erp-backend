"use client"

import { useState, useEffect, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface Lesson {
    id: string
    start_at: string
    end_at: string
    status: string
    note?: string
    checked_in: boolean
    check_in_time?: string
}

interface PackageLessonsDialogProps {
    studentId: string
    packageId: string
    totalLessons: number
    label?: string
    trigger?: React.ReactNode
}

export function PackageLessonsDialog({ studentId, packageId, totalLessons, label, trigger }: PackageLessonsDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [lessons, setLessons] = useState<Lesson[]>([])

    useEffect(() => {
        if (!open) return
        const fetchLessons = async () => {
            setLoading(true)
            try {
                const { default: axios } = await import("axios")
                const token = localStorage.getItem("token")
                const res = await axios.get(
                    `/api/students/${studentId}/packages/${packageId}/lessons`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                setLessons(res.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchLessons()
    }, [open, studentId, packageId])

    const summary = useMemo(() => {
        // 請假會把原堂標記成 canceled 並在課表最後補一堂，兩者是同一堂課的紀錄，
        // 所以「總堂數」要用購買數 total_lessons，不能直接算 lessons.length。
        const active = lessons.filter(l => l.status !== "canceled")
        const checkedIn = active.filter(l => l.checked_in).length
        const upcoming = active.length - checkedIn
        const leave = lessons.filter(l => l.status === "canceled").length
        return { total: totalLessons, checkedIn, leave, upcoming }
    }, [lessons, totalLessons])

    const lessonStatus = (lesson: Lesson) => {
        if (lesson.checked_in) {
            return { text: "已簽到", className: "bg-emerald-100 text-emerald-700" }
        }
        if (lesson.status === "canceled") {
            return { text: "請假", className: "bg-amber-100 text-amber-700" }
        }
        return { text: "未上課", className: "bg-gray-100 text-gray-500" }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : <Button variant="ghost" size="sm">紀錄</Button>}
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>上課紀錄{label ? ` — ${label}` : ""}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : lessons.length === 0 ? (
                    <p className="text-center text-sm text-zinc-400 py-8">尚無排課紀錄</p>
                ) : (
                    <div className="space-y-3">
                        <div className="text-sm text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2">
                            本期共 {summary.total} 堂．已簽到 {summary.checkedIn}．尚未上課 {summary.upcoming}
                            {summary.leave > 0 && `（另有請假並改期 ${summary.leave} 次，不計入總堂數）`}
                        </div>
                        <div className="space-y-2">
                            {lessons.map((lesson) => {
                                const s = lessonStatus(lesson)
                                return (
                                    <div key={lesson.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                        <div>
                                            <div className="text-sm font-medium">
                                                {format(new Date(lesson.start_at), "M/d (EEE) HH:mm", { locale: zhTW })}
                                            </div>
                                            {lesson.checked_in && lesson.check_in_time && (
                                                <div className="text-xs text-zinc-400">
                                                    簽到時間：{format(new Date(lesson.check_in_time), "HH:mm")}
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>
                                            {s.text}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
