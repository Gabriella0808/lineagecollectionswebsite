/*
 * Dealer / trade account application.
 *
 * Applicants download the New Account Application, complete it, and upload it here with their
 * resale tax certificate(s). If LINEAGE_DATA.dealerApplicationUrl is set (once a backend exists),
 * the form posts there as multipart form data, files included. Until then it checks everything
 * and asks the applicant to email their documents to orders@.
 */
(function () {
  'use strict';

  const form = document.getElementById('dealerForm');
  if (!form) return;

  const status = document.getElementById('dealerStatus');
  const cardNote = document.getElementById('cardNote');
  const resaleList = document.getElementById('daResaleList');
  const data = window.LINEAGE_DATA || {};
  const ORDERS_EMAIL = 'orders@lineage-collections.com';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ALLOWED = /\.(pdf|jpe?g|png)$/i;
  const MAX_BYTES = 10 * 1024 * 1024;

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
      msg.id = `${field.id || field.name}Error`;
      wrap.appendChild(msg);
      field.setAttribute('aria-describedby', msg.id);
    }
    msg.textContent = message;
  }

  // What's wrong with a file field, or '' if it's fine.
  function fileProblem(input, what) {
    const files = Array.from(input.files);
    if (!files.length) return `Please attach your ${what}.`;
    const wrongType = files.find((f) => !ALLOWED.test(f.name));
    if (wrongType) return `${wrongType.name} isn't a PDF, JPG or PNG.`;
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) return `${tooBig.name} is larger than 10 MB.`;
    return '';
  }

  function validate() {
    const firstTerm = form.querySelector('input[name="terms"]');
    const checks = [
      [form.company, form.company.value.trim() ? '' : 'Please enter your company name.'],
      [form.contactName, form.contactName.value.trim() ? '' : 'Please enter your name.'],
      [form.email, EMAIL_RE.test(form.email.value.trim()) ? '' : 'Please enter a valid email address.'],
      [form.phone, form.phone.value.trim() ? '' : 'Please enter a phone number.'],
      [firstTerm, form.terms.value ? '' : 'Please choose how you would like to pay.'],
      [form.creditApp, fileProblem(form.creditApp, 'completed application')],
      [form.resaleCerts, fileProblem(form.resaleCerts, 'resale tax certificate(s)')],
      [form.agree, form.agree.checked ? '' : 'Please confirm you have signed the Terms of Sale and Credit.']
    ];
    checks.forEach(([field, message]) => setError(field, message));
    const firstInvalid = checks.find(([, message]) => message);
    if (firstInvalid) firstInvalid[0].focus();
    return !firstInvalid;
  }

  // Clear a field's error as soon as it's fixed.
  const clearError = (e) => {
    const field = e.target.name === 'terms' ? form.querySelector('input[name="terms"]') : e.target;
    if (field.getAttribute('aria-invalid') === 'true') setError(field, '');
  };
  form.addEventListener('input', clearError);

  form.addEventListener('change', (e) => {
    clearError(e);
    // The card form is only needed when they're not on Net 30.
    if (e.target.name === 'terms') cardNote.hidden = form.terms.value !== 'Credit card';
    // Show the chosen certificate files, since there may be several.
    if (e.target === form.resaleCerts) {
      resaleList.innerHTML = Array.from(form.resaleCerts.files).map((f) => `<li>${escapeHtml(f.name)}</li>`).join('');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.classList.remove('is-error');
    if (!validate()) return;

    const emailLink = `mailto:${ORDERS_EMAIL}?subject=${encodeURIComponent(`Dealer application: ${form.company.value.trim()}`)}`;

    // No backend yet: point them to email instead of losing the application.
    if (!data.dealerApplicationUrl) {
      status.innerHTML = `Thank you. Online submission isn't available just yet, so please email your completed application and resale tax certificate(s) to <a href="${emailLink}">${ORDERS_EMAIL}</a>.`;
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = 'Sending your application…';
    try {
      const res = await fetch(data.dealerApplicationUrl, { method: 'POST', body: new FormData(form) });
      if (!res.ok) throw new Error(`Application ${res.status}`);
      form.reset();
      cardNote.hidden = true;
      resaleList.innerHTML = '';
      status.textContent = 'Thank you, your application has been sent. Our team will review it and be in touch.';
    } catch (err) {
      status.classList.add('is-error');
      status.innerHTML = `Sorry, something went wrong sending your application. Please try again, or email your documents to <a href="${emailLink}">${ORDERS_EMAIL}</a>.`;
    } finally {
      button.disabled = false;
    }
  });
})();
