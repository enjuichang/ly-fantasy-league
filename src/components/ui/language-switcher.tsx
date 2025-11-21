'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from './button';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en';

    // Remove current locale from pathname and add new locale
    const pathWithoutLocale = pathname.replace(/^\/(en|zh)/, '');
    const newPath = `/${newLocale}${pathWithoutLocale}`;

    router.push(newPath);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative h-10 w-10"
      aria-label={locale === 'en' ? 'Switch to Mandarin' : 'Switch to English'}
    >
      <div className="flex items-center gap-1">
        <Globe
          className={`h-4 w-4 ${
            locale === 'en'
              ? 'text-[#094D92] dark:text-[#C3F73A]'
              : 'text-[#094D92] dark:text-[#C3F73A]'
          }`}
        />
        <span
          className={`text-xs font-medium ${
            locale === 'en'
              ? 'text-[#094D92] dark:text-[#C3F73A]'
              : 'text-[#094D92] dark:text-[#C3F73A]'
          }`}
        >
          {locale === 'en' ? 'EN' : '中'}
        </span>
      </div>
    </Button>
  );
}
