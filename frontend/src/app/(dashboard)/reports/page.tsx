"use client"

import { useEffect, useState } from "react"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend
} from "recharts"
import { BarChart3, Users, CheckCircle2, TrendingUp } from "lucide-react"

interface AttendanceRecord {
    id: string
    student_name: string
    check_in_time: string
    status: string
}

interface Student {
    id: string
    name: string
    status: string
    created_at: string
}

export default function ReportsPage() {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"))

    useEffect(() => {
        const load = async () => {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            const headers = { Authorization: `Bearer ${token}` }
            try {
                const [attRes, stuRes] = await Promise.all([
                    axios.get("/api/attendance", { headers }),
                    axios.get("/api/students", { headers }),
                ])
                setAttendance(attRes.data)
                setStudents(stuRes.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const now = new Date()

    // Last 6 months trend
    const trendData = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i)
        const start = startOfMonth(d)
        const end = endOfMonth(d)
        const count = attendance.filter(a => {
            const t = new Date(a.check_in_time)
            return t >= start && t <= end
        }).length
        const newStudents = students.filter(s => {
            const t = new Date(s.created_at)
            return t >= start && t <= end
        }).length
        return {
            month: format(d, "M月", { locale: zhTW }),
            簽到次數: count,
            新增學生: newStudents,
        }
    })

    // Selected month breakdown
    const [selYear, selMonth] = selectedMonth.split("-").map(Number)
    const selDate = new Date(selYear, selMonth - 1, 1)
    const selStart = startOfMonth(selDate)
    const selEnd = endOfMonth(selDate)

    const monthAttendance = attendance.filter(a => {
        const t = new Date(a.check_in_time)
        return t >= selStart && t <= selEnd
    })

    // Count by student
    const studentCounts = monthAttendance.reduce((acc, a) => {
        acc[a.student_name] = (acc[a.student_name] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const studentRanking = Object.entries(studentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, 出席次數: count }))

    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const d = subMonths(now, i)
        return { value: format(d, "yyyy-MM"), label: format(d, "yyyy年M月", { locale: zhTW }) }
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-indigo-600" />
                    月報表
                </h1>
                <p className="text-sm text-zinc-500 mt-1">出席趨勢與學生統計</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <p className="text-sm text-zinc-500">本月簽到</p>
                    <p className="text-3xl font-bold text-indigo-600 mt-1">
                        {trendData[trendData.length - 1]?.簽到次數 ?? 0}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">次出席記錄</p>
                </div>
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <p className="text-sm text-zinc-500">在籍學生</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">
                        {students.filter(s => s.status === "active").length}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">位有效學員</p>
                </div>
                <div className="bg-white rounded-xl border p-5 shadow-sm col-span-2 lg:col-span-1">
                    <p className="text-sm text-zinc-500">本月新增學生</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">
                        {trendData[trendData.length - 1]?.新增學生 ?? 0}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">位新學員</p>
                </div>
            </div>

            {/* 6-month trend */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    <h2 className="font-semibold text-zinc-800">近 6 個月趨勢</h2>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }} />
                        <Legend />
                        <Line type="monotone" dataKey="簽到次數" stroke="#0F1F5C" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="新增學生" stroke="#F5A41B" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Monthly student breakdown */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <h2 className="font-semibold text-zinc-800">學生出席排名</h2>
                    </div>
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="text-sm border rounded-lg px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                        {monthOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {studentRanking.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-8">該月份無簽到記錄</p>
                ) : (
                    <ResponsiveContainer width="100%" height={Math.max(200, studentRanking.length * 40)}>
                        <BarChart data={studentRanking} layout="vertical" barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 13 }} axisLine={false} tickLine={false} width={100} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }} />
                            <Bar dataKey="出席次數" fill="#F5A41B" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}
