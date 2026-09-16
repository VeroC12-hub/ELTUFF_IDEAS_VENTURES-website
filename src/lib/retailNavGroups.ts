import {
  LayoutDashboard, Barcode, Receipt, Users, BarChart3, Tag,
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
      { title: "Reports",    url: "/retail/reports",   icon: BarChart3 },
    ],
  },
];

export default retailNavGroups;
