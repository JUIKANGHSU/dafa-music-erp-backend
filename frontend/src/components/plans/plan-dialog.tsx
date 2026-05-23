"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Pencil, Trash } from "lucide-react"

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
import { Input } from "@/components/ui/input"

// Schema now uses unit_price instead of price for the form
const formSchema = z.object({
    name: z.string().min(1, "方案名稱為必填"),
    lesson_minutes: z.number().default(60),
    total_lessons: z.coerce.number().min(1, "至少需要包含一堂課"),
    unit_price: z.coerce.number().min(0, "單堂價格不能為負數"),
    valid_days: z.number().nullable().default(null),
})

interface PlanDialogProps {
    plan?: {
        id: string
        name: string
        lesson_minutes: number
        total_lessons: number
        price: number
        valid_days?: number | null
        is_active?: boolean
    }
    trigger?: React.ReactNode
}

export function PlanDialog({ plan, trigger }: PlanDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const isEdit = !!plan

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            lesson_minutes: 60,
            total_lessons: 4,
            unit_price: 0,
            valid_days: null,
        },
    })

    // Watch values to calculate total
    const totalLessons = form.watch("total_lessons")
    const unitPrice = form.watch("unit_price")
    const totalPrice = (totalLessons || 0) * (unitPrice || 0)

    useEffect(() => {
        if (plan) {
            form.reset({
                name: plan.name,
                lesson_minutes: plan.lesson_minutes,
                total_lessons: plan.total_lessons,
                unit_price: plan.total_lessons > 0 ? Math.round(plan.price / plan.total_lessons) : 0,
                valid_days: plan.valid_days || null,
            })
        } else {
            form.reset({
                name: "",
                lesson_minutes: 60,
                total_lessons: 4,
                unit_price: 0,
                valid_days: null,
            })
        }
    }, [plan, form, open])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                alert("請先登入")
                return
            }

            const { default: axios } = await import("axios")

            // Calculate total price to send to backend
            const payload = {
                ...values,
                price: values.total_lessons * values.unit_price
            }

            if (isEdit && plan) {
                await axios.patch(`/api/plans/${plan.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            } else {
                await axios.post("/api/plans", payload, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            }

            setOpen(false)
            form.reset()
            router.refresh()
            window.location.reload()
        } catch (error: any) {
            console.error(error)
            const msg = error.response?.data?.detail || error.message || "儲存方案失敗"
            alert(msg)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault()
        if (!confirm("確定要刪除這個方案嗎？")) return

        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            const { default: axios } = await import("axios")
            await axios.delete(`/api/plans/${plan?.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setOpen(false)
            router.refresh()
            window.location.reload()
        } catch (error: any) {
            console.error(error)
            const msg = error.response?.data?.detail || error.message || "刪除方案失敗"
            alert(msg)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> 新增方案
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "編輯方案" : "新增方案"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "更新課程方案的詳細資料。" : "建立一個新的課程方案。"}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>方案名稱</FormLabel>
                                    <FormControl>
                                        <Input placeholder="標準鋼琴課程" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
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
                            <FormField
                                control={form.control}
                                name="unit_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>單堂價格</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Total Price Display */}
                        <div className="rounded-md bg-muted p-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">總計金額</span>
                                <span className="text-lg font-bold">
                                    TWD {totalPrice.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="flex justify-between sm:justify-between w-full">
                            {isEdit && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                >
                                    <Trash className="mr-2 h-4 w-4" />
                                    刪除
                                </Button>
                            )}
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEdit ? "儲存變更" : "建立方案"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
