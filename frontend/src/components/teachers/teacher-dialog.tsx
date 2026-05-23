"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, UserPlus, Loader2, Trash } from "lucide-react"
import { useRouter } from "next/navigation"

import axios from "axios"

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

const formSchema = z.object({
    name: z.string().min(2, "姓名至少要有 2 個字元。"),
    email: z.string().email("無效的電子郵件格式。"),
    password: z.string().min(6, "密碼至少要有 6 個字元。").optional().or(z.literal("")),
})

interface TeacherDialogProps {
    teacher?: {
        id: string
        name: string
        email: string
        role?: string
        is_active?: boolean
    }
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function TeacherDialog({ teacher, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: TeacherDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const router = useRouter()

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    // Wrapper to handle both controlled and uncontrolled state
    const setOpen = (newOpen: boolean) => {
        if (setControlledOpen) {
            setControlledOpen(newOpen)
        } else {
            setInternalOpen(newOpen)
        }
    }

    const [isLoading, setIsLoading] = useState(false)
    const isEdit = !!teacher

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    })

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            if (teacher) {
                form.reset({
                    name: teacher.name,
                    email: teacher.email,
                    password: "",
                })
            } else {
                form.reset({
                    name: "",
                    email: "",
                    password: "",
                })
            }
        }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    // Only reset form when dialog opens (via internal trigger)
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")

            // Clean empty password
            const data: any = { ...values, role: "teacher" }
            if (isEdit && !data.password) {
                delete data.password
            }

            if (isEdit && teacher) {
                await axios.patch(`/api/users/${teacher.id}`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            } else {
                if (!values.password) {
                    alert("新增教師時必須填寫密碼")
                    setIsLoading(false)
                    return
                }
                await axios.post("/api/users", data, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            }

            setOpen(false)
            form.reset()
            router.refresh()
            window.location.reload()
        } catch (error: any) {
            console.error(error)
            let msg = error.response?.data?.detail || "儲存失敗"
            if (error.response?.status === 401 || error.response?.status === 403) {
                msg = "Session expired. Please log in again."
                window.location.href = "/"
            }
            alert(msg)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault()
        if (!confirm("確定要刪除這位教師嗎？")) return

        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            await axios.delete(`/api/users/${teacher?.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setOpen(false)
            router.refresh()
            window.location.reload()
        } catch (error: any) {
            console.error(error)
            const msg = error.response?.data?.detail || error.message || "刪除失敗"
            alert(msg)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger !== null && (
                <DialogTrigger asChild>
                    {trigger ? trigger : (
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> 新增教師
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>{isEdit ? "編輯教師" : "新增教師"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "更新教師的詳細資料。" : "在此建立新的教師帳號。"}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>姓名</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} autoComplete="name" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>電子郵件</FormLabel>
                                    <FormControl>
                                        <Input placeholder="john@example.com" {...field} autoComplete="email" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>密碼 {isEdit && "（若不修改請留空）"}</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="******" {...field} autoComplete="new-password" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
                                {isEdit ? "儲存變更" : "建立"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
