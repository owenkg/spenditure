interface IconProps {
  size?: number;
  className?: string;
}

function icon(path: string | string[], viewBox = '0 0 24 24') {
  return function Icon({ size = 20, className = '' }: IconProps) {
    const paths = Array.isArray(path) ? path : [path];
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    );
  };
}

export const IconHome = icon([
  'M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z',
  'M9 21V12h6v9',
]);

export const IconArrowsUpDown = icon([
  'M7 3v18M7 21l-3-3M7 21l3-3',
  'M17 21V3M17 3l-3 3M17 3l3 3',
]);

export const IconRepeat = icon(
  'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
);

export const IconWallet = icon([
  'M21 7H3a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z',
  'M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0',
  'M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2',
]);

export const IconSettings = icon([
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
]);

export const IconBank = icon([
  'M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11',
]);

export const IconPhone = icon([
  'M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z',
  'M12 18h.01',
]);

export const IconBanknotes = icon([
  'M2 7h20v13H2z',
  'M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  'M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2',
]);

export const IconPiggyBank = icon([
  'M18.5 11a4.5 4.5 0 0 0-4.5-4.5H8A4 4 0 0 0 4 10.5v.5H2l1 3h1',
  'M18.5 11H22l-1 3h-2.5',
  'M6 14a6 6 0 0 0 12 0',
  'M14 14v2',
  'M10 14v2',
]);

export const IconTrendingUp = icon([
  'M22 7l-8.5 8.5-5-5L2 17',
  'M16 7h6v6',
]);

export const IconCreditCard = icon([
  'M22 4H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z',
  'M2 10h20',
]);

export const IconArrowUp = icon('M12 19V5M5 12l7-7 7 7');

export const IconArrowDown = icon('M12 5v14M19 12l-7 7-7-7');

export const IconTransfer = icon([
  'M7 16V4m0 0L3 8m4-4 4 4',
  'M17 8v12m0 0 4-4m-4 4-4-4',
]);

export const IconLogOut = icon([
  'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4',
  'M16 17l5-5-5-5',
  'M21 12H9',
]);

export const IconX = icon('M18 6 6 18M6 6l12 12');

export const IconChevronLeft = icon('M15 18l-6-6 6-6');

export const IconChevronRight = icon('M9 18l6-6-6-6');

export const IconDownload = icon([
  'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
  'M7 10l5 5 5-5',
  'M12 15V3',
]);

export const IconSun = icon([
  'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
]);

export const IconMoon = icon(
  'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
);

export const ACCOUNT_TYPE_ICONS: Record<string, typeof IconBank> = {
  BANK: IconBank,
  MOBILE_MONEY: IconPhone,
  CASH: IconBanknotes,
  SAVINGS: IconPiggyBank,
  INVESTMENT: IconTrendingUp,
};
