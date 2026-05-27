import { useEffect, useState } from "react";
import { Bell, X, ExternalLink, Zap, ShoppingBag, Calendar, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Notification = {
  id: string;
  title: string;
  body: string;
  type: "info" | "event" | "product" | "urgent";
  link_url: string | null;
  link_label: string | null;
  created_at: string;
};

const TYPE_CONFIG = {
  info: {
    icon: Info,
    bg: "bg-primary/10",
    border: "border-primary/30",
    icon_color: "text-primary",
    badge: "bg-primary/20 text-primary",
    label: "Update",
  },
  event: {
    icon: Calendar,
    bg: "bg-accent/10",
    border: "border-accent/30",
    icon_color: "text-accent",
    badge: "bg-accent/20 text-accent-foreground",
    label: "Event",
  },
  product: {
    icon: ShoppingBag,
    bg: "bg-success/10",
    border: "border-success/30",
    icon_color: "text-success",
    badge: "bg-success/20 text-success",
    label: "New Product",
  },
  urgent: {
    icon: Zap,
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    icon_color: "text-destructive",
    badge: "bg-destructive/20 text-destructive",
    label: "Urgent",
  },
};

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Load dismissed IDs from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("k2c_dismissed_notifs") || "[]");
      setDismissed(new Set(saved));
    } catch { /* ignore */ }

    // Fetch notifications
    supabase
      .from("notifications")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
      });

    // Subscribe to new notifications in real time
    const channel = supabase
      .channel("notifications_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    try {
      localStorage.setItem("k2c_dismissed_notifs", JSON.stringify([...next]));
    } catch { /* ignore */ }
  };

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  const unread = visible.length;

  if (visible.length === 0) return null;

  return (
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4">
      {/* Bell trigger bar */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:border-primary/50"
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Bell className="h-4 w-4 text-primary" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {unread} new notification{unread !== 1 ? "s" : ""} from K2Ç Academy
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {notifications[0]?.title}
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {open ? "Hide" : "View"}
        </span>
      </button>

      {/* Notification cards */}
      {open && (
        <div className="mt-3 space-y-3">
          {visible.map((n) => {
            const cfg = TYPE_CONFIG[n.type];
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`relative rounded-2xl border ${cfg.border} ${cfg.bg} p-4 transition-all`}
              >
                {/* Dismiss button */}
                <button
                  onClick={() => dismiss(n.id)}
                  className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <div className="flex items-start gap-3 pr-6">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.icon_color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {n.body}
                    </p>
                    {n.link_url && (
                      <a
                        href={n.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        {n.link_label || "Learn more"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => {
              visible.forEach((n) => dismiss(n.id));
              setOpen(false);
            }}
            className="w-full rounded-xl border border-border py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
