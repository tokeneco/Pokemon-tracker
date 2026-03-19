[README.md](https://github.com/user-attachments/files/26105652/README.md)
# Pokemon Card Investing Dashboard

Deployable Next.js app with:
- scanner and EV ranking
- CSV import preview
- portfolio view
- grading tracker
- eBay live connector through `/api/ebay-search`

## Local setup

1. Install dependencies

```bash
npm install
```

2. Create `.env.local`

```bash
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
EBAY_ENVIRONMENT=production
```

3. Run locally

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Deploy to Vercel

1. Upload this folder to GitHub
2. Import the repo into Vercel
3. Add the same environment variables in Vercel project settings
4. Deploy

The dashboard defaults to using `/api/ebay-search` as its live endpoint.
