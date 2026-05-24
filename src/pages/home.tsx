import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Search, ChevronRight, MapPin, ShoppingCart, Plus, Minus, ChevronLeft, ImageIcon, ShieldCheck, Truck as TruckIcon, PackageCheck } from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';
import { useCategories, useProducts, useSliders, usePromoBoxes } from "@/hooks/useFirebaseData";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/cart-context";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";

function FeaturedProductCard({ product }: { product: Product }) {
  const { items, addToCart, updateQuantity } = useCart();
  const { toast } = useToast();
  const cartItem = items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast({
      title: "Added to Cart",
      description: `${product.nameUrdu} added.`,
      duration: 2000,
    });
  };

  const step = (product.unit === "kg" || product.unit === "liter" || product.unit === "dozen") ? 0.5 : 1;

  const handleUpdate = (e: React.MouseEvent, newQty: number) => {
    e.preventDefault();
    e.stopPropagation();
    // Round to avoid floating point issues like 0.30000000000000004
    const rounded = Math.round(newQty * 10) / 10;
    updateQuantity(product.id, rounded);
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col hover-elevate group">
      <Link href={`/products?search=${encodeURIComponent(product.name)}`} className="block">
        <div className="w-full aspect-square bg-muted/20 flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-full" />
          )}
        </div>
      </Link>
      <div className="p-3 flex flex-col gap-0.5">
        <div className="flex justify-between items-center mb-1">
          <p className="text-[9px] text-muted-foreground uppercase font-medium truncate pr-2">{product.name}</p>
          <h3 className="urdu-text text-sm font-bold leading-tight text-right shrink-0">{product.nameUrdu}</h3>
        </div>
        
        <div className="flex justify-between items-end mt-1 mb-2">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-primary text-sm leading-none">Rs. {product.price}</p>
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="bg-red-600 text-white text-[8px] font-bold px-1 py-0.5 rounded flex items-center shadow-sm animate-pulse">
                -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
              </div>
            )}
          </div>
          {product.originalPrice && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground line-through">Rs. {product.originalPrice}</span>
              <span className="text-muted-foreground font-normal text-[8px]">/ {product.unit}</span>
            </div>
          )}
        </div>

        <div className="mt-auto">
          {quantity > 0 ? (
            <div className="flex items-center justify-between bg-secondary rounded-lg p-1 border">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleUpdate(e, quantity - step)}
                className="h-8 w-8 text-secondary-foreground rounded-md hover:bg-background"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-bold text-sm w-10 text-center">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleUpdate(e, quantity + step)}
                className="h-8 w-8 text-secondary-foreground rounded-md hover:bg-background"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={handleAdd} size="sm" className="w-full rounded-lg font-bold h-9">
              <ShoppingCart className="w-4 h-4 mr-2" />
              <span className="urdu-text">کارٹ میں ڈالیں</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
function HomeSlider() {
  const { data: sliders, isLoading, error } = useSliders();
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    direction: 'rtl',
    align: 'start',
  });
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!emblaApi || isPaused) return;
    const intervalId = setInterval(() => {
      emblaApi.scrollNext();
    }, 4000);
    return () => clearInterval(intervalId);
  }, [emblaApi, isPaused]);

  if (isLoading) return <Skeleton className="w-full aspect-[2752/1536] rounded-2xl" />;
  
  if (error) return null;

  if (!sliders || sliders.length === 0) {
    return (
      <div className="w-full aspect-[2752/1536] bg-muted/30 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center">
        <ImageIcon className="w-12 h-12 text-muted-foreground/20 mb-2" />
        <p className="urdu-text text-muted-foreground">ایڈمن پینل سے سلائیڈر کی تصاویر اپ لوڈ کریں</p>
      </div>
    );
  }

  return (
    <div 
      className="overflow-hidden w-full" 
      ref={emblaRef} 
      dir="rtl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="flex touch-pan-y">
        {sliders.map((s) => (
          <div key={s.id} className="flex-[0_0_100%] min-w-0 relative aspect-[2752/1536]">
            {s.linkUrl ? (
              <Link href={s.linkUrl}>
                <img src={s.imageUrl} alt="Offer" className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity" />
              </Link>
            ) : (
              <img src={s.imageUrl} alt="Offer" className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustBadges() {
  return (
    <div className="bg-[#1a1a1a] text-white py-2.5 px-3 border-t border-white/5">
      <div className="flex items-center justify-between text-center">
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Safe Pay</span>
        </div>
        
        <div className="w-[1px] h-3.5 bg-white/20" />
        
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <TruckIcon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Fast Del</span>
        </div>

        <div className="w-[1px] h-3.5 bg-white/20" />
        
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <PackageCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Quality</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: categories, isLoading: isLoadingCategories } = useCategories();
  const { data: products, isLoading: isLoadingProducts } = useProducts(); 
  const { data: promoBoxes } = usePromoBoxes();
  const featuredProducts = products; // Show all products as requested

  const b1 = promoBoxes?.find(b => b.id === 'box1') || {
    title: "خصوصی آرڈر",
    subtitle: "پرچی بھیجیں",
    linkUrl: "/custom-order",
    imageUrl: null
  };
  const b2 = promoBoxes?.find(b => b.id === 'box2') || {
    title: "بڑی بچت",
    subtitle: "ڈسکاؤنٹ سیل",
    linkUrl: "/products",
    imageUrl: null
  };
  const b3 = promoBoxes?.find(b => b.id === 'box3') || {
    title: "فوری سروس",
    subtitle: "ٹرانسپورٹ",
    linkUrl: "/transport",
    imageUrl: null
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 p-4 pb-12">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="مصنوعات تلاش کریں..."
            className="w-full pl-10 h-12 rounded-xl border-primary/20 focus-visible:ring-primary shadow-sm urdu-text text-right"
          />
          <Search className="absolute left-3 top-3.5 text-muted-foreground w-5 h-5" />
        </form>

        {/* Home Slider & Trust Badges Unified Card */}
        <div className="overflow-hidden w-full rounded-2xl shadow-lg border border-red-100 flex flex-col bg-[#1a1a1a]">
          <HomeSlider />
          <TrustBadges />
        </div>

        {/* 3 Promo Gift Boxes under the Slider */}
        <div className="grid grid-cols-3 gap-3">
          <Link href={b1.linkUrl} className="block no-underline">
            {b1.imageUrl ? (
              <div className="relative overflow-hidden rounded-2xl h-24 flex flex-col items-center justify-center p-2 text-center shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 group border border-red-100 dark:border-red-900/30">
                <img src={b1.imageUrl} alt={b1.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                <div className="relative z-10 text-center leading-tight">
                  <span className="urdu-text text-[12px] font-black text-white block drop-shadow-md">{b1.title}</span>
                  <span className="urdu-text text-[9px] font-bold text-gray-200 block mt-0.5 drop-shadow-sm">{b1.subtitle}</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background border border-red-100 dark:border-red-900/30 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 text-center shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 group h-24">
                <div className="w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-900/40 rounded-full group-hover:scale-110 transition-transform duration-200 overflow-hidden">
                  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 animate-bounce" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 12V20C20 20.55 19.55 21 19 21H5C4.45 21 4 20.55 4 20V12" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
                    <path d="M22 7C22 7.55 21.55 8 21 8H3C2.45 8 2 7.55 2 7V5C2 4.45 2.45 4 3 4H21C21.55 4 22 4.45 22 5V7Z" fill="#EF4444" />
                    <path d="M12 4V21" stroke="#FBBF24" strokeWidth="2.5" />
                    <path d="M12 4C12 4 10.5 2 8.5 2C6.5 2 6 3.5 7.5 4.5C9 5.5 12 8 12 8C12 8 15 5.5 16.5 4.5C18 3.5 17.5 2 15.5 2C13.5 2 12 4 12 4Z" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
                  </svg>
                </div>
                <div className="text-center leading-tight">
                  <span className="urdu-text text-[11px] font-bold text-red-700 dark:text-red-400 block">{b1.title}</span>
                  <span className="urdu-text text-[8px] text-muted-foreground block mt-0.5">{b1.subtitle}</span>
                </div>
              </div>
            )}
          </Link>

          <Link href={b2.linkUrl} className="block no-underline">
            {b2.imageUrl ? (
              <div className="relative overflow-hidden rounded-2xl h-24 flex flex-col items-center justify-center p-2 text-center shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 group border border-amber-100 dark:border-amber-900/30">
                <img src={b2.imageUrl} alt={b2.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                <div className="relative z-10 text-center leading-tight">
                  <span className="urdu-text text-[12px] font-black text-white block drop-shadow-md">{b2.title}</span>
                  <span className="urdu-text text-[9px] font-bold text-gray-200 block mt-0.5 drop-shadow-sm">{b2.subtitle}</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border border-amber-100 dark:border-amber-900/30 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 text-center shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 group h-24">
                <div className="w-10 h-10 flex items-center justify-center bg-amber-100 dark:bg-amber-900/40 rounded-full group-hover:scale-110 transition-transform duration-200 overflow-hidden">
                  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 12L9 19L19 9L12 2Z" stroke="#D97706" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M12 2L19 9L22 4L12 2Z" fill="#FBBF24" />
                    <circle cx="9" cy="9" r="2" fill="#D97706" />
                    <path d="M7 14L14 7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                    <path d="M17 12V17C17 17.55 16.55 18 16 18H14" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-center leading-tight">
                  <span className="urdu-text text-[11px] font-bold text-amber-700 dark:text-amber-400 block">{b2.title}</span>
                  <span className="urdu-text text-[8px] text-muted-foreground block mt-0.5">{b2.subtitle}</span>
                </div>
              </div>
            )}
          </Link>

          <Link href={b3.linkUrl} className="block no-underline">
            {b3.imageUrl ? (
              <div className="relative overflow-hidden rounded-2xl h-24 flex flex-col items-center justify-center p-2 text-center shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 group border border-blue-100 dark:border-blue-900/30">
                <img src={b3.imageUrl} alt={b3.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                <div className="relative z-10 text-center leading-tight">
                  <span className="urdu-text text-[12px] font-black text-white block drop-shadow-md">{b3.title}</span>
                  <span className="urdu-text text-[9px] font-bold text-gray-200 block mt-0.5 drop-shadow-sm">{b3.subtitle}</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background border border-blue-100 dark:border-blue-900/30 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 text-center shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 group h-24">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 rounded-full group-hover:scale-110 transition-transform duration-200 overflow-hidden">
                  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 8H20L23 12V18H20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 18H5C5 19.65 6.35 21 8 21C9.65 21 11 19.65 11 18H13C13 19.65 14.35 21 16 21C17.65 21 19 19.65 19 18H21" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17 8V18H3V8H17Z" fill="#3B82F6" stroke="#2563EB" strokeWidth="2" />
                    <circle cx="8" cy="18" r="3" fill="#1E3A8A" />
                    <circle cx="16" cy="18" r="3" fill="#1E3A8A" />
                  </svg>
                </div>
                <div className="text-center leading-tight">
                  <span className="urdu-text text-[11px] font-bold text-blue-700 dark:text-blue-400 block">{b3.title}</span>
                  <span className="urdu-text text-[8px] text-muted-foreground block mt-0.5">{b3.subtitle}</span>
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Categories */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <Link href="/products" className="text-sm font-medium text-primary hover:underline flex items-center">
              سب دیکھیں <ChevronRight className="w-4 h-4 ml-0.5" />
            </Link>
            <h2 className="urdu-text text-2xl font-bold">زمرہ جات</h2>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {isLoadingCategories ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="w-full aspect-square rounded-2xl" />
                  <Skeleton className="w-12 h-3" />
                </div>
              ))
            ) : categories?.length === 0 ? (
              <div className="col-span-4 text-center py-6 text-muted-foreground text-sm">No categories found.</div>
            ) : (
              categories?.map(category => (
                <Link key={category.id} href={category.type === "vehicle" ? "/transport" : `/category/${category.id}`} className="flex flex-col items-center gap-2 group">
                  <div className="w-full aspect-square bg-card border rounded-2xl shadow-sm overflow-hidden flex items-center justify-center p-0 group-hover:border-primary transition-colors hover-elevate">
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                    ) : category.icon ? (
                      <span className="text-3xl">{category.icon}</span>
                    ) : (
                      <div className="w-10 h-10 bg-primary/10 rounded-full" />
                    )}
                  </div>
                  <span className="urdu-text text-center text-xs font-medium leading-tight">{category.nameUrdu}</span>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Featured Products */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <Link href="/products" className="text-sm font-medium text-primary hover:underline flex items-center">
              مزید <ChevronRight className="w-4 h-4 ml-0.5" />
            </Link>
            <h2 className="urdu-text text-2xl font-bold">نمایاں مصنوعات</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isLoadingProducts ? (
              Array(4).fill(0).map((_, i) => (
                <Skeleton key={i} className="w-full h-52 rounded-xl" />
              ))
            ) : featuredProducts?.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">No featured products.</div>
            ) : (
              featuredProducts?.map(product => (
                <FeaturedProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
