import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CodeGate } from "@/components/student/CodeGate";
import { Onboarding } from "@/components/student/Onboarding";
import { CoachChat } from "@/components/student/CoachChat";
import {
  Users, Phone, Award, Gift, Settings,
  BarChart3, LogOut, Shield,
} from "lucide-react";

const SESSION_KEY = "k2c_student_session";
const VERIFIED_KEY = "k2c_student_verified";
const ADMIN_PASSWORD = "Nathyfundy001.com";

const AMBASSADORS = [
  { name: "Dornu Esther", phone: "08055033240", network: "Glo", role: "Ads Manager" },
  { name: "Eyong Goodnews", phone: "09131103682", network: "MTN", role: "Community Manager 2" },
  { name: "Sunday Obi", phone: "07059391256", network: "Glo", role: "Social Media Manager" },
  { name: "Vincent Joseph", phone: "07071753752", network: "MTN", role: "Graphic Designer" },
  { name: "Louis Ekemini", phone: "08026233453", network: "Airtel", role: "Ambassador" },
  { name: "Effa Minka Aliche", phone: "08052062005", network: "Glo", role: "Community Manager 1" },
  { name: "Ifeoma", phone: "08062239402", network: "MTN", role: "Copywriter" },
  { name: "Ayuk Felix", phone: "08163156939", network: "MTN", role: "Cinematographer" },
  { name: "Digital Nathy", phone: "09164266235", network: "MTN", role: "Founder" },
];

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

function AdminPanel() {
  const [tab, setTab] = useState("dashboard");
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "students", label: "Students", icon: Users },
    { id: "calls", label: "Voice Calls", icon: Phone },
    { id: "ambassadors", label: "Ambassadors", icon: Award },
    { id: "birthdays", label: "Birthdays", icon: Gift },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-sm">K2Ç Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Digital Nathy</p>
          </div>
        </div>
        <a
          href="/student-portal"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm"
        >
          <LogOut className="h-4 w-4" /> Exit
        </a>
      </div>

      <div className="border-b border-border bg-card overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {tab === "dashboard" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Total Students", value: "—", color: "text-primary" },
                { label: "Active Trials", value: "—", color: "text-yellow-400" },
                { label: "First Sales Made", value: "—", color: "text-green-400" },
                { label: "Voice Call Minutes", value: "—", color: "text-blue-400" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-foreground mb-3">Quick Links</h3>
              <div className="space-y-2">
                {[
                  { label: "Course on Systeme.io", url: "https://oniahemmanuel.systeme.io/da36229f" },
                  { label: "Sunday Class WhatsApp", url: "https://chat.whatsapp.com/CrNR2l6QeOq5dqkLk7jlKf" },
                  { label: "Inner Circle WhatsApp", url: "https://chat.whatsapp.com/BIisZp0VxZE5WOE2WPKCQh" },
                  { label: "Partners WhatsApp", url: "https://chat.whatsapp.com/GqsfcCpqr4cLMOmD0ClS7S" },
                  { label: "Selar Store", url: "https://selar.com/m/K2%C3%87Academy" },
                  { label: "TidyCal Bookings", url: "https://tidycal.com/oniahemmanuel/30-minute-meeting" },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-primary/10 transition text-sm text-foreground"
                  >
                    {link.label} <span className="text-primary">→</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab === "students" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Students</h2>
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Student data loads from Supabase.</p>
            </div>
          </div>
        )}
        {tab === "calls" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Voice Calls</h2>
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Voice call logs will appear here.</p>
            </div>
          </div>
        )}
        {tab === "ambassadors" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Ambassadors</h2>
            <p className="text-sm text-muted-foreground">
              Monthly 1GB data sent on the 1st via ClubKonnect
            </p>
            <div className="space-y-3">
              {AMBASSADORS.map((a) => (
                <div
                  key={a.phone}
                  className="rounded-xl border border-border bg-card p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground text-sm">{a.name}</p>
                    <p className="text-xs text-primary">{a.role}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.phone} · {a.network}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{a.network[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "birthdays" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Birthday Log</h2>
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Birthday log loads from Supabase.</p>
            </div>
          </div>
        )}
        {tab === "settings" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Settings</h2>
            <div className="space-y-3">
              {[
                { label: "Course Price", value: "₦9,997" },
                { label: "Inner Circle", value: "₦1,000/month" },
                { label: "Trial Period", value: "14 days free" },
                { label: "Student Portal Code", value: "K2C-STUDENT" },
                { label: "WhatsApp", value: "09164266235" },
                { label: "Admin Email", value: "k2cacademy001@gmail.com" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-card p-4 flex items-center justify-between"
                >
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-semibold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function fetchProfile(session: string): Promise<Profile | null> {
  try {
    const { getProfile } = await import("@/lib/student-portal.functions");
    const result = await getProfile({ data: { session } });
    return result as Profile | null;
  } catch (e) {
    console.error("fetchProfile error", e);
    return null;
  }
}

function StudentPortalPage() {
  const [session, setSession] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const adminKey = params.get("admin");
    if (adminKey === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    const verified = localStorage.getItem(VERIFIED_KEY);
    const s = localStorage.getItem(SESSION_KEY);
    if (verified === "true" && s) {
      setSession(s);
      fetchProfile(s)
        .then((p) => setProfile(p))
        .catch(() => {
          localStorage.removeItem(VERIFIED_KEY);
          localStorage.removeItem(SESSION_KEY);
          setSession(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  if (isAdmin) return <AdminPanel />;

  if (!session) {
    return (
      <CodeGate
        onVerified={(s) => {
          localStorage.setItem(VERIFIED_KEY, "true");
          localStorage.setItem(SESSION_KEY, s);
          setSession(s);
          fetchProfile(s).then((p) => setProfile(p));
        }}
      />
    );
  }

  if (!profile || !profile.onboarding_complete) {
    return (
      <Onboarding
        session={session}
        onDone={() =>
          fetchProfile(session).then((p) => setProfile(p))
        }
      />
    );
  }

  return <CoachChat session={session} profile={profile} />;
}
