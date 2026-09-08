type Class = string | false | null | undefined;

/**
 * Penggabung className minimal — menyaring nilai falsy lalu menyambung dengan
 * spasi. Sengaja tanpa clsx/tailwind-merge: pemakaian di repo ini hanya
 * menyambung kelas, tidak pernah butuh resolusi utility yang bentrok. Sama
 * dengan konvensi di `apps/cms/src/lib/cn.ts`.
 */
export function cn(...classes: Class[]): string {
  return classes.filter(Boolean).join(" ");
}
