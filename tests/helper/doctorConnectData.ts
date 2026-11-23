import fs from "fs";
import path from "path";

/**
 * A department the setup creates once and reuses on later runs, so repeated
 * local runs don't keep adding departments to the fixture facility.
 */
export const DEPARTMENT_NAME = "Doctor Connect E2E";

export interface Member {
  name: string;
  phone: string;
}

export interface DoctorConnectData {
  facilityId: string;
  patientId: string;
  encounterId: string;
  department: string;
  doctor: Member;
  nurse: Member;
}

const DATA_FILE = path.resolve("tests/.auth/doctorConnect.json");

export function saveDoctorConnectData(data: DoctorConnectData) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/** Call inside a test or hook: the setup project writes this file. */
export function loadDoctorConnectData(): DoctorConnectData {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(
      `${DATA_FILE} is missing. Run the "setup" project first (npm run test:e2e runs it automatically).`,
    );
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

export const encounterPath = (data: DoctorConnectData) =>
  `/facility/${data.facilityId}/patient/${data.patientId}/encounter/${data.encounterId}/updates`;
