const API_BASE_URL = "http://localhost:8000/api";

export interface ApiError {
  detail: string;
  code: string;
}

/**
 * Executes a fetch network request.
 * Handles JWT token injection, auto-refreshing expired tokens, and consistent error throwing.
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  isMultipart: boolean = false
): Promise<any> {
  const token = localStorage.getItem("access_token");
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!isMultipart && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle successful empty response (e.g., 204 No Content)
  if (response.status === 204) {
    return null;
  }

  // Handle Token Expiry & Automatic Refresh
  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem("access_token", refreshData.access_token);
          localStorage.setItem("refresh_token", refreshData.refresh_token);

          // Retry request with new token
          headers.set("Authorization", `Bearer ${refreshData.access_token}`);
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
          if (retryResponse.status === 204) return null;
          if (retryResponse.ok) return await retryResponse.json();
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }
    }
    
    // Clear storage and redirect to login if session cannot be recovered
    localStorage.clear();
    if (typeof window !== "undefined" && window.location.pathname !== "/login" && window.location.pathname !== "/register") {
      window.location.href = "/login?expired=true";
    }
  }

  const data = await response.json();

  if (!response.ok) {
    const apiErr: ApiError = {
      detail: data.detail || "An unexpected error occurred.",
      code: data.code || "UNKNOWN_ERROR",
    };
    throw apiErr;
  }

  return data;
}

export function logout(): void {
  localStorage.clear();
  window.location.href = "/login";
}
