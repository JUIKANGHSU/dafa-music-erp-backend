"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Loader2, CreditCard, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import axios from "axios"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
    plan_id: z.string().min(1, "Please select a plan"),
    paid_amount: z.coerce.number(),
    payment_method: z.string().min(1),
    note: z.string().optional(),
    total_lessons: z.coerce.number().min(1),
    start_date: z.string().min(1, "Start date is required"),
    start_time: z.string().min(1),
    teacher_id: z.string().optional(),
    frequency_days: z.coerce.number().min(1),
})

interface Plan {
    id: string
    name: string
    price: number
    total_lessons: number
}

interface User {
    id: string
    name: string
}

interface AssignPlanDialogProps {
    studentId: string
    studentName: string
    trigger?: React.ReactNode
}

export function AssignPlanDialog({ studentId, studentName, trigger }: AssignPlanDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [plans, setPlans] = useState<Plan[]>([])
    const [teachers, setTeachers] = useState<User[]>([])
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            plan_id: "",
            paid_amount: 0,
            payment_method: "cash",
            note: "",
            total_lessons: 0,
            start_date: new Date().toISOString().split('T')[0],
            start_time: "10:00",
            teacher_id: "",
            frequency_days: 7,
        },
    })

    // Fetch plans and teachers when dialog opens
    useEffect(() => {
        if (open) {
            const token = localStorage.getItem("token")
            const headers = { Authorization: `Bearer ${token}` }

            const fetchPlans = async () => {
                try {
                    console.log("Fetching plans...")
                    const res = await axios.get("/api/plans", { headers })
                    console.log("Plans fetched:", res.data)
                    setPlans(res.data)
                } catch (err: any) {
                    console.error("Failed to load plans", err)
                    if (err.response?.status === 401) {
                        alert("連線逾時，請重新登入。")
                    }
                }
            }

            const fetchTeachers = async () => {
                try {
                    console.log("Fetching teachers...")
                    const res = await axios.get("/api/users?role=teacher", { headers })
                    console.log("Teachers fetched:", res.data)
                    setTeachers(res.data)
                } catch (err: any) {
                    console.error("Failed to load teachers", err)
                }
            }

            fetchPlans()
            fetchTeachers()
        }
    }, [open])

    // Update form when a plan is selected
    const onPlanSelect = (planId: string) => {
        const plan = plans.find(p => p.id === planId)
        if (plan) {
            // plan_id is updated by field.onChange
            form.setValue("paid_amount", plan.price)
            form.setValue("total_lessons", plan.total_lessons)
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            // axios is imported at top level now

            const selectedPlan = plans.find(p => p.id === values.plan_id)
            if (!selectedPlan) return

            // 1. Create Payment & Package
            const payload = {
                plan_id: values.plan_id,
                plan_name_snapshot: selectedPlan.name,
                paid_amount: values.paid_amount,
                payment_method: values.payment_method,
                note: values.note,
                paid_at: new Date().toISOString(),
                total_lessons: values.total_lessons,
                start_date: values.start_date,
                expire_date: null
            }

            const paymentRes = await axios.post(`/api/students/${studentId}/payments`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (values.teacher_id && values.teacher_id !== "none") {
                const packagesRes = await axios.get(`/api/students/${studentId}/packages`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                // Assuming the first one is the newest one we just created
                const newPackage = packagesRes.data[0]

                if (newPackage) {
                    const startDateTime = new Date(`${values.start_date}T${values.start_time}:00`).toISOString()
                    await axios.post(`/api/students/${studentId}/schedule`, {
                        lesson_package_id: newPackage.id,
                        teacher_id: values.teacher_id,
                        start_date: startDateTime,
                        frequency_days: values.frequency_days
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                }
            }

            setOpen(false)
            form.reset()
            alert("報名成功！")
            router.refresh()
            window.location.reload()
        } catch (error: any) {
            console.error(error)
            const msg = error.response?.data?.detail || error.message || "處理失敗"
            alert(`錯誤: ${msg}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" size="sm">
                        <CreditCard className="mr-2 h-4 w-4" /> 報名課程
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>為 {studentName} 報名課程</DialogTitle>
                    <DialogDescription>
                        指定課程方案並安排課程時間。
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="plan_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>選擇方案</FormLabel>
                                    <Select
                                        onValueChange={(val) => {
                                            field.onChange(val)
                                            onPlanSelect(val)
                                        }}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="請選擇課程方案..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {plans.map((plan) => (
                                                <SelectItem key={plan.id} value={plan.id}>
                                                    {plan.name} - ${plan.price.toLocaleString()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="paid_amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>實收金額</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="total_lessons"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>總堂數</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="start_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>開始日期</FormLabel>
                                        <Popover modal={true}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(new Date(field.value), "yyyy-MM-dd", { locale: zhTW })
                                                        ) : (
                                                            <span>選擇日期</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value ? new Date(field.value) : undefined}
                                                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                                    disabled={(date) =>
                                                        date < new Date("1900-01-01")
                                                    }
                                                    initialFocus
                                                    locale={zhTW}
                                                    formatters={{
                                                        formatWeekdayName: (date) => format(date, "EEEEE", { locale: zhTW })
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="start_time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>上課時間</FormLabel>
                                        <FormControl>
                                            <div className="flex gap-2">
                                                <Select
                                                    value={field.value ? field.value.split(':')[0] : "10"}
                                                    onValueChange={(h) => field.onChange(`${h}:${field.value ? field.value.split(':')[1] || '00' : '00'}`)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="時" />
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
                                                    value={field.value ? field.value.split(':')[1] : "00"}
                                                    onValueChange={(m) => field.onChange(`${field.value ? field.value.split(':')[0] || '10' : '10'}:${m}`)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="分" />
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
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="frequency_days"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>頻率 (天)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="teacher_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>指定老師 (自動排程)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="選擇老師..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">無 (不安排)</SelectItem>
                                            {teachers.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="payment_method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>付款方式</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="選擇方式" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="cash">現金</SelectItem>
                                            <SelectItem value="transfer">匯款</SelectItem>
                                            <SelectItem value="credit_card">信用卡</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>備註</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="選填..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                確認報名
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
