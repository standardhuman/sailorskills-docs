import { supabase } from './supabase-client.js';

export async function getEmailTemplates() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('template_name');

  if (error) throw error;
  return data;
}

export async function getEmailTemplate(templateKey) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', templateKey)
    .single();

  if (error) throw error;
  return data;
}

export async function updateEmailTemplate(templateKey, updates) {
  const { data, error } = await supabase
    .from('email_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('template_key', templateKey)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function renderTemplate(template, data) {
  let subject = template.subject_line;
  let body = template.email_body;

  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, data[key] || '');
    body = body.replace(regex, data[key] || '');
  });

  return { subject, body };
}
