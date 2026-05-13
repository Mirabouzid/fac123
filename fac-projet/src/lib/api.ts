const API_BASE_URL = "http://localhost:3000/api";

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
    const headers: HeadersInit = {
      ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (this.getToken()) {
      headers.Authorization = `Bearer ${this.getToken()}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Network error" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async signup(email: string, password: string, name: string, role: string) {
    const data = await this.request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role }),
    });
    return data;
  }

  // Users
  async getProfile() {
    return this.request("/users/profile");
  }

  async updateProfile(updates: any) {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Jobs
  async getJobs(filters: any = {}) {
    const queryString = new URLSearchParams(filters).toString();
    const url = queryString ? `/jobs?${queryString}` : "/jobs";
    return this.request(url);
  }

  async getJob(id: string) {
    return this.request(`/jobs/${id}`);
  }

  async createJob(jobData: any) {
    return this.request("/jobs", {
      method: "POST",
      body: JSON.stringify(jobData),
    });
  }

  async submitJob(formData: FormData) {
    return this.request("/jobs", {
      method: "POST",
      body: formData,
    });
  }

  async updateJob(id: string, updates: any) {
    return this.request(`/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteJob(id: string) {
    return this.request(`/jobs/${id}`, {
      method: "DELETE",
    });
  }

  // Applications
  async getApplications() {
    return this.request("/applications");
  }

  async getPendingApplications() {
    return this.request("/applications?status=received");
  }

  async submitApplication(formData: FormData) {
    return this.request("/applications", {
      method: "POST",
      body: formData,
    });
  }

  async createApplication(jobId: string, coverLetter?: string) {
    return this.request("/applications", {
      method: "POST",
      body: JSON.stringify({ jobId, coverLetter }),
    });
  }

  async updateApplication(id: string, updates: any) {
    return this.request(`/applications/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }
}

export const apiService = new ApiService();
