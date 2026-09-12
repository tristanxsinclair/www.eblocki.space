import {
  CalendarDays,
  FilePlus2,
  House,
  MessageSquare,
  UserRound,
} from "lucide-react";

export const STUDENT_NAV = [
  {
    to: "/dashboard",
    label: "Today",
    icon: House,
    paths: ["/dashboard", "/today"],
  },
  {
    to: "/start-today",
    label: "Plan",
    icon: CalendarDays,
    paths: ["/start-today", "/start"],
  },
  { to: "/proof", label: "Log", icon: FilePlus2, paths: ["/proof", "/log"] },
  { to: "/coach", label: "Coach", icon: MessageSquare, paths: ["/coach"] },
  {
    to: "/profile",
    label: "Profile",
    icon: UserRound,
    paths: ["/profile", "/operator", "/settings", "/modes"],
  },
];

export const isStudentNavActive = (paths: string[], pathname: string) =>
  paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
