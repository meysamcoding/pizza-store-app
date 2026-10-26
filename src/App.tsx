import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  Heart,
  Leaf,
  MapPin,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type {
  Customer,
  Fulfillment,
  MenuResponse,
  Order,
  OrderResponse,
  Pizza,
} from "./types";
import { usePageRoute } from "./hooks/usePageRoute";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FAQ from "./components/FAQ";
import "./pages/pages.css";

type Cart = Record<string, number>;
type Panel = "cart" | "checkout" | "confirmation" | "tracking" | null;
type CategoryFilter = "all" | "signature" | "classic" | "vegetarian";
type FormFields = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};
const DEMO_MODE = import.meta.env.VITE_PAGES_DEMO === "true";
const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
const CART_KEY = DEMO_MODE ? "forno-pages-cart-v1" : "forno-cart-v1";
const MODE_KEY = DEMO_MODE ? "forno-pages-fulfillment-v1" : "forno-fulfillment-v1";
const ORDER_KEY = "forno-latest-order-v1";
const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount,
  );

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Ordering works without local storage. */
  }
}

function initialCart(): Cart {
  try {
    const parsed: unknown = JSON.parse(readStored(CART_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([id, quantity]) =>
          id.length < 80 &&
          typeof quantity === "number" &&
          Number.isInteger(quantity) &&
          quantity > 0 &&
          quantity <= 10,
      ),
    );
  } catch {
    return {};
  }
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = (await response.json().catch(() => null)) as {
    error?: string;
    message?: string;
  } | null;
  if (!response.ok)
    throw new Error(
      data?.error || data?.message || "Something went wrong. Please try again.",
    );
  if (!data)
    throw new Error("We could not read the response. Please try again.");
  return data as T;
}

function ModeSwitch({
  value,
  onChange,
}: {
  value: Fulfillment;
  onChange: (value: Fulfillment) => void;
}) {
  return (
    <div
      className="fulfillment-toggle"
      role="group"
      aria-label="Order fulfillment"
    >
      <button
        type="button"
        className={value === "delivery" ? "active" : ""}
        aria-pressed={value === "delivery"}
        onClick={() => onChange("delivery")}
      >
        <Truck size={15} />
        Delivery
      </button>
      <button
        type="button"
        className={value === "pickup" ? "active" : ""}
        aria-pressed={value === "pickup"}
        onClick={() => onChange("pickup")}
      >
        <ShoppingBag size={15} />
        Pickup
      </button>
    </div>
  );
}

function PizzaCard({
  pizza,
  quantity,
  onAdd,
}: {
  pizza: Pizza;
  quantity: number;
  onAdd: () => void;
}) {
  return (
    <article className="pizza-card">
      <div className="pizza-image-wrap">
        <img src={pizza.image} alt={pizza.name + " pizza"} loading="lazy" />
        {pizza.badge && <span className="pizza-badge">{pizza.badge}</span>}
      </div>
      <div className="pizza-card-body">
        <div className="pizza-name-row">
          <h3>{pizza.name}</h3>
          <div className="diet-icons">
            {pizza.vegetarian && (
              <span title="Vegetarian" className="vegetarian-icon">
                <Leaf size={16} aria-label="Vegetarian" />
              </span>
            )}
            {pizza.spicy && (
              <span title="Spicy" className="spicy-icon">
                <Flame size={16} aria-label="Spicy" />
              </span>
            )}
          </div>
        </div>
        <p>{pizza.description}</p>
        <div className="pizza-card-bottom">
          <span className="pizza-price">{formatMoney(pizza.price)}</span>
          <button
            type="button"
            className="add-button"
            onClick={onAdd}
            disabled={quantity >= 10}
            aria-label={`Add ${pizza.name} to your order${quantity ? `, ${quantity} already in cart` : ""}`}
          >
            {quantity >= 10 ? <Check size={17} /> : <Plus size={17} />}
            <span>{quantity >= 10 ? "Max added" : "Add to order"}</span>
            {quantity > 0 && quantity < 10 && (
              <span className="added-count">{quantity}</span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const { page, hash } = usePageRoute();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const previousPageRef = useRef(page);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [menuError, setMenuError] = useState("");
  const [menuAttempt, setMenuAttempt] = useState(0);
  const [cart, setCart] = useState<Cart>(initialCart);
  const [mode, setMode] = useState<Fulfillment>(() =>
    readStored(MODE_KEY) === "pickup" ? "pickup" : "delivery",
  );
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState("");
  const [fields, setFields] = useState<FormFields>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormFields, string>>
  >({});
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [latestOrderId, setLatestOrderId] = useState(() =>
    readStored(ORDER_KEY),
  );
  const [trackingLoading, setTrackingLoading] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const submittingRef = useRef(false);
  const panelOpen = panel !== null;

  useEffect(() => {
    setMobileNavOpen(false);
    const titles = {
      home: "Forno — Good pizza. Great company.",
      about: "About us — Forno",
      contact: "Contact us — Forno",
    };
    document.title = titles[page];
    const descriptions = {
      home: "Meet your next favorite pizza. Explore the Forno menu and find your favorite flavor.",
      about: "Meet Forno: simple ingredients, patient dough, and pizza made for good company.",
      contact: "Have a question about Forno? Explore common questions and preview a message on our practice site.",
    };
    document.querySelector('meta[name="description"]')?.setAttribute("content", descriptions[page]);
    const changedPage = previousPageRef.current !== page;
    previousPageRef.current = page;
    const frame = window.requestAnimationFrame(() => {
      if (changedPage) mainRef.current?.focus({ preventScroll: true });
      const anchor = hash.slice(1);
      if (page === "home" && ["menu", "story", "faq"].includes(anchor)) {
        document.getElementById(anchor)?.scrollIntoView({ behavior: "instant" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, page]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        navigationButtonRef.current?.focus();
      }
    };
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const controller = new AbortController();
    setMenuError("");
    api<MenuResponse>(DEMO_MODE ? assetUrl("demo-menu.json") : "/api/menu", {
      signal: controller.signal,
    })
      .then((data) => {
        setMenu({
          ...data,
          items: data.items.map((item) => ({ ...item, image: assetUrl(item.image) })),
        });
        setCart((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([id]) =>
              data.items.some((item) => item.id === id),
            ),
          ),
        );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setMenuError(
            error instanceof Error
              ? error.message
              : "Our menu could not load. Please try again.",
          );
      });
    return () => controller.abort();
  }, [menuAttempt]);

  useEffect(() => {
    store(CART_KEY, JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    store(MODE_KEY, mode);
  }, [mode]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!panelOpen) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    shellRef.current?.setAttribute("inert", "");
    shellRef.current?.setAttribute("aria-hidden", "true");
    const focusTimeout = window.setTimeout(
      () => panelHeadingRef.current?.focus(),
      0,
    );
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submittingRef.current) setPanel(null);
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
        ) || [],
      ).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !focusable.includes(document.activeElement as HTMLElement))
      ) {
        event.preventDefault();
        last.focus();
      }
      if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !focusable.includes(document.activeElement as HTMLElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeys);
    return () => {
      window.clearTimeout(focusTimeout);
      document.body.style.overflow = bodyOverflow;
      shellRef.current?.removeAttribute("inert");
      shellRef.current?.removeAttribute("aria-hidden");
      document.removeEventListener("keydown", handleKeys);
      restoreFocusRef.current?.focus();
    };
  }, [panelOpen]);

  useEffect(() => {
    if (panelOpen)
      window.requestAnimationFrame(() => panelHeadingRef.current?.focus());
  }, [panel, panelOpen]);

  const cartItems = (menu?.items || [])
    .filter((item) => cart[item.id])
    .map((item) => ({ ...item, quantity: cart[item.id] }));
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal =
    Math.round(
      cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) *
        100,
    ) / 100;
  const deliveryFee =
    mode === "delivery" &&
    subtotal > 0 &&
    subtotal < (menu?.freeDeliveryThreshold || 35)
      ? menu?.deliveryFee || 3.5
      : 0;
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;
  const filteredItems = (menu?.items || []).filter(
    (item) =>
      (category === "all" ||
        (category === "vegetarian"
          ? item.vegetarian
          : item.category === category)) &&
      `${item.name} ${item.description}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  function changeQuantity(id: string, difference: number) {
    setCart((current) => {
      const quantity = Math.min(
        10,
        Math.max(0, (current[id] || 0) + difference),
      );
      const next = { ...current };
      if (quantity) next[id] = quantity;
      else delete next[id];
      return next;
    });
  }

  function addPizza(pizza: Pizza) {
    changeQuantity(pizza.id, 1);
    setToast(`${pizza.name} added to your order`);
  }

  function closeMobileNavigation(destination: string) {
    if (window.location.hash === destination) {
      navigationButtonRef.current?.focus();
    }
    setMobileNavOpen(false);
  }

  function browseMenu() {
    setPanel(null);
    if (window.location.hash !== "#menu") {
      window.location.hash = "menu";
      return;
    }
    window.setTimeout(
      () =>
        document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }),
      0,
    );
  }

  async function trackOrder() {
    if (DEMO_MODE || !latestOrderId) return;
    setPanel("tracking");
    setTrackingLoading(true);
    setRequestError("");
    try {
      const data = await api<OrderResponse>(
        `/api/orders/${encodeURIComponent(latestOrderId)}`,
      );
      setOrder(data.order);
      setPanel((current) =>
        current === "tracking" ? "confirmation" : current,
      );
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "We could not find your order. Please try again.",
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  function updateField(field: keyof FormFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError("");
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (DEMO_MODE || submittingRef.current || !cartItems.length) return;
    const errors: Partial<Record<keyof FormFields, string>> = {};
    if (fields.name.trim().length < 2) errors.name = "Please enter your name.";
    const phoneDigits = fields.phone.replace(/\D/g, "").length;
    if (
      phoneDigits < 7 ||
      phoneDigits > 15 ||
      !/^[+()\d\s-]+$/.test(fields.phone.trim())
    )
      errors.phone = "Please enter a phone number with 7–15 digits.";
    if (
      fields.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())
    )
      errors.email = "Please enter a valid email address.";
    if (mode === "delivery" && fields.address.trim().length < 5)
      errors.address = "Please enter your full delivery address.";
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      window.requestAnimationFrame(() =>
        document.getElementById(`customer-${Object.keys(errors)[0]}`)?.focus(),
      );
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setRequestError("");
    const customer: Customer = {
      name: fields.name.trim(),
      phone: fields.phone.trim(),
      address: mode === "delivery" ? fields.address.trim() : "",
      ...(fields.email.trim() ? { email: fields.email.trim() } : {}),
      ...(fields.notes.trim() ? { notes: fields.notes.trim() } : {}),
    };
    try {
      const data = await api<OrderResponse>("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
          customer,
          fulfillment: mode,
          paymentMethod: "cash",
        }),
      });
      setOrder(data.order);
      setLatestOrderId(data.order.id);
      store(ORDER_KEY, data.order.id);
      setCart({});
      setPanel("confirmation");
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "Your order could not be placed. Please try again.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function Totals() {
    return (
      <div className="totals">
        <div className="total-row">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <div className="total-row">
          <span>{mode === "pickup" ? "Pickup" : "Delivery"}</span>
          <span>
            {deliveryFee ? (
              formatMoney(deliveryFee)
            ) : (
              <span className="free-label">Free</span>
            )}
          </span>
        </div>
        <div className="total-row grand-total">
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>
    );
  }

  const panelTitle =
    panel === "cart"
      ? "Your order"
      : panel === "checkout"
        ? "One step from pizza."
        : panel === "tracking"
          ? "Your latest order"
          : "You’re on the list.";

  return (
    <>
      <div className="site-shell" ref={shellRef}>
        <a
          href="#main-content"
          className="skip-link"
          onClick={(event) => {
            event.preventDefault();
            mainRef.current?.focus();
            mainRef.current?.scrollIntoView({ behavior: "instant" });
          }}
        >
          Skip to content
        </a>
        {DEMO_MODE && (
          <div className="demo-banner" role="note">
            <span>Practice site · Explore the menu and cart. No real orders.</span>
          </div>
        )}
        <header className="site-header section-shell" ref={headerRef}>
          <a className="brand" href="#/" aria-label="Forno home">
            <span className="brand-icon">
              <UtensilsCrossed size={21} />
            </span>
            forno<span className="brand-dot">.</span>
          </a>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a className={page === "home" ? "nav-active" : ""} href="#menu" aria-current={page === "home" ? "page" : undefined}>
              Our menu
            </a>
            <a className={page === "about" ? "nav-active" : ""} href="#/about" aria-current={page === "about" ? "page" : undefined}>About us</a>
            <a className={page === "contact" ? "nav-active" : ""} href="#/contact" aria-current={page === "contact" ? "page" : undefined}>Contact us</a>
          </nav>
          <div className="header-actions">
            <ModeSwitch value={mode} onChange={setMode} />
            {!DEMO_MODE && latestOrderId && (
              <button
                type="button"
                className="track-button"
                onClick={trackOrder}
              >
                <Clock3 size={16} />
                <span>My order</span>
              </button>
            )}
            <button
              type="button"
              className="cart-trigger"
              onClick={() => {
                setMobileNavOpen(false);
                setPanel("cart");
              }}
              aria-label={`Open your order, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            >
              <ShoppingBag size={18} />
              <span>Cart</span>
              <span className="cart-count">{itemCount}</span>
            </button>
            <button
              type="button"
              className="mobile-nav-toggle"
              ref={navigationButtonRef}
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
          {mobileNavOpen && (
            <nav className="mobile-navigation" id="mobile-navigation" aria-label="Mobile navigation">
              <a href="#menu" aria-current={page === "home" ? "page" : undefined} onClick={() => closeMobileNavigation("#menu")}>Our menu <ArrowRight size={17} /></a>
              <a href="#/about" aria-current={page === "about" ? "page" : undefined} onClick={() => closeMobileNavigation("#/about")}>About us <ArrowRight size={17} /></a>
              <a href="#/contact" aria-current={page === "contact" ? "page" : undefined} onClick={() => closeMobileNavigation("#/contact")}>Contact us <ArrowRight size={17} /></a>
              <a href="#faq" onClick={() => closeMobileNavigation("#faq")}>Good to know <ArrowRight size={17} /></a>
              <p>A little slice of the good life.</p>
            </nav>
          )}
        </header>

        <main id="main-content" ref={mainRef} tabIndex={-1}>
          {page === "home" ? <>
          <section
            className="hero section-shell"
            aria-labelledby="hero-heading"
          >
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                HAND-STRETCHED. WOOD-FIRED.
              </p>
              <h1 id="hero-heading">
                Good pizza.
                <br />
                <span>Great company.</span>
              </h1>
              <p className="hero-description">
                A little flour. A lot of love. Proper pizza made with slow-risen
                dough, good ingredients, and nothing to hide.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#menu">
                  Find your favorite <ArrowDownRight size={21} />
                </a>
                <div className="hero-note">
                  <span className="hero-note-icon">
                    <Flame size={21} />
                  </span>
                  <span>
                    Made fresh.
                    <br />
                    <strong>Worth sharing.</strong>
                  </span>
                </div>
              </div>
              <div className="hero-bottom-note">
                <span className="tiny-star">✳</span> GOOD FOOD. NO FUSS. JUST
                FORNO.
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-photo">
                <img
                  src={assetUrl("images/hero.svg")}
                  alt="Freshly baked pizza with basil and melted mozzarella"
                  fetchPriority="high"
                />
              </div>
              <div className="hero-stamp">
                <span>DOUGH MADE</span>
                <strong>
                  slow.
                  <br />
                  pizza made
                  <br />
                  with love.
                </strong>
                <span>EVERY SINGLE DAY</span>
              </div>
              <div className="hero-caption">
                <span className="caption-dot" />A little slice of the good life.
              </div>
              <span className="hero-doodle" aria-hidden="true">
                ✳
              </span>
            </div>
          </section>

          <div className="quality-ribbon" aria-label="Our pizza promises">
            <span>
              <Flame size={17} /> Wood-fired goodness
            </span>
            <span className="ribbon-star" aria-hidden="true">
              ✳
            </span>
            <span>
              <Leaf size={17} /> Thoughtfully sourced
            </span>
            <span className="ribbon-star" aria-hidden="true">
              ✳
            </span>
            <span>
              <Heart size={17} /> Made for sharing
            </span>
            <span className="ribbon-star" aria-hidden="true">
              ✳
            </span>
            <span>
              <ChefHat size={17} /> Slow dough, happy people
            </span>
          </div>

          <section
            id="menu"
            className="menu-section section-shell"
            aria-labelledby="menu-heading"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">A SLICE FOR EVERY MOOD</p>
                <h2 id="menu-heading">
                  Meet your next favorite<span>.</span>
                </h2>
              </div>
              <p className="menu-intro">
                The classics you love. A few new crushes.
                <br />
                Every pizza, made fresh just for you.
              </p>
            </div>
            <div className="menu-toolbar">
              <div
                className="category-filters"
                role="group"
                aria-label="Filter pizzas"
              >
                {(
                  [
                    { id: "all", label: "All pizzas" },
                    { id: "signature", label: "Signature" },
                    { id: "classic", label: "Classics" },
                    { id: "vegetarian", label: "Vegetarian" },
                  ] as { id: CategoryFilter; label: string }[]
                ).map((filter) => (
                  <button
                    type="button"
                    key={filter.id}
                    className={`category-chip ${category === filter.id ? "active" : ""}`}
                    aria-pressed={category === filter.id}
                    onClick={() => setCategory(filter.id)}
                  >
                    {filter.id === "vegetarian" && <Leaf size={14} />}
                    {filter.label}
                  </button>
                ))}
              </div>
              <label className="menu-search">
                <Search size={17} />
                <span className="sr-only">Search pizzas or ingredients</span>
                <input
                  type="search"
                  placeholder="Find your flavor..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
            </div>
            {menuError ? (
              <div className="menu-state" role="alert">
                <p>Our menu is taking a little longer.</p>
                <span>{menuError}</span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMenuAttempt((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            ) : !menu ? (
              <div
                className="pizza-grid skeleton-grid"
                aria-label="Loading pizza menu"
                aria-busy="true"
              >
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <div className="pizza-skeleton" key={value}>
                    <div />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : filteredItems.length ? (
              <div className="pizza-grid">
                {filteredItems.map((pizza) => (
                  <PizzaCard
                    key={pizza.id}
                    pizza={pizza}
                    quantity={cart[pizza.id] || 0}
                    onAdd={() => addPizza(pizza)}
                  />
                ))}
              </div>
            ) : (
              <div className="menu-state">
                <Search size={28} />
                <p>No pizzas found for that flavor.</p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSearch("");
                    setCategory("all");
                  }}
                >
                  See all pizzas
                </button>
              </div>
            )}
            <div className="menu-footnote">
              <Leaf size={15} />
              <span>Vegetarian</span>
              <span className="footnote-divider">·</span>
              <Flame size={15} />
              <span>A little heat</span>
              <span className="menu-size-note">
                All pizzas are 12″. Perfect for one. Better with friends.
              </span>
            </div>
          </section>

          <section className="delivery-strip section-shell">
            <div className="delivery-strip-icon">
              <Truck size={29} />
            </div>
            <div>
              <h3>Your place or ours?</h3>
              <p>Choose delivery or pick it up fresh from the oven.</p>
            </div>
            <span className="delivery-strip-tag">
              Free delivery on orders{" "}
              {formatMoney(menu?.freeDeliveryThreshold || 35)}+
            </span>
            <a href="#menu" className="text-link">
              Let’s eat <ArrowRight size={19} />
            </a>
          </section>

          <section
            className="story-section section-shell"
            id="story"
            aria-labelledby="story-heading"
          >
            <div className="story-copy">
              <p className="eyebrow">THE FORNO WAY</p>
              <h2 id="story-heading">
                Simple things.
                <br />
                Done properly.
              </h2>
              <p>
                We believe the best nights start with a good pizza. So we keep
                things simple: patient dough, generous toppings, and a hot oven.
                A familiar favorite, with a little something special.
              </p>
              <span className="story-signoff">See you around the table.</span>
              <a className="text-link story-more" href="#/about">Get to know us <ArrowRight size={17} /></a>
            </div>
            <div className="story-values">
              <div className="story-value">
                <span>
                  <Clock3 size={23} />
                </span>
                <div>
                  <h3>Good things take time</h3>
                  <p>
                    Our dough rests slowly for a light, airy crust with a little
                    extra character.
                  </p>
                </div>
              </div>
              <div className="story-value">
                <span>
                  <Leaf size={23} />
                </span>
                <div>
                  <h3>Every ingredient counts</h3>
                  <p>
                    Bright tomatoes, creamy mozzarella, and toppings that speak
                    for themselves.
                  </p>
                </div>
              </div>
              <div className="story-value">
                <span>
                  <Heart size={23} />
                </span>
                <div>
                  <h3>A table for everyone</h3>
                  <p>
                    Big nights, quiet nights, or just-because nights. There’s a
                    pizza for that.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <FAQ />
          </> : page === "about" ? <AboutPage assetUrl={assetUrl} /> : <ContactPage />}
        </main>
        <footer className="site-footer section-shell">
          <div>
            <a className="brand" href="#/" aria-label="Forno home">
              forno<span className="brand-dot">.</span>
            </a>
            <p>Good pizza. Great company.</p>
          </div>
          <nav className="footer-nav" aria-label="Footer navigation">
            <a href="#menu">Our menu</a>
            <a href="#/about">About us</a>
            <a href="#/contact">Contact us</a>
            <a href="#faq">FAQ</a>
          </nav>
          <span className="footer-copyright">
            © {new Date().getFullYear()} Forno. Made with love.
          </span>
        </footer>
      </div>

      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && (
          <>
            <CheckCircle2 size={18} />
            <span>{toast}</span>
            <button
              type="button"
              onClick={() => {
                setToast("");
                setPanel("cart");
              }}
            >
              View order <ArrowRight size={15} />
            </button>
          </>
        )}
      </div>

      {panelOpen && (
        <div
          className="overlay-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget && !submittingRef.current)
              setPanel(null);
          }}
        >
          <div
            className={`order-panel ${panel === "confirmation" ? "confirmation-panel" : ""}`}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
          >
            <div className="panel-header">
              <div>
                {panel === "checkout" && (
                  <button
                    type="button"
                    className="back-button"
                    onClick={() => {
                      setPanel("cart");
                      setRequestError("");
                    }}
                    disabled={submitting}
                  >
                    <ArrowLeft size={15} />
                    Back to your order
                  </button>
                )}
                <h2 id="panel-title" ref={panelHeadingRef} tabIndex={-1}>
                  {panelTitle}
                </h2>
                {panel === "cart" && (
                  <p>
                    {itemCount
                      ? `${itemCount} ${itemCount === 1 ? "pizza" : "pizzas"}. A very good decision.`
                      : "Your next favorite is waiting."}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="close-button"
                aria-label="Close order panel"
                onClick={() => setPanel(null)}
                disabled={submitting}
              >
                <X size={22} />
              </button>
            </div>

            {panel === "cart" && (
              <>
                {cartItems.length ? (
                  <>
                    <div className="panel-content">
                      <div className="cart-mode">
                        <span>How are we getting together?</span>
                        <ModeSwitch value={mode} onChange={setMode} />
                      </div>
                      <div className="cart-items">
                        {cartItems.map((item) => (
                          <div className="cart-item" key={item.id}>
                            <img
                              className="cart-item-image"
                              src={item.image}
                              alt={item.name}
                            />
                            <div className="cart-item-copy">
                              <h3>{item.name}</h3>
                              <p>{formatMoney(item.price)} each</p>
                              <div className="quantity-control">
                                <button
                                  type="button"
                                  onClick={() => changeQuantity(item.id, -1)}
                                  aria-label={`Remove one ${item.name}`}
                                >
                                  <Minus size={14} />
                                </button>
                                <span
                                  aria-label={`${item.quantity} ${item.name} pizzas`}
                                >
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => changeQuantity(item.id, 1)}
                                  disabled={item.quantity >= 10}
                                  aria-label={`Add one ${item.name}`}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="cart-item-right">
                              <strong>
                                {formatMoney(item.price * item.quantity)}
                              </strong>
                              <button
                                type="button"
                                className="remove-item"
                                aria-label={`Remove ${item.name} from your order`}
                                onClick={() =>
                                  setCart((current) => {
                                    const next = { ...current };
                                    delete next[item.id];
                                    return next;
                                  })
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {mode === "delivery" && (
                        <div className="delivery-progress">
                          <Truck size={18} />
                          <span>
                            {subtotal >= (menu?.freeDeliveryThreshold || 35)
                              ? "You’ve unlocked free delivery. Nice."
                              : `Add ${formatMoney((menu?.freeDeliveryThreshold || 35) - subtotal)} more for free delivery.`}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="add-more-button"
                        onClick={browseMenu}
                      >
                        <Plus size={16} />A little more pizza?
                      </button>
                    </div>
                    <div className="panel-footer">
                      <Totals />
                      <button
                        type="button"
                        className="checkout-button"
                        disabled={DEMO_MODE}
                        onClick={() => {
                          setPanel("checkout");
                          setRequestError("");
                        }}
                      >
                        {DEMO_MODE ? "Checkout unavailable in demo" : "Continue to checkout"}
                        {!DEMO_MODE && <ArrowRight size={19} />}
                      </button>
                      <p className="checkout-note">
                        {DEMO_MODE
                          ? "This practice site does not collect details or place orders."
                          : "Fresh pizza. Easy checkout. Happy you."}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="empty-cart panel-content">
                    <div className="empty-cart-icon">
                      <ShoppingBag size={38} />
                    </div>
                    <h3>A little empty in here.</h3>
                    <p>Let’s fix that with something delicious.</p>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={browseMenu}
                    >
                      Find your pizza <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}

            {panel === "checkout" && (
              <form className="checkout-form" onSubmit={submitOrder} noValidate>
                <div className="panel-content">
                  <div className="checkout-mode">
                    <ModeSwitch
                      value={mode}
                      onChange={(value) => {
                        if (!submitting) {
                          setMode(value);
                          setFormErrors({});
                        }
                      }}
                    />
                    <p>
                      <Clock3 size={15} />
                      {mode === "delivery"
                        ? "Delivered fresh in about 35–45 minutes"
                        : "Ready to pick up in about 20–25 minutes"}
                    </p>
                  </div>
                  <div className="form-section-title">
                    <span>01</span>
                    <h3>Your details</h3>
                  </div>
                  <div className="form-field">
                    <label htmlFor="customer-name">Full name</label>
                    <input
                      className="input"
                      id="customer-name"
                      name="name"
                      autoComplete="name"
                      placeholder="Alex Smith"
                      value={fields.name}
                      maxLength={100}
                      disabled={submitting}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      aria-invalid={Boolean(formErrors.name)}
                      aria-describedby={
                        formErrors.name ? "name-error" : undefined
                      }
                      required
                    />
                    {formErrors.name && (
                      <span className="form-error" id="name-error">
                        {formErrors.name}
                      </span>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="customer-phone">Phone number</label>
                      <input
                        className="input"
                        id="customer-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="Your phone number"
                        value={fields.phone}
                        maxLength={25}
                        disabled={submitting}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                        aria-invalid={Boolean(formErrors.phone)}
                        aria-describedby={
                          formErrors.phone ? "phone-error" : undefined
                        }
                        required
                      />
                      {formErrors.phone && (
                        <span className="form-error" id="phone-error">
                          {formErrors.phone}
                        </span>
                      )}
                    </div>
                    <div className="form-field">
                      <label htmlFor="customer-email">
                        Email <span>(optional)</span>
                      </label>
                      <input
                        className="input"
                        id="customer-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={fields.email}
                        maxLength={254}
                        disabled={submitting}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        aria-invalid={Boolean(formErrors.email)}
                        aria-describedby={
                          formErrors.email ? "email-error" : undefined
                        }
                      />
                      {formErrors.email && (
                        <span className="form-error" id="email-error">
                          {formErrors.email}
                        </span>
                      )}
                    </div>
                  </div>
                  {mode === "delivery" && (
                    <div className="form-field">
                      <label htmlFor="customer-address">Delivery address</label>
                      <textarea
                        className="input"
                        id="customer-address"
                        name="address"
                        autoComplete="street-address"
                        placeholder="Street, apartment, city, and ZIP code"
                        value={fields.address}
                        maxLength={240}
                        rows={2}
                        disabled={submitting}
                        onChange={(event) =>
                          updateField("address", event.target.value)
                        }
                        aria-invalid={Boolean(formErrors.address)}
                        aria-describedby={
                          formErrors.address ? "address-error" : undefined
                        }
                        required
                      />
                      {formErrors.address && (
                        <span className="form-error" id="address-error">
                          {formErrors.address}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="form-field">
                    <label htmlFor="customer-notes">
                      Anything we should know? <span>(optional)</span>
                    </label>
                    <textarea
                      className="input"
                      id="customer-notes"
                      name="notes"
                      placeholder={
                        mode === "delivery"
                          ? "Door code, delivery instructions, or a little hello..."
                          : "Any order notes or a little hello..."
                      }
                      value={fields.notes}
                      maxLength={500}
                      rows={2}
                      disabled={submitting}
                      onChange={(event) =>
                        updateField("notes", event.target.value)
                      }
                    />
                  </div>
                  <div className="form-section-title">
                    <span>02</span>
                    <h3>Payment</h3>
                  </div>
                  <div className="payment-note">
                    <span className="payment-check">
                      <Check size={17} />
                    </span>
                    <div>
                      <strong>
                        {mode === "delivery"
                          ? "Cash on delivery"
                          : "Pay cash at pickup"}
                      </strong>
                      <p>Keep it simple. Pay when your pizza arrives.</p>
                    </div>
                  </div>
                  <div className="order-summary">
                    <h3>Your pizza lineup</h3>
                    {cartItems.map((item) => (
                      <div key={item.id}>
                        <span>
                          {item.quantity} × {item.name}
                        </span>
                        <span>{formatMoney(item.quantity * item.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel-footer">
                  <Totals />
                  {requestError && (
                    <p className="request-error" role="alert">
                      {requestError}
                    </p>
                  )}
                  <button
                    className="checkout-button"
                    type="submit"
                    disabled={submitting || !cartItems.length}
                  >
                    {submitting
                      ? "Placing your order…"
                      : `Place order · ${formatMoney(total)}`}
                    {!submitting && <ArrowRight size={19} />}
                  </button>
                  <p className="checkout-note">
                    {mode === "delivery"
                      ? "Payment is collected on delivery."
                      : "Payment is collected when you pick up."}
                  </p>
                </div>
              </form>
            )}

            {panel === "tracking" && (
              <div
                className="panel-content tracking-state"
                aria-busy={trackingLoading}
              >
                {trackingLoading ? (
                  <>
                    <span className="loading-spinner" />
                    <p>Checking your pizza…</p>
                  </>
                ) : (
                  <>
                    <p className="request-error" role="alert">
                      {requestError}
                    </p>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={trackOrder}
                    >
                      Try again
                    </button>
                  </>
                )}
              </div>
            )}

            {panel === "confirmation" && order && (
              <div className="panel-content confirmation-content">
                <div className="confirmation-icon">
                  <Check size={35} />
                </div>
                <p className="eyebrow">ORDER CONFIRMED</p>
                <h3>Good things are coming.</h3>
                <p className="confirmation-description">
                  Thanks, {order.customer.name.split(" ")[0]}. Your order is
                  saved and ready for the kitchen.
                </p>
                <div className="confirmation-meta">
                  <div>
                    <span>Order number</span>
                    <strong>#{order.number}</strong>
                  </div>
                  <div>
                    <span>
                      {order.fulfillment === "delivery"
                        ? "Estimated delivery"
                        : "Ready for pickup"}
                    </span>
                    <strong>~{order.estimatedMinutes} min</strong>
                  </div>
                </div>
                <div className="fulfillment-receipt">
                  {order.fulfillment === "delivery" ? (
                    <MapPin size={21} />
                  ) : (
                    <ShoppingBag size={21} />
                  )}
                  <div>
                    <strong>
                      {order.fulfillment === "delivery"
                        ? "Delivery to"
                        : "Pickup order"}
                    </strong>
                    <p>
                      {order.fulfillment === "delivery"
                        ? order.customer.address
                        : "Your pizza will be ready for pickup."}
                    </p>
                  </div>
                </div>
                <div className="receipt-items">
                  {order.items.map((item) => (
                    <div key={item.id}>
                      <span>
                        {item.quantity} × {item.name}
                      </span>
                      <span>{formatMoney(item.quantity * item.unitPrice)}</span>
                    </div>
                  ))}
                  <div>
                    <span>
                      {order.fulfillment === "delivery" ? "Delivery" : "Pickup"}
                    </span>
                    <span>
                      {order.deliveryFee
                        ? formatMoney(order.deliveryFee)
                        : "Free"}
                    </span>
                  </div>
                  <div className="receipt-total">
                    <strong>Total</strong>
                    <strong>{formatMoney(order.total)}</strong>
                  </div>
                </div>
                <div className="confirmation-payment">
                  <CheckCircle2 size={16} />
                  {order.fulfillment === "delivery"
                    ? "Pay cash when your pizza arrives."
                    : "Pay cash when you pick up your pizza."}
                </div>
                <p className="confirmation-fineprint">
                  Your confirmation is saved on this device. Use “My order” to
                  view it again. Timing is an estimate; live kitchen updates are
                  not available.
                </p>
                <button
                  type="button"
                  className="checkout-button"
                  onClick={() => setPanel(null)}
                >
                  Back to the good stuff <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
