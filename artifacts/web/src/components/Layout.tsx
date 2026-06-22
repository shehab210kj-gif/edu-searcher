import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Library,
  PlusCircle,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "لوحة التحكم", href: "/", icon: LayoutDashboard },
    { name: "المكتبة البحثية", href: "/library", icon: BookOpen },
    { name: "المشاريع", href: "/projects/new", icon: PlusCircle, isAction: true },
    { name: "القوالب", href: "/templates", icon: Library },
    { name: "إدارة المكتبة", href: "/admin", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <nav className="w-full md:w-64 bg-sidebar border-b md:border-b-0 md:border-l border-sidebar-border shrink-0 text-sidebar-foreground">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-xl shrink-0">
              أ
            </div>
            <h1 className="text-xl font-bold tracking-tight">منصة الأبحاث</h1>
          </Link>
        </div>
        
        <div className="px-4 pb-4">
          <Link href="/projects/new" className="w-full">
            <Button className="w-full gap-2 justify-start mb-6 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground">
              <PlusCircle className="w-5 h-5" />
              <span>مشروع جديد</span>
            </Button>
          </Link>

          <div className="space-y-1">
            {navigation.filter(item => !item.isAction).map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}