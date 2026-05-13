const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("token", token);
  }

  getToken(): string | null {
    return this.token || localStorage.getItem("token");
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("token");
  }

  private async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {};

    // Ne pas forcer Content-Type pour FormData (multipart)
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (this.getToken()) {
      headers["Authorization"] = `Bearer ${this.getToken()}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Erreur réseau" }));
      if (error.errors && Array.isArray(error.errors)) {
        const details = error.errors
          .map((e: any) => e.msg || e.message)
          .join(" | ");
        throw new Error(`${error.message} : ${details}`);
      }
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async signup(
    email: string,
    password: string,
    name: string,
    role: string,
    extra?: Record<string, unknown>,
  ) {
    return this.request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role, ...extra }),
    });
  }

  async forgotPassword(email: string) {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async getProfile() {
    return this.request("/users/profile");
  }

  async updateProfile(updates: Record<string, unknown>) {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // ─── Jobs ─────────────────────────────────────────────────────────────────

  async getJobs(filters?: {
    position?: string;
    city?: string;
    urgency?: boolean;
    page?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.position) params.set("position", filters.position);
    if (filters?.city) params.set("city", filters.city);
    if (filters?.urgency) params.set("urgency", "true");
    if (filters?.page) params.set("page", String(filters.page));
    const qs = params.toString() ? `?${params}` : "";
    return this.request(`/jobs${qs}`);
  }

  async getJob(id: string) {
    return this.request(`/jobs/${id}`);
  }

  async getMyJobs() {
    return this.request("/jobs/employer/my-jobs");
  }

  async getEmployerStats() {
    return this.request("/jobs/employer/stats");
  }

  async createJob(formData: FormData) {
    return this.request("/jobs", { method: "POST", body: formData });
  }

  async submitJob(formData: FormData) {
    return this.createJob(formData);
  }

  async updateJob(id: string, updates: Record<string, unknown>) {
    return this.request(`/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async updatePipelineStage(id: string, stage: string) {
    return this.request(`/jobs/${id}/pipeline`, {
      method: "PUT",
      body: JSON.stringify({ stage }),
    });
  }

  async deleteJob(id: string) {
    return this.request(`/jobs/${id}`, { method: "DELETE" });
  }

  // ─── Applications ─────────────────────────────────────────────────────────

  async getApplications(filters?: {
    status?: string;
    specialty?: string;
    city?: string;
    global?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.specialty) params.set("specialty", filters.specialty);
    if (filters?.city) params.set("city", filters.city);
    if (filters?.global) params.set("global", "true");
    const qs = params.toString() ? `?${params}` : "";
    return this.request(`/applications${qs}`);
  }

  async getCandidateStats() {
    return this.request("/applications/candidate/stats");
  }

  async submitApplication(formData: FormData) {
    return this.request("/applications", { method: "POST", body: formData });
  }

  async updateApplicationStatus(id: string, status: string, note?: string) {
    return this.request(`/applications/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status, note }),
    });
  }

  async updateApplicationPipelineStage(id: string, stage: string) {
    return this.request(`/applications/${id}/pipeline`, {
      method: "PUT",
      body: JSON.stringify({ stage }),
    });
  }

  async anonymizeApplication(id: string) {
    return this.request(`/applications/${id}/anonymize`, { method: "DELETE" });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async getAdminStats() {
    return this.request("/admin/stats");
  }

  async getPendingOffers() {
    return this.request("/admin/pending-offers");
  }

  async validateOffer(id: string) {
    return this.request(`/admin/validate-offer/${id}`, { method: "POST" });
  }

  async rejectOffer(id: string, reason: string) {
    return this.request(`/admin/reject-offer/${id}`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async getPendingApplications() {
    return this.request("/admin/pending-applications");
  }

  async qualifyCandidate(id: string, note?: string) {
    return this.request(`/admin/qualify/${id}`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  async archiveCandidate(id: string, note?: string) {
    return this.request(`/admin/archive/${id}`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  async getRgpdAlerts() {
    return this.request("/admin/rgpd-alerts");
  }

  async anonymizeExpired() {
    return this.request("/admin/anonymize-all-expired", { method: "POST" });
  }

  async getAuditLog(filters?: { page?: number; action?: string }) {
    const params = new URLSearchParams();
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.action) params.set("action", filters.action);
    const qs = params.toString() ? `?${params}` : "";
    return this.request(`/admin/audit-log${qs}`);
  }

  async getAdminPayments() {
    return this.request("/admin/payments");
  }

  async getAdminUsers(role?: string) {
    const qs = role ? `?role=${role}` : "";
    return this.request(`/admin/users${qs}`);
  }

  async createAdmin(data: { email: string; name: string; password: string }) {
    return this.request("/admin/create-admin", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ─── Payments ─────────────────────────────────────────────────────────────

  async createCheckoutSession(applicationId: string) {
    return this.request("/payments/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    });
  }

  async createPaymentIntent(applicationId: string) {
    return this.request("/payments/create-payment-intent", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    });
  }

  async verifyPayment(paymentIntentId: string) {
    return this.request("/payments/verify-payment", {
      method: "POST",
      body: JSON.stringify({ paymentIntentId }),
    });
  }

  async getPaymentHistory() {
    return this.request("/payments/history");
  }
}

export const apiService = new ApiService();
