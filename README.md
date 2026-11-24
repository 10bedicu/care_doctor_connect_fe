# CARE Doctor Connect

A federated micro-frontend plugin for [CARE](https://github.com/ohcnetwork/care_fe) that adds a **Doctor Connect** sheet to the patient encounter view, letting clinical staff quickly browse a facility's organization tree and reach the right doctor (or any other role) on call.

## Features

- Adds a `Doctor Connect` quick action to the Patient Info Card on the encounter page.
- Renders the facility's organization tree as collapsible sections.
- Shows users assigned to each organization with their role and contact details.
- Filters users by role via an autocomplete (defaults to `Doctor` when available).
- Plugin-config driven filtering of which organizations and which roles appear (set per deployment from CARE's admin panel).

## Configuration

The plugin reads runtime configuration from the `config` object inside the `meta` of its `PlugConfig` in CARE core (managed under **Admin → Apps** in the CARE admin panel). Configuration is delivered to the plugin via the `__meta` prop injected by CARE's `PLUGIN_Component`.

### Supported keys

These keys go in `meta.config`, not at the top level of `meta`.

| Key                              | Type       | Description                                                                                                                             |
| -------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `allowed_facility_organizations` | `string[]` | Names of top-level facility organizations to show in the sheet. Matched case-insensitively against `organization.name`. Omit/empty = show all. |
| `allowed_filter_roles`           | `string[]` | Names of roles to expose in the role-filter autocomplete. Matched case-insensitively against `role.name`. Omit/empty = show all roles.  |

### Example

In CARE admin, set the plugin's `meta` JSON to:

```json
{
  "url": "https://doctor-connect.example.org/assets/remoteEntry.js",
  "name": "care_doctor_connect_fe",
  "config": {
    "allowed_facility_organizations": ["Health Department"],
    "allowed_filter_roles": ["Doctor", "Nurse"]
  }
}
```

With this config:

- Only the top-level facility organization named `Health Department` (case-insensitive) appears in the sheet. Others (e.g. `Administration`) are filtered out.
- The role filter autocomplete only offers `Doctor` and `Nurse`.

If a key is missing or its array is empty, no filtering is applied for that dimension (full backwards-compatible behavior).

> Note: `allowed_facility_organizations` filters **facility organizations** (the org tree shown inside the sheet) by name. `allowed_filter_roles` filters the **Role** catalog used by the autocomplete. These are independent — you can set either, both, or neither.

## Development

### Prerequisites

- Node.js 22+
- A running CARE backend and CARE frontend (see [care_fe](https://github.com/ohcnetwork/care_fe))

### Setup

```bash
npm install
npm run start    # builds in watch mode and serves on http://localhost:6173
```

Then enable the plugin in your local CARE with a plugin config. As an admin, go to **Admin → Apps**, create a config with the slug `care_doctor_connect_fe`, and set its meta JSON to the plugin's federation entry:

```json
{
  "url": "http://localhost:6173/assets/remoteEntry.js",
  "name": "care_doctor_connect_fe"
}
```

Keep the slug and `name` as `care_doctor_connect_fe`: CARE loads the plugin's translations under that name. Add any [configuration keys](#supported-keys) under a `config` object in the same JSON (see the [example](#example)).

After saving a new config, reload the page. The plugin appears straight away, but CARE only loads a plugin's translations when the page loads, so until then its labels show as raw translation keys.

> The older way, `REACT_ENABLED_APPS="10bedicu/care_doctor_connect_fe@localhost:6173/assets/remoteEntry.js"` in the CARE frontend's `.env.local`, still works but is deprecated.

### Build

```bash
npm run build
```

The federated build is emitted to `dist/`.

## Testing

End-to-end tests live in `tests/` and use [Playwright](https://playwright.dev). They open an encounter, check the Doctor Connect sheet lists department members, filter by role, and check the call and WhatsApp actions. The call and WhatsApp hand-offs (`tel:`, `whatsapp://`, `wa.me`) are recorded rather than opened, so no "Open app?" prompt appears.

The tests need:

- A CARE backend on `http://localhost:9000` loaded with `python manage.py load_fixtures`.
- A CARE frontend on `http://localhost:4000`.
- This plugin served on `http://localhost:6173` (`npm run start`).

The setup logs in as `admin` / `admin` and prepares the rest:

- **Enables the plugin.** If CARE has no plugin config for `care_doctor_connect_fe`, the setup creates one pointing at the served plugin, as you would in **Admin → Apps** (see [Setup](#setup)). An existing config is left as it is, so its `url` must point at the served plugin.
- **Adds test data.** It adds the fixture doctor and nurse to a `Doctor Connect E2E` department in `FACILITY WITH PATIENTS`.

If the plugin's config sets an [allowlist](#supported-keys) in `meta.config`, it must not hide that data: `allowed_facility_organizations` must include `Doctor Connect E2E`, and `allowed_filter_roles` must include `Doctor`. The config the setup creates sets neither.

> If your CARE frontend still enables the plugin with `REACT_ENABLED_APPS`, CARE loads the plugin from that URL instead of the plugin config's, so the tests may run against a different or stale build. Remove the `REACT_ENABLED_APPS` entry and restart the frontend before testing.

```bash
npx playwright install chromium   # first time only
npm run test:e2e
```

Override the URLs with `REACT_CARE_FE_URL`, `REACT_CARE_API_URL` and `REACT_PLUGIN_URL` if yours differ. `REACT_PLUGIN_URL` must be an origin with no path, such as `http://localhost:6173`, because CARE loads a plugin's translations from the origin of its URL.

CI runs the same tests on every pull request (`.github/workflows/playwright.yaml`), against the published CARE backend image and care_fe `develop`. The test setup enables the plugin there too.