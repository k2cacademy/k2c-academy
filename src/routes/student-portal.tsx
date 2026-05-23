import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/student-portal.functions";
import { CodeGate } from "@/components/student/CodeGate";
import { Onboarding } from "@/components/student/Onboarding";
import { CoachChat } from "@/components/student/CoachChat";

const SESSION_KEY = "k2c_student_session";
const VERIFIED_KEY = "k2c_student_verified";

export const Route = createFileRoute("/student-portal")({
  head: () => ({
    meta: [
      { title: "Student Portal — K2Ç Academy" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StudentPortalPage,
});

type Profile = {
  first_name: string | null;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  birthday_md: string | null;
  network: string | null;
  onboarding_complete: boolean;
  trial_start: string | null;
  trial_end: string | null;
  inner_circle_status: string | null;
};

function StudentPortalPage() {
  const [session, setSession] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchProfile = useServerFn(getProfile);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const verified = localStorage.getItem(VERIFIED_KEY);
    const s = localStorage.getItem(SESSION_KEY);
    if (verified === "true" && s) {
      setSession(s);
      fetchProfile({ data: { session: s } })
        .then((p) => setProfile(p as Profile | null))
        .catch(() => {
          localStorage.removeItem(VERIFIED_KEY);
          localStorage.removeItem(SESSION_KEY);
          setSession(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <CodeGate
        onVerified={(s) => {
          localStorage.setItem(VERIFIED_KEY, "true");
          localStorage.setItem(SESSION_KEY, s);
          setSession(s);
          fetchProfile({ data: { session: s } }).then((p) => setProfile(p as Profile | null));
        }}
      />
    );
  }

  if (!profile || !profile.onboarding_complete) {
    return (
      <Onboarding
        session={session}
        onDone={() => fetchProfile({ data: { session } }).then((p) => setProfile(p as Profile | null))}
      />
    );
  }

  return <CoachChat session={session} profile={profile} />;
}
