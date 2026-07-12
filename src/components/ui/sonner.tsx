import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { haptics } from "@/hooks/useHaptics";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  const extraProps: Record<string, unknown> = {
    onAutoClose: () => haptics.light(),
  };
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      position={isMobile ? "top-center" : "bottom-right"}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-sm",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...extraProps}
      {...props}
    />
  );
};

/** Haptic-aware toast wrappers */
const hapticsToast = Object.assign(
  (message: string, opts?: Parameters<typeof toast>[1]) => toast(message, opts),
  {
    success: (message: string, opts?: Parameters<typeof toast.success>[1]) => {
      haptics.success();
      return toast.success(message, opts);
    },
    error: (message: string, opts?: Parameters<typeof toast.error>[1]) => {
      haptics.error();
      return toast.error(message, opts);
    },
    warning: (message: string, opts?: Parameters<typeof toast.warning>[1]) => {
      haptics.warning();
      return toast.warning(message, opts);
    },
    info: (message: string, opts?: Parameters<typeof toast.info>[1]) => {
      haptics.light();
      return toast.info(message, opts);
    },
  }
);

export { Toaster, toast, hapticsToast };
