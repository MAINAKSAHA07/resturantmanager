import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function HomePage() {
  const cookieStore = cookies();
  const token = cookieStore.get('pb_auth_token')?.value;
  const selectedTenant = cookieStore.get('selected_tenant_id')?.value;

  if (!token) {
    redirect('/login');
  }
  
  if (!selectedTenant) {
    redirect('/select-tenant');
  }
  
  redirect('/dashboard');
}




