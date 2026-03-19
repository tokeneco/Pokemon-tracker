'use client';

import React, { useMemo, useState } from 'react';

type Listing = {
  id: string;
  title: string;
  language: string;
  source: string;
  url: string;
  price: number;
  shipping: number;
  gradingFee: number;
  estimatedPSA10Value: number;
  estimatedPSA9Value: number;
  psa10Probability: number;
  liquidity: string;
  category: string;
  notes: string;
  condition?: string;
  imageUrl?: string;
};

type Submission = {
  id: string;
  card: string;
  service: string;
  sentDate: string;
  stage: string;
  declaredValue: number;
  fee: number;
  estimatedReturnDate: string;
};

const initialListings: Listing[] = [
  {
    id: '1',
    title: 'Cubone Gem Pack Vol. 3 Holo',
    language: 'Chinese',
    source: 'Sample',
    url: '#',
    price: 72,
    shipping: 6,
    gradingFee: 24,
    estimatedPSA10Value: 245,
    estimatedPSA9Value: 118,
    psa10Probability: 0.58,
    liquidity: 'Medium',
    category: 'Grading Arbitrage',
    notes: 'Strong centering from photos, minor holo scratch risk.',
  },
  {
    id: '2',
    title: 'Batik Pikachu Reverse Holo',
    language: 'Indonesian',
    source: 'Sample',
    url: '#',
    price: 210,
    shipping: 8,
    gradingFee: 32,
    estimatedPSA10Value: 620,
    estimatedPSA9Value: 355,
    psa10Probability: 0.46,
    liquidity: 'Low',
    category: 'Long-Term Hold',
    notes: 'Thin buyer pool, but strong exclusivity narrative.',
  },
  {
    id: '3',
    title: "Sabrina's Gengar",
    language: 'Japanese',
    source: 'Sample',
    url: '#',
    price: 345,
    shipping: 5,
    gradingFee: 28,
    estimatedPSA10Value: 760,
    estimatedPSA9Value: 470,
    psa10Probability: 0.31,
    liquidity: 'High',
    category: 'Blue Chip',
    notes: 'Iconic card with reliable exit demand.',
  },
];

const holdings = [
  { card: 'Japanese 151 Booster Box', qty: 8, basis: 128, market: 168, allocation: 30 },
  { card: 'Batik Pikachu Reverse Holo PSA 10', qty: 1, basis: 460, market: 620, allocation: 18 },
  { card: "Sabrina's Gengar PSA 9", qty: 2, basis: 265, market: 310, allocation: 14 },
];

const submissions: Submission[] = [
  {
    id: 's1',
    card: 'Cubone Gem Pack Vol. 3 Holo',
    service: 'PSA Value Bulk',
    sentDate: '2026-03-03',
    stage: 'Grading',
    declaredValue: 245,
    fee: 24,
    estimatedReturnDate: '2026-04-09',
  },
  {
    id: 's2',
    card: 'Haunter 151 Master Ball',
    service: 'PSA Value',
    sentDate: '2026-03-08',
    stage: 'Assembly',
    declaredValue: 240,
    fee: 24,
    estimatedReturnDate: '2026-03-31',
  },
];

function cardStyle(): React.CSSProperties {
  return {
    background: 'rgba(24,24,27,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  };
}

function statValueColor(v: number) {
  return v >= 0 ? '#86efac' : '#fca5a5';
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<'overview'|'scanner'|'import'|'portfolio'|'grading'|'ebay'>('overview');
  const [search, setSearch] = useState('');
  const [strategy, setStrategy] = useState('All');
  const [positiveOnly, setPositiveOnly] = useState(false);
  const [csvInput, setCsvInput] = useState(
    'title,language,source,price,shipping,gradingFee,estimatedPSA10Value,estimatedPSA9Value,psa10Probability,liquidity,category,url\nPikachu SM Promo,Japanese,Import,180,5,24,420,250,0.41,High,Grading Arbitrage,https://example.com/pikachu-sm-promo'
  );
  const [manualListings, setManualListings] = useState<Listing[]>(initialListings);
  const [ebayProxyUrl, setEbayProxyUrl] = useState('/api/ebay-search');
  const [ebayQuery, setEbayQuery] = useState('pokemon japanese gengar psa 10');
  const [ebayStatus, setEbayStatus] = useState('Disconnected');
  const [ebayLoading, setEbayLoading] = useState(false);
  const [ebayError, setEbayError] = useState('');
  const [ebayListings, setEbayListings] = useState<Listing[]>([]);

  const importedPreview = useMemo(() => {
    const lines = csvInput.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [] as Listing[];
    const headers = lines[0].split(',').map((x) => x.trim());
    return lines.slice(1).map((line, i) => {
      const cols = line.split(',');
      const row = Object.fromEntries(headers.map((h, idx) => [h, (cols[idx] || '').trim()]));
      return {
        id: `preview-${i}`,
        title: row.title || 'Unknown Card',
        language: row.language || 'Unknown',
        source: row.source || 'Import',
        url: row.url || '#',
        price: Number(row.price || 0),
        shipping: Number(row.shipping || 0),
        gradingFee: Number(row.gradingFee || 0),
        estimatedPSA10Value: Number(row.estimatedPSA10Value || 0),
        estimatedPSA9Value: Number(row.estimatedPSA9Value || 0),
        psa10Probability: Number(row.psa10Probability || 0),
        liquidity: row.liquidity || 'Unknown',
        category: row.category || 'Other',
        notes: 'Imported from CSV preview.',
      } as Listing;
    });
  }, [csvInput]);

  const allListings = useMemo(() => [...importedPreview, ...ebayListings, ...manualListings], [importedPreview, ebayListings, manualListings]);

  const scoredListings = useMemo(() => {
    return allListings
      .map((item) => {
        const totalCost = item.price + item.shipping + item.gradingFee;
        const expectedValue = item.psa10Probability * item.estimatedPSA10Value + (1 - item.psa10Probability) * item.estimatedPSA9Value;
        const expectedProfit = expectedValue - totalCost;
        const expectedROI = totalCost > 0 ? (expectedProfit / totalCost) * 100 : 0;
        const liquidityScore = item.liquidity === 'High' ? 18 : item.liquidity === 'Medium' ? 12 : 7;
        const edgeScore = Math.max(1, Math.min(99, Math.round(expectedROI * 0.7 + item.psa10Probability * 40 + liquidityScore)));
        return { ...item, totalCost, expectedValue, expectedProfit, expectedROI, edgeScore };
      })
      .filter((item) => {
        const haystack = `${item.title} ${item.language} ${item.source} ${item.category}`.toLowerCase();
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesStrategy = strategy === 'All' || item.category === strategy;
        const matchesProfit = !positiveOnly || item.expectedProfit > 0;
        return matchesSearch && matchesStrategy && matchesProfit;
      })
      .sort((a, b) => b.edgeScore - a.edgeScore);
  }, [allListings, positiveOnly, search, strategy]);

  const portfolioValue = holdings.reduce((sum, h) => sum + h.qty * h.market, 0);
  const portfolioCost = holdings.reduce((sum, h) => sum + h.qty * h.basis, 0);
  const portfolioRoi = ((portfolioValue - portfolioCost) / portfolioCost) * 100;

  const importPreview = () => {
    setManualListings((prev) => [
      ...importedPreview.map((x, idx) => ({ ...x, id: `import-${Date.now()}-${idx}` })),
      ...prev,
    ]);
  };

  const refreshEbay = async () => {
    setEbayLoading(true);
    setEbayError('');
    setEbayStatus('Connecting');
    try {
      const res = await fetch(`${ebayProxyUrl}?q=${encodeURIComponent(ebayQuery)}&limit=12`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || 'Failed to fetch eBay listings');
      const items = (data.items || []).map((item: any, idx: number) => ({
        id: `ebay-${idx}-${item.title}`,
        title: item.title || `eBay Listing ${idx + 1}`,
        language: /japanese/i.test(item.title || '') ? 'Japanese' : /chinese/i.test(item.title || '') ? 'Chinese' : /indonesian/i.test(item.title || '') ? 'Indonesian' : 'Unknown',
        source: 'eBay Live',
        url: item.url || '#',
        price: Number(item.price || 0),
        shipping: Number(item.shipping || 0),
        gradingFee: 24,
        estimatedPSA10Value: Math.round(Number(item.price || 0) * 2.4),
        estimatedPSA9Value: Math.round(Number(item.price || 0) * 1.4),
        psa10Probability: /psa 10|gem mint/i.test(item.title || '') ? 0.92 : /mint|nm/i.test(item.title || '') ? 0.48 : 0.32,
        liquidity: 'High',
        category: 'Grading Arbitrage',
        notes: item.condition ? `Condition: ${item.condition}` : 'Imported from eBay live connector.',
        condition: item.condition,
        imageUrl: item.imageUrl,
      } as Listing));
      setEbayListings(items);
      setEbayStatus(`Live: ${items.length} listings`);
    } catch (err: any) {
      setEbayError(err?.message || 'Could not connect');
      setEbayStatus('Connection failed');
      setEbayListings([]);
    } finally {
      setEbayLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#000,#111827,#09090b)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.2)', color: '#a5f3fc', fontSize: 14, marginBottom: 10 }}>
              Pokémon Card Investing Command Center
            </div>
            <h1 style={{ margin: 0, fontSize: 36 }}>Live deployable scanner, portfolio, grading tracker, and eBay connector</h1>
            <p style={{ color: '#a1a1aa', maxWidth: 900 }}>Import rows, rank expected value, track submissions, and connect to the included eBay proxy route.</p>
          </div>
          <button onClick={refreshEbay} style={{ background: '#fff', color: '#000', border: 0, borderRadius: 16, padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>
            {ebayLoading ? 'Refreshing…' : 'Refresh eBay'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 24 }}>
          {[
            ['Portfolio Value', `$${portfolioValue.toLocaleString()}`, `${portfolioRoi.toFixed(1)}%`, portfolioRoi >= 0],
            ['Open Submissions', String(submissions.length), 'pipeline active', true],
            ['Live Opportunities', String(scoredListings.filter((x) => x.expectedProfit > 0).length), `${Math.max(0, ...scoredListings.map((x) => x.expectedROI)).toFixed(1)}% max ROI`, true],
            ['eBay Status', ebayStatus, ebayError || 'ready for proxy', !ebayError],
          ].map(([title, value, delta, positive]) => (
            <div key={String(title)} style={cardStyle()}>
              <div style={{ color: '#a1a1aa', fontSize: 14 }}>{title}</div>
              <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{value}</div>
              <div style={{ marginTop: 8, color: positive ? '#86efac' : '#fca5a5', fontSize: 14 }}>{delta}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            ['overview', 'Overview'],
            ['scanner', 'Live Scanner'],
            ['import', 'Import Feed'],
            ['portfolio', 'Portfolio'],
            ['grading', 'Grading Tracker'],
            ['ebay', 'eBay Link'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              style={{
                padding: '10px 14px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                background: activeTab === key ? '#fff' : 'rgba(24,24,27,0.9)',
                color: activeTab === key ? '#000' : '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>Top Signals</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  'Japanese 151 sealed still benefits from durable collector demand.',
                  'Asian exclusives remain strongest where scarcity is real but still under-discovered.',
                  'Best grade-arb comes from clean raw cards where spread exceeds all friction.',
                ].map((x) => <div key={x} style={{ padding: 14, borderRadius: 16, background: 'rgba(0,0,0,0.25)', color: '#d4d4d8' }}>{x}</div>)}
              </div>
            </div>
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>Execution Rules</h3>
              <ul style={{ paddingLeft: 18, color: '#d4d4d8', lineHeight: 1.7 }}>
                <li>Only buy when EV stays positive after fees.</li>
                <li>Track liquidity separately from rarity.</li>
                <li>Use grading like working capital, not storage.</li>
                <li>Sell into spikes instead of waiting for sentiment to turn.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'scanner' && (
          <>
            <div style={{ ...cardStyle(), marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'center' }}>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search card, source, language..." style={inputStyle} />
                <select value={strategy} onChange={(e) => setStrategy(e.target.value)} style={inputStyle}>
                  <option>All</option>
                  <option>Grading Arbitrage</option>
                  <option>Long-Term Hold</option>
                  <option>Blue Chip</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d4d4d8' }}>
                  <input type="checkbox" checked={positiveOnly} onChange={(e) => setPositiveOnly(e.target.checked)} /> Positive EV only
                </label>
                <button onClick={refreshEbay} style={buttonStyle}>Refresh</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16 }}>
              {scoredListings.map((item) => (
                <div key={item.id} style={cardStyle()}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 14, marginBottom: 14 }} /> : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <Pill>{item.category}</Pill>
                        <Pill>{item.language}</Pill>
                        <Pill>{item.source}</Pill>
                        {item.condition ? <Pill>{item.condition}</Pill> : null}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 20 }}>{item.title}</div>
                      <div style={{ color: '#a1a1aa', marginTop: 6 }}>{item.notes}</div>
                    </div>
                    <div style={{ minWidth: 80, textAlign: 'right' }}>
                      <div style={{ color: '#86efac', fontSize: 12 }}>Edge Score</div>
                      <div style={{ color: '#86efac', fontSize: 28, fontWeight: 800 }}>{item.edgeScore}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 14 }}>
                    <MiniStat label="Buy+Ship" value={`$${(item.price + item.shipping).toFixed(0)}`} />
                    <MiniStat label="Grade Fee" value={`$${item.gradingFee.toFixed(0)}`} />
                    <MiniStat label="PSA 10 Prob" value={`${(item.psa10Probability * 100).toFixed(0)}%`} />
                    <MiniStat label="Liquidity" value={item.liquidity} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 14 }}>
                    <MiniStat label="Expected Value" value={`$${item.expectedValue.toFixed(0)}`} />
                    <MiniStat label="Expected Profit" value={`$${item.expectedProfit.toFixed(0)}`} accent={statValueColor(item.expectedProfit)} />
                    <MiniStat label="Expected ROI" value={`${item.expectedROI.toFixed(1)}%`} accent={statValueColor(item.expectedROI)} />
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#a5f3fc' }}>Open listing</a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'import' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>CSV import</h3>
              <textarea value={csvInput} onChange={(e) => setCsvInput(e.target.value)} style={{ ...inputStyle, minHeight: 260, width: '100%', resize: 'vertical' }} />
              <div style={{ color: '#a1a1aa', marginTop: 12 }}>Required columns: title, language, source, price, shipping, gradingFee, estimatedPSA10Value, estimatedPSA9Value, psa10Probability, liquidity, category, url</div>
              <button onClick={importPreview} style={{ ...buttonStyle, marginTop: 14 }}>Add preview rows to scanner</button>
            </div>
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>Parsed preview</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {importedPreview.map((item) => {
                  const totalCost = item.price + item.shipping + item.gradingFee;
                  const expectedValue = item.psa10Probability * item.estimatedPSA10Value + (1 - item.psa10Probability) * item.estimatedPSA9Value;
                  return (
                    <div key={item.id} style={{ padding: 14, borderRadius: 16, background: 'rgba(0,0,0,0.25)' }}>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      <div style={{ color: '#a1a1aa', marginTop: 4 }}>{item.language} • {item.source} • {item.category}</div>
                      <div style={{ marginTop: 8, color: '#d4d4d8' }}>Total cost: ${totalCost.toFixed(0)} • EV: ${expectedValue.toFixed(0)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>Current Holdings</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#a1a1aa', textAlign: 'left' }}>
                      <th style={thtd}>Card</th><th style={thtd}>Qty</th><th style={thtd}>Basis</th><th style={thtd}>Market</th><th style={thtd}>Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => (
                      <tr key={h.card}>
                        <td style={thtd}>{h.card}</td>
                        <td style={thtd}>{h.qty}</td>
                        <td style={thtd}>${h.basis}</td>
                        <td style={thtd}>${h.market}</td>
                        <td style={thtd}>{h.allocation}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'grading' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>Submission Tracker</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {submissions.map((s) => (
                  <div key={s.id} style={{ padding: 14, borderRadius: 16, background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.card}</div>
                        <div style={{ color: '#a1a1aa', marginTop: 4 }}>{s.service} • Sent {s.sentDate}</div>
                      </div>
                      <Pill>{s.stage}</Pill>
                    </div>
                    <div style={{ marginTop: 10, color: '#d4d4d8' }}>Declared value ${s.declaredValue} • Fee ${s.fee} • ETA {s.estimatedReturnDate}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>KPIs</h3>
              <p style={{ color: '#d4d4d8' }}>Grading inventory ties up cash, so batch size should match expected turn time and sell-through speed.</p>
            </div>
          </div>
        )}

        {activeTab === 'ebay' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>eBay connector</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <input value={ebayProxyUrl} onChange={(e) => setEbayProxyUrl(e.target.value)} placeholder="/api/ebay-search" style={inputStyle} />
                <input value={ebayQuery} onChange={(e) => setEbayQuery(e.target.value)} placeholder="pokemon japanese gengar psa 10" style={inputStyle} />
                <button onClick={refreshEbay} style={buttonStyle}>{ebayLoading ? 'Fetching…' : 'Fetch live eBay listings'}</button>
                <div style={{ padding: 14, borderRadius: 16, background: 'rgba(0,0,0,0.25)', color: '#d4d4d8' }}>
                  Status: {ebayStatus}{ebayError ? ` — ${ebayError}` : ''}
                </div>
              </div>
            </div>
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>Expected proxy response</h3>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#d4d4d8', fontSize: 12, background: 'rgba(0,0,0,0.25)', padding: 14, borderRadius: 16 }}>
{`{
  "ok": true,
  "items": [
    {
      "title": "Pokemon Japanese Gengar PSA 10",
      "price": 399,
      "shipping": 12,
      "url": "https://www.ebay.com/...",
      "condition": "Graded"
    }
  ]
}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'inline-block', padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: '#e4e4e7', fontSize: 12 }}>{children}</span>;
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }}>
      <div style={{ color: '#a1a1aa', fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 800, color: accent || '#fff' }}>{value}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  borderRadius: 14,
  padding: '12px 14px',
};

const buttonStyle: React.CSSProperties = {
  background: '#fff',
  color: '#000',
  border: 0,
  borderRadius: 14,
  padding: '12px 14px',
  fontWeight: 700,
  cursor: 'pointer',
};

const thtd: React.CSSProperties = {
  padding: '12px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
};
