import type { Metadata } from 'next';
import { PhoneApp } from '@/components/phone/PhoneApp';

export const metadata: Metadata = { title: 'Trailside Seasons — your seat' };

/** Where a seat's QR code lands: that player's own sheet, on their phone. */
export default function Page() {
  return <PhoneApp />;
}
