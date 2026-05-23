import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "K2Ç Academy — Stop Learning. Start Earning." },
      {
        name: "description",
        content:
          "K2Ç Academy helps Nigerian beginners turn knowledge and skills into real online income — legitimately, without capital. Founded by Digital Nathy, Nigeria's First Sale Coach.",
      },
      { name: "author", content: "K2Ç Academy" },
      { property: "og:title", content: "K2Ç Academy — Stop Learning. Start Earning." },
      {
        property: "og:description",
        content:
          "Turn your existing knowledge into your first online sale. Nigeria's First Sale Academy by Digital Nathy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@digitalnathy" },
      { name: "theme-color", content: "#0A0A0A" },
      { name: "twitter:title", content: "K2Ç Academy — Stop Learning. Start Earning." },
      { name: "description", content: "K2Ç Launchpad is a Nigerian digital education website that helps beginners earn online." },
      { property: "og:description", content: "K2Ç Launchpad is a Nigerian digital education website that helps beginners earn online." },
      { name: "twitter:description", content: "K2Ç Launchpad is a Nigerian digital education website that helps beginners earn online." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/L69RvGmZPZRBjuKpWN9z40sumpR2/social-images/social-1778566720622-1001522950.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/L69RvGmZPZRBjuKpWN9z40sumpR2/social-images/social-1778566720622-1001522950.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
    scripts: [
      { src: "https://www.googletagmanager.com/gtag/js?id=G-YJ90XMTRGC", async: true },
      {
        children: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-YJ90XMTRGC');`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}
