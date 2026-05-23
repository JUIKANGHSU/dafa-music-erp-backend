"use client"

import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AddEventDialog } from "@/components/calendar/add-event-dialog"
import { EventDetailsDialog } from "@/components/calendar/event-details-dialog"
import { useIsMobile } from "@/lib/use-is-mobile"

interface Event {
    id: string
    title: string
    start: string
    end: string
    teacher_id: string
    backgroundColor?: string
    extendedProps?: any
}

export default function CalendarView() {
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [selectedEvent, setSelectedEvent] = useState<any>(null)
    const router = useRouter()

    const [currentRange, setCurrentRange] = useState<{ start: string, end: string } | null>(null)
    const [debugInfo, setDebugInfo] = useState<string>("")
    const isMobile = useIsMobile()

    // Fetch events based on current view range (simplified to fetch all/month for MVP)
    const fetchEvents = async (info?: any) => {
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                // No token, redirect immediately
                router.push("/login")
                return
            }

            let start, end
            if (info) {
                start = info.startStr
                end = info.endStr
                setCurrentRange({ start, end })
            } else if (currentRange) {
                start = currentRange.start
                end = currentRange.end
            } else {
                start = new Date().toISOString()
                end = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
            }

            // Construct query params
            const params = new URLSearchParams({
                start: start,
                end: end
            })

            const res = await fetch(`/api/events?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.ok) {
                const data = await res.json()
                // Map backend event to FullCalendar event object
                const formatted = data.map((e: any) => ({
                    id: e.id,
                    title: e.title,
                    start: e.start_at,
                    end: e.end_at,
                    teacher_id: e.teacher_id,
                    backgroundColor: ["scheduled", "confirmed"].includes(e.status) ? "#4f46e5" : "#ef4444",
                    extendedProps: {
                        status: e.status,
                        note: e.note
                    }
                }))
                setEvents(formatted)
                // Temporary debug
                console.log("Loaded events:", formatted.length)
                // Clean debug info on success if we want, or keep it.
                // setDebugInfo(`Range: ${start.substring(0,10)} to ${end.substring(0,10)} | Events: ${formatted.length}`)
                // Cleaning it up to look nice as requested "fix it"
                setDebugInfo("")
            } else if (res.status === 401) {
                localStorage.removeItem("token")
                alert("憑證過期，請重新登入。")
                router.push("/login")
            } else {
                console.error("Failed to load events", res.status)
                setDebugInfo(`Error: ${res.status}`)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleEventDrop = async (info: any) => {
        try {
            const token = localStorage.getItem("token")
            const body = {
                start_at: info.event.start.toISOString(),
                end_at: info.event.end.toISOString()
            }

            const res = await fetch(`/api/events/${info.event.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            })

            if (!res.ok) {
                // Revert if failed
                info.revert()
                const err = await res.json()
                alert(err.detail || "更新事件失敗")
            }
        } catch (err) {
            console.error(err)
            info.revert()
        }
    }

    const handleDateClick = (arg: any) => {
        setSelectedDate(arg.date)
        setDialogOpen(true)
    }

    const handleEventClick = (info: any) => {
        setSelectedEvent({
            id: info.event.id,
            title: info.event.title,
            start: info.event.start,
            end: info.event.end,
            extendedProps: info.event.extendedProps
        })
        setDetailsOpen(true)
    }

    return (
        <div className="bg-white rounded-lg shadow" style={{ height: isMobile ? "calc(100vh - 160px)" : "80vh" }}>
            <AddEventDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                defaultDate={selectedDate}
                onSuccess={() => fetchEvents()}
            />
            <EventDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                event={selectedEvent}
            />
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
                headerToolbar={isMobile ? {
                    left: "prev,next",
                    center: "title",
                    right: "today",
                } : {
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                footerToolbar={isMobile ? {
                    center: "dayGridMonth,timeGridWeek,timeGridDay"
                } : undefined}
                dayHeaderContent={(arg) => (
                    <div className="flex flex-col items-center leading-tight py-1">
                        <span className="text-xs text-gray-400 font-medium">
                            {arg.date.toLocaleDateString("zh-TW", { weekday: "short" })}
                        </span>
                        <span className="text-sm font-bold text-gray-800">
                            {`${arg.date.getMonth() + 1}/${arg.date.getDate()}`}
                        </span>
                    </div>
                )}
                events={events}
                datesSet={(arg) => fetchEvents(arg)}
                editable={!isMobile}
                droppable={!isMobile}
                eventDrop={handleEventDrop}
                eventResize={handleEventDrop}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                selectable={true}
                height="100%"
                slotMinTime="08:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                buttonText={{ today: '今天', month: '月', week: '週', day: '日' }}
                locale="zh-tw"
                firstDay={1}
                slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                eventMaxStack={isMobile ? 2 : undefined}
            />
        </div>
    )
}
