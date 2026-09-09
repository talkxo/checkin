"use client";

import { motion } from "framer-motion";

// Remounts on every console navigation — gives each module switch a soft
// fade/slide-in like the main app's tab transitions. (App Router can't do
// exit animations without heavier machinery; enter-only reads smooth.)
export default function ConsoleTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
