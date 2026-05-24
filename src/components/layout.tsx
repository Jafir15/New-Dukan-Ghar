import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Truck, MapPin, Package, Home, Moon, Sun, ClipboardList, Phone, Mail, Lock, Bell, User } from "lucide-react";
import { useCart } from "./cart-context";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";
import { useNotifications, useAppSettings } from "@/hooks/useFirebaseData";
import { useAuth } from "@/lib/auth";
import { Logo } from "./logo";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { totalItems } = useCart();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { data: notifications } = useNotifications(user?.uid);
  const { data: settings } = useAppSettings();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const readIds = JSON.parse(localStorage.getItem("dg_read_notifs") || "[]");
      const deletedIds = JSON.parse(localStorage.getItem("dg_deleted_notifs") || "[]");
      const unread = notifications?.filter(n => !readIds.includes(n.id) && !deletedIds.includes(n.id)) || [];
      setUnreadCount(unread.length);
    };

    updateCount();
    window.addEventListener("notifications_updated", updateCount);
    return () => window.removeEventListener("notifications_updated", updateCount);
  }, [notifications]);

  return (
    <div className="mx-auto max-w-[430px] min-h-[100dvh] bg-background shadow-2xl relative flex flex-col sm:border-x">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-3 shadow-md flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline text-primary-foreground">
          <div className="bg-white p-1 rounded-full flex items-center justify-center shadow-md w-9 h-9">
            <Logo className="w-7 h-7" />
          </div>
          <span className="text-2xl font-bold tracking-tight urdu-text leading-none mt-1">دکان گھر</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full w-9 h-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
          <Link href={user ? "/profile" : "/login"} className="text-primary-foreground hover:text-primary-foreground/80 transition-colors">
            <User size={22} />
          </Link>
          <Link href="/orders" className="text-primary-foreground hover:text-primary-foreground/80 transition-colors">
            <MapPin size={22} />
          </Link>
          <Link href="/cart" className="relative text-primary-foreground hover:text-primary-foreground/80 transition-colors">
            <ShoppingBag size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border px-5 pt-6 pb-2 mb-16">
        <div className="flex items-center justify-end gap-2.5 mb-4">
          <div className="bg-muted p-1 rounded-full flex items-center justify-center shadow-sm w-9 h-9 border">
            <Logo className="w-7 h-7" />
          </div>
          <div className="text-right">
            <p className="urdu-text text-xl font-bold text-primary leading-none">دکان گھر</p>
            <p className="urdu-text text-xs text-muted-foreground mt-0.5">آپ کی روزمرہ کی ضروریات کا گھر</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-right">
            <p className="urdu-text text-sm font-semibold mb-2 text-foreground">فوری لنکس</p>
            <div className="flex flex-col gap-1.5">
              <Link href="/" className="urdu-text text-xs text-muted-foreground hover:text-primary transition-colors">🏠 ہوم</Link>
              <Link href="/products" className="urdu-text text-xs text-muted-foreground hover:text-primary transition-colors">📦 مصنوعات</Link>
              <Link href="/transport" className="urdu-text text-xs text-muted-foreground hover:text-primary transition-colors">🚗 ٹرانسپورٹ</Link>
              <Link href="/orders" className="urdu-text text-xs text-muted-foreground hover:text-primary transition-colors">📋 آرڈر ٹریک کریں</Link>
            </div>
          </div>
          <div className="text-right">
            <p className="urdu-text text-sm font-semibold mb-2 text-foreground">رابطہ کریں</p>
            <div className="flex flex-col gap-1.5">
              {(() => {
                const rawPhone = settings?.footerPhone || "0300-1234567";
                const cleanPhone = rawPhone.replace(/^0/, "92").replace(/[^0-9]/g, "");
                return (
                  <a 
                    href={`https://wa.me/${cleanPhone}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-end gap-1"
                  >
                    {rawPhone} <Phone className="w-3 h-3" />
                  </a>
                );
              })()}
              <a 
                href={`mailto:${settings?.footerEmail || "jafir0691824@gmail.com"}`} 
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-end gap-1 break-all"
              >
                {settings?.footerEmail || "jafir0691824@gmail.com"} <Mail className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-2 flex items-center justify-between">
          <Link href="/admin/secure-panel" className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            <Lock className="w-2.5 h-2.5" /> Admin
          </Link>
          <p className="urdu-text text-[10px] text-muted-foreground/50">© 2025 دکان گھر</p>
        </div>
      </footer>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-[430px] bg-card border-t border-border flex justify-between px-1 py-2 pb-safe z-50 rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <BottomNavItem href="/" icon={<Home size={20} />} label="Home" active={location === "/"} />
        <BottomNavItem href="/products" icon={<Package size={20} />} label="Products" active={location === "/products" || location.startsWith("/category")} />
        <BottomNavItem href="/transport" icon={<Truck size={20} />} label="Transport" active={location === "/transport"} />
        <BottomNavItem href="/messages" icon={<Bell size={20} />} label="Messages" active={location === "/messages"} badge={unreadCount} />
        <BottomNavItem href="/orders" icon={<ClipboardList size={20} />} label="Orders" active={location === "/orders" || location.startsWith("/track")} />
        <BottomNavItem href="/cart" icon={<ShoppingBag size={20} />} label="Cart" active={location === "/cart"} badge={totalItems} />
      </nav>
    </div>
  );
}

function BottomNavItem({ href, icon, label, active, badge }: { href: string; icon: React.ReactNode; label: string; active: boolean; badge?: number }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-16 h-14 relative rounded-xl transition-all duration-200 ${active ? "text-primary font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
      <div className={`mb-1 transition-transform duration-200 ${active ? "scale-110" : ""}`}>
        {icon}
      </div>
      <span className="text-[10px]">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1 right-3 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-sm">
          {badge}
        </span>
      )}
      {active && (
        <div className="absolute -bottom-2 w-8 h-1 bg-primary rounded-t-full" />
      )}
    </Link>
  );
}
