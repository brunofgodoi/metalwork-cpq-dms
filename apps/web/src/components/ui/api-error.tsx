export interface ApiErrorData {
  status?: string;
  code?: string;
  message?: string;
  details?: { field?: string; message: string; code?: string }[];
}
