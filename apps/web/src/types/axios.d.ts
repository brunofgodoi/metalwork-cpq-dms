import 'axios';
import type { ApiErrorData } from '@/components/ui/api-error';

declare module 'axios' {
  interface AxiosError {
    normalizedError?: ApiErrorData;
  }
}
