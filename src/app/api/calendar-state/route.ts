import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { CalendarSnapshotPayload } from "@/types/calendar-snapshot";

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function canAccess(email: string | null | undefined): email is string {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  const adminUsername = (process.env.ADMIN_USERNAME ?? "").trim().toLowerCase();
  if (adminUsername && normalized === adminUsername) return true;
  return parseAdminEmails().includes(normalized);
}

type CalendarSnapshotRow = {
  school_year: string;
  payload: CalendarSnapshotPayload;
  version: number;
  updated_at: string;
  updated_by: string;
};

type ChangeAction = "CREATE" | "UPDATE" | "CONFLICT_REJECTED";

interface ChangeSummary {
  changedDates: string[];
  changedFields: string[];
  totalChangedDates: number;
}

function mapRowToResponse(row: CalendarSnapshotRow) {
  return {
    schoolYear: row.school_year,
    payload: row.payload,
    version: row.version,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function summarizePayloadChanges(previous: CalendarSnapshotPayload | null, next: CalendarSnapshotPayload): ChangeSummary {
  if (!previous) {
    const allDates = Object.keys(next.days).sort();
    return {
      changedDates: allDates.slice(0, 60),
      changedFields: ["days", "cycleLength", "schoolYearStart", "schoolYearEnd", "exportMapping"],
      totalChangedDates: allDates.length,
    };
  }

  const changedFields: string[] = [];
  if (previous.cycleLength !== next.cycleLength) changedFields.push("cycleLength");
  if (previous.schoolYearStart !== next.schoolYearStart) changedFields.push("schoolYearStart");
  if (previous.schoolYearEnd !== next.schoolYearEnd) changedFields.push("schoolYearEnd");
  if (JSON.stringify(previous.exportMapping) !== JSON.stringify(next.exportMapping)) changedFields.push("exportMapping");

  const dateSet = new Set<string>([...Object.keys(previous.days), ...Object.keys(next.days)]);
  const changedDates = Array.from(dateSet).filter(
    (date) => JSON.stringify(previous.days[date]) !== JSON.stringify(next.days[date]),
  );
  if (changedDates.length > 0) changedFields.push("days");

  return {
    changedDates: changedDates.sort().slice(0, 60),
    changedFields,
    totalChangedDates: changedDates.length,
  };
}

async function writeChangeAudit(params: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  action: ChangeAction;
  schoolYear: string;
  actorEmail: string;
  baseVersion: number | null;
  newVersion: number | null;
  summary: ChangeSummary;
}) {
  const auditRow = {
    school_year: params.schoolYear,
    action: params.action,
    actor_email: params.actorEmail,
    base_version: params.baseVersion,
    new_version: params.newVersion,
    changed_dates: params.summary.changedDates,
    changed_fields: params.summary.changedFields,
    change_summary: {
      totalChangedDates: params.summary.totalChangedDates,
    },
  };
  const { error } = await params.supabase.from("calendar_change_log").insert(auditRow as never);

  if (error) {
    console.error("[AUDIT_LOG_ERROR]", error.message);
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!canAccess(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const schoolYear = searchParams.get("schoolYear")?.trim();
  if (!schoolYear) {
    return NextResponse.json({ error: "Missing schoolYear query parameter" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("calendar_snapshots")
    .select("school_year, payload, version, updated_at, updated_by")
    .eq("school_year", schoolYear)
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ snapshot: null }, { status: 200 });
  }

  return NextResponse.json({ snapshot: mapRowToResponse(data as CalendarSnapshotRow) }, { status: 200 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!canAccess(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    schoolYear?: string;
    payload?: CalendarSnapshotPayload;
    expectedVersion?: number | null;
  };

  const schoolYear = body.schoolYear?.trim();
  if (!schoolYear || !body.payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("calendar_snapshots")
    .select("school_year, payload, version, updated_at, updated_by")
    .eq("school_year", schoolYear)
    .limit(1)
    .maybeSingle();
  const existingRow = existing as unknown as CalendarSnapshotRow | null;

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existingRow) {
    const createSummary = summarizePayloadChanges(null, body.payload);
    const { data: inserted, error: insertError } = await supabase
      .from("calendar_snapshots")
      .insert({
        school_year: schoolYear,
        payload: body.payload,
        version: 1,
        updated_by: email,
      } as never)
      .select("school_year, payload, version, updated_at, updated_by")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await writeChangeAudit({
      supabase,
      action: "CREATE",
      schoolYear,
      actorEmail: email,
      baseVersion: null,
      newVersion: 1,
      summary: createSummary,
    });

    return NextResponse.json({ snapshot: mapRowToResponse(inserted as CalendarSnapshotRow) }, { status: 200 });
  }

  const expectedVersion = body.expectedVersion;
  if (expectedVersion !== existingRow.version) {
    await writeChangeAudit({
      supabase,
      action: "CONFLICT_REJECTED",
      schoolYear,
      actorEmail: email,
      baseVersion: expectedVersion ?? null,
      newVersion: existingRow.version,
      summary: summarizePayloadChanges(existingRow.payload as CalendarSnapshotPayload, body.payload),
    });
    return NextResponse.json(
      {
        error: "Version conflict",
        snapshot: mapRowToResponse(existingRow),
      },
      { status: 409 },
    );
  }

  const changeSummary = summarizePayloadChanges(existingRow.payload as CalendarSnapshotPayload, body.payload);
  if (changeSummary.changedFields.length === 0) {
    return NextResponse.json({ snapshot: mapRowToResponse(existingRow) }, { status: 200 });
  }

  const nextVersion = existingRow.version + 1;
  const { data: updated, error: updateError } = await supabase
    .from("calendar_snapshots")
    .update({
      payload: body.payload,
      version: nextVersion,
      updated_by: email,
    } as never)
    .eq("school_year", schoolYear)
    .eq("version", expectedVersion)
    .select("school_year, payload, version, updated_at, updated_by")
    .single();

  if (updateError) {
    const { data: latest } = await supabase
      .from("calendar_snapshots")
      .select("school_year, payload, version, updated_at, updated_by")
      .eq("school_year", schoolYear)
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      {
        error: "Version conflict",
        snapshot: latest ? mapRowToResponse(latest as CalendarSnapshotRow) : null,
      },
      { status: 409 },
    );
  }

  await writeChangeAudit({
    supabase,
    action: "UPDATE",
    schoolYear,
    actorEmail: email,
    baseVersion: expectedVersion ?? null,
    newVersion: nextVersion,
    summary: changeSummary,
  });

  return NextResponse.json({ snapshot: mapRowToResponse(updated as CalendarSnapshotRow) }, { status: 200 });
}
