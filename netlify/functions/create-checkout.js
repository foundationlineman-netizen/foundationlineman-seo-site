const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = {
  'film-session':        { name: 'Film Session',        amount: 2000  },
  'solo-1':             { name: '1 Solo Session',       amount: 4000  },
  'group-1':            { name: '1 Group Session',      amount: 2500  },
  'solo-5':             { name: '5 Solo Sessions',      amount: 18000 },
  'group-5':            { name: '5 Group Sessions',     amount: 11000 },
  'solo-8':             { name: '8 Solo Sessions',      amount: 29000 },
  'group-8':            { name: '8 Group Sessions',     amount: 18000 },
  'group-10':           { name: '10 Group Sessions',    amount: 22000 },
  'summer-solo':        { name: 'Summer Bundle (Solo)',  amount: 80000 },
  'summer-group':       { name: 'Summer Bundle (Group)', amount: 40000 },
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items, discountCode } = JSON.parse(event.body);

    const lineItems = items.map(({ id, quantity }) => {
      const product = PRODUCTS[id];
      if (!product) throw new Error(`Unknown product: ${id}`);
      return {
        price_data: {
          currency: 'usd',
          product_data: { name: product.name },
          unit_amount: product.amount,
        },
        quantity: quantity || 1,
      };
    });

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://foundationlineman.net/success.html',
      cancel_url: 'https://foundationlineman.net/services.html',
      billing_address_collection: 'auto',
    };

    if (discountCode) {
      const coupons = await stripe.coupons.list({ limit: 100 });
      const match = coupons.data.find(
        c => c.name && c.name.toUpperCase() === discountCode.toUpperCase() && c.valid
      );
      if (match) {
        sessionParams.discounts = [{ coupon: match.id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
