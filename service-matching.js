import { normalizeText } from './lib-text.js';

export function businessMatchesOpportunity(business, opportunity) {
  if (business.status !== 'verified' || business.acceptingLeads === false) return false;
  if (business.market !== opportunity.market) return false;
  if (opportunity.category !== 'general' && !business.categories.includes(opportunity.category)) return false;
  if (opportunity.city && !business.serviceAreas.some((city) => normalizeText(city) === normalizeText(opportunity.city))) return false;
  return true;
}

export function matchingBusinesses(data, opportunity) {
  return data.businesses.filter((business) => businessMatchesOpportunity(business, opportunity));
}
