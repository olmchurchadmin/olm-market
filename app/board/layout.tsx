import { MarkBoardSeen } from "@/components/mark-board-seen";

export const dynamic = "force-dynamic";

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarkBoardSeen />
      {children}
    </>
  );
}
