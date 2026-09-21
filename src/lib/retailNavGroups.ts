import {
  LayoutDashboard, Barcode, Receipt, Users, BarChart3, Tag, Wallet,
} from "lucide-react";

const retailNavGroups = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/retail/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Shop",
    items: [
      { title: "New Sale",   url: "/retail/sale",      icon: Barcode },
      { title: "Receipts",   url: "/retail/receipts",  icon: Receipt },
      { title: "Price List", url: "/retail/products",  icon: Tag },
      { title: "Customers",  url: "/retail/customers", icon: Users },
      { title: "Expenses",   url: "/retail/expenses",  icon: Wallet },
      { title: "Reports",    url: "/retail/reports",   icon: BarChart3, adminOnly: true },
    ],
  },
];

export default retailNavGroups;
