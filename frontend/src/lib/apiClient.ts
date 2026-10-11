// Dynamic import for server cookies to allow apiClient usage in client components
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

interface ApiOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Check if running on server side (Node.js/Next.js SSR or Server Actions)
  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const token = cookieStore.get("texflow_session")?.value;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["Cookie"] = `texflow_session=${token}`;
      }
    } catch {
      // cookies() might not be available in some server contexts
    }
  } else {
    try {
      const match = document.cookie.match(new RegExp("(^| )texflow_session=([^;]+)"));
      const token = (match && match[2]) || (typeof localStorage !== "undefined" ? localStorage.getItem("texflow_token") : null);
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // document.cookie fallback
    }
  }

  return headers;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const customHeaders = (options.headers as Record<string, string>) || {};
  if (options.token) {
    customHeaders["Authorization"] = `Bearer ${options.token}`;
  }

  const mergedHeaders = {
    ...authHeaders,
    ...customHeaders,
  };

  const fetchOptions: RequestInit = {
    ...options,
    headers: mergedHeaders,
    credentials: "include",
    cache: options.cache || "no-store",
  };

  try {
    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      let errorMsg = `API request failed with status ${res.status}`;
      let errData = null;
      try {
        errData = await res.json();
        if (errData && res.status >= 500) {
          console.error("Backend error detail:", errData);
        }
        if (errData && errData.detail) {
          errorMsg = Array.isArray(errData.detail)
            ? errData.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ")
            : errData.detail;
        }
      } catch {
        // Response was not JSON
      }
      throw new ApiError(res.status, errorMsg, errData);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, err.message || "Network error communicating with Python backend");
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: any, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: any, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
