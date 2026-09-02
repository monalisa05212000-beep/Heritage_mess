export type MealCode = "BREAKFAST" | "LUNCH" | "DINNER";

import { addBusinessDays, businessDateKey, formatBusinessDate } from "@/lib/domain/time";

export const previewBusiness = {
  name: "Heritage",
  phone: "+91 98765 43210",
  address: "Kothrud, Pune",
  timezone: "Asia/Kolkata"
};

export type ServiceDateId = "today" | "tomorrow" | "past-cutoff" | "closure" | "future-unpublished";

export interface DateOption {
  id: ServiceDateId;
  dateStr: string;
  dayLabel: string;
  shortDay: string;
  dayNum: string;
  state: "published" | "unpublished" | "closure" | "past-cutoff";
  statusText: string;
}

const currentBusinessDate = businessDateKey();
const pastBusinessDate = addBusinessDays(currentBusinessDate, -1);
const tomorrowBusinessDate = addBusinessDays(currentBusinessDate, 1);
const futureBusinessDate = addBusinessDays(currentBusinessDate, 2);
const closureBusinessDate = addBusinessDays(currentBusinessDate, 3);
const shortLabel = (date: string) => formatBusinessDate(date, { weekday: "short", day: "numeric", month: "short" });
const shortWeekday = (date: string) => formatBusinessDate(date, { weekday: "short" });
const dayNumber = (date: string) => formatBusinessDate(date, { day: "numeric" });
const longLabel = (date: string) => formatBusinessDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortNoYear = (date: string) => formatBusinessDate(date, { day: "numeric", month: "short" });

export const dateRibbonOptions: DateOption[] = [
  { id: "past-cutoff", dateStr: pastBusinessDate, dayLabel: shortLabel(pastBusinessDate), shortDay: shortWeekday(pastBusinessDate), dayNum: dayNumber(pastBusinessDate), state: "past-cutoff", statusText: "Service complete" },
  { id: "today", dateStr: currentBusinessDate, dayLabel: `${shortLabel(currentBusinessDate)} (Today)`, shortDay: shortWeekday(currentBusinessDate), dayNum: dayNumber(currentBusinessDate), state: "published", statusText: "Menu published" },
  { id: "tomorrow", dateStr: tomorrowBusinessDate, dayLabel: shortLabel(tomorrowBusinessDate), shortDay: shortWeekday(tomorrowBusinessDate), dayNum: dayNumber(tomorrowBusinessDate), state: "unpublished", statusText: "Menu not published yet" },
  { id: "future-unpublished", dateStr: futureBusinessDate, dayLabel: shortLabel(futureBusinessDate), shortDay: shortWeekday(futureBusinessDate), dayNum: dayNumber(futureBusinessDate), state: "unpublished", statusText: "Menu not published yet" },
  { id: "closure", dateStr: closureBusinessDate, dayLabel: shortLabel(closureBusinessDate), shortDay: shortWeekday(closureBusinessDate), dayNum: dayNumber(closureBusinessDate), state: "closure", statusText: "No food service on this day" },
];

export const todayMenu = {
  date: formatBusinessDate(currentBusinessDate, { weekday: "long", day: "numeric", month: "long" }),
  cutoffNotice: "Order before cutoff for today's meals",
  items: [
    { code: "BREAKFAST" as MealCode, name: "Poha, Sprouts & Masala Chai", price: 60, available: false, cutoffTime: "7:00 AM", note: "Ordering closed at 7:00 AM" },
    { code: "LUNCH" as MealCode, name: "Rice, Dal Fry, Aloo Matar & Fresh Salad", price: 80, available: true, cutoffTime: "11:00 AM", note: "Order before 11:00 AM" },
    { code: "DINNER" as MealCode, name: "4 Chapatis, Paneer Masala & Jeera Rice", price: 60, available: true, cutoffTime: "6:00 PM", note: "Order before 6:00 PM" },
  ],
};

export const customerEntitlements = [
  { code: "LUNCH" as MealCode, label: "Lunch", remaining: 4, original: 20, carriedForward: 3, usable: true },
  { code: "DINNER" as MealCode, label: "Dinner", remaining: 2, original: 10, carriedForward: 0, usable: true },
  { code: "BREAKFAST" as MealCode, label: "Breakfast", remaining: 0, original: 0, carriedForward: 0, usable: false },
];

export const customerUpcomingOrders = [
  { id: "ORD-1048", date: shortLabel(currentBusinessDate), meal: "Lunch", dish: "Rice, Dal Fry, Aloo Matar & Fresh Salad", coverage: "Covered by your plan", amount: 0, status: "CONFIRMED", cancellable: true, cutoffTime: "11:00 AM" },
  { id: "ORD-1051", date: shortLabel(currentBusinessDate), meal: "Dinner", dish: "4 Chapatis, Paneer Masala & Jeera Rice", coverage: "Covered by your plan", amount: 0, status: "CONFIRMED", cancellable: true, cutoffTime: "6:00 PM" },
  { id: "ORD-1038", date: shortLabel(pastBusinessDate), meal: "Lunch", dish: "Rice, Sambar & Cabbage Poriyal", coverage: "₹80 added to bill", amount: 80, status: "COMPLETED", cancellable: false, cutoffTime: "11:00 AM" },
];

export const customerStatementEntries = [
  { date: "12 Aug", description: "Lunch · Extra meal order", amount: 80, type: "charge" },
  { date: "13 Aug", description: "Lunch · Extra meal order", amount: 80, type: "charge" },
  { date: "14 Aug", description: "UPI Payment received", amount: -200, type: "payment" },
  { date: "15 Aug", description: "Dinner · One-time meal", amount: 60, type: "charge" },
  { date: "23 Aug", description: "Lunch · Extra meal order", amount: 80, type: "charge" },
  { date: shortNoYear(currentBusinessDate), description: "Lunch · Extra meal order", amount: 140, type: "charge" },
];

export const adminOrders = [
  { id: "ORD-1048", customer: "Aarav Mehta", phone: "+91 98765 4812", meal: "Lunch", dish: "Rice, Dal Fry, Aloo Matar", source: "PREPAID_SUBSCRIPTION", coverage: "Prepaid plan", billableAmount: 0, status: "CONFIRMED", cutoff: "11:00 AM" },
  { id: "ORD-1049", customer: "Riya Shah", phone: "+91 97123 2308", meal: "Lunch", dish: "Rice, Dal Fry, Aloo Matar", source: "COUNT_SUBSCRIPTION", coverage: "₹80 billable", billableAmount: 80, status: "CONFIRMED", cutoff: "11:00 AM" },
  { id: "ORD-1050", customer: "Kabir Singh", phone: "+91 99888 9211", meal: "Dinner", dish: "4 Chapatis, Paneer Masala", source: "ONE_TIME", coverage: "₹60 billable", billableAmount: 60, status: "CONFIRMED", cutoff: "6:00 PM" },
  { id: "ORD-1051", customer: "Aarav Mehta", phone: "+91 98765 4812", meal: "Dinner", dish: "4 Chapatis, Paneer Masala", source: "PREPAID_SUBSCRIPTION", coverage: "Prepaid plan", billableAmount: 0, status: "CONFIRMED", cutoff: "6:00 PM" },
  { id: "ORD-1022", customer: "Neha Rao", phone: "+91 90111 0755", meal: "Lunch", dish: "Rice, Dal Fry, Aloo Matar", source: "EXTRA_MEAL", coverage: "₹80 billable", billableAmount: 80, status: "CANCELLED", cutoff: "11:00 AM" },
];

export interface CustomerPersona {
  id: string;
  name: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE";
  planType: "Prepaid" | "Count-based" | "One-time" | "Future Prepaid";
  coverageSummary: string;
  outstanding: number;
  joined: string;
  prepaidLunchesLeft: number;
  prepaidDinnersLeft: number;
  countPlanUsed: number;
  countPlanCap: number;
  reservedMeals?: string;
  carriedForward: number;
}

export const customers: CustomerPersona[] = [
  {
    id: "CUS-011",
    name: "Aarav Mehta",
    phone: "+91 98765 4812",
    status: "ACTIVE",
    planType: "Prepaid",
    coverageSummary: "4 Lunches & 2 Dinners left",
    outstanding: 240,
    joined: "12 Aug 2026",
    prepaidLunchesLeft: 4,
    prepaidDinnersLeft: 2,
    countPlanUsed: 0,
    countPlanCap: 0,
    carriedForward: 3
  },
  {
    id: "CUS-012",
    name: "Riya Shah",
    phone: "+91 97123 2308",
    status: "ACTIVE",
    planType: "Count-based",
    coverageSummary: "12 used of 20 monthly lunches",
    outstanding: 640,
    joined: "3 Aug 2026",
    prepaidLunchesLeft: 0,
    prepaidDinnersLeft: 0,
    countPlanUsed: 12,
    countPlanCap: 20,
    carriedForward: 0
  },
  {
    id: "CUS-013",
    name: "Kabir Singh",
    phone: "+91 99888 9211",
    status: "ACTIVE",
    planType: "One-time",
    coverageSummary: "Pay as you order",
    outstanding: 150,
    joined: "16 Aug 2026",
    prepaidLunchesLeft: 0,
    prepaidDinnersLeft: 0,
    countPlanUsed: 0,
    countPlanCap: 0,
    carriedForward: 0
  },
  {
    id: "CUS-014",
    name: "Neha Rao",
    phone: "+91 90111 0755",
    status: "INACTIVE",
    planType: "Prepaid",
    coverageSummary: "3 Lunches preserved (Inactive)",
    outstanding: 0,
    joined: "28 Jul 2026",
    prepaidLunchesLeft: 3,
    prepaidDinnersLeft: 0,
    countPlanUsed: 0,
    countPlanCap: 0,
    carriedForward: 0
  },
  {
    id: "CUS-015",
    name: "Priya Verma",
    phone: "+91 98220 1199",
    status: "ACTIVE",
    planType: "Future Prepaid",
    coverageSummary: "10 Lunches reserved for Sep 1",
    outstanding: 0,
    joined: "20 Aug 2026",
    prepaidLunchesLeft: 0,
    prepaidDinnersLeft: 0,
    countPlanUsed: 0,
    countPlanCap: 0,
    reservedMeals: `10 Lunches starting ${formatBusinessDate(futureBusinessDate, { day: "numeric", month: "short", year: "numeric" })}`,
    carriedForward: 0
  }
];

export const invoices = [
  { number: "INV-2026-0042", customer: "Riya Shah", period: "1–31 August 2026", total: 2450, paidAmount: 1600, outstanding: 850, status: "ISSUED", issueDate: "31 Aug 2026" },
  { number: "INV-2026-0041", customer: "Kabir Singh", period: "1–31 July 2026", total: 550, paidAmount: 550, outstanding: 0, status: "PAID", issueDate: "31 Jul 2026" },
];

export const todayKitchenSummary = {
  date: longLabel(currentBusinessDate),
  meals: [
    { type: "Breakfast", dish: "Poha, Sprouts & Masala Chai", total: 7, prepaid: 4, billable: 3, cutoff: "7:00 AM" },
    { type: "Lunch", dish: "Rice, Dal Fry, Aloo Matar & Salad", total: 12, prepaid: 7, billable: 5, cutoff: "11:00 AM" },
    { type: "Dinner", dish: "4 Chapatis, Paneer Masala & Jeera Rice", total: 5, prepaid: 3, billable: 2, cutoff: "6:00 PM" },
  ],
  lunchboxTracker: { dispatched: 28, returned: 25, missing: 3 }
};
