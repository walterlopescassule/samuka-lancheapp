export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Garante o parsing correto do JSON independentemente de como a Vercel recebe o body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const items = body?.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio ou dados inválidos' });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Token do Mercado Pago não configurado na Vercel' });
    }

    // Comunicação com a API do Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items: items.map(item => ({
          title: String(item.title || 'Produto Samuka'),
          unit_price: Number(item.unit_price || 0),
          quantity: Number(item.quantity || 1),
          currency_id: 'BRL'
        })),
        back_urls: {
          success: `${req.headers.origin || 'https://' + req.headers.host}?status=success`,
          failure: `${req.headers.origin || 'https://' + req.headers.host}?status=failure`,
          pending: `${req.headers.origin || 'https://' + req.headers.host}?status=pending`
        },
        auto_return: 'approved'
      })
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro retornado pelo Mercado Pago:", data);
      return res.status(mpResponse.status).json({ error: data.message || 'Erro na API do Mercado Pago', details: data });
    }

    return res.status(200).json({ init_point: data.init_point });

  } catch (error) {
    console.error("Erro interno no servidor:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
