import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { 
  Category, 
  Product, 
  Order, 
  Vehicle, 
  Booking, 
  PaymentMethod,
  Slider,
  Notification,
  CustomRequest,
  PromoBox,
  Coupon
} from "../types";

// ---------- Categories ----------
export const useCategories = (params?: { type?: string }) => {
  return useQuery({
    queryKey: ["categories", params?.type],
    queryFn: async () => {
      let q = collection(db, "categories");
      const snap = await getDocs(q);
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      if (params?.type) {
        data = data.filter(c => c.type === params.type);
      }
      return data;
    },
    staleTime: 5 * 60 * 1000
  });
};

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Category, "id">) => {
      return addDoc(collection(db, "categories"), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] })
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Category> }) => {
      return updateDoc(doc(db, "categories", id), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] })
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDoc(doc(db, "categories", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] })
  });
};

// ---------- Products ----------
export const useProducts = (params?: { categoryId?: string }) => {
  return useQuery({
    queryKey: ["products", params?.categoryId],
    queryFn: async () => {
      let q = collection(db, "products");
      const snap = await getDocs(q);
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      if (params?.categoryId) {
        data = data.filter(p => p.categoryId === params.categoryId);
      }
      return data;
    },
    staleTime: 5 * 60 * 1000
  });
};

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Product, "id">) => {
      return addDoc(collection(db, "products"), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] })
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      return updateDoc(doc(db, "products", id), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] })
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDoc(doc(db, "products", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] })
  });
};

// ---------- Orders ----------
export const useOrders = () => {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "orders"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      // Sort by createdAt descending
      return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  });
};

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Order, "id" | "trackingNumber" | "createdAt">) => {
      const trackingNumber = `DG${Math.floor(100000 + Math.random() * 900000)}`;
      const docRef = await addDoc(collection(db, "orders"), {
        ...data,
        trackingNumber,
        createdAt: new Date().toISOString()
      });
      return { id: docRef.id, trackingNumber };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] })
  });
};

export const useUpdateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Order> }) => {
      return updateDoc(doc(db, "orders", id), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] })
  });
};
export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDoc(doc(db, "orders", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] })
  });
};

// ---------- Vehicles ----------
export const useVehicles = () => {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "vehicles"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
    }
  });
};

export const useCreateVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Vehicle, "id">) => {
      return addDoc(collection(db, "vehicles"), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] })
  });
};

export const useUpdateVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vehicle> }) => {
      return updateDoc(doc(db, "vehicles", id), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] })
  });
};

export const useDeleteVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDoc(doc(db, "vehicles", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] })
  });
};

// ---------- Bookings ----------
export const useBookings = () => {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "bookings"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      // Sort by createdAt descending (handling Firestore timestamps)
      return data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
    }
  });
};

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Booking, "id">) => {
      return addDoc(collection(db, "bookings"), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] })
  });
};

export const useUpdateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Booking> }) => {
      return updateDoc(doc(db, "bookings", id), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] })
  });
};

export const useDeleteBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDoc(doc(db, "bookings", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] })
  });
};

// ---------- Payment Methods ----------
export const usePaymentMethods = () => {
  return useQuery({
    queryKey: ["paymentMethods"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "paymentMethods"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentMethod));
    }
  });
};

export const useCreatePaymentMethod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<PaymentMethod, "id">) => {
      return addDoc(collection(db, "paymentMethods"), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentMethods"] })
  });
};

export const useUpdatePaymentMethod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PaymentMethod> }) => {
      return updateDoc(doc(db, "paymentMethods", id), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentMethods"] })
  });
};

export const useDeletePaymentMethod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDoc(doc(db, "paymentMethods", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentMethods"] })
  });
};

// ---------- Stats ----------
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const orders = await getDocs(collection(db, "orders"));
      const products = await getDocs(collection(db, "products"));
      const bookings = await getDocs(collection(db, "bookings"));
      
      let totalRevenue = 0;
      let deliveredOrders = 0;
      let pendingOrders = 0;
      
      orders.docs.forEach(d => {
        const o = d.data() as Order;
        totalRevenue += o.total || 0;
        if (o.status === "delivered") deliveredOrders++;
        if (o.status === "pending") pendingOrders++;
      });

      return {
        totalOrders: orders.size,
        totalRevenue,
        pendingOrders,
        deliveredOrders,
        totalBookings: bookings.size,
        totalProducts: products.size
      };
    }
  });
};

// ---------- Sliders ----------
export const useSliders = () => {
  return useQuery({
    queryKey: ["sliders"],
    queryFn: async () => {
      const q = query(collection(db, "sliders"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Slider));
    }
  });
};

export const useCreateSlider = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Slider>) => {
      return addDoc(collection(db, "sliders"), {
        ...data,
        createdAt: serverTimestamp(),
        active: true
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sliders"] })
  });
};

export const useDeleteSlider = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDoc(doc(db, "sliders", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sliders"] })
  });
};

// ---------- Notifications ----------
export const useNotifications = (userId?: string | null) => {
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      if (userId) {
        data = data.filter(n => !n.userId || n.userId === userId);
      } else {
        data = data.filter(n => !n.userId);
      }
      return data;
    }
  });
};

export const useCreateNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Notification>) => {
      return addDoc(collection(db, "notifications"), {
        ...data,
        timestamp: serverTimestamp()
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] })
  });
};

// ---------- Users ----------
export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "users"));
      return snap.docs.map(d => ({ uid: d.id, ...d.data() } as any));
    }
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return updateDoc(doc(db, "users", id), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] })
  });
};

// ---------- Payment Requests ----------
export const usePaymentRequests = () => {
  return useQuery({
    queryKey: ["payment_requests"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "payment_requests"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      return data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    }
  });
};

export const useUpdatePaymentRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return updateDoc(doc(db, "payment_requests", id), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_requests"] })
  });
};

// ---------- Custom Requests ----------
export const useCustomRequests = () => {
  return useQuery<CustomRequest[]>({
    queryKey: ["custom_requests"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "custom_requests"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      return data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    }
  });
};

export const useUserCustomRequests = (userId: string | undefined, sessionId: string | undefined) => {
  return useQuery<CustomRequest[]>({
    queryKey: ["custom_requests", userId || sessionId],
    queryFn: async () => {
      if (!userId && !sessionId) return [];
      const snap = await getDocs(collection(db, "custom_requests"));
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter((r: any) => {
          if (userId) {
            // Logged in: ONLY show requests belonging to THIS Firebase account
            return r.userId === userId;
          }
          // Guest: show by browser session
          return r.sessionId === sessionId;
        });
      return data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    },
    enabled: !!(userId || sessionId)
  });
};

export const useCreateCustomRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CustomRequest, "id">) => {
      return addDoc(collection(db, "custom_requests"), data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_requests"] });
    }
  });
};

export const useUpdateCustomRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomRequest> }) => {
      return updateDoc(doc(db, "custom_requests", id), data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_requests"] });
    }
  });
};

export const useDeleteCustomRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDoc(doc(db, "custom_requests", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_requests"] })
  });
};

// ---------- Promo Boxes ----------
export const usePromoBoxes = () => {
  return useQuery({
    queryKey: ["promo_boxes"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "promo_boxes"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as PromoBox));
      
      // Return sorted by id ('box1', 'box2', 'box3')
      return data.sort((a, b) => a.id.localeCompare(b.id));
    },
    staleTime: 0 // Fetch immediately so updates are instant on the user-side
  });
};

export const useUpdatePromoBox = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromoBox> }) => {
      const { setDoc, doc } = await import("firebase/firestore");
      return setDoc(doc(db, "promo_boxes", id), data, { merge: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promo_boxes"] });
    }
  });
};

// ---------- App Settings ----------
export interface AppSettings {
  id: string;
  adminPin: string;
  footerEmail: string;
  footerPhone: string;
}

export const useAppSettings = () => {
  return useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { doc, getDoc } = await import("firebase/firestore");
      const docRef = doc(db, "app_settings", "global");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as AppSettings;
      }
      return {
        id: "global",
        adminPin: "1234",
        footerEmail: "jafir0691824@gmail.com",
        footerPhone: "0300-1234567"
      };
    },
    staleTime: 0 // Ensure any changes reflect instantly
  });
};

export const useUpdateAppSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<AppSettings>) => {
      const { setDoc, doc } = await import("firebase/firestore");
      return setDoc(doc(db, "app_settings", "global"), data, { merge: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app_settings"] });
    }
  });
};

// ---------- Coupons ----------
export const useCoupons = () => {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "coupons"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
      return data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    }
  });
};

export const useCreateCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Coupon, "id" | "createdAt">) => {
      return addDoc(collection(db, "coupons"), {
        ...data,
        createdAt: serverTimestamp()
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] })
  });
};

export const useUpdateCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Coupon> }) => {
      return updateDoc(doc(db, "coupons", id), data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] })
  });
};

export const useDeleteCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDoc(doc(db, "coupons", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] })
  });
};

