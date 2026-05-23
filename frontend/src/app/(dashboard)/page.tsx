"use client"

import { useEffect, useState } from "react"
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { zhTW } from "date-fns/locale"
import { Users, Calendar, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"

interface Student {
    id: string
    name: string
    nickname?: string
    active_plan?: string
    remaining_lessons?: number
    status: string
}

interface Event {
    id: string
    title: string
    start_at: string
    student_id?: string
    status: string
}

interface AttendanceRecord {
    id: string
    student_name: string
    check_in_time: string
    status: string
}

interface StatCardProps {
    title: string
    value: string | number
    sub?: string
    icon: React.ReactNode
    color: string
}

function StatCard({ title, value, sub, icon, color }: StatCardProps) {
    return (
        <div className="bg-white rounded-xl border p-5 flex items-start gap-4 shadow-sm">
            <div className={`p-2.5 rounded-lg ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-zinc-500 font-medium">{title}</p>
                <p className="text-2xl font-bold text-zinc-900 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [todayEvents, setTodayEvents] = useState<Event[]>([])
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
    const [monthlyData, setMonthlyData] = useState<{ month: string, 簽到: number }[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            const headers = { Authorization: `Bearer ${token}` }
            const now = new Date()

            try {
                const [studentsRes, eventsRes, attendanceRes] = await Promise.all([
                    axios.get("/api/students", { headers }),
                    axios.get("/api/events", {
                        headers,
                        params: {
                            start: startOfDay(now).toISOString(),
                            end: endOfDay(now).toISOString(),
                        }
                    }),
                    axios.get("/api/attendance", { headers }),
                ])

                setStudents(studentsRes.data)
                setTodayEvents(eventsRes.data.filter((e: Event) => e.status !== "canceled"))
                setAttendance(attendanceRes.data)

                // Build last 6 months chart data
                const months = Array.from({ length: 6 }, (_, i) => {
                    const d = subMonths(now, 5 - i)
                    return {
                        key: format(d, "yyyy-MM"),
                        month: format(d, "M月", { locale: zhTW }),
                        start: startOfMonth(d),
                        end: endOfMonth(d),
                    }
                })
                const chart = months.map(({ key, month, start, end }) => ({
                    month,
                    簽到: attendanceRes.data.filter((a: AttendanceRecord) => {
                        const t = new Date(a.check_in_time)
                        return t >= start && t <= end
                    }).length
                }))
                setMonthlyData(chart)
            } catch (err) {
                console.error("Dashboard load error", err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const activeStudents = students.filter(s => s.status === "active")
    const lowLessonStudents = students.filter(s =>
        s.remaining_lessons !== null &&
        s.remaining_lessons !== undefined &&
        s.remaining_lessons <= 3
    )
    const today = format(new Date(), "yyyy年M月d日 EEEE", { locale: zhTW })

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">儀表板</h1>
                <p className="text-sm text-zinc-500 mt-1">{today}</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="在籍學生"
                    value={activeStudents.length}
                    sub="位有效學員"
                    icon={<Users className="h-5 w-5 text-[#0F1F5C]" />}
                    color="bg-blue-50"
                />
                <StatCard
                    title="今日課程"
                    value={todayEvents.length}
                    sub={todayEvents.length > 0 ? `${format(new Date(todayEvents[0].start_at), "HH:mm")} 開始` : "尚無排程"}
                    icon={<Calendar className="h-5 w-5 text-[#F5A41B]" />}
                    color="bg-orange-50"
                />
                <StatCard
                    title="本月簽到"
                    value={monthlyData[monthlyData.length - 1]?.簽到 ?? 0}
                    sub="次出席記錄"
                    icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                    color="bg-emerald-50"
                />
                <StatCard
                    title="課時即將到期"
                    value={lowLessonStudents.length}
                    sub="剩餘 ≤ 3 堂"
                    icon={<AlertTriangle className="h-5 w-5 text-[#B71C1C]" />}
                    color="bg-red-50"
                />
            </div>

            {/* Two columns: chart + today's schedule */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Monthly Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                        <h2 className="font-semibold text-zinc-800">近 6 個月簽到趨勢</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={monthlyData} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                                cursor={{ fill: "#f5f5ff" }}
                            />
                            <Bar dataKey="簽到" fill="#0F1F5C" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Today's Schedule */}
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        <h2 className="font-semibold text-zinc-800">今日課表</h2>
                    </div>
                    {todayEvents.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-8">今日無排程課程</p>
                    ) : (
                        <div className="space-y-2">
                            {todayEvents.slice(0, 6).map(event => (
                                <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50">
                                    <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded font-semibold w-14 text-center flex-shrink-0">
                                        {format(new Date(event.start_at), "HH:mm")}
                                    </span>
                                    <span className="text-sm text-zinc-700 truncate">{event.title}</span>
                                </div>
                            ))}
                            {todayEvents.length > 6 && (
                                <p className="text-xs text-zinc-400 text-center pt-1">還有 {todayEvents.length - 6} 堂課...</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Low lesson warning */}
            {lowLessonStudents.length > 0 && (
                <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <h2 className="font-semibold text-zinc-800">課時即將到期提醒</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {lowLessonStudents.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                <div>
                                    <p className="font-medium text-sm text-zinc-800">{s.name}</p>
                                    <p className="text-xs text-zinc-500">{s.active_plan ?? "無方案"}</p>
                                </div>
                                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                                    (s.remaining_lessons ?? 0) === 0
                                        ? "bg-red-100 text-red-600"
                                        : "bg-amber-100 text-amber-700"
                                }`}>
                                    剩 {s.remaining_lessons} 堂
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
