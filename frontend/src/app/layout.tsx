import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "CFSS Fieldwork",
  description: "Community Field Survey System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CFSS Fieldwork",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a4628",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var isDark = false;
                var isAdmin = window.location.pathname.indexOf('/admin') === 0;
                var storageKey = isAdmin ? 'cfss-admin-auth-storage' : 'cfss-auth-storage';
                var raw = localStorage.getItem(storageKey);
                var theme = 'light';
                if (raw) {
                  var parsed = JSON.parse(raw);
                  if (parsed && parsed.state && parsed.state.theme) {
                    theme = parsed.state.theme;
                  }
                }
                if (theme === 'dark') {
                  isDark = true;
                } else if (theme === 'system') {
                  isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      <body className="h-full flex flex-col bg-page text-primary antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
