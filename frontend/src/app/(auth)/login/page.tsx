import { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { Music2 } from "lucide-react"

export const metadata: Metadata = {
    title: "Login - Da-Fa Music ERP",
    description: "Login to your account",
}

export default function LoginPage() {
    return (
        <div className="flex flex-col space-y-6 text-center">
            <div className="flex flex-col items-center space-y-2">
                <div className="rounded-full bg-indigo-600 p-3">
                    <Music2 className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your email and password to sign in
                </p>
            </div>
            <LoginForm />
        </div>
    )
}
