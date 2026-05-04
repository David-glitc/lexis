import clsx from "classnames";

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-sm",
  xl: "w-16 h-16 text-base"
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#538d4e", "#b59f3b", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316"];
  return colors[Math.abs(hash) % colors.length];
};

export function Avatar({ src, alt = "", name = "User", size = "md", isOnline, className }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = stringToColor(name);

  return (
    <div className={clsx("relative inline-flex items-center justify-center rounded-full font-semibold", sizeClasses[size], className)}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className="h-full w-full rounded-full object-cover"
          crossOrigin="anonymous"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full text-white"
          style={{ backgroundColor: bgColor }}
        >
          {initials}
        </div>
      )}
      {isOnline && (
        <span className="absolute bottom-0 right-0 block h-2/5 w-2/5 rounded-full border-2 border-background bg-emerald-500" />
      )}
    </div>
  );
}
