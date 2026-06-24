// Loads the single-row business profile from Supabase (business_settings, id = 1).
// Falls back to a bundled logo path only if the column is empty.
import { supabase } from '@/integrations/supabase/client';

export const FALLBACK_LOGO_URL = '/ReklamX_Logo.png';

export async function loadBusinessProfile() {
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) {
    return {
      companyName: '',
      logoUrl: FALLBACK_LOGO_URL,
      address: '', phone: '', email: '',
      bankgiro: '', orgNumber: '', momsreg: '',
    };
  }
  return {
    companyName: data.company_name || '',
    logoUrl: data.logo_url || FALLBACK_LOGO_URL,
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    bankgiro: data.bankgiro || '',
    orgNumber: data.org_number || '',
    momsreg: data.momsreg || '',
  };
}
