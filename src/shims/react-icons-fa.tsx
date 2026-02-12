import React from "react";

type IconProps = {
  className?: string;
  size?: number | string;
};

function makeIcon(label: string) {
  return ({ className, size = 16 }: IconProps) =>
    React.createElement(
      "span",
      {
        className,
        style: {
          display: "inline-block",
          width: typeof size === "number" ? `${size}px` : size,
          height: typeof size === "number" ? `${size}px` : size,
          textAlign: "center",
          lineHeight: typeof size === "number" ? `${size}px` : size,
          borderRadius: "9999px",
          background: "rgba(0,0,0,0.05)",
          fontSize:
            typeof size === "number" ? `${Math.max(10, size - 6)}px` : "0.8em",
        },
        "aria-hidden": "true",
      },
      label
    );
}

export const FaLaptop = makeIcon("💻");
export const FaMobileAlt = makeIcon("📱");
export const FaTrash = makeIcon("🗑");
export const FaExclamationCircle = makeIcon("!");
export const FaCheckCircle = makeIcon("✓");
export const FaEye = makeIcon("👁");
export const FaEyeSlash = makeIcon("🙈");
export const FaCheck = makeIcon("✓");
export const FaTimes = makeIcon("✕");
export const FaApple = makeIcon("");
export const FaFacebook = makeIcon("f");
export const FaMicrosoft = makeIcon("⌘");
export const FaKey = makeIcon("🔑");
export const FaArrowLeft = makeIcon("←");
export const FaBell = makeIcon("🔔");
export const FaLock = makeIcon("🔒");
export const FaMoon = makeIcon("🌙");
export const FaSun = makeIcon("☀");
export const FaUserShield = makeIcon("🛡");
export const FaVideo = makeIcon("🎥");
export const FaBriefcase = makeIcon("💼");
export const FaMicrophone = makeIcon("🎤");
export const FaVolumeUp = makeIcon("🔊");
export const FaPen = makeIcon("✎");
export const FaChevronDown = makeIcon("˅");

