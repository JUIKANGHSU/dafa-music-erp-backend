"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"

// Generate time slots (24h, 30min intervals)
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2)
    const minute = i % 2 === 0 ? "00" : "30"
    return `${hour.toString().padStart(2, "0")}:${minute}`
})

interface EventDetailsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    event: any
}

export function EventDetailsDialog({ open, onOpenChange, event }: EventDetailsDialogProps) {
    const [isRescheduling, setIsRescheduling] = useState(false)
    const [startDate, setStartDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endDate, setEndDate] = useState("")
    const [endTime, setEndTime] = useState("")

    useEffect(() => {
        if (open && event) {
            setIsRescheduling(false)
            if (event.start) {
                const s = new Date(event.start)
                setStartDate(format(s, "yyyy-MM-dd"))
                setStartTime(format(s, "HH:mm"))
            }
            if (event.end) {
                const e = new Date(event.end)
                setEndDate(format(e, "yyyy-MM-dd"))
                setEndTime(format(e, "HH:mm"))
            }
        }
    }, [open, event])

    if (!event) return null

    const handleReschedule = async () => {
        try {
            const token = localStorage.getItem("token")
            const { default: axios } = await import("axios")

            // Combine date and time
            const startDateTime = new Date(`${startDate}T${startTime}`)
            const endDateTime = new Date(`${endDate}T${endTime}`)

            await axios.patch(`/api/events/${event.id}`, {
                start_at: startDateTime.toISOString(),
                end_at: endDateTime.toISOString()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            alert("調課成功！")
            onOpenChange(false)
            window.location.reload()
        } catch (error: any) {
            const detail = error.response?.data?.detail
            let msg = "操作失敗"
            if (typeof detail === "string") {
                msg = detail
            } else if (typeof detail === "object") {
                msg = JSON.stringify(detail)
            }
            alert(msg)
        }
    }

    const handleLeave = async () => {
        if (!confirm("確定要請假嗎？這將會取消此課程並往後遞延一週。")) return
        try {
            const token = localStorage.getItem("token")
            const { default: axios } = await import("axios")
            await axios.post(`/api/events/${event.id}/leave`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            alert("請假成功，課程已遞延。")
            onOpenChange(false)
            window.location.reload()
        } catch (error: any) {
            const detail = error.response?.data?.detail
            let msg = "操作失敗"
            if (typeof detail === "string") {
                msg = detail
            } else if (typeof detail === "object") {
                msg = JSON.stringify(detail)
            }
            alert(msg)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{event.title}</DialogTitle>
                    <DialogDescription>
                        {format(new Date(event.start), "PPP p")} - {format(new Date(event.end), "p")}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {!isRescheduling ? (
                        <>
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">狀態</h4>
                                <p className="text-sm text-muted-foreground capitalize">
                                    {event.extendedProps?.status === "scheduled" ? "已排程" : event.extendedProps?.status || "已排程"}
                                </p>
                            </div>
                            {event.extendedProps?.note && (
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">備註 / 計畫</h4>
                                    <p className="text-sm text-muted-foreground">{event.extendedProps.note}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label>開始日期</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>時間</Label>
                                    <Select value={startTime} onValueChange={setStartTime}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="選擇時間" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {TIME_SLOTS.map((t) => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label>結束日期</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>時間</Label>
                                    <Select value={endTime} onValueChange={setEndTime}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="選擇時間" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {TIME_SLOTS.map((t) => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-start gap-2">
                    {event.extendedProps?.status !== "canceled" && (
                        <>
                            {!isRescheduling ? (
                                <>
                                    <Button variant="default" onClick={() => setIsRescheduling(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        調課 (Reschedule)
                                    </Button>
                                    <Button variant="destructive" onClick={handleLeave}>
                                        請假 (Defer)
                                    </Button>
                                </>
                            ) : (
                                <div className="flex w-full justify-end gap-2">
                                    <Button onClick={handleReschedule}>
                                        確認調課
                                    </Button>
                                    <Button variant="ghost" onClick={() => setIsRescheduling(false)}>
                                        取消
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
