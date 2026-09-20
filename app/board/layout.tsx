import { markBoardSeen } from "@/lib/board/unread";

export const dynamic = "force-dynamic";

export default async function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await markBoardSeen();
  return children;
}
