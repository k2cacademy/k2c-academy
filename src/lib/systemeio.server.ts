// Minimal Systeme.io API client — server only.
// Docs: https://developer.systeme.io/
// Auth: header `X-API-Key`.

const BASE = "https://api.systeme.io/api";

function apiKey(): string {
  const k = process.env.SYSTEME_API_KEY;
  if (!k) throw new Error("SYSTEME_API_KEY is not configured");
  return k;
}

async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Systeme.io ${method} ${path} failed`, res.status, text);
    throw new Error(`Systeme.io ${path} -> ${res.status}`);
  }
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

export async function upsertContact(opts: {
  email: string;
  firstName?: string;
  fields?: Record<string, string | number | null>;
}): Promise<{ id: number }> {
  // Try create; if 409/422 (exists), fall back to lookup.
  try {
    const created = await call<{ id: number }>("POST", "/contacts", {
      email: opts.email,
      fields: [
        opts.firstName ? { slug: "first_name", value: opts.firstName } : null,
        ...Object.entries(opts.fields ?? {}).map(([slug, value]) => ({ slug, value })),
      ].filter(Boolean),
    });
    return created;
  } catch {
    // Try lookup
    const list = await call<{ items: { id: number; email: string }[] }>(
      "GET",
      `/contacts?email=${encodeURIComponent(opts.email)}`,
    );
    const found = list.items?.find((c) => c.email.toLowerCase() === opts.email.toLowerCase());
    if (!found) throw new Error("Systeme.io: contact upsert failed");
    return { id: found.id };
  }
}

export async function addTag(contactId: number, tagId: number): Promise<void> {
  await call("POST", `/contacts/${contactId}/tags`, { tagId });
}

export async function enrollInCourse(contactId: number, courseId: number): Promise<void> {
  // Systeme.io enrollment endpoint shape can vary by account; this is the documented one.
  await call("POST", `/school/courses/${courseId}/enrollments`, { contactId });
}

export async function enrollStudent(email: string, firstName?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const courseId = Number(process.env.SYSTEMEIO_COURSE_ID);
    const tagId = Number(process.env.SYSTEMEIO_STUDENT_TAG_ID);
    const contact = await upsertContact({ email, firstName });
    if (Number.isFinite(tagId) && tagId > 0) {
      await addTag(contact.id, tagId).catch((e) => console.warn("Systeme.io tag failed", e));
    }
    if (Number.isFinite(courseId) && courseId > 0) {
      await enrollInCourse(contact.id, courseId).catch((e) =>
        console.warn("Systeme.io enroll failed", e),
      );
    }
    return { ok: true };
  } catch (e) {
    console.error("Systeme.io enrollment error", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
