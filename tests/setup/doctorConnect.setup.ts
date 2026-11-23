import { test as setup } from "@playwright/test";

import { CareApi, FIXTURE_FACILITY, fullName } from "../helper/careApi";
import {
  DEPARTMENT_NAME,
  saveDoctorConnectData,
} from "../helper/doctorConnectData";

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
