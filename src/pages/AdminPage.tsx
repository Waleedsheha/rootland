import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  Building2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings2,
  Shirt,
  Star,
  Store,
  TicketPercent,
  Type,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Customer, Order, Product } from '../types';
import { AuthService, UserRoleInfo, AdminRole } from '../services/authService';
import { DataService } from '../services/dataService';
import { useToast } from '../components/Toast';
import { SEOHead } from '../components/SEOHead';
import { RootlandIcon } from '../components/RootlandLogo';
import { DashboardTab } from './admin/DashboardTab';
import { OrdersTab } from './admin/OrdersTab';
import { CustomersTab } from './admin/CustomersTab';
import { ProductsTab } from './admin/ProductsTab';
import { InventoryTab } from './admin/InventoryTab';
import { ReviewsTab } from './admin/ReviewsTab';
import { CouponsTab } from './admin/CouponsTab';
import { B2BTab } from './admin/B2BTab';
import { ContentTab } from './admin/ContentTab';
import { SettingsTab } from './admin/SettingsTab';
import { StaffTab, ROLE_LABEL } from './admin/StaffTab';
import { ActivityTab } from './admin/ActivityTab';
import { Loading, ErrorNotice, adminError, egp, ConfirmProvider } from './admin/ui';

type TabId = 'dashboard' | 'orders' | 'customers' | 'products' | 'inventory' | 'reviews' | 'coupons' | 'b2b' | 'content' | 'settings' | 'staff' | 'activity';

const TAB_LABEL: Record<TabId, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  customers: 'Customers',
  products: 'Products',
  inventory: 'Inventory',
  reviews: 'Reviews',
  coupons: 'Discount codes',
  b2b: 'Bulk requests',
  content: 'Storefront text',
  settings: 'Store settings',
  staff: 'Staff',
  activity: 'Activity',
};

/** The line under each page title. */
const TAB_INTRO: Record<TabId, string> = {
  dashboard: 'Today’s orders, cash and stock at a glance.',
  orders: 'Every order, newest first. Open one to confirm it, hand it to the courier or close it.',
  customers: 'People who created an account. Guest checkouts have no account; find them in Orders.',
  products: 'Names, descriptions, prices and what is on sale.',
  inventory:
    'Stock goes down by itself when an order is placed and comes back when one is cancelled or refused. Set it here after new pieces arrive or a recount; every change is recorded in Activity.',
  reviews: 'Reviews arrive hidden. Publish one to show it on the product page and the homepage.',
  coupons: 'Create codes, set their limits and pause them.',
  b2b: 'Bulk and uniform requests from the B2B page.',
  content: 'The announcement bar and the homepage hero. Leave a field empty to show the built-in text listed under it.',
  settings: 'Delivery fees, pre-orders, contact details, tracking pixels and scrolling. Checkout reads these as soon as you save.',
  staff: 'Who can open the admin, and what each role can change.',
  activity: 'Every change staff made, newest first. Nobody can edit or delete these records.',
};

const TAB_ICON: Record<TabId, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: Receipt,
  customers: Users,
  products: Shirt,
  inventory: Boxes,
  reviews: Star,
  coupons: TicketPercent,
  b2b: Building2,
  content: Type,
  settings: Settings2,
  staff: UserCog,
  activity: History,
};

/** Sidebar order. Each role sees only its own tabs, and a group with none of them is left out. */
const NAV_GROUPS: { label?: string; tabs: TabId[] }[] = [
  { tabs: ['dashboard'] },
  { label: 'Sales', tabs: ['orders', 'customers', 'b2b'] },
  { label: 'Catalogue', tabs: ['products', 'inventory', 'reviews'] },
  { label: 'Marketing', tabs: ['coupons', 'content'] },
  { label: 'Store', tabs: ['settings', 'staff', 'activity'] },
];

/** Roles whose row level security lets them read every order. */
const ORDER_READERS: AdminRole[] = ['OWNER', 'ORDERS', 'MARKETING'];

/**
 * Staff console at /admin. Staff sign in with the store's own sign-in window like every customer;
 * access comes from the `staff` table (email + role, confirmed email only), and every tab reads and
 * writes through row level security and the database functions.
 */
export const AdminPage: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const [authReady, setAuthReady] = useState(() => AuthService.isReady());
  const [user, setUser] = useState<Customer | null>(() => AuthService.getCurrentUser());
  const [loadError, setLoadError] = useState(() => AuthService.getLoadError());
  const [role, setRole] = useState<UserRoleInfo | null>(null);
  const [roleState, setRoleState] = useState<'checking' | 'ready' | 'error'>('checking');
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    const onAuth = () => {
      setAuthReady(AuthService.isReady());
      setUser(AuthService.getCurrentUser());
      setLoadError(AuthService.getLoadError());
    };
    window.addEventListener('rootland_auth_updated', onAuth);
    return () => window.removeEventListener('rootland_auth_updated', onAuth);
  }, []);

  const checkRole = useCallback(() => {
    setRoleState('checking');
    AuthService.getUserRole()
      .then((info) => {
        setRole(info);
        setRoleState('ready');
      })
      .catch((err) => {
        console.error('[AdminPage] role check failed:', err);
        setRoleError(adminError(err));
        setRoleState('error');
      });
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setRole(null);
      setRoleState('ready');
      return;
    }
    checkRole();
  }, [authReady, user?.id, checkRole]);

  let body: React.ReactNode;
  if (!authReady || roleState === 'checking') {
    body = (
      <Gate>
        <p role="status" className="flex items-center gap-3 text-sm text-body">
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-fg/20 border-t-fg" />
          Checking your access…
        </p>
      </Gate>
    );
  } else if (loadError) {
    body = (
      <Gate>
        <ErrorNotice message={`Your account could not be loaded: ${loadError}. Reload the page.`} />
      </Gate>
    );
  } else if (roleState === 'error') {
    body = (
      <Gate>
        <ErrorNotice message={`Your access could not be checked: ${roleError}`} onRetry={checkRole} />
      </Gate>
    );
  } else if (!user) {
    body = <SignedOut onOpenAuth={onOpenAuth} />;
  } else if (!role || !role.isAdmin || role.role === 'CUSTOMER') {
    body = <NoAccess email={user.email} onCheckAgain={checkRole} />;
  } else {
    body = <Console role={role} adminRole={role.role} email={user.email} />;
  }

  return (
    <div data-admin data-surface="bone" dir="ltr" lang="en" className="min-h-svh">
      <ConfirmProvider>{body}</ConfirmProvider>
    </div>
  );
};

const Brand: React.FC = () => (
  <span className="flex items-center gap-2.5 text-fg">
    <RootlandIcon size={24} color="currentColor" barColor="#c8642a" />
    <span className="font-display text-[17px] font-semibold uppercase leading-none tracking-[-0.03em]">Rootland</span>
    <span className="text-[15px] leading-none text-mut">Admin</span>
  </span>
);

/** The night screen shown before the console: checking, signed out, no access, or an error. */
const Gate: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-surface="night" className="flex min-h-svh flex-col">
    <SEOHead title="Store admin" description="RootLand staff console." />
    <div className="flex h-16 shrink-0 items-center px-5 sm:px-8">
      <Brand />
    </div>
    <div className="flex flex-1 items-center px-5 pb-20 pt-6 sm:px-8">
      <div className="mx-auto w-full max-w-[480px]">{children}</div>
    </div>
  </div>
);

const SignedOut: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => (
  <Gate>
    <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-fg">Store admin</h1>
    <p className="mt-4 text-[15px] leading-relaxed text-body">
      Sign in with your store account, the same one you shop with. The admin opens for the emails the owner has added in Staff.
    </p>
    <div className="mt-8 flex flex-wrap gap-3">
      <button type="button" onClick={onOpenAuth} className="pill pill--accent">
        Sign in
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <Link to="/" className="pill">
        Back to the store
      </Link>
    </div>
  </Gate>
);

const NoAccess: React.FC<{ email: string; onCheckAgain: () => void }> = ({ email, onCheckAgain }) => {
  const { showToast } = useToast();
  const handleSignOut = async () => {
    try {
      await AuthService.logout();
    } catch (err) {
      showToast('Could not sign out', AuthService.formatAuthError(err, false), 'error');
    }
  };
  return (
    <Gate>
      <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-fg">No staff access</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-body">
        <span className="text-fg">{email}</span> is signed in, but it has no admin role. Either the owner has not added this email in Staff yet, or the
        email address is not confirmed. Open the confirmation link from your inbox, then check again.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={onCheckAgain} className="pill pill--accent">
          Check again
        </button>
        <button type="button" onClick={handleSignOut} className="pill">
          Sign out
        </button>
        <Link to="/" className="pill">
          Back to the store
        </Link>
      </div>
    </Gate>
  );
};

interface NavCount {
  value: number;
  /** What the number means, for screen readers and the hover title. */
  label: string;
  tone: 'accent' | 'neutral';
}

const SidebarNav: React.FC<{
  groups: { label?: string; tabs: TabId[] }[];
  current: TabId;
  counts: Partial<Record<TabId, NavCount>>;
  onOpen: (id: TabId) => void;
}> = ({ groups, current, counts, onOpen }) => (
  <nav aria-label="Admin sections" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-1">
    {groups.map((group, i) => (
      <div key={group.label ?? 'top'} className={i === 0 ? '' : 'mt-5'}>
        {group.label && <p className="px-3 pb-2 text-xs font-medium text-mut">{group.label}</p>}
        <ul className="space-y-0.5">
          {group.tabs.map((id) => {
            const Icon = TAB_ICON[id];
            const active = id === current;
            const count = counts[id];
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onOpen(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 cursor-pointer ${
                    active ? 'bg-ghost text-fg' : 'text-body hover:bg-bone/[0.05] hover:text-fg'
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.75}
                    className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${active ? 'text-clay' : 'text-mut group-hover:text-body'}`}
                  />
                  <span className="flex-1 text-start">{TAB_LABEL[id]}</span>
                  {count && (
                    <span
                      title={count.label}
                      className={`min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold leading-4 tabular-nums ${
                        count.tone === 'accent' ? 'bg-clay text-night' : 'bg-bone/10 text-fg'
                      }`}
                    >
                      <span aria-hidden="true">{count.value}</span>
                      <span className="sr-only">{count.label}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </nav>
);

const SidebarAccount: React.FC<{ email: string; roleLabel: string; onSignOut: () => void }> = ({ email, roleLabel, onSignOut }) => (
  <div className="shrink-0 border-t border-line p-3">
    <div className="flex items-center gap-3 px-2 py-2">
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ghost text-sm font-semibold uppercase text-fg">
        {email.charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm text-fg" title={email}>
          {email}
        </p>
        <p className="text-xs text-mut">{roleLabel}</p>
      </div>
    </div>
    <div className="mt-1 grid grid-cols-2 gap-1">
      <Link
        to="/"
        className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] text-body transition-colors duration-200 hover:bg-bone/[0.05] hover:text-fg"
      >
        <Store className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        View store
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] text-body transition-colors duration-200 hover:bg-bone/[0.05] hover:text-fg cursor-pointer"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Sign out
      </button>
    </div>
  </div>
);

/** Phones and tablets: the sidebar as a drawer over the page. */
const MenuDrawer: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close.current();
      } else if (e.key === 'Tab' && panelRef.current) {
        // Keep Tab inside the drawer while it is open.
        const items = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    // The drawer closes by itself when the window widens to the desktop layout, where the sidebar shows instead.
    const wide = window.matchMedia('(min-width: 1024px)');
    const onWide = () => {
      if (wide.matches) close.current();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      window.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div className="absolute inset-0 bg-night/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        id="admin-menu"
        data-surface="night"
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        className="absolute inset-y-0 start-0 flex w-[min(300px,86vw)] flex-col shadow-[16px_0_48px_-12px_rgba(0,0,0,0.55)]"
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 px-5">
          <Brand />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close the menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong text-fg transition-colors duration-200 hover:border-fg cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Console: React.FC<{ role: UserRoleInfo; adminRole: AdminRole; email: string }> = ({ role, adminRole, email }) => {
  const { showToast } = useToast();
  const tabs = role.allowedTabs as TabId[];
  const [tab, setTab] = useState<TabId>(tabs[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newOrders, setNewOrders] = useState(0);

  const readsOrders = ORDER_READERS.includes(adminRole);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersState, setOrdersState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ordersError, setOrdersError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsState, setProductsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    if (!readsOrders) return;
    let known: Set<string> | null = null;
    return DataService.subscribeToOrders(
      (live) => {
        setOrders(live);
        setOrdersState('ready');
        if (known) {
          const fresh = live.filter((o) => !known?.has(o.id));
          if (fresh.length > 0) {
            setNewOrders((n) => n + fresh.length);
            showToast(fresh.length === 1 ? 'New order' : `${fresh.length} new orders`, `${fresh[0].orderNumber} · ${egp(fresh[0].total)}`, 'success');
          }
        }
        known = new Set(live.map((o) => o.id));
      },
      (message) => {
        console.error('[AdminPage] orders could not be loaded:', message);
        setOrdersError(message);
        setOrdersState('error');
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readsOrders]);

  useEffect(
    () =>
      DataService.subscribeToProducts(
        (live) => {
          setProducts(live);
          setProductsState('ready');
        },
        (message) => {
          console.error('[AdminPage] products could not be loaded:', message);
          setProductsError(message);
          setProductsState('error');
        },
        { includeDrafts: true }
      ),
    []
  );

  const openTab = (next: TabId) => {
    setTab(next);
    setMenuOpen(false);
    if (next === 'orders') setNewOrders(0);
    window.scrollTo({ top: 0 });
  };
  const openOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    openTab('orders');
  };

  const handleSignOut = async () => {
    try {
      await AuthService.logout();
    } catch (err) {
      showToast('Could not sign out', AuthService.formatAuthError(err, false), 'error');
    }
  };

  const pending = orders.filter((o) => o.orderStatus === 'pending').length;
  const soldOut = products.reduce((n, p) => n + p.variants.filter((v) => v.stockCount === 0).length, 0);
  const counts: Partial<Record<TabId, NavCount>> = {};
  if (ordersState === 'ready' && pending > 0) {
    counts.orders = { value: pending, label: pending === 1 ? '1 new order to confirm' : `${pending} new orders to confirm`, tone: 'accent' };
  }
  if (productsState === 'ready' && soldOut > 0) {
    counts.inventory = { value: soldOut, label: soldOut === 1 ? '1 size sold out' : `${soldOut} sizes sold out`, tone: 'neutral' };
  }

  const groups = NAV_GROUPS.map((g) => ({ ...g, tabs: g.tabs.filter((id) => tabs.includes(id)) })).filter((g) => g.tabs.length > 0);
  const nav = <SidebarNav groups={groups} current={tab} counts={counts} onOpen={openTab} />;
  const account = <SidebarAccount email={email} roleLabel={ROLE_LABEL[adminRole]} onSignOut={handleSignOut} />;
  const showNewOrders = newOrders > 0 && tabs.includes('orders');

  // Products and Inventory show nothing until the catalogue arrives; the Dashboard and Reviews handle it themselves.
  const waitsForProducts: TabId[] = ['products', 'inventory'];
  const needsProducts: TabId[] = ['dashboard', 'products', 'inventory', 'reviews'];

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <SEOHead title={`${TAB_LABEL[tab]} · Store admin`} description="RootLand staff console." />

      <aside data-surface="night" className="sticky top-0 hidden h-svh flex-col lg:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Brand />
        </div>
        {nav}
        {account}
      </aside>

      <div data-surface="night" className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          {showNewOrders && tab !== 'orders' && (
            <button type="button" onClick={() => openTab('orders')} className="pill pill--sm pill--accent">
              {newOrders} new
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="admin-menu"
            aria-label="Open the menu"
            className="grid h-10 w-10 place-items-center rounded-full border border-line-strong text-fg transition-colors duration-200 hover:border-fg cursor-pointer"
          >
            <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>
      {menuOpen && (
        <MenuDrawer onClose={() => setMenuOpen(false)}>
          {nav}
          {account}
        </MenuDrawer>
      )}

      <div className="min-w-0 px-4 pb-16 pt-8 sm:px-8 lg:px-12 lg:pt-12">
        <div className="mx-auto max-w-[1240px]">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-fg">{TAB_LABEL[tab]}</h1>
              <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-body">{TAB_INTRO[tab]}</p>
            </div>
            {showNewOrders && tab !== 'orders' && (
              <button type="button" onClick={() => openTab('orders')} className="pill pill--sm pill--accent hidden lg:inline-flex">
                {newOrders === 1 ? '1 new order' : `${newOrders} new orders`}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </header>

          {waitsForProducts.includes(tab) && productsState === 'loading' && (
            <div className="rounded-2xl border border-fg/10 bg-bg-2">
              <Loading label="Loading products…" />
            </div>
          )}
          {needsProducts.includes(tab) && productsState === 'error' && (
            <div className="mb-6">
              <ErrorNotice message={`Products could not be loaded: ${productsError}`} />
            </div>
          )}

          {tab === 'dashboard' && (
            <DashboardTab
              orders={orders}
              ordersState={readsOrders ? ordersState : 'error'}
              ordersError={readsOrders ? ordersError : 'your role cannot read orders'}
              products={products}
              productsReady={productsState === 'ready'}
              onOpenOrder={tabs.includes('orders') ? openOrder : undefined}
              onOpenOrders={tabs.includes('orders') ? () => openTab('orders') : undefined}
            />
          )}
          {tab === 'orders' && (
            <OrdersTab orders={orders} ordersState={ordersState} ordersError={ordersError} selectedOrderId={selectedOrderId} onSelect={setSelectedOrderId} />
          )}
          {tab === 'customers' && <CustomersTab />}
          {tab === 'products' && <ProductsTab products={products} productsState={productsState} />}
          {tab === 'inventory' && productsState === 'ready' && <InventoryTab products={products} />}
          {tab === 'reviews' && <ReviewsTab products={products} />}
          {tab === 'coupons' && <CouponsTab />}
          {tab === 'b2b' && <B2BTab />}
          {tab === 'content' && <ContentTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'staff' && <StaffTab currentEmail={email} />}
          {tab === 'activity' && <ActivityTab />}
        </div>
      </div>
    </div>
  );
};
