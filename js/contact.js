/*
 * Contact form.
 *
 * If LINEAGE_DATA.contactFormUrl is set (e.g. a Formspree endpoint or our own Worker),
 * the form posts there as JSON. Until then it opens the visitor's email app with the
 * message pre-filled to customer service, so no enquiry is lost.
 */
(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  if (!form) return;

  const status = document.getElementById('contactStatus');
  const data = window.LINEAGE_DATA || {};
  const SUPPORT_EMAIL = 'support@lineage-collections.com';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Pre-select a topic from the URL, e.g. contact.html?topic=Becoming%20a%20dealer
  const topicParam = new URLSearchParams(location.search).get('topic');
  if (topicParam) {
    const option = Array.from(form.topic.options).find((o) => o.text.toLowerCase() === topicParam.toLowerCase());
    if (option) option.selected = true;
  }

  function setError(field, message) {
    const wrap = field.closest('.field');
    let msg = wrap.querySelector('.field-error');
    if (!message) {
      field.removeAttribute('aria-invalid');
      if (msg) msg.remove();
      return;
    }
    field.setAttribute('aria-invalid', 'true');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'field-error';
      msg.id = `${field.id}Error`;
      wrap.appendChild(msg);
      field.setAttribute('aria-describedby', msg.id);
    }
    msg.textContent = message;
  }

  function validate() {
    const checks = [
      [form.name, form.name.value.trim() ? '' : 'Please enter your name.'],
      [form.email, EMAIL_RE.test(form.email.value.trim()) ? '' : 'Please enter a valid email address.'],
      [form.topic, form.topic.value ? '' : 'Please choose a topic.'],
      [form.message, form.message.value.trim() ? '' : 'Please enter a message.']
    ];
    checks.forEach(([field, message]) => setError(field, message));
    const firstInvalid = checks.find(([, message]) => message);
    if (firstInvalid) firstInvalid[0].focus();
    return !firstInvalid;
  }

  // Clear a field's error as soon as it's fixed.
  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, '');
  });

  function values() {
    return {
      name: form.name.value.trim(),
      company: form.company.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      topic: form.topic.value,
      message: form.message.value.trim()
    };
  }

  function openEmail(v) {
    const details = [
      `Name: ${v.name}`,
      v.company ? `Company: ${v.company}` : null,
      `Email: ${v.email}`,
      v.phone ? `Phone: ${v.phone}` : null
    ].filter(Boolean);
    const body = `${v.message}\n\n${details.join('\n')}`;
    location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Website enquiry: ${v.topic}`)}&body=${encodeURIComponent(body)}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.classList.remove('is-error');
    if (!validate()) return;

    const v = values();

    if (!data.contactFormUrl) {
      openEmail(v);
      status.textContent = 'Your email app should open with your message ready to send.';
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = 'Sending…';
    try {
      const res = await fetch(data.contactFormUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(v)
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      form.reset();
      status.textContent = 'Thank you. Your message has been sent and we’ll be in touch soon.';
    } catch (err) {
      status.classList.add('is-error');
      status.innerHTML = `Sorry, your message couldn’t be sent. Please email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.`;
    } finally {
      button.disabled = false;
    }
  });
})();
