import type { CSSProperties } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Car,
  Check,
  ChevronDown,
  CreditCard,
  Download,
  Film,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  LayoutDashboard,
  List,
  LogOut,
  type LucideIcon,
  MessageCircle,
  Moon,
  Pause,
  PawPrint,
  Pencil,
  PieChart,
  Plus,
  Receipt,
  Repeat,
  Search,
  Send,
  Shield,
  ShoppingBag,
  ShoppingBasket,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Undo2,
  Upload,
  User,
  Utensils,
  X,
  Zap,
  BarChart3,
  Plane,
} from "lucide-react";

// Every icon in this file (except AiInsightIcon, a raster brand mark) is a
// thin Lucide wrapper behind the app's original icon names — callers never
// changed, only what each name renders. One shared stroke width keeps every
// icon visually consistent regardless of which screen it's on.
const STROKE_WIDTH = 1.75;

function wrap(Icon: LucideIcon) {
  return function Wrapped({ className }: { className?: string }) {
    return <Icon className={className} strokeWidth={STROKE_WIDTH} aria-hidden="true" />;
  };
}

export const PencilIcon = wrap(Pencil);
export const TrashIcon = wrap(Trash2);
export const PieChartIcon = wrap(PieChart);
export const ColumnChartIcon = wrap(BarChart3);
export const DashboardIcon = wrap(LayoutDashboard);
export const TransactionsIcon = wrap(List);
export const ImportIcon = wrap(Upload);
export const InsightsIcon = wrap(TrendingUp);
export const BusinessIcon = wrap(Briefcase);
export const SortIcon = wrap(ArrowUpDown);
export const PersonIcon = wrap(User);
export const LogOutIcon = wrap(LogOut);
export const CheckIcon = wrap(Check);
export const RecurringIcon = wrap(Repeat);
export const PlusIcon = wrap(Plus);
export const CloseIcon = wrap(X);
export const GoalsIcon = wrap(Target);
export const PauseIcon = wrap(Pause);
export const SearchIcon = wrap(Search);
export const ArrowDownIcon = wrap(ArrowDown);
export const ArrowUpIcon = wrap(ArrowUp);
export const DownloadIcon = wrap(Download);
export const UndoIcon = wrap(Undo2);
export const UtensilsIcon = wrap(Utensils);
export const BasketIcon = wrap(ShoppingBasket);
export const CarIcon = wrap(Car);
export const FilmIcon = wrap(Film);
export const BagIcon = wrap(ShoppingBag);
export const HomeIcon = wrap(Home);
export const BoltIcon = wrap(Zap);
export const ShieldIcon = wrap(Shield);
export const HeartPulseIcon = wrap(HeartPulse);
export const PlaneIcon = wrap(Plane);
export const PawIcon = wrap(PawPrint);
export const GiftIcon = wrap(Gift);
export const HandHeartIcon = wrap(HandHeart);
export const GraduationCapIcon = wrap(GraduationCap);
export const CreditCardIcon = wrap(CreditCard);
export const ReceiptIcon = wrap(Receipt);
export const SunIcon = wrap(Sun);
export const MoonIcon = wrap(Moon);
export const ChatIcon = wrap(MessageCircle);
export const SendIcon = wrap(Send);

// Accepts an extra `style` prop (used for the carousel's rotate-180 "up"
// variant) — the one icon that needs more than className, so it isn't
// built through the wrap() factory above.
export function ChevronDownIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <ChevronDown className={className} style={style} strokeWidth={STROKE_WIDTH} aria-hidden="true" />;
}

// A four-point "sparkle" — the compact twinkle shape used by most AI-branded
// marks (Gemini, Copilot, etc.) — curved concave waists between the points
// rather than straight diamond edges, so it reads as soft/organic instead
// of a hard geometric shape. Filled rather than outline, so it sits as a
// badge/accent rather than another line icon. Currently unused, kept as a
// reusable AI-accent shape.
export function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        d="M12 3c0 0 .8 6.2 3 7 .8.3 6 2 6 2s-5.2 1.7-6 2c-2.2.8-3 7-3 7s-.8-6.2-3-7
           c-.8-.3-6-2-6-2s5.2-1.7 6-2c2.2-.8 3-7 3-7Z"
      />
    </svg>
  );
}

// Currently unused, kept as a reusable shape.
export function DollarSignIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2v20" />
      <path d="M17 6.5c0-1.9-2.2-3.5-5-3.5s-5 1.4-5 3.5c0 4.5 10 2.5 10 7.5 0 2.1-2.2 3.5-5 3.5s-5-1.6-5-3.5" />
    </svg>
  );
}

// Google's standard multi-color "G" mark — brand logos stay their own
// colors in both themes (not recolored to match the app's ink/accent
// tokens), same convention as the AI mark below.
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// The "this is AI-synthesized" mark used across every AI-generated content
// surface (Dashboard insight carousel, the Insights weekly narrative, the
// Goals AI summary, Drift alerts). Renders /public/ai-mark.png — the "1b —
// small mark, no frame" direction from the AI Budget Logo design file,
// rendered via headless Chrome from that direction's exact markup/colors
// and trimmed to its true (transparent) bounding box with sharp, rather
// than hand-redrawn — so it's pixel-faithful to the design, not an
// approximation. Deliberately frameless/backgroundless per that direction's
// own caption ("sized for a section/header, not an app icon"), unlike the
// earlier badge-style 1a mark this replaced.
export function AiInsightIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/ai-mark.png"
      alt=""
      width={79}
      height={94}
      className={`inline-block shrink-0 object-contain ${className ?? ""}`}
    />
  );
}
