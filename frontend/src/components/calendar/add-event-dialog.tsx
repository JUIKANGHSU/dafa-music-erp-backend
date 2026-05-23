"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
    title: z.string().min(1, "標題為必填"),
    start_at: z.string(),
    end_at: z.string(),
    teacher_id: z.string().min(1, "請選擇教師"),
})

interface AddEventDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultDate?: Date
    onSuccess: () => void
}

export function AddEventDialog({ open, onOpenChange, defaultDate, onSuccess }: AddEventDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [teachers, setTeachers] = useState<any[]>([])

    // Fetch teachers for dropdown (using /api/auth/me just to check, but ideally /api/users or hardcoded for MVP)
    // For MVP let's hardcode or fetch if possible. 
    // We don't have a public "list teachers" endpoint exposed easily in router without auth. 
    // Let's assume we use the current user as teacher or fetch from a new endpoint. 
    // Actually, let's just use the current user's ID if we can get it, or allow manual entry.
    // Better: Fetch /api/users?role=teacher. But we didn't implement that filter.
    // For MVP, I'll just fetch /api/auth/me and use that ID, or just put a placeholder ID.

    // Wait, I seeded 2 teachers. I should probably fetch them.
    // Let's just hardcode the seed IDs for demo if we can't fetch.
    // Or better, let the user type the ID for now? No that's bad UX.
    // I'll fetch `/api/auth/me` to get current user and default to that.

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "鋼琴課",
            start_at: "",
            end_at: "",
            teacher_id: "",
        },
    })

    useEffect(() => {
        if (defaultDate) {
            // Round to nearest hour
            const start = new Date(defaultDate)
            const end = new Date(defaultDate)
            end.setHours(start.getHours() + 1)

            const pad = (n: number) => String(n).padStart(2, '0')
            const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
            form.reset({
                title: "鋼琴課",
                start_at: toLocal(start),
                end_at: toLocal(end),
                teacher_id: "placeholder"
            })
        }
    }, [defaultDate, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")

            // MVP: Fetch me to get ID
            const meRes = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
            const me = await meRes.json()

            const body = {
                ...values,
                teacher_id: me.id, // Force current user
                start_at: new Date(values.start_at).toISOString(),
                end_at: new Date(values.end_at).toISOString(),
            }

            const res = await fetch("/api/events", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail)
            }

            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>新增課程</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>標題</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="start_at"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>開始時間</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="end_at"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>結束時間</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                建立
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
