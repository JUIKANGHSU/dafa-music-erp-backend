"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/teachers/data-table"
import { columns, Teacher } from "@/components/teachers/columns"
import { TeacherDialog } from "@/components/teachers/teacher-dialog"
import { Loader2, Mail, MoreHorizontal } from "lucide-react"
import { useIsMobile } from "@/lib/use-is-mobile"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export default function TeachersPage() {
    const [data, setData] = useState<Teacher[]>([])
    const [loading, setLoading] = useState(true)
    const isMobile = useIsMobile()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { default: axios } = await import("axios")
                const token = localStorage.getItem("token")
                const res = await axios.get("/api/users?role=teacher", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setData(res.data)
            } catch (error) {
                console.error("Failed to fetch teachers", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900">教師管理</h2>
                    <p className="text-sm text-zinc-500">共 {data.length} 位教師</p>
                </div>
                <TeacherDialog />
            </div>

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
                </div>
            ) : isMobile ? (
                <div className="space-y-2">
                    {data.map(teacher => (
                        <div key={teacher.id} className="bg-white rounded-xl border p-4 flex items-center justify-between gap-3 shadow-sm">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-zinc-900">{teacher.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${teacher.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        {teacher.is_active ? "啟用" : "停用"}
                                    </span>
                                </div>
                                <span className="flex items-center gap-1 mt-1 text-xs text-zinc-500">
                                    <Mail className="h-3 w-3" />{teacher.email}
                                </span>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-gray-100">
                                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>操作</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={e => e.preventDefault()}>
                                        <TeacherDialog teacher={teacher} trigger={<div className="w-full">編輯資料</div>} />
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            ) : (
                <DataTable columns={columns} data={data} />
            )}
        </div>
    )
}
