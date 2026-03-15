import { onAuthStateChanged, type User } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY";

export type Member = {
  id: string;
  name: string;
  phone: string;
  type?: string;
  area?: string;
  email?: string;
  attendanceStatus?: AttendanceStatus | null;
  attendedToday: boolean;
  prasadam: number;
};

export type MemberType = "devotee" | "volunteer";

export type CreateMemberInput = {
  name: string;
  phone: string;
  type: MemberType;
  area?: string;
};

export type UpdateMemberInput = {
  name?: string;
  type?: MemberType;
  area?: string;
};

export type MemberDetails = Member & {
  presentDaysCount: number;
};

export type MemberPresentDaysByMonth = {
  month: string;
  days: string[];
  presentDaysCount: number;
};

export type MemberImportError = {
  row: number;
  name: string;
  message: string;
};

export type MemberImportResult = {
  total: number;
  created: number;
  existing: number;
  attendanceMarked: number;
  errors: MemberImportError[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

const formatSelectedDate = (value?: string) => {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) {
    return "";
  }

  return trimmedValue.slice(0, 10);
};

const buildApiUrl = (path: string) => {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
};

const readJsonSafely = async (response: Response) => {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

const getErrorMessage = (payload: unknown, fallbackMessage: string) => {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim().length > 0) {
    return record.message;
  }

  if (typeof record.error === "string" && record.error.trim().length > 0) {
    return record.error;
  }

  return fallbackMessage;
};

const waitForCurrentUser = async () => {
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    return auth.currentUser;
  }

  return await new Promise<User | null>((resolve) => {
    let unsubscribe: (() => void) | null = null;
    const timeoutId = window.setTimeout(() => {
      unsubscribe?.();
      resolve(null);
    }, 3000);

    unsubscribe = onAuthStateChanged(auth, (user) => {
      window.clearTimeout(timeoutId);
      unsubscribe?.();
      resolve(user);
    });
  });
};

const getAuthHeaders = async () => {
  const user = await waitForCurrentUser();
  if (!user) {
    throw new Error("Admin session not found. Please login again.");
  }

  const idToken = await user.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
  };
};

const parseAttendanceStatus = (raw: Record<string, unknown>) => {
  if (
    raw.attendanceStatus === "PRESENT" ||
    raw.attendanceStatus === "ABSENT" ||
    raw.attendanceStatus === "HALF_DAY"
  ) {
    return raw.attendanceStatus;
  }

  if (
    raw.status === "PRESENT" ||
    raw.status === "ABSENT" ||
    raw.status === "HALF_DAY"
  ) {
    return raw.status;
  }

  const attendance = raw.attendance;
  if (attendance && typeof attendance === "object") {
    const attendanceRecord = attendance as Record<string, unknown>;
    if (
      attendanceRecord.status === "PRESENT" ||
      attendanceRecord.status === "ABSENT" ||
      attendanceRecord.status === "HALF_DAY"
    ) {
      return attendanceRecord.status;
    }
  }

  return null;
};

const parsePrasadam = (raw: Record<string, unknown>) => {
  if (typeof raw.prasadam === "number" && Number.isFinite(raw.prasadam)) {
    return Math.max(0, raw.prasadam);
  }

  const attendance = raw.attendance;
  if (attendance && typeof attendance === "object") {
    const attendanceRecord = attendance as Record<string, unknown>;
    if (
      typeof attendanceRecord.prasadam === "number" &&
      Number.isFinite(attendanceRecord.prasadam)
    ) {
      return Math.max(0, attendanceRecord.prasadam);
    }
  }

  return 0;
};

const parseAttendedForDate = (
  raw: Record<string, unknown>,
  selectedDate?: string,
) => {
  const normalizedSelectedDate = formatSelectedDate(selectedDate);
  const attendanceStatus = parseAttendanceStatus(raw);

  if (typeof raw.attendedToday === "boolean" && !normalizedSelectedDate) {
    return raw.attendedToday;
  }

  if (typeof raw.isAttendedToday === "boolean" && !normalizedSelectedDate) {
    return raw.isAttendedToday;
  }

  if (typeof raw.alreadyMarked === "boolean" && !normalizedSelectedDate) {
    return raw.alreadyMarked;
  }

  if (
    (raw.todayStatus === "PRESENT" || attendanceStatus === "PRESENT") &&
    !normalizedSelectedDate
  ) {
    return true;
  }

  if (typeof raw.date === "string") {
    const attendanceDate = raw.date.slice(0, 10);
    if (normalizedSelectedDate) {
      return (
        attendanceDate === normalizedSelectedDate &&
        attendanceStatus === "PRESENT"
      );
    }
  }

  const attendanceDateSource =
    typeof raw.attendanceDate === "string"
      ? raw.attendanceDate
      : typeof raw.lastAttendanceAt === "string"
        ? raw.lastAttendanceAt
        : typeof raw.markedAt === "string"
          ? raw.markedAt
          : null;

  if (attendanceDateSource && normalizedSelectedDate) {
    return (
      attendanceDateSource.slice(0, 10) === normalizedSelectedDate &&
      attendanceStatus === "PRESENT"
    );
  }

  const attendance = raw.attendance;
  if (attendance && typeof attendance === "object") {
    const attendanceRecord = attendance as Record<string, unknown>;
    if (
      typeof attendanceRecord.date === "string" &&
      normalizedSelectedDate &&
      attendanceRecord.date.slice(0, 10) === normalizedSelectedDate
    ) {
      return attendanceRecord.status === "PRESENT";
    }

    if (
      typeof attendanceRecord.attendedToday === "boolean" &&
      !normalizedSelectedDate
    ) {
      return attendanceRecord.attendedToday;
    }

    if (attendanceRecord.status === "PRESENT" && !normalizedSelectedDate) {
      return true;
    }
  }

  return attendanceStatus === "PRESENT";
};

const toMember = (raw: unknown, selectedDate?: string): Member | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const idSource = record.id ?? record._id ?? record.memberId;
  if (!idSource) {
    return null;
  }

  const name =
    typeof record.name === "string"
      ? record.name
      : typeof record.fullName === "string"
        ? record.fullName
        : "Unnamed Member";

  const phone =
    typeof record.phone === "string"
      ? record.phone
      : typeof record.phoneNumber === "string"
        ? record.phoneNumber
        : "";

  return {
    id: String(idSource),
    name,
    phone,
    type: typeof record.type === "string" ? record.type : undefined,
    area: typeof record.area === "string" ? record.area : undefined,
    email: typeof record.email === "string" ? record.email : undefined,
    attendanceStatus: parseAttendanceStatus(record),
    attendedToday: parseAttendedForDate(record, selectedDate),
    prasadam: parsePrasadam(record),
  };
};

const extractMembers = (payload: unknown, selectedDate?: string): Member[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => toMember(item, selectedDate))
      .filter((member): member is Member => member !== null);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.members,
    record.results,
    record.items,
    record.data,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const members = candidate
      .map((item) => toMember(item, selectedDate))
      .filter((member): member is Member => member !== null);
    if (members.length > 0) {
      return members;
    }
  }

  const singleMember = toMember(
    record.member ?? record.data ?? record.result ?? record,
    selectedDate,
  );
  return singleMember ? [singleMember] : [];
};

const fetchMembersFrom = async (path: string, selectedDate?: string) => {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(path), {
    method: "GET",
    headers: {
      ...authHeaders,
    },
  });

  const payload = await readJsonSafely(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Unable to load members."));
  }

  return extractMembers(payload, selectedDate);
};

const requestJson = async (
  path: string,
  init: RequestInit,
  fallbackMessage: string,
) => {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(init.headers ?? {}),
    },
  });

  const payload = await readJsonSafely(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, fallbackMessage));
  }

  return payload;
};

export const getMembers = async (query?: string, selectedDate?: string) => {
  const trimmedQuery = query?.trim() ?? "";
  const normalizedSelectedDate = formatSelectedDate(selectedDate);

  const searchParams = new URLSearchParams();
  if (trimmedQuery) {
    searchParams.set("search", trimmedQuery);
  }
  if (normalizedSelectedDate) {
    searchParams.set("date", normalizedSelectedDate);
  }

  const path =
    searchParams.size > 0
      ? `/api/members?${searchParams.toString()}`
      : "/api/members";

  return await fetchMembersFrom(path, normalizedSelectedDate);
};

export const createMember = async (input: CreateMemberInput) => {
  const payload = await requestJson(
    "/api/members",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    "Unable to create member.",
  );

  const [member] = extractMembers(payload);
  if (!member) {
    throw new Error("Member created but response did not include member data.");
  }

  return member;
};

export const updateMember = async (
  memberId: string,
  input: UpdateMemberInput,
) => {
  const payload = await requestJson(
    `/api/members/${memberId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
    "Unable to update member.",
  );

  const [member] = extractMembers(payload);
  if (!member) {
    throw new Error("Member updated but response did not include member data.");
  }

  return member;
};

export const getMemberDetails = async (memberId: string, date?: string) => {
  const normalizedSelectedDate = formatSelectedDate(date);
  const searchParams = new URLSearchParams();

  if (normalizedSelectedDate) {
    searchParams.set("date", normalizedSelectedDate);
  }

  const path =
    searchParams.size > 0
      ? `/api/members/${memberId}?${searchParams.toString()}`
      : `/api/members/${memberId}`;

  const payload = await requestJson(path, { method: "GET" }, "Unable to load member details.");
  const [member] = extractMembers(payload, normalizedSelectedDate);

  if (!member) {
    throw new Error("Unable to load member details.");
  }

  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;
  const data =
    record && record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : null;

  const presentDaysCountRaw = data?.presentDaysCount;
  const presentDaysCount =
    typeof presentDaysCountRaw === "number" && Number.isFinite(presentDaysCountRaw)
      ? presentDaysCountRaw
      : 0;

  return {
    ...member,
    presentDaysCount,
  } satisfies MemberDetails;
};

export const getMemberPresentDaysByMonth = async (
  memberId: string,
  month: string,
) => {
  const normalizedMonth = month.trim().slice(0, 7);

  const payload = await requestJson(
    `/api/members/${memberId}/present-days?month=${encodeURIComponent(normalizedMonth)}`,
    { method: "GET" },
    "Unable to load present days.",
  );

  if (!payload || typeof payload !== "object") {
    return {
      month: normalizedMonth,
      days: [],
      presentDaysCount: 0,
    } satisfies MemberPresentDaysByMonth;
  }

  const record = payload as Record<string, unknown>;
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : null;

  const rawDays = data?.days;
  const days = Array.isArray(rawDays)
    ? rawDays.filter((value): value is string => typeof value === "string")
    : [];
  const rawCount = data?.presentDaysCount;

  return {
    month: typeof data?.month === "string" ? data.month : normalizedMonth,
    days,
    presentDaysCount:
      typeof rawCount === "number" && Number.isFinite(rawCount)
        ? rawCount
        : days.length,
  } satisfies MemberPresentDaysByMonth;
};

export const importMembersFile = async (
  file: File,
): Promise<MemberImportResult> => {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl("/api/members/import"), {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    body: await file.arrayBuffer(),
  });

  const payload = await readJsonSafely(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Unable to import members."));
  }

  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;
  const data =
    record?.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : null;
  const rawErrors = Array.isArray(data?.errors) ? data.errors : [];

  return {
    total:
      typeof data?.total === "number" && Number.isFinite(data.total)
        ? data.total
        : 0,
    created:
      typeof data?.created === "number" && Number.isFinite(data.created)
        ? data.created
        : 0,
    existing:
      typeof data?.existing === "number" && Number.isFinite(data.existing)
        ? data.existing
        : 0,
    attendanceMarked:
      typeof data?.attendanceMarked === "number" &&
      Number.isFinite(data.attendanceMarked)
        ? data.attendanceMarked
        : 0,
    errors: rawErrors
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const errorRecord = item as Record<string, unknown>;
        return {
          row:
            typeof errorRecord.row === "number" && Number.isFinite(errorRecord.row)
              ? errorRecord.row
              : 0,
          name:
            typeof errorRecord.name === "string"
              ? errorRecord.name
              : "Unknown member",
          message:
            typeof errorRecord.message === "string"
              ? errorRecord.message
              : "Unable to import this row.",
        } satisfies MemberImportError;
      })
      .filter((item): item is MemberImportError => item !== null),
  } satisfies MemberImportResult;
};

export const downloadMemberImportTemplate = async (): Promise<void> => {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl("/api/members/import/template"), {
    method: "GET",
    headers: {
      ...authHeaders,
    },
  });

  if (!response.ok) {
    const payload = await readJsonSafely(response);
    throw new Error(
      getErrorMessage(payload, "Unable to download import template."),
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "members_import_template.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
};
