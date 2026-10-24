import type { SVGProps } from "react";

/**
 * Grammar Atlas icon set. Drawn on a 20-unit grid with a 1.5 stroke and square
 * terminals so the icons sit with the editorial type rather than a UI kit.
 * Always decorative: pass a visible label next to them, or aria-label on the control.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function icon(paths: React.ReactNode, opts: { fill?: boolean } = {}) {
  function Icon({ size = 18, className, ...rest }: IconProps) {
    return (
      <svg
        viewBox="0 0 20 20"
        width={size}
        height={size}
        fill={opts.fill ? "currentColor" : "none"}
        stroke={opts.fill ? "none" : "currentColor"}
        strokeWidth={1.5}
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
        focusable="false"
        className={className}
        {...rest}
      >
        {paths}
      </svg>
    );
  }
  return Icon;
}

export const IconSearch = icon(
  <>
    <circle cx="8.5" cy="8.5" r="5.25" />
    <path d="M12.4 12.4 17 17" />
  </>,
);
export const IconArrow = icon(<path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" />);
export const IconArrowLeft = icon(<path d="M16.5 10h-12M9 5.5 4.5 10 9 14.5" />);
export const IconExternal = icon(<path d="M8 4.5H4.5v11h11V12M11 4.5h4.5V9M15.5 4.5 9 11" />);
export const IconChevron = icon(<path d="m5.5 7.75 4.5 4.5 4.5-4.5" />);
export const IconChevronRight = icon(<path d="m7.75 5.5 4.5 4.5-4.5 4.5" />);
export const IconClose = icon(<path d="m5 5 10 10M15 5 5 15" />);
export const IconMenu = icon(<path d="M3.5 6.5h13M3.5 13.5h8" />);
export const IconCheck = icon(<path d="m4.5 10.25 3.5 3.5 7.5-7.5" />);
export const IconCross = icon(<path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />);
export const IconPlus = icon(<path d="M10 4v12M4 10h12" />);
export const IconMinus = icon(<path d="M4 10h12" />);

/** Verified: a seal with a tick. */
export const IconSeal = icon(
  <>
    <path d="M10 2.5 12 4l2.5-.2.7 2.4 2.1 1.4-.9 2.4.9 2.4-2.1 1.4-.7 2.4L12 16l-2 1.5L8 16l-2.5.2-.7-2.4-2.1-1.4.9-2.4-.9-2.4 2.1-1.4.7-2.4L8 4Z" />
    <path d="m7.25 10 1.9 1.9 3.6-3.6" />
  </>,
);
/** Awaiting verification: an hourglass. */
export const IconPending = icon(<path d="M5.5 3h9M5.5 17h9M6.5 3c0 4 7 4 7 7s-7 3-7 7M13.5 3c0 4-7 4-7 7s7 3 7 7" />);
/** Not available: an empty circle with a gap mark. */
export const IconAbsent = icon(
  <>
    <circle cx="10" cy="10" r="6.5" strokeDasharray="2.5 2.2" />
    <path d="M7 10h6" />
  </>,
);
/** Historical: a clock hand turned back. */
export const IconHistory = icon(<path d="M4 10a6 6 0 1 0 1.8-4.3M4 3.5v3h3M10 6.5V10l2.5 1.5" />);
/** Estimate: approximately-equals. */
export const IconEstimate = icon(<path d="M5 8c1.5-1.6 3.5-1.6 5 0s3.5 1.6 5 0M5 12.5c1.5-1.6 3.5-1.6 5 0s3.5 1.6 5 0" />);
/** Conflicting sources: two crossing arrows. */
export const IconConflict = icon(<path d="M3.5 6.5h9l-2.5-2.5M16.5 13.5h-9l2.5 2.5M12.5 6.5l1.5 1.5M7.5 13.5 6 12" />);
export const IconWarning = icon(
  <>
    <path d="M10 3.5 17 16H3Z" />
    <path d="M10 8.5v3.5M10 13.75v.5" />
  </>,
);
export const IconInfo = icon(
  <>
    <circle cx="10" cy="10" r="6.75" />
    <path d="M10 9v4.5M10 6.5v.5" />
  </>,
);
export const IconQuestion = icon(
  <>
    <circle cx="10" cy="10" r="6.75" />
    <path d="M7.9 8a2.2 2.2 0 1 1 3 2c-.6.3-.9.7-.9 1.4M10 13.6v.4" />
  </>,
);

/** Shortlist: a bookmark ribbon. */
export const IconShortlist = icon(<path d="M5.5 3h9v14l-4.5-3.5L5.5 17Z" />);
export const IconShortlisted = icon(<path d="M5 2.5h10v15l-5-3.9-5 3.9Z" />, { fill: true });
export const IconCompare = icon(<path d="M3.5 4h5v12h-5ZM11.5 4h5v12h-5ZM5.5 8h1M13.5 8h1M5.5 11h1M13.5 11h1" />);
export const IconFilter = icon(<path d="M3 6h8M14 6h3M3 14h3M9 14h8M11 4v4M6 12v4" />);
export const IconList = icon(<path d="M3.5 5h13M3.5 10h13M3.5 15h13" />);
export const IconTable = icon(<path d="M3 4h14v12H3ZM3 8h14M3 12h14M8 4v12" />);
export const IconMap = icon(<path d="M2.5 5 7 3l6 2 4.5-2v12L13 17l-6-2-4.5 2ZM7 3v12M13 5v12" />);
export const IconPin = icon(
  <>
    <path d="M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.5 5.5 9.5 5.5 9.5Z" />
    <circle cx="10" cy="8" r="1.9" />
  </>,
);
export const IconCalendar = icon(<path d="M3.5 5h13v11.5h-13ZM3.5 8.5h13M7 3v3.5M13 3v3.5" />);
export const IconCalendarAdd = icon(<path d="M3.5 5h13v11.5h-13ZM3.5 8.5h13M7 3v3.5M13 3v3.5M10 10.5v4M8 12.5h4" />);
export const IconPrint = icon(<path d="M6 7V3h8v4M5 14H3V7h14v7h-2M6 11h8v6H6Z" />);
export const IconLink = icon(<path d="m8.5 11.5 3-3M7.2 9.2l-1.9 1.9a2.6 2.6 0 0 0 3.6 3.6l1.9-1.9M12.8 10.8l1.9-1.9a2.6 2.6 0 0 0-3.6-3.6L9.2 7.2" />);
export const IconSend = icon(<path d="M3 10h11.5M10 5.5l4.5 4.5-4.5 4.5M17 4v12" />);
export const IconDocument = icon(<path d="M5 2.5h6.5l3.5 3.5v11.5H5ZM11.5 2.5V6H15M7.5 10h5M7.5 13h5" />);
export const IconBook = icon(<path d="M10 5.5C8.5 4 6 3.5 3 3.75v11.5c3-.25 5.5.25 7 1.75 1.5-1.5 4-2 7-1.75V3.75c-3-.25-5.5.25-7 1.75ZM10 5.5V17" />);
export const IconRoute = icon(
  <>
    <circle cx="5" cy="15" r="1.75" />
    <circle cx="15" cy="5" r="1.75" />
    <path d="M6.75 15h5.25a2.75 2.75 0 0 0 0-5.5H8a2.75 2.75 0 0 1 0-5.5h5.25" />
  </>,
);
export const IconTarget = icon(
  <>
    <circle cx="10" cy="10" r="6.5" />
    <circle cx="10" cy="10" r="3" />
    <path d="M10 2v2M10 16v2M2 10h2M16 10h2" />
  </>,
);
export const IconQuill = icon(<path d="M16.5 3.5c-6 .5-9.5 4.5-10.5 9.5L4.5 16.5M6 13c2.5-.2 5-1.3 6.5-3.5M9 9.5l3-.2" />);
export const IconLadder = icon(<path d="M6 2.5v15M14 2.5v15M6 6h8M6 10h8M6 14h8" />);
export const IconClock = icon(
  <>
    <circle cx="10" cy="10" r="6.75" />
    <path d="M10 6.25V10l2.75 1.75" />
  </>,
);
export const IconDot = icon(<circle cx="10" cy="10" r="3" />, { fill: true });
export const IconSpark = icon(<path d="M10 2.5v4M10 13.5v4M2.5 10h4M13.5 10h4M5 5l2.2 2.2M12.8 12.8 15 15M15 5l-2.2 2.2M7.2 12.8 5 15" />);
