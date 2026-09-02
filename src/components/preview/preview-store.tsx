"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addBusinessDays, businessDateKey, businessMinutesSinceMidnight, formatBusinessClock, formatBusinessDate, formatBusinessDateTime } from "@/lib/domain/time";

export type MealCode = "BREAKFAST" | "LUNCH" | "DINNER";
export type PlanType = "PREPAID" | "COUNT" | "ONE_TIME";
export type MenuItems = Record<MealCode, string>;

export const prototypeNow = () => new Date();
export const prototypeToday = () => businessDateKey();

const mealCutoffTimes: Record<MealCode, string> = {
  BREAKFAST: "7:00 AM",
  LUNCH: "11:00 AM",
  DINNER: "6:00 PM"
};

const mealCutoffMinutes: Record<MealCode, number> = {
  BREAKFAST: 7 * 60,
  LUNCH: 11 * 60,
  DINNER: 18 * 60
};

export interface PrototypeCustomer {
  id: string;
  name: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE";
  planType: PlanType;
  planName: string;
  outstanding: number;
  lunches: number;
  dinners: number;
  carriedForwardLunches: number;
  returnedLunches: number;
  reservedLunches: number;
  reservationStartsOn?: string;
}

export interface PrototypeOrder {
  id: string;
  customerId: string;
  serviceDate: string;
  meal: MealCode;
  dish: string;
  amount: number;
  covered: boolean;
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED";
  source: "CUSTOMER" | "ADMIN" | "REPLACEMENT";
  cancellable: boolean;
  linkedOrderId?: string;
  cancellationNote?: string;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  occurredOn: string;
  description: string;
  amount: number;
  type: "CHARGE" | "PAYMENT" | "CREDIT" | "ADJUSTMENT";
}

export interface PrototypeInvoice {
  id: string;
  customerId: string;
  customerName: string;
  issuedOn: string;
  period: string;
  total: number;
  paid: number;
  outstanding: number;
  status: "ISSUED" | "PAID";
  lineItems: Array<{ description: string; amount: number }>;
}

export interface AuditEvent {
  id: string;
  occurredOn: string;
  title: string;
  detail: string;
}

const mealLabels: Record<MealCode, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner"
};

const mealDishes: Record<MealCode, string> = {
  BREAKFAST: "Poha, Sprouts & Masala Chai",
  LUNCH: "Rice, Dal Fry, Aloo Matar & Fresh Salad",
  DINNER: "4 Chapatis, Paneer Masala & Jeera Rice"
};

const buildInitialMenus = (today: string): Record<string, MenuItems> => ({
  [today]: { ...mealDishes },
  [addBusinessDays(today, 1)]: {
    BREAKFAST: "Upma, Coconut Chutney & Chai",
    LUNCH: "Jeera Rice, Dal Tadka, Bhindi Fry & Salad",
    DINNER: "Chapati, Mix Veg Kurma & Curd Rice"
  },
  [addBusinessDays(today, 2)]: {
    BREAKFAST: "Idli, Sambar & Filter Coffee",
    LUNCH: "Veg Pulao, Raita, Dal Fry & Pickle",
    DINNER: "Phulka, Chana Masala & Steamed Rice"
  },
  [addBusinessDays(today, 3)]: {
    BREAKFAST: "Poha, Banana & Chai",
    LUNCH: "Rice, Sambar, Beans Poriyal & Curd",
    DINNER: "Chapati, Dal Tadka & Aloo Gobi"
  }
});

const buildInitialCustomers = (today: string): PrototypeCustomer[] => [
  { id: "CUS-011", name: "Aarav Mehta", phone: "+91 98765 4812", status: "ACTIVE", planType: "PREPAID", planName: "Current Monthly Prepaid Plan", outstanding: 240, lunches: 4, dinners: 2, carriedForwardLunches: 3, returnedLunches: 0, reservedLunches: 10, reservationStartsOn: addBusinessDays(today, 2) },
  { id: "CUS-012", name: "Riya Shah", phone: "+91 97123 2308", status: "ACTIVE", planType: "COUNT", planName: "Flexi Count Plan", outstanding: 640, lunches: 8, dinners: 0, carriedForwardLunches: 0, returnedLunches: 0, reservedLunches: 0 },
  { id: "CUS-013", name: "Kabir Singh", phone: "+91 99888 9211", status: "ACTIVE", planType: "ONE_TIME", planName: "Pay as you order", outstanding: 150, lunches: 0, dinners: 0, carriedForwardLunches: 0, returnedLunches: 0, reservedLunches: 0 },
  { id: "CUS-014", name: "Neha Rao", phone: "+91 90111 0755", status: "INACTIVE", planType: "PREPAID", planName: "Preserved Prepaid Plan", outstanding: 0, lunches: 3, dinners: 0, carriedForwardLunches: 0, returnedLunches: 0, reservedLunches: 0 },
  { id: "CUS-015", name: "Priya Verma", phone: "+91 98220 1199", status: "ACTIVE", planType: "PREPAID", planName: "Next Period Prepaid Plan", outstanding: 0, lunches: 0, dinners: 0, carriedForwardLunches: 0, returnedLunches: 0, reservedLunches: 10, reservationStartsOn: addBusinessDays(today, 2) }
];

const buildInitialOrders = (today: string): PrototypeOrder[] => [
  { id: "ORD-1048", customerId: "CUS-011", serviceDate: today, meal: "LUNCH", dish: mealDishes.LUNCH, amount: 0, covered: true, status: "CONFIRMED", source: "CUSTOMER", cancellable: true },
  { id: "ORD-1049", customerId: "CUS-012", serviceDate: today, meal: "LUNCH", dish: mealDishes.LUNCH, amount: 80, covered: false, status: "CONFIRMED", source: "CUSTOMER", cancellable: true },
  { id: "ORD-1050", customerId: "CUS-013", serviceDate: today, meal: "DINNER", dish: mealDishes.DINNER, amount: 60, covered: false, status: "CONFIRMED", source: "CUSTOMER", cancellable: true },
  { id: "ORD-1051", customerId: "CUS-011", serviceDate: today, meal: "DINNER", dish: mealDishes.DINNER, amount: 0, covered: true, status: "CONFIRMED", source: "CUSTOMER", cancellable: true },
  { id: "ORD-1038", customerId: "CUS-011", serviceDate: addBusinessDays(today, -1), meal: "LUNCH", dish: "Rice, Sambar & Cabbage Poriyal", amount: 80, covered: false, status: "COMPLETED", source: "CUSTOMER", cancellable: false },
  { id: "ORD-1022", customerId: "CUS-014", serviceDate: today, meal: "LUNCH", dish: mealDishes.LUNCH, amount: 80, covered: false, status: "CANCELLED", source: "CUSTOMER", cancellable: false, cancellationNote: "Customer cancelled before cutoff" }
];

const initialLedger: LedgerEntry[] = [
  { id: "LED-001", customerId: "CUS-011", occurredOn: "2026-08-12", description: "Lunch · extra meal order", amount: 80, type: "CHARGE" },
  { id: "LED-002", customerId: "CUS-011", occurredOn: "2026-08-13", description: "Lunch · extra meal order", amount: 80, type: "CHARGE" },
  { id: "LED-003", customerId: "CUS-011", occurredOn: "2026-08-14", description: "UPI payment received", amount: -200, type: "PAYMENT" },
  { id: "LED-004", customerId: "CUS-011", occurredOn: "2026-08-15", description: "Dinner · one-time meal", amount: 60, type: "CHARGE" },
  { id: "LED-005", customerId: "CUS-011", occurredOn: "2026-08-29", description: "Lunch · extra meal order", amount: 80, type: "CHARGE" },
  { id: "LED-006", customerId: "CUS-011", occurredOn: businessDateKey(), description: "Lunch · extra meal order", amount: 140, type: "CHARGE" }
];

const initialInvoices: PrototypeInvoice[] = [
  { id: "INV-2026-0042", customerId: "CUS-012", customerName: "Riya Shah", issuedOn: "2026-08-30", period: "1–30 August 2026", total: 2450, paid: 1600, outstanding: 850, status: "ISSUED", lineItems: [{ description: "August count plan", amount: 2290 }, { description: "Two extra lunches", amount: 160 }] },
  { id: "INV-2026-0041", customerId: "CUS-013", customerName: "Kabir Singh", issuedOn: "2026-07-31", period: "1–31 July 2026", total: 550, paid: 550, outstanding: 0, status: "PAID", lineItems: [{ description: "July meal orders", amount: 550 }] }
];

export const formatServiceDate = (date: string) => formatBusinessDate(date, { weekday: "short", day: "numeric", month: "short" });
export const formatLongDate = (date: string) => formatBusinessDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const formatShortDate = (date: string) => formatBusinessDate(date, { day: "numeric", month: "short" });
export const formatCurrentDateTime = (date: Date) => formatBusinessDateTime(date);
export const formatCurrentClock = (date: Date) => formatBusinessClock(date);
export const mealLabel = (meal: MealCode) => mealLabels[meal];
export const mealDish = (meal: MealCode) => mealDishes[meal];
export const mealCutoff = (meal: MealCode) => mealCutoffTimes[meal];
export const isMealCutoffPassed = (meal: MealCode, serviceDate: string, now = prototypeNow()) => {
  const today = businessDateKey(now);
  if (serviceDate !== today) return serviceDate < today;
  return businessMinutesSinceMidnight(now) >= mealCutoffMinutes[meal];
};

export interface ServiceDay {
  date: string;
  state: "published" | "unpublished" | "closed" | "past";
}

interface PreviewStore {
  now: Date;
  today: string;
  customers: PrototypeCustomer[];
  orders: PrototypeOrder[];
  ledger: LedgerEntry[];
  invoices: PrototypeInvoice[];
  auditEvents: AuditEvent[];
  publishedDates: string[];
  closedDates: string[];
  menus: Record<string, MenuItems>;
  prices: Record<MealCode, number>;
  priceEffectiveOn: string;
  serviceDays: ServiceDay[];
  totalOutstanding: number;
  collectedToday: number;
  kitchenCounts: Record<MealCode, number>;
  getCustomer: (id: string) => PrototypeCustomer | undefined;
  isServiceOpen: (date: string) => boolean;
  getMenu: (date: string) => MenuItems;
  getMenuDish: (date: string, meal: MealCode) => string;
  getCoverage: (customerId: string, meal: MealCode) => { covered: boolean; amount: number; message: string };
  placeOrder: (input: { customerId: string; serviceDate: string; meal: MealCode; source: PrototypeOrder["source"]; linkedOrderId?: string }) => { ok: boolean; message: string; order?: PrototypeOrder };
  cancelOrder: (id: string, note?: string, restoreEntitlement?: boolean) => { ok: boolean; message: string };
  recordPayment: (customerId: string, amount: number) => { ok: boolean; message: string };
  addAdjustment: (customerId: string, amount: number, reason: string) => { ok: boolean; message: string };
  publishMenu: (date: string) => { ok: boolean; message: string };
  unpublishMenu: (date: string) => { ok: boolean; message: string };
  updateMenu: (date: string, menu: MenuItems) => { ok: boolean; message: string };
  updateMenuDish: (date: string, meal: MealCode, dish: string) => { ok: boolean; message: string };
  changePrices: (prices: Record<MealCode, number>, effectiveOn: string) => void;
  changeCustomerPlan: (customerId: string, planType: PlanType) => void;
  setCustomerStatus: (customerId: string, status: PrototypeCustomer["status"]) => void;
  confirmClosure: (date: string, reason: string) => { affectedOrders: number; restoredMeals: number; removedCharges: number };
  generateInvoice: (customerId: string) => PrototypeInvoice;
}

const PreviewStoreContext = createContext<PreviewStore | null>(null);

export function PreviewStoreProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => prototypeNow());
  const today = businessDateKey(now);
  const tomorrow = addBusinessDays(today, 1);
  const dayAfterTomorrow = addBusinessDays(today, 2);
  const thirdDay = addBusinessDays(today, 3);
  const [customers, setCustomers] = useState(() => buildInitialCustomers(today));
  const [orders, setOrders] = useState(() => buildInitialOrders(today));
  const [ledger, setLedger] = useState(initialLedger);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [publishedDates, setPublishedDates] = useState([today]);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [menus, setMenus] = useState<Record<string, MenuItems>>(() => buildInitialMenus(today));
  const [prices, setPrices] = useState<Record<MealCode, number>>({ BREAKFAST: 60, LUNCH: 80, DINNER: 60 });
  const [priceEffectiveOn, setPriceEffectiveOn] = useState(dayAfterTomorrow);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(prototypeNow()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const getCustomer = (id: string) => customers.find((customer) => customer.id === id);
  const isServiceOpen = (date: string) => !closedDates.includes(date) && publishedDates.includes(date) && date >= today;
  const getMenu = (date: string) => menus[date] || buildInitialMenus(today)[date] || mealDishes;
  const getMenuDish = (date: string, meal: MealCode) => getMenu(date)[meal];
  const totalOutstanding = 7390 + customers.reduce((sum, customer) => sum + customer.outstanding, 0);
  const collectedToday = 1000 + Math.abs(ledger.filter((entry) => entry.occurredOn === today && entry.type === "PAYMENT").reduce((sum, entry) => sum + entry.amount, 0));
  const initialKitchenCounts: Record<MealCode, number> = { BREAKFAST: 7, LUNCH: 12, DINNER: 5 };
  const initialConfirmedCounts: Record<MealCode, number> = { BREAKFAST: 0, LUNCH: 2, DINNER: 2 };
  const kitchenCounts = (Object.keys(initialKitchenCounts) as MealCode[]).reduce((counts, meal) => {
    counts[meal] = initialKitchenCounts[meal] + orders.filter((order) => order.serviceDate === today && order.meal === meal && order.status === "CONFIRMED").length - initialConfirmedCounts[meal];
    return counts;
  }, {} as Record<MealCode, number>);

  const serviceDays: ServiceDay[] = useMemo(() => [
    { date: addBusinessDays(today, -1), state: "past" },
    { date: today, state: closedDates.includes(today) ? "closed" : "published" },
    { date: tomorrow, state: closedDates.includes(tomorrow) ? "closed" : publishedDates.includes(tomorrow) ? "published" : "unpublished" },
    { date: dayAfterTomorrow, state: closedDates.includes(dayAfterTomorrow) ? "closed" : publishedDates.includes(dayAfterTomorrow) ? "published" : "unpublished" },
    { date: thirdDay, state: closedDates.includes(thirdDay) ? "closed" : publishedDates.includes(thirdDay) ? "published" : "unpublished" }
  ], [closedDates, dayAfterTomorrow, publishedDates, thirdDay, today, tomorrow]);

  const getCoverage = (customerId: string, meal: MealCode) => {
    const customer = getCustomer(customerId);
    if (!customer) return { covered: false, amount: prices[meal], message: "Customer not found" };
    const remaining = meal === "LUNCH" ? customer.lunches : meal === "DINNER" ? customer.dinners : 0;
    if (customer.planType !== "ONE_TIME" && remaining > 0) return { covered: true, amount: 0, message: `Covered by ${customer.planName}; ${remaining} ${mealLabel(meal).toLowerCase()}${remaining === 1 ? "" : "s"} remain.` };
    return { covered: false, amount: prices[meal], message: `₹${prices[meal]} will be added to this customer's balance.` };
  };

  const addAudit = (title: string, detail: string) => setAuditEvents((current) => [{ id: `AUD-${Date.now()}`, occurredOn: prototypeNow().toISOString(), title, detail }, ...current]);

  const placeOrder: PreviewStore["placeOrder"] = ({ customerId, serviceDate, meal, source, linkedOrderId }) => {
    const customer = getCustomer(customerId);
    if (!customer || customer.status !== "ACTIVE") return { ok: false, message: "This customer is inactive and cannot receive a new order." };
    if (closedDates.includes(serviceDate)) return { ok: false, message: "This is a no-service date. Remove the closure before ordering." };
    if (!publishedDates.includes(serviceDate)) return { ok: false, message: "Publish the menu for this date before creating an order." };
    if (orders.some((order) => order.customerId === customerId && order.serviceDate === serviceDate && order.meal === meal && order.status === "CONFIRMED")) return { ok: false, message: "This customer already has that meal booked for this date." };
    const coverage = getCoverage(customerId, meal);
    const order: PrototypeOrder = { id: `ORD-${1052 + orders.length}`, customerId, serviceDate, meal, dish: getMenuDish(serviceDate, meal), amount: coverage.amount, covered: coverage.covered, status: "CONFIRMED", source, cancellable: true, linkedOrderId };
    setOrders((current) => [order, ...current]);
    if (coverage.covered && (meal === "LUNCH" || meal === "DINNER")) setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, [meal === "LUNCH" ? "lunches" : "dinners"]: Math.max(0, item[meal === "LUNCH" ? "lunches" : "dinners"] - 1) } : item));
    if (!coverage.covered) {
      setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, outstanding: item.outstanding + coverage.amount } : item));
      setLedger((current) => [{ id: `LED-${Date.now()}`, customerId, occurredOn: serviceDate, description: `${mealLabel(meal)} · ${source === "ADMIN" ? "manual " : ""}meal order`, amount: coverage.amount, type: "CHARGE" }, ...current]);
    }
    addAudit("Order created", `${customer.name}: ${mealLabel(meal)} for ${formatServiceDate(serviceDate)}.`);
    return { ok: true, message: `${mealLabel(meal)} booked for ${customer.name}. ${coverage.message}`, order };
  };

  const cancelOrder: PreviewStore["cancelOrder"] = (id, note = "Cancelled before cutoff", restoreEntitlement = true) => {
    const target = orders.find((order) => order.id === id);
    if (!target || target.status !== "CONFIRMED") return { ok: false, message: "Only a confirmed order can be cancelled." };
    const customer = getCustomer(target.customerId);
    if (!customer) return { ok: false, message: "Customer not found." };
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status: "CANCELLED", cancellable: false, cancellationNote: note } : order));
    if (target.covered && restoreEntitlement && (target.meal === "LUNCH" || target.meal === "DINNER")) {
      const key = target.meal === "LUNCH" ? "lunches" : "dinners";
      setCustomers((current) => current.map((item) => item.id === target.customerId ? { ...item, [key]: item[key] + 1, ...(target.meal === "LUNCH" ? { returnedLunches: item.returnedLunches + 1 } : {}) } : item));
    }
    if (!target.covered && target.amount > 0) {
      setCustomers((current) => current.map((item) => item.id === target.customerId ? { ...item, outstanding: Math.max(0, item.outstanding - target.amount) } : item));
      setLedger((current) => [{ id: `LED-${Date.now()}`, customerId: target.customerId, occurredOn: today, description: `${mealLabel(target.meal)} order credit · ${note}`, amount: -target.amount, type: "CREDIT" }, ...current]);
    }
    addAudit("Order cancelled", `${customer.name}: ${mealLabel(target.meal)} on ${formatServiceDate(target.serviceDate)}. ${note}`);
    return { ok: true, message: target.covered && restoreEntitlement ? `${mealLabel(target.meal)} cancelled. It is back in available meals and shown as a returned meal.` : !target.covered ? `${mealLabel(target.meal)} cancelled. ₹${target.amount} has been credited back.` : `${mealLabel(target.meal)} cancelled; the meal remains consumed as selected.` };
  };

  const recordPayment: PreviewStore["recordPayment"] = (customerId, amount) => {
    const customer = getCustomer(customerId);
    if (!customer || amount <= 0) return { ok: false, message: "Enter a payment amount greater than ₹0." };
    if (amount > customer.outstanding) return { ok: false, message: `Payment cannot exceed ${customer.name}'s ₹${customer.outstanding} outstanding balance.` };
    setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, outstanding: item.outstanding - amount } : item));
    setLedger((current) => [{ id: `LED-${Date.now()}`, customerId, occurredOn: today, description: "Payment received", amount: -amount, type: "PAYMENT" }, ...current]);
    addAudit("Payment recorded", `${customer.name}: ₹${amount} received; balance ₹${customer.outstanding - amount}.`);
    return { ok: true, message: `₹${amount} received from ${customer.name}. Outstanding is now ₹${customer.outstanding - amount}.` };
  };

  const addAdjustment: PreviewStore["addAdjustment"] = (customerId, amount, reason) => {
    const customer = getCustomer(customerId);
    if (!customer || !reason.trim() || amount === 0) return { ok: false, message: "Enter a customer, non-zero amount, and clear reason." };
    if (amount < 0 && Math.abs(amount) > customer.outstanding) return { ok: false, message: "A credit cannot reduce the balance below ₹0." };
    setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, outstanding: item.outstanding + amount } : item));
    setLedger((current) => [{ id: `LED-${Date.now()}`, customerId, occurredOn: today, description: `Adjustment · ${reason}`, amount, type: "ADJUSTMENT" }, ...current]);
    addAudit("Financial adjustment", `${customer.name}: ₹${amount} adjustment for ${reason}.`);
    return { ok: true, message: `Adjustment saved. ${customer.name}'s balance is now ₹${customer.outstanding + amount}.` };
  };

  const publishMenu: PreviewStore["publishMenu"] = (date) => {
    if (closedDates.includes(date)) return { ok: false, message: "Reopen this date before publishing a menu." };
    setPublishedDates((current) => current.includes(date) ? current : [...current, date]);
    addAudit("Menu published", `Menu published for ${formatLongDate(date)}.`);
    return { ok: true, message: `Menu published for ${formatServiceDate(date)}. Customers can book it now.` };
  };

  const unpublishMenu: PreviewStore["unpublishMenu"] = (date) => {
    if (date <= today) return { ok: false, message: "Past or same-day menus cannot be unpublished after operations have started." };
    const confirmedOrders = orders.filter((order) => order.serviceDate === date && order.status === "CONFIRMED").length;
    if (confirmedOrders > 0) return { ok: false, message: `Cancel or move ${confirmedOrders} confirmed order${confirmedOrders === 1 ? "" : "s"} before unpublishing this menu.` };
    setPublishedDates((current) => current.filter((publishedDate) => publishedDate !== date));
    addAudit("Menu unpublished", `Menu unpublished for ${formatLongDate(date)}.`);
    return { ok: true, message: `Menu unpublished for ${formatServiceDate(date)}. Customers see it as not available.` };
  };

  const updateMenuDish: PreviewStore["updateMenuDish"] = (date, meal, dish) => {
    const trimmed = dish.trim();
    if (!trimmed) return { ok: false, message: "Dish name cannot be blank." };
    setMenus((current) => ({ ...current, [date]: { ...getMenu(date), [meal]: trimmed } }));
    addAudit("Menu dish edited", `${mealLabel(meal)} for ${formatServiceDate(date)} changed to ${trimmed}.`);
    return { ok: true, message: `${mealLabel(meal)} dish updated for ${formatServiceDate(date)}.` };
  };
  const updateMenu: PreviewStore["updateMenu"] = (date, menu) => {
    const nextMenu = {
      BREAKFAST: menu.BREAKFAST.trim(),
      LUNCH: menu.LUNCH.trim(),
      DINNER: menu.DINNER.trim()
    };
    if (Object.values(nextMenu).some((dish) => !dish)) return { ok: false, message: "Every meal needs a dish name." };
    setMenus((current) => ({ ...current, [date]: nextMenu }));
    addAudit("Menu edited", `Menu dishes updated for ${formatServiceDate(date)}.`);
    return { ok: true, message: `Menu saved for ${formatServiceDate(date)}.` };
  };
  const changePrices = (nextPrices: Record<MealCode, number>, effectiveOn: string) => { setPrices(nextPrices); setPriceEffectiveOn(effectiveOn); addAudit("Future prices changed", `New prices take effect on ${formatLongDate(effectiveOn)}.`); };
  const changeCustomerPlan = (customerId: string, planType: PlanType) => {
    const customer = getCustomer(customerId);
    setCustomers((current) => current.map((item) => {
      if (item.id !== customerId) return item;
      if (planType === "PREPAID") return { ...item, planType, planName: "September Monthly Prepaid Plan", lunches: 20, dinners: 10, carriedForwardLunches: 0, returnedLunches: 0, reservedLunches: 0, reservationStartsOn: undefined };
      if (planType === "COUNT") return { ...item, planType, planName: "September Flexi Count Plan", lunches: 20, dinners: 0, carriedForwardLunches: 0, returnedLunches: 0, reservedLunches: 0, reservationStartsOn: undefined };
      return { ...item, planType, planName: "Pay as you order", lunches: 0, dinners: 0, carriedForwardLunches: 0, returnedLunches: 0, reservedLunches: 0, reservationStartsOn: undefined };
    }));
    if (customer) addAudit("Plan changed", `${customer.name} moved to ${planType === "ONE_TIME" ? "pay as you order" : planType === "COUNT" ? "Flexi Count" : "monthly prepaid"}.`);
  };
  const setCustomerStatus = (customerId: string, status: PrototypeCustomer["status"]) => { const customer = getCustomer(customerId); setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, status } : item)); if (customer) addAudit(`Customer ${status.toLowerCase()}`, `${customer.name} is now ${status.toLowerCase()}.`); };

  const confirmClosure: PreviewStore["confirmClosure"] = (date, reason) => {
    const targets = orders.filter((order) => order.serviceDate === date && order.status === "CONFIRMED");
    let restoredMeals = 0;
    let removedCharges = 0;
    targets.forEach((order) => { if (order.covered) restoredMeals += 1; else removedCharges += order.amount; });
    setClosedDates((current) => current.includes(date) ? current : [...current, date]);
    setOrders((current) => current.map((order) => order.serviceDate === date && order.status === "CONFIRMED" ? { ...order, status: "CANCELLED", cancellable: false, cancellationNote: `No-service closure: ${reason}` } : order));
    setCustomers((current) => current.map((customer) => {
      const affected = targets.filter((order) => order.customerId === customer.id);
      const lunchReturns = affected.filter((order) => order.covered && order.meal === "LUNCH").length;
      const dinnerReturns = affected.filter((order) => order.covered && order.meal === "DINNER").length;
      const chargeCredit = affected.filter((order) => !order.covered).reduce((sum, order) => sum + order.amount, 0);
      return affected.length ? { ...customer, lunches: customer.lunches + lunchReturns, dinners: customer.dinners + dinnerReturns, returnedLunches: customer.returnedLunches + lunchReturns, outstanding: Math.max(0, customer.outstanding - chargeCredit) } : customer;
    }));
    setLedger((current) => [...targets.filter((order) => !order.covered).map((order) => ({ id: `LED-${Date.now()}-${order.id}`, customerId: order.customerId, occurredOn: today, description: `Closure credit · ${formatServiceDate(date)}`, amount: -order.amount, type: "CREDIT" as const })), ...current]);
    addAudit("No-service closure confirmed", `${formatLongDate(date)} closed. ${targets.length} orders cancelled, ${restoredMeals} meals restored, ₹${removedCharges} credited. ${reason}`);
    return { affectedOrders: targets.length, restoredMeals, removedCharges };
  };

  const generateInvoice: PreviewStore["generateInvoice"] = (customerId) => {
    const customer = getCustomer(customerId)!;
    const customerLedger = ledger.filter((entry) => entry.customerId === customerId);
    const charges = customerLedger.filter((entry) => entry.amount > 0);
    const paid = Math.abs(customerLedger.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0));
    const total = charges.reduce((sum, entry) => sum + entry.amount, 0);
    const invoice: PrototypeInvoice = { id: `INV-${today.slice(0, 4)}-${String(43 + invoices.length).padStart(4, "0")}`, customerId, customerName: customer.name, issuedOn: today, period: `Through ${formatLongDate(today)}`, total, paid, outstanding: customer.outstanding, status: customer.outstanding === 0 ? "PAID" : "ISSUED", lineItems: charges.map((entry) => ({ description: entry.description, amount: entry.amount })) };
    setInvoices((current) => [invoice, ...current]);
    addAudit("Invoice generated", `${invoice.id} issued for ${customer.name}.`);
    return invoice;
  };

  const value: PreviewStore = { now, today, customers, orders, ledger, invoices, auditEvents, publishedDates, closedDates, menus, prices, priceEffectiveOn, serviceDays, totalOutstanding, collectedToday, kitchenCounts, getCustomer, isServiceOpen, getMenu, getMenuDish, getCoverage, placeOrder, cancelOrder, recordPayment, addAdjustment, publishMenu, unpublishMenu, updateMenu, updateMenuDish, changePrices, changeCustomerPlan, setCustomerStatus, confirmClosure, generateInvoice };
  return <PreviewStoreContext.Provider value={value}>{children}</PreviewStoreContext.Provider>;
}

export function usePreviewStore() {
  const store = useContext(PreviewStoreContext);
  if (!store) throw new Error("usePreviewStore must be used inside PreviewStoreProvider");
  return store;
}
