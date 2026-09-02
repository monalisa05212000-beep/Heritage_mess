import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
};

const variants = {
  primary: "bg-[var(--saffron)] text-white hover:bg-[var(--saffron-deep)]",
  secondary: "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--saffron)]",
  quiet: "text-[var(--ink)] hover:bg-black/5",
  danger: "bg-[var(--danger)] text-white hover:bg-[#8e302c]",
};

export function Button({ className = "", variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

