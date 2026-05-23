"use client"

import { useEffect, useState } from "react"
import { columns, Plan } from "@/components/plans/columns"
import { DataTable } from "@/components/plans/data-table"
import { PlanDialog } from "@/components/plans/plan-dialog"
import { Loader2, Clock, BookOpen } from "lucide-react"
import { useIsMobile } from "@/lib/use-is-mobile"

export default function PlansPage() {
    const [data, setData] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const isMobile = useIsMobile()

    async function fetchData() {
        try {
            const token = localStorage.getItem("token")
            const { default: axios } = await import("axios")
            const res = await axios.get("/api/plans", {
                headers: { Authorization: `Bearer ${token}` }
            })
            setData(res.data)
        } catch (err) {
            console.error("Failed to fetch plans:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900">課程方案</h2>
                    <p className="text-sm text-zinc-500">共 {data.length} 個方案</p>
                </div>
                <PlanDialog />
            </div>

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
                </div>
            ) : isMobile ? (
                <div className="space-y-2">
                    {data.map(plan => (
                        <div key={plan.id} className="bg-white rounded-xl border p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-zinc-900">{plan.name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                            {plan.is_active ? "啟用" : "停用"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <BookOpen className="h-3.5 w-3.5" />{plan.total_lessons} 堂
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />{plan.lesson_minutes} 分鐘/堂
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-[#F5A41B]">
                                        ${plan.price.toLocaleString()}
                                    </span>
                                    <PlanDialog plan={plan} trigger={
                                        <button className="block mt-1 text-xs text-zinc-400 underline">編輯</button>
                                    } />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <DataTable columns={columns} data={data} />
            )}
        </div>
    )
}
