"use client"

import { useState, useEffect, useMemo } from "react"
import { CheckCircle2, Search, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Student {
    id: string
    name: string
    nickname?: string
    phone: string
}

interface Event {
    id: string
    title: string
    start_at: string
    end_at: string
    student_id?: string
    status: string
}

export default function CheckInPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [events, setEvents] = useState<Event[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(false)
    const [checkingIn, setCheckingIn] = useState<string | null>(null)
    const { toast } = useToast()

    // Date & View State
    const [date, setDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<"day" | "week">("day")

    // 1. Fetch Students (Once)
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const token = localStorage.getItem("token")
                const { default: axios } = await import("axios")
                const res = await axios.get("/api/students", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setStudents(res.data)
            } catch (error) {
                console.error("Failed to fetch students", error)
            }
        }
        fetchStudents()
    }, [])

    // 2. Fetch Events (When date or viewMode changes)
    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true)
            try {
                const token = localStorage.getItem("token")
                const { default: axios } = await import("axios")

                let start, end
                if (viewMode === "day") {
                    start = startOfDay(date)
                    end = endOfDay(date)
                } else {
                    // Start week on Monday (1)
                    start = startOfWeek(date, { weekStartsOn: 1 })
                    end = endOfWeek(date, { weekStartsOn: 1 })
                }

                const res = await axios.get("/api/events", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        start: start.toISOString(),
                        end: end.toISOString()
                    }
                })
                // Filter out canceled events just in case, though API does it
                setEvents(res.data.filter((e: Event) => e.status !== "canceled"))
            } catch (error) {
                console.error("Failed to fetch events", error)
                toast({
                    title: "載入課程失敗",
                    description: "無法取得課程資料",
                    variant: "destructive"
                })
            } finally {
                setLoading(false)
            }
        }
        fetchEvents()
    }, [date, viewMode])

    // 3. Map Events to Students and Filter
    const displayItems = useMemo(() => {
        // Create a map for quick student lookup
        const studentMap = new Map(students.map(s => [s.id, s]))

        // Map events to display objects
        const items = events.map(event => {
            if (!event.student_id) return null
            const student = studentMap.get(event.student_id)
            if (!student) return null

            return {
                event,
                student
            }
        }).filter(item => item !== null) as { event: Event, student: Student }[]

        // Filter by search term
        if (!searchTerm) return items.sort((a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime())

        return items.filter(item =>
            item.student.name.includes(searchTerm) ||
            (item.student.nickname && item.student.nickname.includes(searchTerm)) ||
            item.student.phone.includes(searchTerm)
        ).sort((a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime())

    }, [events, students, searchTerm])

    const handleCheckIn = async (studentId: string) => {
        setCheckingIn(studentId)
        try {
            const token = localStorage.getItem("token")
            const { default: axios } = await import("axios")

            const res = await axios.post("/api/attendance/check-in",
                { student_id: studentId },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { student_id: studentId }
                }
            )

            const { message } = res.data

            toast({
                title: "打卡成功",
                description: message,
                duration: 3000,
            })

        } catch (error: any) {
            console.error(error)
            toast({
                title: "打卡失敗",
                description: error.response?.data?.detail || "請稍後再試",
                variant: "destructive",
            })
        } finally {
            setCheckingIn(null)
        }
    }

    const handlePrev = () => {
        if (viewMode === "day") {
            setDate(prev => addDays(prev, -1))
        } else {
            setDate(prev => addDays(prev, -7))
        }
    }

    const handleNext = () => {
        if (viewMode === "day") {
            setDate(prev => addDays(prev, 1))
        } else {
            setDate(prev => addDays(prev, 7))
        }
    }

    const handleToday = () => {
        setDate(new Date())
        setViewMode("day")
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">學生簽到</h2>
                    <p className="text-muted-foreground">
                        {viewMode === "day"
                            ? `顯示 ${format(date, "yyyy/MM/dd (EEEE)", { locale: zhTW })} 的課程`
                            : `顯示 ${format(startOfWeek(date, { weekStartsOn: 1 }), "MM/dd", { locale: zhTW })} - ${format(endOfWeek(date, { weekStartsOn: 1 }), "MM/dd", { locale: zhTW })} 的課程`
                        }
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md bg-background">
                        <Button variant="ghost" size="icon" onClick={handlePrev}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-2 font-medium min-w-[120px] text-center">
                            {viewMode === "day" ? format(date, "yyyy-MM-dd") : "本週"}
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleNext}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button variant="outline" size="sm" onClick={handleToday}>
                        今日
                    </Button>

                    <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/20">
                        <Button
                            variant={viewMode === "day" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("day")}
                            className="text-xs"
                        >
                            日
                        </Button>
                        <Button
                            variant={viewMode === "week" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("week")}
                            className="text-xs"
                        >
                            週
                        </Button>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="搜尋今日學生..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-6">
                    {displayItems.length === 0 ? (
                        <div className="text-center text-muted-foreground p-8 bg-muted/10 rounded-lg border-2 border-dashed">
                            {viewMode === "day" ? "今日沒有排程課程" : "本週沒有排程課程"}
                        </div>
                    ) : (
                        viewMode === "day" ? (
                            // Day View: Flat List
                            <div className="grid gap-4">
                                {displayItems.map(({ event, student }) => (
                                    <StudentCard key={event.id} event={event} student={student} checkingIn={checkingIn} onCheckIn={handleCheckIn} viewMode="day" />
                                ))}
                            </div>
                        ) : (
                            // Week View: Grouped by Day
                            Object.entries(
                                displayItems.reduce((groups, item) => {
                                    const dateKey = format(new Date(item.event.start_at), "yyyy-MM-dd")
                                    if (!groups[dateKey]) groups[dateKey] = []
                                    groups[dateKey].push(item)
                                    return groups
                                }, {} as Record<string, typeof displayItems>)
                            ).sort(([dateA], [dateB]) => dateA.localeCompare(dateB)).map(([dateStr, items]) => (
                                <div key={dateStr} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-1 bg-primary rounded-full" />
                                        <h3 className="font-semibold text-lg">
                                            {format(new Date(dateStr), "yyyy/MM/dd")} ({format(new Date(dateStr), "EEE", { locale: zhTW })})
                                        </h3>
                                    </div>
                                    <div className="grid gap-4">
                                        {items.map(({ event, student }) => (
                                            <StudentCard key={event.id} event={event} student={student} checkingIn={checkingIn} onCheckIn={handleCheckIn} viewMode="week" />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            )}
        </div>
    )
}

function StudentCard({ event, student, checkingIn, onCheckIn, viewMode }: {
    event: Event,
    student: Student,
    checkingIn: string | null,
    onCheckIn: (id: string) => void,
    viewMode: "day" | "week"
}) {
    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-md p-2 min-w-[80px]">
                        <span className="text-xs font-medium uppercase tracking-wider">
                            {format(new Date(event.start_at), "EEE", { locale: zhTW })}
                        </span>
                        <span className="text-xl font-bold">
                            {format(new Date(event.start_at), "HH:mm")}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{student.name}</span>
                            {student.nickname && <span className="text-sm text-muted-foreground">({student.nickname})</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {event.title} • {student.phone}
                        </div>
                    </div>
                </div>

                <Button
                    onClick={() => onCheckIn(student.id)}
                    disabled={checkingIn === student.id}
                    size="lg"
                    className={cn(checkingIn === student.id ? "opacity-100" : "", "min-w-[120px]")}
                >
                    {checkingIn === student.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            簽到
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
