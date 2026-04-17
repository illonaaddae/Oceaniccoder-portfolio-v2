import React from "react";
import { motion } from "framer-motion";
import { FaRocket } from "react-icons/fa";
import { itemVariants, waveVariants } from "./notFoundData";

const NotFoundAnimation: React.FC = () => (
  <>
    {/* Animated 404 with Ocean Theme */}
    <motion.div className="relative mb-8" variants={itemVariants}>
      {/* Ocean waves decoration */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <motion.div
          className="text-[200px] font-black text-oceanic-500 select-none"
          variants={waveVariants}
          animate="animate"
        >
          ~
        </motion.div>
      </div>

      {/* Main 404 text */}
      <motion.h1
        className="text-[120px] sm:text-[150px] font-black bg-gradient-to-r from-oceanic-500 via-oceanic-400 to-brand-ocean-2 bg-clip-text text-transparent leading-none"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
      >
        404
      </motion.h1>
    </motion.div>

    {/* Ocean-themed illustration */}
    <motion.div variants={itemVariants} className="mb-10 flex justify-center">
      <div className="relative">
        <motion.div
          className="text-6xl text-oceanic-500"
          animate={{
            rotate: [0, 10, -10, 0],
            y: [0, -5, 5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <FaRocket className="w-12 h-12" />
        </motion.div>
        <motion.div
          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-2xl"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          〰️
        </motion.div>
      </div>
    </motion.div>
  </>
);

export default React.memo(NotFoundAnimation);
