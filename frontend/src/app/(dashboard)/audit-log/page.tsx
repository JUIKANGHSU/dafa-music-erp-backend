"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { History, Loader2 } from "lucide-react"

interface AuditLogEntry {
    id: string
    actor_name: string
    action: string
    target_type: string
    target_id?: string
    target_label: string
    detail?: string
    created_at: string
}

const ACTION_LABELS: Record<string, { text: string, className: string }> = {
    "student.archived": { text: "移至非在籍", className: "bg-amber-100 text-amber-700" },
    "student.restored": { text: "恢復在籍", className: "bg-emerald-100 text-emerald-700" },
    "student.status_changed": { text: "變更學生狀態", className: "bg-gray-100 text-gray-600" },
    "student.updated": { text: "編輯學生資料", className: "bg-blue-100 text-blue-700" },
    "student.permanently_deleted": { text: "永久刪除學生", className: "bg-red-100 text-red-700" },
    "package.updated": { text: "編輯課程包", className: "bg-blue-100 text-blue-700" },
    "package.deleted": { text: "刪除課程包", className: "bg-red-100 text-red-700" },
    "payment.created": { text: "新增繳費", className: "bg-emerald-100 text-emerald-700" },
    "event.leave": { text: "學生請假", className: "bg-amber-100 text-amber-700" },
}

const TARGET_TYPE_LABELS: Record<string, string> = {
    student: "學生",
    lesson_package: "課程包",
    payment: "繳費",
    event: "課堂",
}

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [targetType, setTargetType] = useState<string>("")

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const { default: axios } = await import("axios")
                const token = localStorage.getItem("token")
                const res = await axios.get("/api/audit-logs", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: targetType ? { target_type: targetType } : {},
                })
                setLogs(res.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [targetType])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                        <History className="h-6 w-6 text-indigo-600" />
                        操作紀錄
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">誰在什麼時候對哪位學生做了什麼操作</p>
                </div>
                <select
                    value={targetType}
                    onChange={e => setTargetType(e.target.value)}
                    className="text-sm border rounded-lg px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                    <option value="">全部類型</option>
                    <option value="student">學生</option>
                    <option value="lesson_package">課程包</option>
                    <option value="payment">繳費</option>
                    <option value="event">課堂</option>
                </select>
            </div>

            <div className="bg-white rounded-xl border shadow-sm">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                ) : logs.length === 0 ? (
                    <p className="text-center text-sm text-zinc-400 py-12">目前沒有操作紀錄</p>
                ) : (
                    <div className="divide-y">
                        {logs.map(log => {
                            const label = ACTION_LABELS[log.action] || { text: log.action, className: "bg-gray-100 text-gray-600" }
                            return (
                                <div key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                                    <div className="flex-shrink-0 w-32 text-xs text-zinc-400 pt-0.5">
                                        {format(new Date(log.created_at), "M/d HH:mm", { locale: zhTW })}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-zinc-800">{log.actor_name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${label.className}`}>
                                                {label.text}
                                            </span>
                                            <span className="text-sm text-zinc-600">
                                                {TARGET_TYPE_LABELS[log.target_type] || log.target_type}「{log.target_label}」
                                            </span>
                                        </div>
                                        {log.detail && (
                                            <p className="text-xs text-zinc-400 mt-1">{log.detail}</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
