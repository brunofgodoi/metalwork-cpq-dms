import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
    mutations: {
      onError: (error: unknown) => {
        const axiosError = error as { normalizedError?: { message?: string } };
        const message = axiosError?.normalizedError?.message || 'An unexpected error occurred';
        toast.error(message);
      },
    },
  },
});
