import { TopBar } from "@/components/layout/top-bar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { AuthGuard } from "@/components/layout/auth-guard"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <div className="min-h-screen bg-gray-50">
                <TopBar />
                <main className="px-4 py-5 pb-24">
                    {children}
                </main>
                <BottomNav />
            </div>
        </AuthGuard>
    )
}
