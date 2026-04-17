import { FC } from "react";
import { Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import publicRoutes from "@/routes/publicRoutes";
import adminRoutes from "@/routes/adminRoutes";

interface AnimatedRoutesProps {
  isAdminLoggedIn: boolean;
  onAdminLogin: (password: string) => void;
  onAdminLogout: () => void;
}

const AnimatedRoutes: FC<AnimatedRoutesProps> = ({
  isAdminLoggedIn,
  onAdminLogin,
  onAdminLogout,
}) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {publicRoutes}
        {adminRoutes({ isAdminLoggedIn, onAdminLogin, onAdminLogout })}
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
