export const runtime = 'nodejs';

const ENV = process.env.EBAY_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';

const TOKEN_URL =
  ENV === 'sandbox'
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token';

const BROWSE_URL =
  ENV === 'sandbox'
    ? 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'
    : 'https://api.ebay.com/buy/browse/v1/item_summary/search';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.accessToken;

  const clientId = required('EBAY_CLIENT_ID');
  const clientSecret = required('EBAY_CLIENT_SECRET');
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

type EbayItem = {
  title?: string;
  itemWebUrl?: string;
  price?: { value?: string };
  shippingOptions?: Array<{ shippingCost?: { value?: string } }>;
  condition?: string;
  buyingOptions?: string[];
  itemLocation?: { country?: string };
  image?: { imageUrl?: string };
};

function normalize(item: EbayItem) {
  return {
    title: item.title ?? 'Untitled eBay listing',
    url: item.itemWebUrl ?? '#',
    price: Number(item.price?.value ?? 0),
    shipping: Number(item.shippingOptions?.[0]?.shippingCost?.value ?? 0),
    condition: item.condition ?? 'Unknown',
    buyingOptions: item.buyingOptions ?? [],
    country: item.itemLocation?.country ?? 'Unknown',
    imageUrl: item.image?.imageUrl ?? '',
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || 'pokemon gengar psa 10';
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 12), 1), 50);
    const sort = searchParams.get('sort')?.trim() || 'newlyListed';
    const categoryIds = searchParams.get('category_ids')?.trim();
    const filter = searchParams.get('filter')?.trim();

    const token = await getAccessToken();
    const url = new URL(BROWSE_URL);
    url.searchParams.set('q', q);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('sort', sort);
    if (categoryIds) url.searchParams.set('category_ids', categoryIds);
    if (filter) url.searchParams.set('filter', filter);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return Response.json(
        { ok: false, error: 'Browse request failed', detail: await response.text() },
        { status: response.status },
      );
    }

    const data = (await response.json()) as { itemSummaries?: EbayItem[]; total?: number; next?: string };
    const items = (data.itemSummaries ?? []).map(normalize);
    return Response.json({ ok: true, query: q, total: data.total ?? items.length, items, next: data.next ?? null, environment: ENV });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
