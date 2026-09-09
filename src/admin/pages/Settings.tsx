import { Shield } from 'lucide-react';
import { SectionHeader, Card } from '../components';
import type { Profile } from '../types';

export default function Settings({ profile }: { profile: Profile | null }) {
  return (
    <div>
      <SectionHeader title="Settings" subtitle="Admin panel configuration" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-[18px] h-[18px] text-[#950606]" />
            <h3 className="text-[15px] font-black">Your account</h3>
          </div>
          <p className="text-[14px] font-bold text-[#0A0A0A]">{profile?.name || '—'}</p>
          <p className="text-[13px] text-[#737373] mb-3">{profile?.email}</p>
          <p className="text-[13px] text-[#525252]">
            Role: <span className="font-bold">Administrator</span>
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-[15px] font-black mb-3">Authorization</h3>
          <p className="text-[13px] text-[#525252] leading-relaxed">
            Admin access is stored on the <code className="text-[12px] bg-black/5 px-1.5 py-0.5 rounded">profiles.role</code> column
            and enforced with Row Level Security. Promoting a user from this panel uses a database function that
            also prevents removing the last remaining admin.
          </p>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="text-[15px] font-black mb-3">Bootstrap the first admin</h3>
          <p className="text-[13px] text-[#525252] leading-relaxed mb-3">
            After the first Google sign-in, run this in the Supabase SQL editor (replace the email):
          </p>
          <pre className="text-[12px] bg-[#0A0A0A] text-white rounded-xl p-4 overflow-x-auto">
{`UPDATE profiles SET role = 'admin'
WHERE email = 'you@example.com';`}
          </pre>
        </Card>
      </div>
    </div>
  );
}
