import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
    cleanup()
})

// Mock Next.js modules
vi.mock('next/server', () => ({
    NextResponse: {
        json: vi.fn(),
        redirect: vi.fn(),
    },
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
    }),
    useSearchParams: () => ({
        get: vi.fn(),
    }),
    usePathname: () => '/',
}))
