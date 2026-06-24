import { lazy, Suspense, useLayoutEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { gsap } from "gsap";
import GuestOnly from "@/components/GuestOnly";
import RequireAdmin from "@/components/RequireAdmin";
import RequireAuth from "@/components/RequireAuth";
import RequireSalesWorkflow from "@/components/RequireSalesWorkflow";
import RequirePageAccess from "@/components/RequirePageAccess";
import { PanelRefreshProvider } from "@/components/panelEditor/PanelRefreshContext";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Register from "./pages/Auth/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import Fin from "./pages/Fin";
import Inv from "./pages/Inv";
import InvLedger from "./pages/Inv/Ledger";
import AllOrders from "./pages/AllOrders";
import NewOrder from "./pages/Orders/NewOrder";
import PendingOrders from "./pages/Orders/PendingOrders";
import Profile from "./pages/Profile";

const Sal = lazy(() => import("./pages/Sal"));

const Index = lazy(() => import("./pages/Index/index"));

function App() {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    gsap.set(el, { autoAlpha: 1, opacity: 1, visibility: "visible" });
    if (location.pathname === "/login") return;

    const tween = gsap.fromTo(
      el,
      { opacity: 0.35 },
      { opacity: 1, duration: 0.45, ease: "power2.out" }
    );

    return () => {
      tween.kill();
      gsap.set(el, { autoAlpha: 1, opacity: 1, visibility: "visible" });
    };
  }, [location.key, location.pathname]);

  return (
    <PanelRefreshProvider>
      <div ref={containerRef} style={{ opacity: 1, visibility: "visible" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/home"
            element={
              <RequirePageAccess page="home">
                <Index />
              </RequirePageAccess>
            }
          />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <Auth />
              </GuestOnly>
            }
          />
          <Route
            path="/register"
            element={
              <GuestOnly>
                <Register />
              </GuestOnly>
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/profile/*"
            element={
              <RequirePageAccess page="profile">
                <Profile />
              </RequirePageAccess>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            }
          />
          <Route
            path="/inv/ledger"
            element={
              <RequirePageAccess page="inv">
                <InvLedger />
              </RequirePageAccess>
            }
          />
          <Route
            path="/inv"
            element={
              <RequirePageAccess page="inv">
                <Inv />
              </RequirePageAccess>
            }
          />
          <Route
            path="/sal"
            element={
              <RequirePageAccess page="sal">
                <Suspense fallback={null}>
                  <Sal />
                </Suspense>
              </RequirePageAccess>
            }
          />
          <Route
            path="/fin"
            element={
              <RequirePageAccess page="fin">
                <Fin />
              </RequirePageAccess>
            }
          />
          <Route
            path="/orders/new"
            element={
              <RequireAuth>
                <RequireSalesWorkflow>
                  <NewOrder />
                </RequireSalesWorkflow>
              </RequireAuth>
            }
          />
          <Route
            path="/orders/pending"
            element={
              <RequireAuth>
                <PendingOrders />
              </RequireAuth>
            }
          />
          <Route
            path="/orders"
            element={
              <RequirePageAccess page="orders">
                <AllOrders />
              </RequirePageAccess>
            }
          />
        </Routes>
      </div>
    </PanelRefreshProvider>
  );
}

export default App;
