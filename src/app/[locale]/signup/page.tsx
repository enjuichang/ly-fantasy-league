'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from 'next-intl'
import { registerUser } from "@/app/actions"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignUpPage() {
    const t = useTranslations('signUpPage')
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        const formData = new FormData(e.currentTarget)
        const res = await registerUser(formData)

        if (res.success) {
            router.push("/signin?registered=true")
        } else {
            setError(res.message || "Registration failed")
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <img
                            src="/logo.svg"
                            alt="Fantasy Legislative Yuan Logo"
                            width={60}
                            height={60}
                        />
                    </div>
                    <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
                    <CardDescription>{t('subtitle')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('nameLabel')}</Label>
                            <Input id="name" name="name" placeholder={t('namePlaceholder')} required disabled={isLoading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('emailLabel')}</Label>
                            <Input id="email" name="email" type="email" placeholder={t('emailPlaceholder')} required disabled={isLoading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('passwordLabel')}</Label>
                            <Input id="password" name="password" type="password" placeholder={t('passwordPlaceholder')} required disabled={isLoading} />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? t('creating') : t('submitButton')}
                        </Button>
                    </form>
                    <div className="text-center text-sm">
                        {t('alreadyHaveAccount')}{" "}
                        <Link href="/signin" className="underline">
                            {t('signInLink')}
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
