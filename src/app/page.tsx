import Link from "next/link"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const session = await auth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-slate-900">
        Fantasy Legislative Yuan
      </h1>
      <p className="mb-8 max-w-2xl text-lg text-slate-600">
        Draft your team of Taiwanese legislators, track their performance, and compete with friends based on real legislative data.
      </p>

      <div className="flex gap-4">
        {session ? (
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
            <form action={async () => {
              'use server'
              const { signOut } = await import("@/auth")
              await signOut()
            }}>
              <Button variant="outline" size="lg">Sign Out</Button>
            </form>
          </div>
        ) : (
          <Link href="/api/auth/signin">
            <Button size="lg">Start Playing</Button>
          </Link>
        )}
        <Link href="/rules">
          <Button variant="outline" size="lg">How to Play</Button>
        </Link>
      </div>
    </div>
  )
}
