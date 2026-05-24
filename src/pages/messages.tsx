import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useNotifications } from "@/hooks/useFirebaseData";
import { Layout } from "@/components/layout";
import { Megaphone, Clock, Check, Trash2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function formatUrduDistance(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "ابھی";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} منٹ پہلے`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} گھنٹے پہلے`;
  if (diffInSeconds < 172800) return "کل";
  return date.toLocaleDateString('ur-PK');
}
import { useAuth } from "@/lib/auth";

export default function Messages() {
  const { user } = useAuth();
  const { data: notifications, isLoading } = useNotifications(user?.uid);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const r = JSON.parse(localStorage.getItem("dg_read_notifs") || "[]");
    const d = JSON.parse(localStorage.getItem("dg_deleted_notifs") || "[]");
    setReadIds(r);
    setDeletedIds(d);
  }, []);

  const markAllRead = () => {
    const allIds = notifications?.map(n => n.id) || [];
    const newRead = [...new Set([...readIds, ...allIds])];
    setReadIds(newRead);
    localStorage.setItem("dg_read_notifs", JSON.stringify(newRead));
    window.dispatchEvent(new Event("notifications_updated"));
  };

  const deleteNotif = (id: string) => {
    const newDeleted = [...new Set([...deletedIds, id])];
    setDeletedIds(newDeleted);
    localStorage.setItem("dg_deleted_notifs", JSON.stringify(newDeleted));
    window.dispatchEvent(new Event("notifications_updated"));
  };

  const handleClick = (n: any) => {
    const newRead = [...new Set([...readIds, n.id])];
    setReadIds(newRead);
    localStorage.setItem("dg_read_notifs", JSON.stringify(newRead));
    window.dispatchEvent(new Event("notifications_updated"));
    if (n.linkUrl) {
      setLocation(n.linkUrl);
    }
  };

  const filtered = notifications?.filter(n => !deletedIds.includes(n.id)) || [];
  const unreadCount = filtered.filter(n => !readIds.includes(n.id)).length;

  return (
    <Layout>
      <div className="p-4 flex flex-col gap-6 pb-20">
        <div className="flex items-center justify-between">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-[10px] h-7 px-2 gap-1 text-primary hover:text-primary hover:bg-primary/5">
              <Check className="w-3 h-3" />
              <span className="urdu-text">سب کو پڑھا ہوا نشان زد کریں</span>
            </Button>
          )}
          <h1 className="urdu-text text-2xl font-bold text-right flex-1">پیغامات (Messages)</h1>
        </div>

        <div className="flex flex-col gap-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-card border rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                <Skeleton className="h-6 w-3/4 ml-auto" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed flex flex-col items-center">
              <Megaphone className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="urdu-text text-muted-foreground">ابھی تک کوئی پیغام نہیں ہے</p>
            </div>
          ) : (
            filtered.map((n) => {
              const isRead = readIds.includes(n.id);
              const isAlert = n.type === 'alert';

              return (
                <div 
                  key={n.id} 
                  className={`bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col group animate-in fade-in slide-in-from-bottom-2 duration-500 relative ${isRead ? 'opacity-80' : 'border-primary/20 ring-1 ring-primary/5'}`}
                >
                  {!isRead && <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)] z-10 animate-pulse" />}
                  
                  <div className="p-2 flex items-center justify-between border-b bg-muted/10">
                    <div className="flex items-center gap-2">
                      <button onClick={() => deleteNotif(n.id)} className="p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <span className="urdu-text text-[9px] font-bold text-primary">اعلان</span>
                        <div className="flex items-center gap-1 text-[8px] text-muted-foreground font-medium">
                          <Clock className="w-2 h-2" />
                          {n.timestamp && typeof n.timestamp.toDate === 'function' ? formatUrduDistance(n.timestamp.toDate()) : "ابھی"}
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Megaphone className="w-3.5 h-3.5 text-primary" />
                      </div>
                    </div>
                  </div>

                  {isAlert ? (
                    /* Alert Style: Icon on Left, Info on Right */
                    <div className="p-3 flex gap-3 items-center">
                       <div className="w-14 h-14 rounded-lg bg-muted border overflow-hidden shrink-0 shadow-sm">
                        {n.imageUrl ? (
                          <img src={n.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5">
                            <Megaphone className="w-5 h-5 text-primary/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-right">
                        <h3 className="urdu-text text-sm font-bold leading-tight mb-0.5">{n.title}</h3>
                        <p className="urdu-text text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{n.description}</p>
                      </div>
                    </div>
                  ) : (
                    /* Banner Style: Exact 2752x1536 Fit */
                    <div className="flex flex-col">
                      {n.imageUrl && (
                        <div className="w-full aspect-[2752/1536] bg-muted/30 flex items-center justify-center overflow-hidden border-b">
                          <img 
                            src={n.imageUrl} 
                            alt="" 
                            className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" 
                          />
                        </div>
                      )}
                      <div className="p-3 text-right flex flex-col gap-0.5">
                        <h3 className="urdu-text text-base font-black text-red-900 leading-tight">{n.title}</h3>
                        <p className="urdu-text text-xs text-red-800/80 leading-relaxed">{n.description}</p>
                      </div>
                    </div>
                  )}

                  <div className="px-3 pb-3 flex items-center justify-between">
                    {n.discountPercentage && (
                      <div className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md animate-pulse">
                        {n.discountPercentage} OFF 🔥
                      </div>
                    )}
                    {n.linkUrl && (
                      <Button size="sm" onClick={() => handleClick(n)} className="h-7 rounded-lg text-[10px] gap-1 urdu-text px-3">
                        <ExternalLink className="w-3 h-3" />
                        دیکھیں
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
