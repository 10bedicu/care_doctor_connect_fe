import { type APIRequestContext, expect } from "@playwright/test";

export const CARE_API_URL =
  process.env.REACT_CARE_API_URL ?? "http://localhost:9000";

/** Superuser and facility created by the backend's `load_fixtures` command. */
export const ADMIN = { username: "admin", password: "admin" };
export const FIXTURE_FACILITY = "FACILITY WITH PATIENTS";

interface Paginated<T> {
  count: number;
  results: T[];
}

interface Named {
  id: string;
  name: string;
}

export interface CareUser {
  id: string;
  username: string;
  prefix?: string | null;
  first_name: string;
  last_name: string;
  suffix?: string | null;
  phone_number: string;
}

interface Encounter {
  id: string;
  patient: { id: string };
}

interface FacilityOrganization extends Named {
  level_cache: number;
}

interface OrganizationMember {
  id: string;
  user: { id: string };
  role: { id: string };
}

export interface PlugConfig {
  slug: string;
  meta: Record<string, unknown>;
}

/** Same formatting as the plugin's `formatUserName`. */
export const fullName = (user: CareUser) =>
  [user.prefix, user.first_name, user.last_name, user.suffix]
    .filter(Boolean)
    .join(" ");

/** Minimal CARE API client for preparing test data. */
export class CareApi {
  private constructor(
    private readonly request: APIRequestContext,
    private readonly token: string,
  ) {}

  static async login(request: APIRequestContext, credentials = ADMIN) {
    const response = await request.post(`${CARE_API_URL}/api/v1/auth/login/`, {
      data: credentials,
    });
    await expect(response, `log in as ${credentials.username}`).toBeOK();
    const { access } = await response.json();
    return new CareApi(request, access);
  }

  private async call<T>(
    method: "GET" | "POST" | "PUT",
    path: string,
    data?: unknown,
  ): Promise<T> {
    const response = await this.request.fetch(`${CARE_API_URL}${path}`, {
      method,
      data,
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!response.ok()) {
      throw new Error(
        `${method} ${path} failed (${response.status()}): ${await response.text()}`,
      );
    }
    return response.json();
  }

  async findFacility(name: string) {
    const { results } = await this.call<Paginated<Named>>(
      "GET",
      `/api/v1/facility/?name=${encodeURIComponent(name)}&limit=50`,
    );
    const facility = results.find((f) => f.name === name);
    if (!facility) throw new Error(`Facility "${name}" not found`);
    return facility;
  }

  async findActiveEncounter(facilityId: string) {
    const { results } = await this.call<Paginated<Encounter>>(
      "GET",
      `/api/v1/encounter/?facility=${facilityId}&status=in_progress&limit=1`,
    );
    if (!results.length) {
      throw new Error(`No in-progress encounter in facility ${facilityId}`);
    }
    return results[0];
  }

  getUser(username: string) {
    return this.call<CareUser>("GET", `/api/v1/users/${username}/`);
  }

  async findRole(name: string) {
    const { results } = await this.call<Paginated<Named>>(
      "GET",
      `/api/v1/role/?name=${encodeURIComponent(name)}&limit=50`,
    );
    const role = results.find((r) => r.name === name);
    if (!role) throw new Error(`Role "${name}" not found`);
    return role;
  }

  /** Returns the top-level department with this name, creating it if needed. */
  async ensureDepartment(facilityId: string, name: string) {
    const base = `/api/v1/facility/${facilityId}/organizations/`;
    const { results } = await this.call<Paginated<FacilityOrganization>>(
      "GET",
      `${base}?name=${encodeURIComponent(name)}&limit=100`,
    );
    const existing = results.find(
      (o) => o.name === name && o.level_cache === 0,
    );
    if (existing) return existing;
    return this.call<FacilityOrganization>("POST", base, {
      name,
      description: "",
      org_type: "dept",
      facility: facilityId,
    });
  }

  /** Makes `userId` a member of the department with `roleId`. */
  async ensureMember(
    facilityId: string,
    organizationId: string,
    userId: string,
    roleId: string,
  ) {
    const base = `/api/v1/facility/${facilityId}/organizations/${organizationId}/users/`;
    const { results } = await this.call<Paginated<OrganizationMember>>(
      "GET",
      `${base}?limit=100`,
    );
    const member = results.find((m) => m.user.id === userId);
    if (!member) {
      await this.call("POST", base, { user: userId, role: roleId });
    } else if (member.role.id !== roleId) {
      await this.call("PUT", `${base}${member.id}/`, { role: roleId });
    }
  }

  /**
   * Enables a plugin the way Admin → Apps does, by creating its plugin
   * config. An existing config with this slug is left as it is.
   */
  async ensurePlugConfig(config: PlugConfig) {
    const base = "/api/v1/plug_config/";
    const { configs } = await this.call<{ configs: PlugConfig[] }>("GET", base);
    if (!configs.some((c) => c.slug === config.slug)) {
      await this.call("POST", base, config);
    }
  }
}
