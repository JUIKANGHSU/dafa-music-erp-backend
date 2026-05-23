"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Edit2, Check, X, Trash2, CalendarPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Package {
    id: string
    student_id: string
    teacher_id?: string
    total_lessons: number
    used_lessons: number
    start_date: string
    expire_date?: string
    status: string
}

interface ManagePackagesDialogProps {
    studentId: string
    studentName: string
    trigger?: React.ReactNode
}

export function ManagePackagesDialog({ studentId, studentName, trigger }: ManagePackagesDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [packages, setPackages] = useState<Package[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form for inline editing
    // We'll manage state manually for simplicity or use individual forms per row?
    // Manual state for the editing row is easier.
    const [editValues, setEditValues] = useState<Partial<Package>>({})

    const fetchPackages = async () => {
        setLoading(true)
        try {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            const res = await axios.get(`/api/students/${studentId}/packages`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setPackages(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            fetchPackages()
            fetchTeachers()
        }
    }, [open, studentId])

    const startEdit = (pkg: Package) => {
        setEditingId(pkg.id)
        setEditValues({
            teacher_id: pkg.teacher_id,
            total_lessons: pkg.total_lessons,
            used_lessons: pkg.used_lessons,
            start_date: pkg.start_date,
            status: pkg.status
        })
        fetchTeachers()
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditValues({})
    }

    const saveEdit = async (pkgId: string) => {
        try {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            await axios.patch(`/api/students/${studentId}/packages/${pkgId}`, editValues, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setEditingId(null)
            fetchPackages()
        } catch (err) {
            alert("Failed to update package")
            console.error(err)
        }
    }

    const deletePackage = async (pkgId: string) => {
        if (!confirm("確定要刪除這個課程包？相關的課程排程也會一併刪除。")) return
        try {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            await axios.delete(`/api/students/${studentId}/packages/${pkgId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            fetchPackages()
        } catch (err) {
            alert("刪除失敗")
            console.error(err)
        }
    }

    // Schedule Dialog State
    const [scheduleOpen, setScheduleOpen] = useState(false)
    const [schedulePkgId, setSchedulePkgId] = useState<string | null>(null)
    const [teachers, setTeachers] = useState<{ id: string, name: string }[]>([])

    // Schedule Form State
    const [scheduleData, setScheduleData] = useState({
        startDate: new Date().toISOString().split('T')[0],
        startTime: "10:00",
        teacherId: "",
        frequencyDays: 7
    })

    const fetchTeachers = async () => {
        try {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            const res = await axios.get("/api/users?role=teacher", {
                headers: { Authorization: `Bearer ${token}` }
            })
            setTeachers(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    const openScheduleDialog = (pkgId: string) => {
        setSchedulePkgId(pkgId)
        fetchTeachers()
        setScheduleOpen(true)
    }

    const handleScheduleSubmit = async () => {
        if (!scheduleData.teacherId) {
            alert("Please select a teacher.")
            return
        }
        if (!scheduleData.startDate || !scheduleData.startTime) {
            alert("Please select start date and time.")
            return
        }

        // Combine date and time
        // Frontend input type="date" gives YYYY-MM-DD
        // input type="time" gives HH:MM
        const startDateTime = new Date(`${scheduleData.startDate}T${scheduleData.startTime}:00`).toISOString()

        try {
            const { default: axios } = await import("axios")
            const token = localStorage.getItem("token")
            await axios.post(`/api/students/${studentId}/schedule`, {
                lesson_package_id: schedulePkgId,
                teacher_id: scheduleData.teacherId,
                start_date: startDateTime,
                frequency_days: scheduleData.frequencyDays
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            alert("Lessons scheduled successfully!")
            setScheduleOpen(false)
        } catch (err: any) {
            console.error(err)
            let msg = err.response?.data?.detail || "Failed to schedule lessons"
            if (Array.isArray(msg)) {
                // Handle Pydantic 422 error array
                msg = msg.map((e: any) => e.msg).join(", ")
            } else if (typeof msg === 'object') {
                msg = JSON.stringify(msg)
            }
            alert(msg)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="ghost" size="sm">Manage Courses</Button>
                )}
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{studentName} 的課程管理</DialogTitle>
                </DialogHeader>

                <div className="py-2 space-y-3">
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : packages.length === 0 ? (
                        <p className="text-center text-sm text-zinc-400 py-8">尚無課程包</p>
                    ) : (
                        packages.map((pkg) => {
                            const isEditing = editingId === pkg.id
                            const remaining = pkg.total_lessons - pkg.used_lessons
                            return (
                                <div key={pkg.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <p className="text-xs text-zinc-500 mb-1">開始日期</p>
                                                    <input className="appearance-none w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" style={{ height: '32px', textAlign: 'left' }} type="date" value={editValues.start_date || ""} onChange={(e) => setEditValues({ ...editValues, start_date: e.target.value })} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-zinc-500 mb-1">狀態</p>
                                                    <Select value={editValues.status} onValueChange={(val) => setEditValues({ ...editValues, status: val })}>
                                                        <SelectTrigger className="text-sm" style={{ height: '32px' }}><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="active">啟用</SelectItem>
                                                            <SelectItem value="finished">完成</SelectItem>
                                                            <SelectItem value="expired">過期</SelectItem>
                                                            <SelectItem value="void">作廢</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-zinc-500 mb-1">總堂數</p>
                                                    <Input className="!h-8 text-sm px-2" type="number" value={editValues.total_lessons} onChange={(e) => setEditValues({ ...editValues, total_lessons: parseInt(e.target.value) })} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-zinc-500 mb-1">已用堂數</p>
                                                    <Input className="!h-8 text-sm px-2" type="number" value={editValues.used_lessons} onChange={(e) => setEditValues({ ...editValues, used_lessons: parseInt(e.target.value) })} />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-zinc-500 mb-1">老師</p>
                                                <Select value={editValues.teacher_id || "none"} onValueChange={(val) => setEditValues({ ...editValues, teacher_id: val === "none" ? undefined : val })}>
                                                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="選擇老師" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">未指定</SelectItem>
                                                        {teachers.map(t => (
                                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <Button className="flex-1" size="sm" onClick={() => saveEdit(pkg.id)}>
                                                    <Check className="h-4 w-4 mr-1" /> 儲存
                                                </Button>
                                                <Button className="flex-1" size="sm" variant="outline" onClick={cancelEdit}>
                                                    <X className="h-4 w-4 mr-1" /> 取消
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pkg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {pkg.status === 'active' ? '啟用' : pkg.status === 'finished' ? '完成' : pkg.status === 'expired' ? '過期' : '作廢'}
                                                </span>
                                                <span className={`text-sm font-bold ${remaining <= 3 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    剩 {remaining} / {pkg.total_lessons} 堂
                                                </span>
                                            </div>
                                            <div className="text-xs text-zinc-500">開始日期：{pkg.start_date}</div>
                                            {pkg.teacher_id && (
                                                <div className="text-xs text-zinc-500">老師：{teachers.find(t => t.id === pkg.teacher_id)?.name || pkg.teacher_id}</div>
                                            )}
                                            <div className="flex gap-2 pt-1">
                                                <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(pkg)}>
                                                    <Edit2 className="h-3.5 w-3.5 mr-1" /> 編輯
                                                </Button>
                                                <Button size="sm" variant="outline" className="flex-1" onClick={() => openScheduleDialog(pkg.id)}>
                                                    <CalendarPlus className="h-3.5 w-3.5 mr-1 text-blue-600" /> 排課
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => deletePackage(pkg.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </DialogContent>

            {/* Schedule Sub-Dialog */}
            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Schedule Lessons</DialogTitle>
                        <DialogDescription>
                            Schedule class times for this package.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Teacher</label>
                            <Select
                                value={scheduleData.teacherId}
                                onValueChange={(val) => setScheduleData({ ...scheduleData, teacherId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Teacher" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Start Date</label>
                                <Input
                                    type="date"
                                    value={scheduleData.startDate}
                                    onChange={(e) => setScheduleData({ ...scheduleData, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Time</label>
                                <div className="flex gap-2">
                                    <Select
                                        value={scheduleData.startTime.split(':')[0]}
                                        onValueChange={(h) => setScheduleData({ ...scheduleData, startTime: `${h}:${scheduleData.startTime.split(':')[1] || '00'}` })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Hour" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => {
                                                const hourStr = h.toString().padStart(2, '0')
                                                return (
                                                    <SelectItem key={h} value={hourStr}>
                                                        {hourStr}
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <span className="py-2">:</span>
                                    <Select
                                        value={scheduleData.startTime.split(':')[1]}
                                        onValueChange={(m) => setScheduleData({ ...scheduleData, startTime: `${scheduleData.startTime.split(':')[0] || '10'}:${m}` })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Min" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['00', '15', '30', '45'].map((m) => (
                                                <SelectItem key={m} value={m}>
                                                    {m}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Frequency (Days)</label>
                            <Input
                                type="number"
                                value={scheduleData.frequencyDays}
                                onChange={(e) => setScheduleData({ ...scheduleData, frequencyDays: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleScheduleSubmit}>Generate Events</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    )
}
