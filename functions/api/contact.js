// Cloudflare Pages Function: POST /api/contact
//
// Receives the public contact form and the commercial account application,
// validates them, and emails info@locksmithstatenisland.nyc through the Brevo
// transactional API. The Brevo API key is read from the BREVO_API_KEY
// environment variable (set in Cloudflare Pages > Settings > Variables and
// Secrets). Nothing secret lives in this repository.
//
// Accepts multipart/form-data, application/x-www-form-urlencoded or JSON.
// Always answers JSON: { success: boolean, message: string, errors?: string[] }

const TO_EMAIL = 'info@locksmithstatenisland.nyc';
const TO_NAME = 'Locksmith Staten Island NY';
const FROM_EMAIL = 'noreply@locksmithstatenisland.nyc'; // must be a verified sender in Brevo
const FROM_NAME = 'Locksmith Staten Island Website';
const PHONE = '(718) 831-6269';
const ALLOWED_ORIGINS = ['https://www.locksmithstatenisland.nyc', 'https://locksmithstatenisland.nyc'];

const FORMS = {
  contact: {
    label: 'Contact form',
    required: { 'first-name': 'First name', 'last-name': 'Last name', email: 'Email', phone: 'Phone', message: 'Message' },
    optional: { 'service-type': 'Service type' },
    subject: (f) => `New contact form submission - ${f['first-name']} ${f['last-name']}`,
    success: 'Thank you! Your message has been sent. We will respond within 24 hours, or call us now at ' + PHONE + '.',
  },
  'commercial-account': {
    label: 'Commercial account application',
    required: { company: 'Company', segment: 'Type of account', 'contact-name': 'Your name', email: 'Work email', phone: 'Phone', consent: 'Consent' },
    optional: { role: 'Role', volume: 'Size of operation', boroughs: 'Locations', timing: 'Timing', message: 'Needs', page: 'Page' },
    subject: (f) => `Commercial account application - ${f.company} (${f.segment})`,
    success: 'Application received. We will reply from info@locksmithstatenisland.nyc within one business day with your rate sheet. Your first job is 10% off.',
  },
};

// Spanish messages for forms submitted from the /es/ pages (they send lang=es).
const ES = {
  forms: {
    contact: {
      required: { 'first-name': 'El nombre', 'last-name': 'El apellido', email: 'El correo electrónico', phone: 'El teléfono', message: 'El mensaje' },
      success: '¡Gracias! Su mensaje fue enviado. Le responderemos dentro de 24 horas, o llámenos ahora al ' + PHONE + '.',
    },
    'commercial-account': {
      required: { company: 'La empresa', segment: 'El tipo de cuenta', 'contact-name': 'Su nombre', email: 'El correo electrónico de trabajo', phone: 'El teléfono', consent: 'El consentimiento' },
      success: 'Solicitud recibida. Le responderemos desde info@locksmithstatenisland.nyc dentro de un día hábil con su hoja de tarifas. Su primer trabajo tiene 10% de descuento.',
    },
  },
  required: (label) => `${label} es obligatorio`,
  invalidEmail: 'Ingrese un correo electrónico válido',
  invalidPhone: 'Ingrese un número de teléfono válido',
  correct: 'Por favor corrija lo siguiente:',
  unreadable: 'No pudimos leer el formulario.',
  unknown: 'Formulario desconocido.',
  thanks: 'Gracias.',
  unavailable: `Nuestro formulario no está disponible por el momento. Escríbanos a ${TO_EMAIL} o llame al ${PHONE}.`,
  failed: `No pudimos enviar su mensaje en este momento. Escríbanos a ${TO_EMAIL} o llame al ${PHONE}.`,
};

const MAX_FIELD = 4000;
const HONEYPOT = 'company-website';

function json(body, status = 200, origin = '') {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

function corsOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : '';
}

async function readFields(request) {
  const type = (request.headers.get('Content-Type') || '').toLowerCase();
  const fields = {};
  if (type.includes('application/json')) {
    const data = await request.json();
    for (const [k, v] of Object.entries(data || {})) fields[k] = v == null ? '' : String(v);
  } else {
    const form = await request.formData();
    for (const [k, v] of form.entries()) fields[k] = typeof v === 'string' ? v : '';
  }
  for (const k of Object.keys(fields)) fields[k] = fields[k].trim().slice(0, MAX_FIELD);
  return fields;
}

function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

function validPhone(s) {
  return s.replace(/\D/g, '').length >= 10;
}

function buildText(spec, fields, request) {
  const lines = [`${spec.label} from locksmithstatenisland.nyc`, ''];
  const all = { ...spec.required, ...spec.optional };
  for (const [key, label] of Object.entries(all)) {
    if (fields[key]) lines.push(`${label}: ${fields[key]}`);
  }
  lines.push('');
  if (fields.lang === 'es') lines.push('Language: Spanish (submitted from the /es/ site)');
  lines.push(`Submitted: ${new Date().toISOString()}`);
  lines.push(`Page: ${fields.page || request.headers.get('Referer') || 'unknown'}`);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) lines.push(`IP: ${ip}`);
  return lines.join('\n');
}

export async function onRequestOptions(context) {
  const origin = corsOrigin(context.request);
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function onRequestGet() {
  return json({ success: false, message: 'POST a form to this endpoint.' }, 405);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = corsOrigin(request);

  let fields;
  try {
    fields = await readFields(request);
  } catch (e) {
    return json({ success: false, message: 'Could not read the form.' }, 400, origin);
  }
  const es = fields.lang === 'es';

  // Bots fill every field; humans never see this one.
  if (fields[HONEYPOT]) {
    return json({ success: true, message: es ? ES.thanks : 'Thank you.' }, 200, origin);
  }

  const spec = FORMS[fields.form || 'contact'];
  if (!spec) return json({ success: false, message: es ? ES.unknown : 'Unknown form.' }, 400, origin);
  const esSpec = ES.forms[fields.form || 'contact'] || {};

  const errors = [];
  for (const [key, label] of Object.entries(spec.required)) {
    if (!fields[key]) errors.push(es ? ES.required((esSpec.required || {})[key] || label) : `${label} is required`);
  }
  if (fields.email && !validEmail(fields.email)) errors.push(es ? ES.invalidEmail : 'Please enter a valid email address');
  if (fields.phone && !validPhone(fields.phone)) errors.push(es ? ES.invalidPhone : 'Please enter a valid phone number');
  if (errors.length) {
    return json({ success: false, message: es ? ES.correct : 'Please correct the following:', errors }, 422, origin);
  }

  if (!env.BREVO_API_KEY) {
    return json(
      { success: false, message: es ? ES.unavailable : `Our form is temporarily unavailable. Please email ${TO_EMAIL} or call ${PHONE}.` },
      503,
      origin
    );
  }

  const replyName = fields['contact-name'] || [fields['first-name'], fields['last-name']].filter(Boolean).join(' ') || fields.email;
  const payload = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: [{ email: TO_EMAIL, name: TO_NAME }],
    replyTo: { email: fields.email, name: replyName },
    subject: spec.subject(fields),
    textContent: buildText(spec, fields, request),
    tags: ['website', fields.form || 'contact'].concat(es ? ['es'] : []),
  };

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Brevo error', res.status, detail.slice(0, 500));
      return json(
        { success: false, message: es ? ES.failed : `We could not send your message right now. Please email ${TO_EMAIL} or call ${PHONE}.` },
        502,
        origin
      );
    }
  } catch (e) {
    console.error('Brevo request failed', e && e.message);
    return json(
      { success: false, message: es ? ES.failed : `We could not send your message right now. Please email ${TO_EMAIL} or call ${PHONE}.` },
      502,
      origin
    );
  }

  return json({ success: true, message: es && esSpec.success ? esSpec.success : spec.success }, 200, origin);
}
