import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { z } from "zod";

const profileSchema = z.object({
  firstName: z.string().max(80),
  lastName: z.string().max(80),
  dateOfBirth: z.string().max(20),
  gender: z.enum(["male", "female", "x"]),
  postalCode: z.string().min(3).max(12),
  streetAddress: z.string().max(180),
  contactEmail: z.string().max(160),
  contactPhone: z.string().max(40),
  licenceClass: z.enum(["G", "G2", "G1"]),
  licensingHistory: z.enum(["ontario_graduated", "transferred"]),
  licenceOrigin: z.string().max(100),
  ontarioLicenceIssueDate: z.string().max(10),
  firstLicensedYear: z.string().max(4),
  g1LicenceDate: z.string().max(10),
  g2LicenceDate: z.string().max(10),
  gLicenceDate: z.string().max(10),
  maritalStatus: z.enum(["single", "married", "common_law"]),
  employmentStatus: z.enum(["employed", "student", "retired", "other"]),
  vehicleRelationship: z.enum(["planned", "owned"]),
  vehicleYear: z.string().min(4).max(4),
  vehicleMake: z.string().min(1).max(80),
  vehicleModel: z.string().min(1).max(120),
  vehicleCondition: z.enum(["new", "used"]),
  vehicleOwnership: z.enum(["owned", "financed", "leased"]),
  annualKilometres: z.string().max(12),
  primaryUse: z.enum(["personal", "business"]),
  commuteKilometres: z.string().max(12),
  overnightParking: z.enum(["private_garage", "driveway", "street", "other"]),
  winterTires: z.boolean(),
  hasVin: z.boolean(),
  claimsLastSixYears: z.enum(["0", "1", "2+"]),
  convictionsLastThreeYears: z.enum(["0", "1", "2+"]),
  suspensionsLastSixYears: z.enum(["0", "1+"]),
  continuousInsuranceYears: z.enum(["0", "1-2", "3-5", "5+"]),
  policyStartDate: z.string().max(20),
  liabilityLimit: z.enum(["1000000", "2000000"]),
  collisionCoverage: z.boolean(),
  comprehensiveCoverage: z.boolean(),
  deductible: z.enum(["500", "1000", "2000"]),
  opcf44r: z.boolean(),
  telematics: z.boolean(),
});

const startSchema = z.object({
  routeId: z.enum(["allstate", "aviva", "squareone", "rates", "td", "desjardins", "lowestrates"]),
  profile: profileSchema,
  consentToOpenVisibleBrowser: z.literal(true),
  profileMode: z.enum(["hypothetical", "personal_live"]),
  holdMs: z.number().int().min(0).max(120_000).default(4_000),
});

const jobIdSchema = z.string().uuid();

type WorkerEvent = {
  id: string;
  at: string;
  tone: "neutral" | "active" | "success" | "warning";
  message: string;
};

type WorkerResult = {
  status: "manual_handoff" | "waiting_human" | "access_blocked" | "blocked" | "unresolved";
  routeId: "allstate" | "aviva" | "squareone" | "rates" | "td" | "desjardins" | "lowestrates";
  completedFields: string[];
  blocker: string | null;
};

type AgentJob = {
  id: string;
  status: "starting" | "running" | "complete" | "error";
  routeId: "allstate" | "aviva" | "squareone" | "rates" | "td" | "desjardins" | "lowestrates";
  events: WorkerEvent[];
  result: WorkerResult | null;
  error: string | null;
  startedAt: string;
  updatedAt: string;
  child: ChildProcessWithoutNullStreams;
};

const globalForJobs = globalThis as typeof globalThis & {
  __reachrateAgentJobs?: Map<string, AgentJob>;
};

const jobs = globalForJobs.__reachrateAgentJobs ?? new Map<string, AgentJob>();
globalForJobs.__reachrateAgentJobs = jobs;

function publicJob(job: AgentJob) {
  return {
    id: job.id,
    status: job.status,
    routeId: job.routeId,
    events: job.events,
    result: job.result,
    error: job.error,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
  };
}

function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function cleanupJobs() {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [jobId, job] of jobs) {
    if (Date.parse(job.updatedAt) < cutoff) {
      if (!job.child.killed) job.child.kill();
      jobs.delete(jobId);
    }
  }
}

export async function POST(request: Request) {
  if (!isLocalRequest(request)) {
    return Response.json(
      { error: "The visible browser worker is restricted to localhost." },
      { status: 403 },
    );
  }

  if (process.env.LOCAL_BROWSER_AGENT_ENABLED !== "true") {
    return Response.json(
      {
        error:
          "The local visible-browser worker is disabled. Set LOCAL_BROWSER_AGENT_ENABLED=true only for a supervised demo.",
      },
      { status: 503 },
    );
  }

  cleanupJobs();
  const activeJob = [...jobs.values()].find((job) =>
    ["starting", "running"].includes(job.status),
  );
  if (activeJob) {
    return Response.json(
      { error: "A visible browser job is already active.", job: publicJob(activeJob) },
      { status: 409 },
    );
  }

  try {
    const input = startSchema.parse(await request.json());
    const jobId = randomUUID();
    const now = new Date().toISOString();
    const workerPath = path.join(process.cwd(), "scripts", "route-agent-worker.mjs");
    const child = spawn(process.execPath, [workerPath], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        REACHRATE_AGENT_JOB_ID: jobId,
      },
    });

    const job: AgentJob = {
      id: jobId,
      status: "starting",
      routeId: input.routeId,
      events: [],
      result: null,
      error: null,
      startedAt: now,
      updatedAt: now,
      child,
    };
    jobs.set(jobId, job);

    let outputBuffer = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      outputBuffer += chunk;
      const lines = outputBuffer.split(/\r?\n/);
      outputBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line) as
            | { type: "event"; event: WorkerEvent }
            | { type: "result"; result: WorkerResult };
          job.updatedAt = new Date().toISOString();
          if (message.type === "event") {
            job.status = "running";
            job.events = [...job.events.slice(-29), message.event];
          } else {
            job.status = "running";
            job.result = message.result;
          }
        } catch {
          // Ignore non-protocol output from Chromium or Playwright.
        }
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", () => {
      job.updatedAt = new Date().toISOString();
    });
    child.on("error", () => {
      job.status = "error";
      job.error = "The local browser worker could not be started.";
      job.updatedAt = new Date().toISOString();
    });
    child.on("exit", (code) => {
      if (job.status !== "error") {
        if (job.result && code === 0) {
          job.status = "complete";
          job.error = null;
        } else {
          job.status = code === 0 ? "complete" : "error";
          job.error = code === 0 ? null : "The visible browser worker ended before returning a result.";
        }
      }
      job.updatedAt = new Date().toISOString();
    });

    child.stdin.end(JSON.stringify(input));
    return Response.json({ job: publicJob(job) }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid browser-agent request.", issues: error.issues },
        { status: 400 },
      );
    }
    return Response.json({ error: "Unable to launch the local browser worker." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isLocalRequest(request)) {
    return Response.json({ error: "Localhost only." }, { status: 403 });
  }

  cleanupJobs();
  const jobId = new URL(request.url).searchParams.get("jobId");
  const parsedJobId = jobIdSchema.safeParse(jobId);
  if (!parsedJobId.success) {
    return Response.json({ error: "A valid jobId is required." }, { status: 400 });
  }

  const job = jobs.get(parsedJobId.data);
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
  return Response.json({ job: publicJob(job) });
}
