function dayKey(value) {
  return String(value || '').slice(0, 10);
}

export class AdminService {
  constructor({ store, getConnectors }) {
    this.store = store;
    this.getConnectors = getConnectors;
  }

  async overview() {
    const data = await this.store.snapshot();
    const today = dayKey(new Date().toISOString());
    const todaySearches = data.searchEvents.filter((event) => dayKey(event.createdAt) === today);
    const booked = data.opportunities.filter((item) => item.status === 'booked');
    const acceptedQuotes = booked
      .map((opportunity) => opportunity.quotes.find((quote) => quote.id === opportunity.bookedQuoteId))
      .filter(Boolean);
    const gmvByCurrency = acceptedQuotes.reduce((totals, quote) => {
      totals[quote.currency] = Math.round(((totals[quote.currency] || 0) + quote.amount) * 100) / 100;
      return totals;
    }, {});

    const totalSearches = data.searchEvents.length;
    const totalRequests = data.opportunities.length;
    const conversionRate = totalRequests > 0 ? Math.round((booked.length / totalRequests) * 1000) / 10 : 0;

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        searchesToday: todaySearches.length,
        totalSearches,
        marketplaceRequests: totalRequests,
        openOpportunities: data.opportunities.filter((item) => item.status !== 'booked').length,
        quotesSubmitted: data.opportunities.reduce((sum, item) => sum + item.quotes.length, 0),
        bookings: booked.length,
        requestToBookingRate: conversionRate,
        gmvByCurrency
      },
      connectors: this.getConnectors(),
      markets: data.markets,
      recentSearches: data.searchEvents.slice(0, 12),
      recentAudit: data.auditEvents.slice(0, 12),
      operations: {
        userVerification: 7,
        businessVerification: data.businesses.filter((business) => business.verification !== 'mvp-verified').length,
        disputes: 0,
        paymentExceptions: 0,
        contentReview: 3
      }
    };
  }
}
