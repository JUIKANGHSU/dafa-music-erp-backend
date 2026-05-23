"use client"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { TeacherDialog } from "./teacher-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"

export type Teacher = {
    id: string
    name: string
    email: string
    role: string
    is_active: boolean
}

export const columns: ColumnDef<Teacher>[] = [
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
    },
    {
        accessorKey: "email",
        header: "電子郵件",
    },
    {
        accessorKey: "is_active",
        header: "狀態",
        cell: ({ row }) => {
            return (
                <div className={`font-medium ${row.getValue("is_active") ? "text-green-600" : "text-red-600"}`}>
                    {row.getValue("is_active") ? "啟用" : "停用"}
                </div>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <TeacherCellActions teacher={row.original} />,
    },
]

function TeacherCellActions({ teacher }: { teacher: Teacher }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <TeacherDialog
                teacher={teacher}
                open={open}
                onOpenChange={setOpen}
                trigger={null}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>操作</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(teacher.id)}
                    >
                        複製 ID
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpen(true)}>
                        編輯詳細資料
                    </DropdownMenuItem>
                    {/* Add more actions later */}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
