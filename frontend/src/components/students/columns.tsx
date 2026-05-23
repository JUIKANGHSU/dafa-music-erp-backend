"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AssignPlanDialog } from "./assign-plan-dialog"
import { StudentDialog } from "./student-dialog"
import { ManagePackagesDialog } from "./manage-packages-dialog"

export type Student = {
    id: string
    name: string
    nickname?: string
    phone: string
    email?: string
    address?: string
    status: "active" | "inactive" | "archived"
    created_at: string
    active_plan?: string
    remaining_lessons?: number
}

export const columns: ColumnDef<Student>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    姓名
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-medium">{row.getValue("name")}</span>
                {row.original.nickname && (
                    <span className="text-xs text-muted-foreground">{row.original.nickname}</span>
                )}
            </div>
        ),
    },
    {
        accessorKey: "phone",
        header: "電話",
    },
    {
        accessorKey: "active_plan",
        header: "目前課程",
        cell: ({ row }) => {
            const plan = row.getValue("active_plan") as string
            const remaining = row.original.remaining_lessons

            if (!plan) return <span className="text-muted-foreground">-</span>

            return (
                <div className="flex flex-col">
                    <span className="font-medium">{plan}</span>
                    <span className="text-xs text-muted-foreground">剩餘 {remaining} 堂</span>
                </div>
            )
        }
    },
    {
        accessorKey: "status",
        header: "狀態",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            return (
                <Badge variant={status === "active" ? "default" : "secondary"}>
                    {status === "active" ? "啟用" : "停用"}
                </Badge>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const student = row.original
            return (
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <StudentDialog
                                    student={student}
                                    trigger={<div className="w-full cursor-default">編輯基本資料</div>}
                                />
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <AssignPlanDialog
                                    studentId={student.id}
                                    studentName={student.name}
                                    trigger={<div className="w-full cursor-default">報名課程</div>}
                                />
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <ManagePackagesDialog
                                    studentId={student.id}
                                    studentName={student.name}
                                    trigger={<div className="w-full cursor-default">管理課程</div>}
                                />
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    },
]
