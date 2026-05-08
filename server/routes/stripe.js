const express = require('express')
const Stripe = require('stripe')
const supabaseAdmin = require('../lib/supabaseAdmin')

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
const router = express.Router()

// Subscription plan
const SUBSCRIPTION = {
  id: 'monthly',
  type: 'subscription',
  coins: 50,
  label: '50 coins / month',
  displayPrice: '$9.99 / mo',
  priceId: process.env.STRIPE_PRICE_SUBSCRIPTION,
}

// GET /api/stripe/packages
router.get('/packages', (req, res) => {
  res.json({
    subscription: { id: SUBSCRIPTION.id, label: SUBSCRIPTION.label, displayPrice: SUBSCRIPTION.displayPrice },
  })
})

// POST /api/stripe/create-subscription
router.post('/create-subscription', async (req, res) => {
  const { userId, userEmail } = req.body
  if (!userId) return res.status(400).json({ error: 'Must be signed in to subscribe.' })
  if (!SUBSCRIPTION.priceId) return res.status(500).json({ error: 'Subscription not configured yet.' })

  try {
    // Re-use existing Stripe customer if one exists for this user
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    let customerId = existing?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        metadata: { userId },
      })
      customerId = customer.id
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: SUBSCRIPTION.priceId }],
      payment_behavior: 'default_incomplete',
      collection_method: 'charge_automatically',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId },
    })

    const invoice = subscription.latest_invoice
    let paymentIntent = invoice?.payment_intent

    // Fallback: retrieve invoice directly in case SDK version didn't inline it
    if (!paymentIntent?.client_secret && invoice?.id) {
      const freshInvoice = await stripe.invoices.retrieve(invoice.id, { expand: ['payment_intent'] })
      paymentIntent = freshInvoice.payment_intent
    }

    if (!paymentIntent?.client_secret) {
      console.error('Subscription created but no payment intent. sub:', subscription.id, 'inv:', invoice?.id)
      return res.status(500).json({ error: 'Subscription created but payment could not be initialised. Please try again.' })
    }
    res.json({ clientSecret: paymentIntent.client_secret, subscriptionId: subscription.id })
  } catch (err) {
    console.error('Subscription error:', err.message)
    res.status(500).json({ error: 'Failed to create subscription.' })
  }
})

// POST /api/stripe/webhook
async function webhookHandler(req, res) {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  switch (event.type) {
    // Subscription activated or renewed
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object
      const sub = await stripe.subscriptions.retrieve(invoice.subscription)
      const userId = sub.metadata?.userId
      if (!userId) break

      if (invoice.billing_reason === 'subscription_create') {
        // First payment — mark subscription active and credit initial coins
        await supabaseAdmin.from('user_subscriptions').upsert({
          user_id: userId,
          status: 'active',
          stripe_customer_id: sub.customer,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        await supabaseAdmin.rpc('increment_user_coins', { p_user_id: userId, p_amount: SUBSCRIPTION.coins })
        console.log(`Subscription activated: credited ${SUBSCRIPTION.coins} coins to user ${userId}`)
      } else if (invoice.billing_reason === 'subscription_cycle') {
        // Monthly renewal — credit coins
        await supabaseAdmin.rpc('increment_user_coins', { p_user_id: userId, p_amount: SUBSCRIPTION.coins })
        console.log(`Subscription renewal: credited ${SUBSCRIPTION.coins} coins to user ${userId}`)
      }
      break
    }

    // Subscription cancelled
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      if (!userId) break
      await supabaseAdmin.from('user_subscriptions')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      console.log(`Subscription cancelled for user ${userId}`)
      break
    }
  }

  res.json({ received: true })
}

module.exports = { router, webhookHandler }
