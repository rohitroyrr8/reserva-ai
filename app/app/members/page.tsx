"use client";

import { ConsoleShell, PageHead } from "@/components/console-shell";
import { Tag } from "@/components/reserve-gauge";
import { useProgram } from "@/lib/program";

const MEMBERS = [
  { name: "Fatima A.", joined: "12 Aug", points: "1,240", status: "Verified" },
  { name: "Omar K.", joined: "19 Aug", points: "860", status: "Verified" },
  { name: "Noor S.", joined: "2 Sep", points: "200", status: "Verified" },
  { name: "Hassan M.", joined: "2 Sep", points: "480", status: "Verified" },
  { name: "Lina R.", joined: "3 Sep", points: "1,020", status: "Verified" },
  { name: "Yusuf T.", joined: "4 Sep", points: "150", status: "Verified" },
];

export default function MembersPage() {
  const { state } = useProgram();

  return (
    <ConsoleShell shopName={state.businessName} shopPlace={state.location}>
      <PageHead
        title="Members"
        lede="People who passed the selfie check. One person, one enrolment."
      />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-line pb-2 text-left text-[13px] font-medium text-ink-soft">Member</th>
            <th className="border-b border-line pb-2 text-left text-[13px] font-medium text-ink-soft">Joined</th>
            <th className="border-b border-line pb-2 text-right text-[13px] font-medium text-ink-soft">Points</th>
            <th className="border-b border-line pb-2 text-right text-[13px] font-medium text-ink-soft">Status</th>
          </tr>
        </thead>
        <tbody>
          {MEMBERS.map((m) => (
            <tr key={m.name}>
              <td className="border-b border-wash py-2.5">{m.name}</td>
              <td className="border-b border-wash py-2.5">{m.joined}</td>
              <td className="border-b border-wash py-2.5 text-right tabular">{m.points}</td>
              <td className="border-b border-wash py-2.5 text-right">
                <Tag tone="ok">{m.status}</Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ConsoleShell>
  );
}
