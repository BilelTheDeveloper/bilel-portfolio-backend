const SERVICES = ['Web application', 'Website redesign', 'UI/UX design', 'Backend & API', 'Something else'];
const BUDGETS = ['Not sure yet', 'Under $1,000', '$1,000–$3,000', '$3,000–$5,000', '$5,000+'];
const TIMELINES = ['Flexible', 'As soon as possible', 'Within a month', '1–3 months', '3+ months'];
const DETAIL_FIELDS = ['company', 'service', 'budget', 'timeline'];
function inquiryDetails(body) {
  const errors = {};
  const values = {};
  for (const field of DETAIL_FIELDS) {
    const value = body[field] ?? '';
    if (typeof value !== 'string' || value.trim().length > (field === 'company' ? 120 : 80)) { errors[field] = 'Please check this field.'; values[field] = ''; }
    else values[field] = value.trim();
  }
  for (const [field, options] of [['service', SERVICES], ['budget', BUDGETS], ['timeline', TIMELINES]]) if (values[field] && !options.includes(values[field])) errors[field] = 'Choose an available option.';
  return { values, errors };
}
module.exports = { SERVICES, BUDGETS, TIMELINES, DETAIL_FIELDS, inquiryDetails };
