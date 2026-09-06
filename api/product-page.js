const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { STRAPI_URL, strapiFetch: strapi } = require('./_shared');

// דף שיתוף למוצר - /p/<id>. כשמשתפים מוצר בוואטסאפ / פייסבוק / טלגרם / X,
// הרובוט שלהם קורא את הדף הזה ומקבל og:title / og:description / og:image של
// המוצר עצמו (שם, תיאור והתמונה הראשית). גולש אמיתי מועבר מיד ל-products?product=<id>
// שפותח את חלון המוצר. מוצרי מוכרים (id >= 100000) נמשכים מ-Strapi (מאושרים
// בלבד); המוצרים הקבועים - מ-data/products.js.
const SITE = 'https://shop.gofreeil.com';
const ID_BASE = 100000;

function esc(v) {
	return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let fixedProducts = null;
function loadFixed() {
	if (fixedProducts) return fixedProducts;
	try {
		const src = fs.readFileSync(path.join(__dirname, '..', 'data', 'products.js'), 'utf8');
		const ctx = vm.runInNewContext(src + ';({ categories, products })', {}, { timeout: 1000 });
		fixedProducts = { categories: ctx.categories || [], products: ctx.products || [] };
	} catch {
		fixedProducts = { categories: [], products: [] };
	}
	return fixedProducts;
}

async function loadProduct(id) {
	if (id >= ID_BASE) {
		const url = `${STRAPI_URL}/api/shop-seller-products?filters[id][$eq]=${id - ID_BASE}&pagination[pageSize]=1`;
		const r = await strapi(url, { headers: { 'Content-Type': 'application/json' } });
		const row = r.ok ? r.json?.data?.[0] : null;
		if (!row) return null;
		const hasImage = /^data:image\//.test((Array.isArray(row.images) && row.images[0]) || row.image || '');
		return {
			name: row.name,
			desc: row.description || '',
			price: Number(row.price),
			store: row.store_name || row.seller_display || '',
			image: hasImage ? `${SITE}/img/${encodeURIComponent(row.documentId)}/0` : '',
			imageW: 1200, imageH: 900,
		};
	}
	const { products, categories } = loadFixed();
	const p = products.find(x => x.id === id);
	if (!p) return null;
	const cat = categories.find(c => c.id === p.category);
	return { name: p.name, desc: p.desc || (cat ? cat.name : ''), price: p.price, store: '', image: '', imageW: 0, imageH: 0 };
}

module.exports = async (req, res) => {
	const id = Number(String(req.query?.id || '').trim());
	if (!Number.isInteger(id) || id <= 0) return res.redirect(302, '/products');
	let p = null;
	try { p = await loadProduct(id); } catch { /* נופלים לדף הכללי */ }
	const target = `${SITE}/products?product=${id}`;
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
	if (!p) {
		return res.status(200).end(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>חנות החירות</title><meta http-equiv="refresh" content="0;url=${esc(target)}"><script>location.replace(${JSON.stringify(target)})</script></head><body><a href="${esc(target)}">למוצר</a></body></html>`);
	}
	const title = `${p.name} | חנות החירות`;
	const priceTxt = `₪${p.price}`;
	const desc = [priceTxt, p.store ? `מהחנות של ${p.store}` : '', String(p.desc || '').replace(/\s+/g, ' ').trim().slice(0, 200)].filter(Boolean).join(' · ');
	const image = p.image || `${SITE}/images/logo.png`;
	const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(target)}">
<link rel="icon" type="image/png" href="${SITE}/images/logo.png">
<meta property="og:type" content="product">
<meta property="og:site_name" content="חנות החירות">
<meta property="og:title" content="${esc(p.name)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
${p.image ? `<meta property="og:image:width" content="${p.imageW}">\n<meta property="og:image:height" content="${p.imageH}">` : '<meta property="og:image:width" content="1024">\n<meta property="og:image:height" content="1024">'}
<meta property="og:image:alt" content="${esc(p.name)}">
<meta property="og:url" content="${SITE}/p/${id}">
<meta property="og:locale" content="he_IL">
<meta property="product:price:amount" content="${p.price}">
<meta property="product:price:currency" content="ILS">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.name)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)})</script>
<style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#0c4a6e;background:#ecfeff}img{max-width:320px;border-radius:16px}</style>
</head>
<body>
${p.image ? `<img src="${esc(image)}" alt="${esc(p.name)}">` : ''}
<h1>${esc(p.name)}</h1>
<p>${esc(desc)}</p>
<p><a href="${esc(target)}">למוצר בחנות החירות</a></p>
</body>
</html>`;
	return res.status(200).end(html);
};
