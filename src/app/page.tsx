import { redirect } from 'next/navigation';

export default function RootRedirect() {
    // Redirect to the default locale (English) when accessing the base URL
    redirect('/en');
    return null; // This line will never be reached
}
