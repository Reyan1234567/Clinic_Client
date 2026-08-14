"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";

const easeOut = [0.16, 1, 0.3, 1] as const;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}
