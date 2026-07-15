"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";



export function ThemeProvider({ children, ...props }: any) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
