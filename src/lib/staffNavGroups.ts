import {
  LayoutDashboard, Users, Package, PackageOpen, Receipt,
  BarChart3, Settings, ShoppingCart, UserPlus, Warehouse,
  CreditCard, ClipboardList, FlaskConical, BookOpen,
  Calculator, BookMarked,
} from "lucide-react";

const staffNavGroups = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Sales",
    items: [
      { title: "Quotes",   url: "/staff/quotes",   icon: ClipboardList },
      { title: "Invoices", url: "/staff/invoices", icon: Receipt },
      { title: "Orders",   url: "/staff/orders",   icon: ShoppingCart },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Clients",          url: "/staff/clients",          icon: Users },
      { title: "Inventory",        url: "/staff/inventory",        icon: Warehouse },
      { title: "Products",         url: "/staff/products",         icon: Package },
      { title: "Bottles & Labels", url: "/staff/bottles-labels",  icon: PackageOpen },
    ],
  },
  {
    label: "Production",
    items: [
      { title: "Materials",     url: "/staff/production/materials",  icon: FlaskConical },
      { title: "Recipes",       url: "/staff/production/recipes",    icon: BookOpen },
      { title: "Calculator",    url: "/staff/production/calculator", icon: Calculator },
      { title: "Batch Records", url: "/staff/production/batches",    icon: ClipboardList },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Accounts",          url: "/staff/accounts",          icon: CreditCard },
      { title: "Accounting Books",  url: "/staff/accounting-books",  icon: BookMarked },
      { title: "Reports",           url: "/staff/reports",           icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Team",     url: "/staff/team",     icon: UserPlus },
      { title: "Settings", url: "/staff/settings", icon: Settings },
    ],
  },
];

export default staffNavGroups;
