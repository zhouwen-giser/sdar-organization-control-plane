import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

function IconBase({ size = 18, children, ...props }: IconProps & { children?: React.ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children ?? <><circle cx="12" cy="12" r="8" /><path d="M8.5 12h7M12 8.5v7" /></>}</svg>;
}

export const Activity = (p: IconProps) => <IconBase {...p}><path d="M3 12h4l2-6 4 12 2-6h6" /></IconBase>;
export const AlertTriangle = (p: IconProps) => <IconBase {...p}><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v4M12 17h.01"/></IconBase>;
export const ArrowLeft = (p: IconProps) => <IconBase {...p}><path d="m15 18-6-6 6-6M9 12h11"/></IconBase>;
export const Bot = (p: IconProps) => <IconBase {...p}><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M8 18v2M16 18v2"/></IconBase>;
export const Boxes = (p: IconProps) => <IconBase {...p}><rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="8" y="13" width="8" height="7" rx="1"/></IconBase>;
export const BrainCircuit = (p: IconProps) => <IconBase {...p}><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3 3 3 0 0 0 2 3v1a3 3 0 0 0 3 3M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3 3 3 0 0 1-2 3v1a3 3 0 0 1-3 3M12 4v16M9 9h3M12 14h3"/></IconBase>;
export const Cable = (p: IconProps) => <IconBase {...p}><path d="M7 3v6M5 3h4M17 15v6M15 21h4M7 9c0 5 10 1 10 6"/></IconBase>;
export const Check = (p: IconProps) => <IconBase {...p}><path d="m5 12 4 4L19 6"/></IconBase>;
export const CheckCircle2 = (p: IconProps) => <IconBase {...p}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></IconBase>;
export const ChevronDown = (p: IconProps) => <IconBase {...p}><path d="m6 9 6 6 6-6"/></IconBase>;
export const ChevronRight = (p: IconProps) => <IconBase {...p}><path d="m9 6 6 6-6 6"/></IconBase>;
export const CircleAlert = (p: IconProps) => <IconBase {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></IconBase>;
export const CircleGauge = (p: IconProps) => <IconBase {...p}><circle cx="12" cy="12" r="9"/><path d="M6 15a7 7 0 0 1 12 0M12 12l4-4"/></IconBase>;
export const ClipboardCheck = (p: IconProps) => <IconBase {...p}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 12l2 2 5-5"/></IconBase>;
export const Copy = (p: IconProps) => <IconBase {...p}><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></IconBase>;
export const Database = (p: IconProps) => <IconBase {...p}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/></IconBase>;
export const Download = (p: IconProps) => <IconBase {...p}><path d="M12 3v12m0 0 5-5m-5 5-5-5M4 20h16"/></IconBase>;
export const Edit3 = (p: IconProps) => <IconBase {...p}><path d="M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4"/></IconBase>;
export const ExternalLink = (p: IconProps) => <IconBase {...p}><path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6"/></IconBase>;
export const FileClock = (p: IconProps) => <IconBase {...p}><path d="M6 3h8l4 4v5M14 3v5h5"/><circle cx="15" cy="17" r="4"/><path d="M15 15v2l1.5 1"/></IconBase>;
export const FileJson = (p: IconProps) => <IconBase {...p}><path d="M6 3h8l4 4v14H6zM14 3v5h5M10 12c-1 0-1 .8-1 2s0 2-1 2M14 12c1 0 1 .8 1 2s0 2 1 2"/></IconBase>;
export const GitBranch = (p: IconProps) => <IconBase {...p}><circle cx="6" cy="5" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10M8 9c5 0 4-2 8-2"/></IconBase>;
export const HeartPulse = (p: IconProps) => <IconBase {...p}><path d="M20.8 5.8a5 5 0 0 0-7.1 0L12 7.5l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l4-3.6M4 14h4l2-4 3 7 2-3h5"/></IconBase>;
export const Link2 = (p: IconProps) => <IconBase {...p}><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></IconBase>;
export const LoaderCircle = (p: IconProps) => <IconBase {...p}><path d="M21 12a9 9 0 1 1-6.2-8.6"/></IconBase>;
export const LockKeyhole = (p: IconProps) => <IconBase {...p}><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></IconBase>;
export const Network = (p: IconProps) => <IconBase {...p}><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/></IconBase>;
export const Plus = (p: IconProps) => <IconBase {...p}><path d="M12 5v14M5 12h14"/></IconBase>;
export const Radio = (p: IconProps) => <IconBase {...p}><circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13"/></IconBase>;
export const RefreshCcw = (p: IconProps) => <IconBase {...p}><path d="M20 7v5h-5M4 17v-5h5M6 8a7 7 0 0 1 12-2l2 6M18 16a7 7 0 0 1-12 2l-2-6"/></IconBase>;
export const Search = (p: IconProps) => <IconBase {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></IconBase>;
export const ServerCog = (p: IconProps) => <IconBase {...p}><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="11" height="7" rx="2"/><path d="M7 6h.01M7 17h.01M18 15v6M15 18h6"/></IconBase>;
export const Settings2 = (p: IconProps) => <IconBase {...p}><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4"/></IconBase>;
export const ShieldAlert = (p: IconProps) => <IconBase {...p}><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z"/><path d="M12 8v5M12 17h.01"/></IconBase>;
export const ShieldCheck = (p: IconProps) => <IconBase {...p}><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></IconBase>;
export const Sparkles = (p: IconProps) => <IconBase {...p}><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 13l.8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13Z"/></IconBase>;
export const SquareFunction = (p: IconProps) => <IconBase {...p}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 16c2 0 2-8 4-8h3M13 12h3"/></IconBase>;
export const Waypoints = (p: IconProps) => <IconBase {...p}><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h3a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3M6 8v8"/></IconBase>;
export const Wifi = (p: IconProps) => <IconBase {...p}><path d="M4 9a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0M10 17a3 3 0 0 1 4 0M12 20h.01"/></IconBase>;
export const Workflow = (p: IconProps) => <IconBase {...p}><rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="15" width="6" height="5" rx="1"/><path d="M9 6.5h4a3 3 0 0 1 3 3V15M6 9v6a3 3 0 0 0 3 3h6"/></IconBase>;
export const X = (p: IconProps) => <IconBase {...p}><path d="m6 6 12 12M18 6 6 18"/></IconBase>;
