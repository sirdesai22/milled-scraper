"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { EmailCapture } from "@/components/EmailCapture";
import { ScrapeJob } from "@/lib/types";

export default function ReportLandingPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [emailCount, setEmailCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccessAndLoadJob() {
      const hasAccess = localStorage.getItem(`report_access_${jobId}`);
      if (hasAccess === "true") {
        router.replace(`/report/${jobId}/view`);
        return;
      }
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const me = meRes.ok ? await meRes.json() : {};
      if (me.isAdmin) {
        router.replace(`/report/${jobId}/view`);
        return;
      }

      // Load job details
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch job");
        }
        const jobData = await res.json();
        setJob(jobData);

        // Fetch email count
        const emailsRes = await fetch(`/api/jobs/${jobId}/emails`);
        if (emailsRes.ok) {
          const emailsData = await emailsRes.json();
          setEmailCount(emailsData.length);
        }
      } catch (error) {
        console.error("Error loading job:", error);
      } finally {
        setLoading(false);
      }
    }

    checkAccessAndLoadJob();
  }, [jobId, router]);

  function handleSuccess() {
    router.push(`/report/${jobId}/view`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Report Not Found
          </h1>
          <p className="text-slate-600 mb-4">
            This report does not exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 hover:text-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <EmailCapture
        jobId={jobId}
        brandName={job.brand_name}
        emailCount={emailCount}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
