import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import createIntlMiddleware from 'next-intl/middleware';
import { locales } from './i18n';
import { NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig)

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: 'en',
  localeDetection: true,
  localePrefix: 'always'
});

export default auth((req) => {
  // Run i18n middleware for locale handling
  return intlMiddleware(req as NextRequest);
})

// export default intlMiddleware;

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)', // Exclude API, Next.js internals, and static files
  ],
};