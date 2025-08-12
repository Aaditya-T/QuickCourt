import { Link } from "wouter";
import { motion } from "framer-motion";
import clsx from "clsx";

type SiteLogoProps = {
  variant?: "nav" | "landing" | "footer" | "auth";
  className?: string;
};

export default function SiteLogo({ variant = "nav", className }: SiteLogoProps) {
  const sizeClass =
    variant === "landing"
      ? "w-72 h-36 sm:w-80 sm:h-40"
      : variant === "footer"
      ? "w-32 h-16"
      : variant === "auth"
      ? "w-48 h-20"
      : "w-40 h-20 md:w-44 md:h-22"; // nav default

  return (
    <Link href="/">
      <a aria-label="QuickCourt Home" className={clsx("block", className)}>
        <motion.div
          className={clsx("relative", sizeClass)}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
       >
          <img
            src="/logo.png"
            alt="QuickCourt Logo"
            className="w-full h-full object-contain"
            style={{ aspectRatio: "16/9" }}
          />
        </motion.div>
      </a>
    </Link>
  );
}


