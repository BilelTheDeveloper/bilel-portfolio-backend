const CATEGORIES = ['Web Development', 'Meta Ads Case Study', 'UI/UX Design', 'Digital Marketing'];
function projectFields(body) {
  const errors = {};
  const text = (name, max, required = false) => {
    const raw = body[name] ?? '';
    if (typeof raw !== 'string') { errors[name] = 'Use plain text.'; return ''; }
    const value = raw.trim();
    if (required && !value) errors[name] = 'This field is required.';
    else if (value.length > max) errors[name] = `Use no more than ${max} characters.`;
    return value;
  };
  const values = {
    title: text('title', 100, true), category: text('category', 60, true),
    description: text('description', 500, true), cardLabel: text('cardLabel', 40), imageAlt: text('imageAlt', 160),
    longDescription: text('longDescription', 10000), challenges: text('challenges', 10000),
    solutions: text('solutions', 10000), duration: text('duration', 100), link: text('link', 2048),
    imagePosition: body.imagePosition ?? 'center',
  };
  const caseStudyLimits = { projectType: 40, role: 150, decisions: 5000, outcomes: 3000, lessons: 3000, walkthroughUrl: 2048, walkthroughNotes: 2000, repositoryUrl: 2048, demoUrl: 2048, demoGuide: 3000, designImageUrl: 2048, designCaption: 500, gallery: 6000, testimonialQuote: 2000, testimonialAuthor: 150 };
  for (const [name, max] of Object.entries(caseStudyLimits)) values[name] = text(name, max);
  if (values.projectType && !['Client project', 'Personal product', 'Concept project', 'Open-source contribution'].includes(values.projectType)) errors.projectType = 'Choose a supported project type.';
  const validUrl = value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; } };
  for (const name of ['walkthroughUrl', 'repositoryUrl', 'demoUrl', 'designImageUrl']) if (values[name] && !validUrl(values[name])) errors[name] = 'Use a complete HTTP or HTTPS URL without credentials.';
  const gallery = values.gallery.split('\n').map(line => line.trim()).filter(Boolean);
  if (gallery.length > 6 || gallery.some(line => { const [url, ...caption] = line.split('|'); return !validUrl(url.trim()) || !caption.join('|').trim() || caption.join('|').trim().length > 300; })) errors.gallery = 'Use up to 6 lines: image URL | caption (up to 300 characters).';
  if (![undefined, true, false, 'true', 'false'].includes(body.testimonialApproved)) errors.testimonialApproved = 'Use true or false.';
  values.testimonialApproved = body.testimonialApproved === true || body.testimonialApproved === 'true';
  if (values.testimonialQuote && (!values.testimonialApproved || !values.testimonialAuthor)) errors.testimonialQuote = 'Add the approved public attribution and confirm permission before publishing feedback.';
  if (!CATEGORIES.includes(values.category)) errors.category = 'Choose a supported category.';
  if (!['top', 'center', 'bottom'].includes(values.imagePosition)) errors.imagePosition = 'Choose top, center or bottom.';
  if (values.link) {
    try { const url = new URL(values.link); if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error(); }
    catch { errors.link = 'Enter a complete HTTP or HTTPS URL without credentials.'; }
  }
  const list = (name, count, max, json = false) => {
    const raw = body[name] ?? '';
    let items = raw;
    if (typeof raw === 'string') {
      if (raw.length > (json ? 8000 : 500)) { errors[name] = 'This list is too long.'; return []; }
      if (json && raw.trim()) { try { items = JSON.parse(raw); } catch { errors[name] = 'Use a valid list of features.'; return []; } }
      else items = raw.split(',').map(item => item.trim()).filter(Boolean);
    }
    if (!Array.isArray(items) || items.length > count || items.some(item => typeof item !== 'string' || !item.trim() || item.trim().length > max)) {
      errors[name] = `Use up to ${count} items, with 1–${max} characters each.`; return [];
    }
    return [...new Set(items.map(item => item.trim()))];
  };
  values.tags = list('tags', 12, 30);
  values.features = list('features', 30, 200, true);
  if (![undefined, true, false, 'true', 'false'].includes(body.isFeatured)) errors.isFeatured = 'Use true or false.';
  values.isFeatured = body.isFeatured === true || body.isFeatured === 'true';
  return { values, errors };
}
module.exports = { projectFields, CATEGORIES };
