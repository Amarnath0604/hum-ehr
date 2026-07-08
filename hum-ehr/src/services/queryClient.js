import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide TanStack Query client.
 *
 * HIPAA: this cache is IN-MEMORY only — no persister is attached, so no PHI is
 * ever written to localStorage/sessionStorage. It is currently used by the
 * Message Center (recent-users list + conversation history) for caching,
 * request de-duplication, and background refetch.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 15_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export default queryClient;
