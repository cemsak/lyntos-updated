/**
 * Corporate Chat - Redirect to LYNTOS Asistan
 * Bu sayfa artık kullanılmıyor, /v2/asistan'a yönlendirir.
 */
import { redirect } from 'next/navigation';

export default function CorporateChatPage() {
  redirect('/v2/asistan');
}
