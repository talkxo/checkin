'use client';

import { motion } from 'framer-motion';
import { Ghost } from 'lucide-react';

export default function LeaveLoader() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative flex flex-col items-center justify-end h-24 w-24">
        {/* The Ghost */}
        <motion.div
          animate={{
            y: [0, -14, 0],
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
            className="w-12 h-12" 
            stroke="#2dd4bf"
            strokeWidth={0.5}
            style={{ filter: "drop-shadow(0px 5px 8px rgba(45, 212, 191, 0.4))" }}
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
          className="absolute bottom-2 w-8 h-2 bg-foreground/20 rounded-full blur-[1px]"
        />
      </div>


    </div>
  );
}
