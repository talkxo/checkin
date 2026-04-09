'use client';

import { motion } from 'framer-motion';
import { Ghost } from 'lucide-react';

export default function LeaveLoader() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative flex flex-col items-center justify-end h-20 w-20">
        {/* The Ghost */}
        <motion.div
          animate={{
            y: [0, -12, 0],
            rotate: [-5, 5, -5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative z-10"
        >
          <Ghost 
            className="w-10 h-10" 
            stroke="#2dd4bf"
            strokeWidth={0.5}
            style={{ filter: "drop-shadow(0px 4px 6px rgba(45, 212, 191, 0.4))" }}
          />
        </motion.div>

        {/* The Shadow */}
        <motion.div
          animate={{
            scale: [1, 0.5, 1],
            opacity: [0.4, 0.1, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-2 w-7 h-1.5 bg-foreground/20 rounded-full blur-[1px]"
        />
      </div>


    </div>
  );
}
