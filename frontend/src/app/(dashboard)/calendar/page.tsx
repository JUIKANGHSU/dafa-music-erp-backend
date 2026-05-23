import CalendarView from "@/components/calendar/calendar-view"

export default function CalendarPage() {
    return (
        <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">課程行事曆</h2>
            <CalendarView />
        </div>
    )
}
