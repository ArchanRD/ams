import { onAuthStateChanged, type User } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase";

export type MemberType = "devotee" | "volunteer";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY";

export type AttendanceUser = {
  id: string;
  name: string;
  phone?: string;
  type?: MemberType;
  attendedToday: boolean;
  lastAttendanceAt?: string;
};

export type CreateAttendanceUserInput = {
  name: string;
  phone: string;
  type: MemberType;
};

export type MarkAttendanceResult = {
  user: AttendanceUser;
  alreadyMarked: boolean;
};

export type UnmarkAttendanceResult = {
  memberId: string;
  date: string;
  unmarked: boolean;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

const buildApiUrl = (path: string) => {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
};

const getTodayLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeAttendanceDate = (date?: string) => {
  const trimmedDate = date?.trim();
  if (!trimmedDate) {
    return getTodayLocalDate();
  }

  return trimmedDate.slice(0, 10);
};

const readJsonSafely = async (response: Response) => {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

const getErrorMessageFromPayload = (
  payload: unknown,
  fallbackMessage: string,
) => {
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

  const user = await new Promise<User | null>((resolve) => {
    let unsubscribe: (() => void) | null = null;
    const timeoutId = window.setTimeout(() => {
      unsubscribe?.();
      resolve(null);
    }, 3000);

    unsubscribe = onAuthStateChanged(auth, (resolvedUser) => {
      window.clearTimeout(timeoutId);
      unsubscribe?.();
      resolve(resolvedUser);
    });
  });

  return user;
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

const requestJson = async <T>(
  path: string,
  init: RequestInit,
  fallbackError: string,
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
    throw new Error(getErrorMessageFromPayload(payload, fallbackError));
  }

  if (response.status === 204) {
    return null as T;
  }

  return payload as T;
};

const parseAttendedToday = (
  raw: Record<string, unknown>,
  selectedDate: string = getTodayLocalDate(),
) => {
  if (typeof raw.attendedToday === "boolean") {
    return raw.attendedToday;
  }

  if (typeof raw.isAttendedToday === "boolean") {
    return raw.isAttendedToday;
  }

  if (typeof raw.alreadyMarked === "boolean") {
    return raw.alreadyMarked;
  }

  if (raw.todayStatus === "PRESENT" || raw.attendanceStatus === "PRESENT") {
    return true;
  }

  if (raw.status === "PRESENT" && typeof raw.date === "string") {
    return raw.date.slice(0, 10) === selectedDate;
  }

  const attendance = raw.attendance;
  if (attendance && typeof attendance === "object") {
    const attendanceRecord = attendance as Record<string, unknown>;
    if (typeof attendanceRecord.attendedToday === "boolean") {
      return attendanceRecord.attendedToday;
    }

    if (
      attendanceRecord.status === "PRESENT" &&
      typeof attendanceRecord.date === "string"
    ) {
      return attendanceRecord.date.slice(0, 10) === selectedDate;
    }
  }

  return false;
};

const getMemberType = (raw: Record<string, unknown>) => {
  if (raw.type === "devotee" || raw.type === "volunteer") {
    return raw.type;
  }

  return undefined;
};

const toAttendanceUser = (
  raw: unknown,
  selectedDate: string = getTodayLocalDate(),
): AttendanceUser | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const idSource = record.id ?? record._id ?? record.memberId ?? record.userId;
  if (!idSource) {
    return null;
  }

  const name =
    typeof record.name === "string"
      ? record.name
      : typeof record.fullName === "string"
        ? record.fullName
        : [record.firstName, record.lastName]
            .filter(
              (part): part is string =>
                typeof part === "string" && part.length > 0,
            )
            .join(" ")
            .trim() || "Unnamed Member";

  return {
    id: String(idSource),
    name,
    phone:
      typeof record.phone === "string"
        ? record.phone
        : typeof record.phoneNumber === "string"
          ? record.phoneNumber
          : undefined,
    type: getMemberType(record),
    attendedToday: parseAttendedToday(record, selectedDate),
    lastAttendanceAt:
      typeof record.lastAttendanceAt === "string"
        ? record.lastAttendanceAt
        : typeof record.lastSeenAt === "string"
          ? record.lastSeenAt
          : undefined,
  };
};

const extractUsersFromPayload = (
  payload: unknown,
  selectedDate: string = getTodayLocalDate(),
): AttendanceUser[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => toAttendanceUser(item, selectedDate))
      .filter((user): user is AttendanceUser => user !== null);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.members,
    record.users,
    record.results,
    record.data,
    record.items,
    record.member,
    record.user,
    record.result,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (Array.isArray(candidate)) {
      const users = candidate
        .map((item) => toAttendanceUser(item, selectedDate))
        .filter((user): user is AttendanceUser => user !== null);
      if (users.length > 0) {
        return users;
      }
      continue;
    }

    const user = toAttendanceUser(candidate, selectedDate);
    if (user) {
      return [user];
    }
  }

  const directUser = toAttendanceUser(record, selectedDate);
  return directUser ? [directUser] : [];
};

export const searchUsers = async (query: string) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [] as AttendanceUser[];
  }

  const payload = await requestJson<unknown>(
    `/api/members/search?q=${encodeURIComponent(trimmedQuery)}`,
    { method: "GET" },
    "Unable to search members.",
  );

  return extractUsersFromPayload(payload);
};

export const createUser = async (input: CreateAttendanceUserInput) => {
  const payload = await requestJson<unknown>(
    "/api/members",
    {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        phone: input.phone,
        type: input.type,
      }),
    },
    "Unable to create member.",
  );

  const [createdUser] = extractUsersFromPayload(payload);
  if (!createdUser) {
    throw new Error("Member was created but response was missing member data.");
  }

  return createdUser;
};

export const markAttendanceForDate = async (
  memberId: string,
  date: string,
  status: AttendanceStatus = "PRESENT",
): Promise<MarkAttendanceResult> => {
  const normalizedDate = normalizeAttendanceDate(date);
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl("/api/attendance/mark"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      memberId,
      date: normalizedDate,
      status,
      overwrite: false,
    }),
  });

  const payload = await readJsonSafely(response);
  const extractedUser = extractUsersFromPayload(payload, normalizedDate)[0];

  if (response.ok) {
    const user = extractedUser ?? {
      id: memberId,
      name: "Member",
      attendedToday: status === "PRESENT",
    };

    return {
      user: {
        ...user,
        attendedToday: status === "PRESENT",
      },
      alreadyMarked: false,
    };
  }

  if (response.status === 409) {
    const user = extractedUser ?? {
      id: memberId,
      name: "Member",
      attendedToday: true,
    };

    return {
      user: {
        ...user,
        attendedToday: true,
      },
      alreadyMarked: true,
    };
  }

  throw new Error(
    getErrorMessageFromPayload(payload, "Unable to mark attendance."),
  );
};

export const markAttendanceForToday = async (
  memberId: string,
  status: AttendanceStatus = "PRESENT",
): Promise<MarkAttendanceResult> => {
  return markAttendanceForDate(memberId, getTodayLocalDate(), status);
};

export const unmarkAttendanceForDate = async (
  memberId: string,
  date: string,
): Promise<UnmarkAttendanceResult> => {
  const normalizedDate = normalizeAttendanceDate(date);
  const payload = await requestJson<{ data?: UnmarkAttendanceResult }>(
    "/api/attendance/mark",
    {
      method: "DELETE",
      body: JSON.stringify({
        memberId,
        date: normalizedDate,
      }),
    },
    "Unable to unmark attendance.",
  );

  const result = payload?.data;
  if (!result) {
    return {
      memberId,
      date: normalizedDate,
      unmarked: false,
    };
  }

  return result;
};
