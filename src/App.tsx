import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/components/cart-context";
import { AuthProvider } from "@/lib/auth";
import Home from "@/pages/home";
import Category from "@/pages/category";
import Products from "@/pages/products";
import Cart from "@/pages/cart";
import Orders from "@/pages/orders";
import Track from "@/pages/track";
import Transport from "@/pages/transport";
import Messages from "@/pages/messages";
import CheckoutSuccess from "@/pages/checkout-success";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Profile from "@/pages/profile";
import CustomOrder from "@/pages/custom-order";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/profile" component={Profile} />
      <Route path="/category/:id" component={Category} />
      <Route path="/products" component={Products} />
      <Route path="/cart" component={Cart} />
      <Route path="/orders" component={Orders} />
      <Route path="/messages" component={Messages} />
      <Route path="/track/:trackingNumber" component={Track} />
      <Route path="/transport" component={Transport} />
      <Route path="/custom-order" component={CustomOrder} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/secure-panel" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="dg-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
              <SonnerToaster richColors position="top-center" />
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
