import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plane,
  ShieldAlert,
  Target,
  Users,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSeo } from "@/lib/seo";

const NAV = [
  { label: "Visão geral", path: "/admin", icon: LayoutDashboard },
  { label: "Usuários", path: "/admin/users", icon: Users },
  { label: "Voos", path: "/admin/flights", icon: Plane },
  { label: "Leads / CRM", path: "/admin/leads", icon: Target },
  { label: "Receita", path: "/admin/revenue", icon: CreditCard },
  { label: "Planos", path: "/admin/plans", icon: BarChart3 },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col bg-primary text-primary-foreground">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Admin</p>
          <p className="text-[11px] text-primary-foreground/60">Flight Visualizer Pro</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active =
            item.path === "/admin"
              ? location === "/admin"
              : location.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-primary-foreground/80 hover:bg-white/10"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        <Link
          href="/app"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary-foreground/80 transition-colors hover:bg-white/10"
        >
          <ExternalLink className="h-4 w-4" />
          Voltar ao app
        </Link>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
            {user?.name?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user?.name ?? "Admin"}</p>
            <p className="truncate text-[11px] text-primary-foreground/60">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: false });
  const [mobileOpen, setMobileOpen] = useState(false);
  useSeo({ title: `${title} · Admin`, noindex: true });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com uma conta de administrador para acessar o painel.
          </p>
          <Button className="mt-6" onClick={() => (window.location.href = getLoginUrl())}>
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Sem permissão</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área é exclusiva para administradores. Se você acredita que deveria ter
            acesso, contate o responsável pela conta.
          </p>
          <Button variant="outline" className="mt-6 bg-card" asChild>
            <Link href="/app">Voltar ao app</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed h-screen w-64">
          <Sidebar />
        </div>
      </aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
          <button
            className="rounded-md p-2 hover:bg-secondary lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-lg font-semibold leading-tight sm:text-xl">
              {title}
            </h1>
            {description && (
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
