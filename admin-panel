import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Phone, Award, Gift, Settings, BarChart3, LogOut, Shield } from "lucide-react";

export const Route = createFileRoute("/admin-panel")({
  component: AdminPanel,
});

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

function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("dashboard");

  const login = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setError("");
    } else {
      setError("Wrong password. Try again.");
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">K2Ç Admin</h1>
            <p className="text-muted-foreground text-sm mt-1">Restricted access</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <button
              onClick={login}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition"
            >
              Enter Admin Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <button onClick={() => setAuthed(false)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      <div className="border-b border-border bg-card overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
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
              ].map(stat => (
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
                ].map(link => (
                  <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-primary/10 transition text-sm text-foreground">
                    {link.label}
                    <span className="text-primary">→</span>
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
            <p className="text-sm text-muted-foreground">Monthly 1GB data sent on the 1st via ClubKonnect</p>
            <div className="space-y-3">
              {AMBASSADORS.map(a => (
                <div key={a.phone} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{a.name}</p>
                    <p className="text-xs text-primary">{a.role}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.phone} · {a.network}</p>
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
            <p className="text-sm text-muted-foreground">250MB data sent automatically at 8AM WAT on student birthdays</p>
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
                { label: "Student Portal Code", value: "K2Ç-STUDENT" },
                { label: "WhatsApp", value: "09164266235" },
                { label: "Admin Email", value: "k2cacademy001@gmail.com" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
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
              ].map(stat => (
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
                ].map(link => (
                  <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-primary/10 transition text-sm text-foreground">
                    {link.label}
                    <span className="text-primary">→</span>
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
            <p className="text-sm text-muted-foreground">Monthly 1GB data sent on the 1st via ClubKonnect</p>
            <div className="space-y-3">
              {AMBASSADORS.map(a => (
                <div key={a.phone} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{a.name}</p>
                    <p className="text-xs text-primary">{a.role}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.phone} · {a.network}</p>
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
            <p className="text-sm text-muted-foreground">250MB data sent automatically at 8AM WAT on student birthdays</p>
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
                { label: "Student Portal Code", value: "K2Ç-STUDENT" },
                { label: "WhatsApp", value: "09164266235" },
                { label: "Admin Email", value: "k2cacademy001@gmail.com" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
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
    }      </div>

      {/* Content */}
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
              ].map(stat => (
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
                ].map(link => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-primary/10 transition text-sm text-foreground"
                  >
                    {link.label}
                    <span className="text-primary">→</span>
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
              <p className="text-sm text-muted-foreground mt-1">Connect Supabase to see live student list.</p>
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
            <p className="text-sm text-muted-foreground">Monthly 1GB data sent on the 1st via ClubKonnect</p>
            <div className="space-y-3">
              {AMBASSADORS.map(a => (
                <div key={a.phone} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{a.name}</p>
                    <p className="text-xs text-primary">{a.role}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.phone} · {a.network}</p>
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
            <p className="text-sm text-muted-foreground">250MB data sent automatically at 8AM WAT on student birthdays</p>
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
                { label: "Student Portal Code", value: "K2Ç-STUDENT" },
                { label: "WhatsApp", value: "09164266235" },
                { label: "Admin Email", value: "k2cacademy001@gmail.com" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
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
