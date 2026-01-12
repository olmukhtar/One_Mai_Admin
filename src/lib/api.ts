export const AUTH_STORAGE_KEY = "admin_auth";

export function getAuthToken(): string | null {
    const raw =
        localStorage.getItem(AUTH_STORAGE_KEY) ||
        sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed?.token as string | null;
    } catch {
        return null;
    }
}

export async function apiFetch(url: string | URL, init?: RequestInit): Promise<Response> {
    const token = getAuthToken();
    const headers = new Headers(init?.headers);

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
    }

    const config: RequestInit = {
        ...init,
        headers,
    };

    const response = await fetch(url, config);

    if (response.status === 401 || response.status === 403) {
        // Clear auth state
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);

        // Redirect to login
        // Using window.location to ensure a hard redirect in case of router context issues
        // or if we're deeply nested where navigation props aren't available
        if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login?expired=true";
        }
    }

    return response;
}
