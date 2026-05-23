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

const formSchema = z.object({
    name: z.string().min(1, "姓名為必填"),
    nickname: z.string().optional(),
    phone: z.string().min(1, "電話為必填"),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
    line_user_id: z.string().optional(),
})

interface StudentDialogProps {
    student?: {
        id: string
        name: string
        nickname?: string
        phone: string
        email?: string
        address?: string // Add address to Student type in columns if missing, or optional here
    }
    trigger?: React.ReactNode
}

export function StudentDialog({ student, trigger }: StudentDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const isEdit = !!student

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            nickname: "",
            phone: "",
            email: "",
            address: "",
            line_user_id: "",
        },
    })

    useEffect(() => {
        if (student) {
            form.reset({
                name: student.name,
                nickname: student.nickname || "",
                phone: student.phone,
                email: student.email || "",
                address: student.address || "",
                line_user_id: (student as any).line_user_id || "",
            })
        } else {
            form.reset({
                name: "",
                nickname: "",
                phone: "",
                email: "",
                address: "",
                line_user_id: "",
            })
        }
    }, [student, form, open])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            const { default: axios } = await import("axios")

            if (isEdit && student) {
                await axios.patch(`/api/students/${student.id}`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            } else {
                await axios.post("/api/students", values, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            }

            setOpen(false)
            form.reset()
            router.refresh()
            window.location.reload()
        } catch (error: any) {
            console.error(error)
            const msg = error.response?.data?.detail || error.message || "儲存失敗"
            alert(msg)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault()
        if (!confirm("確定要刪除這位學生嗎？")) return

        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            const { default: axios } = await import("axios")
            await axios.delete(`/api/students/${student?.id}`, {
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> 新增學生
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "編輯學生" : "新增學生"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "更新學生的基本資料。" : "在此建立新的學生資料。"}
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
                                        <Input placeholder="王小明" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="nickname"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>暱稱</FormLabel>
                                        <FormControl>
                                            <Input placeholder="小明" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>電話</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0912345678" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>電子郵件</FormLabel>
                                    <FormControl>
                                        <Input placeholder="example@gmail.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>地址</FormLabel>
                                    <FormControl>
                                        <Input placeholder="台北市..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="line_user_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>LINE User ID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="U1234567890abcdef..." {...field} />
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

