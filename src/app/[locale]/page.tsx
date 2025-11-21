import Link from "next/link"
import Image from "next/image"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { Trophy, Database, Users, BarChart3 } from "lucide-react"
import { getTranslations } from 'next-intl/server'

export default async function Home() {
  const session = await auth()
  const t = await getTranslations()

  return (
    <div className="min-h-screen bg-background">
      {/* Header with theme and language toggles */}
      <header className="fixed top-0 right-0 p-4 z-50 flex gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      {/* Hero Section */}
      <section className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <div className="mb-8">
          <img
            src="/logo.svg"
            alt="Fantasy Legislative Yuan Logo"
            width={120}
            height={120}
            className="mx-auto"
          />
        </div>

        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          {t('home.hero.title')}
        </h1>

        <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {t('home.hero.description')}
        </p>

        <div className="flex flex-wrap gap-4 justify-center mb-12">
          {session ? (
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  {t('home.hero.goToDashboard')}
                </Button>
              </Link>
              <form action={async () => {
                'use server'
                const { signOut } = await import("@/auth")
                await signOut()
              }}>
                <Button variant="outline" size="lg">{t('common.signOut')}</Button>
              </form>
            </div>
          ) : (
            <Link href="/signin">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Trophy className="mr-2 h-5 w-5" />
                {t('home.hero.startPlaying')}
              </Button>
            </Link>
          )}
          <Link href="/rules">
            <Button variant="outline" size="lg">{t('home.hero.howToPlay')}</Button>
          </Link>
          <Link href="/legislators">
            <Button variant="outline" size="lg">{t('legislatorsPage.browseAll')}</Button>
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl w-full">
          <div className="flex flex-col items-center">
            <Users className="h-8 w-8 mb-2 text-primary" />
            <div className="text-2xl font-bold text-foreground">113</div>
            <div className="text-sm text-muted-foreground">{t('home.stats.legislators')}</div>
          </div>
          <div className="flex flex-col items-center">
            <Database className="h-8 w-8 mb-2 text-primary" />
            <div className="text-2xl font-bold text-foreground">835+</div>
            <div className="text-sm text-muted-foreground">{t('home.stats.votesTracked')}</div>
          </div>
          <div className="flex flex-col items-center">
            <BarChart3 className="h-8 w-8 mb-2 text-primary" />
            <div className="text-2xl font-bold text-foreground">6</div>
            <div className="text-sm text-muted-foreground">{t('home.stats.scoreTypes')}</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            {t('home.features.title')}
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Real Legislative Data */}
            <div className="bg-card border border-border rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                    {t('home.features.realData.title')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('home.features.realData.description')}
                  </p>
                </div>
              </div>
            </div>

            {/* Competitive Gameplay */}
            <div className="bg-card border border-border rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                    {t('home.features.competitive.title')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('home.features.competitive.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground">
        <p>{t('home.footer')}</p>
      </footer>
    </div>
  )
}
