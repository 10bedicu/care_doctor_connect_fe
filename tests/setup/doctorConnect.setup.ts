import { test as setup } from "@playwright/test";

import { I18NNAMESPACE } from "../../src/lib/constants";
import { CareApi, FIXTURE_FACILITY, fullName } from "../helper/careApi";
import {
  DEPARTMENT_NAME,
  saveDoctorConnectData,
} from "../helper/doctorConnectData";

/** Where the plugin's build is served (`npm run start` uses this port). */
const PLUGIN_URL = process.env.REACT_PLUGIN_URL ?? "http://localhost:6173";

/**
 * Without a plugin config, CARE doesn't load the plugin and the encounter page
 * has no Doctor Connect button. The slug and name must be the plugin's
 * translation namespace, or its labels show as raw keys.
 */
setup("enable the plugin", async ({ request }) => {
  const api = await CareApi.login(request);
  await api.ensurePlugConfig({
    slug: I18NNAMESPACE,
    meta: {
      url: `${PLUGIN_URL}/assets/remoteEntry.js`,
      name: I18NNAMESPACE,
    },
  });
});

/**
 * `load_fixtures` does not put the doctor in any department, so add the
 * fixture doctor and nurse to a department the Doctor Connect sheet will list.
 */
setup("add a doctor and a nurse to a department", async ({ request }) => {
  const api = await CareApi.login(request);

  const facility = await api.findFacility(FIXTURE_FACILITY);
  const encounter = await api.findActiveEncounter(facility.id);
  const department = await api.ensureDepartment(facility.id, DEPARTMENT_NAME);

  const [doctor, nurse, doctorRole, nurseRole] = await Promise.all([
    api.getUser("care-doctor"),
    api.getUser("care-nurse"),
    api.findRole("Doctor"),
    api.findRole("Nurse"),
  ]);
  await api.ensureMember(facility.id, department.id, doctor.id, doctorRole.id);
  await api.ensureMember(facility.id, department.id, nurse.id, nurseRole.id);

  saveDoctorConnectData({
    facilityId: facility.id,
    patientId: encounter.patient.id,
    encounterId: encounter.id,
    department: department.name,
    doctor: { name: fullName(doctor), phone: doctor.phone_number },
    nurse: { name: fullName(nurse), phone: nurse.phone_number },
  });
});
