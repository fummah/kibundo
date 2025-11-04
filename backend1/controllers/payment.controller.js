// controllers/payment.controller.js
const db = require("../models");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Product = db.product;
const Subscription = db.subscription;
const Parent = db.parent;
const Coupon = db.coupon;
const Price = db.price;
const Invoice = db.invoice;

/**
 * Create Stripe Checkout Session for subscription
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { product_id, parent_id, coupon_code, frontend_url } = req.body;

    if (!product_id || !parent_id) {
      return res.status(400).json({ message: "Product ID and Parent ID are required" });
    }

    // Get product
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get parent
    const parent = await Parent.findByPk(parent_id);
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    // Check for existing active subscriptions - get all subscriptions for this parent first
    const allSubscriptions = await Subscription.findAll({
      where: { parent_id: parent_id }
    });
    
    console.log(`🔍 Checking subscriptions for parent ${parent_id}:`, allSubscriptions.map(s => ({
      id: s.id,
      plan_id: s.plan_id,
      status: s.status,
      stripe_subscription_id: s.stripe_subscription_id
    })));
    
    // Filter case-insensitively for active/trialing statuses
    const existingSubscriptions = allSubscriptions.filter(sub => {
      const status = String(sub.status || '').toLowerCase().trim();
      return status === 'active' || status === 'trialing';
    });

    if (existingSubscriptions.length > 0) {
      console.log("🚫 Blocking checkout: User has active subscription(s):", existingSubscriptions.map(s => ({
        id: s.id,
        plan_id: s.plan_id,
        status: s.status,
        stripe_subscription_id: s.stripe_subscription_id
      })));
      
      // Check if trying to subscribe to the same product
      const sameProduct = existingSubscriptions.find(sub => 
        String(sub.plan_id || '').trim() === String(product_id || '').trim()
      );

      if (sameProduct) {
        return res.status(400).json({ 
          message: "You already have an active subscription for this plan. Please use the upgrade feature to change your plan." 
        });
      }

      // If different product, suggest upgrade
      return res.status(400).json({ 
        message: "You already have an active subscription. Please use the upgrade feature to change your plan instead of creating a new subscription.",
        existing_subscription: existingSubscriptions[0].id,
        upgrade_available: true
      });
    }

    // Get or create Stripe price for this product
    let stripePriceId;
    
    // First, try to find existing price in our database
    const existingPrice = await Price.findOne({
      where: { product_id: product.id, active: true },
      order: [['created_at', 'DESC']]
    });

    if (existingPrice?.stripe_price_id) {
      stripePriceId = existingPrice.stripe_price_id;
      console.log("✅ Using existing Stripe Price:", stripePriceId);
    } else {
      // Create a new Stripe price if none exists
      const priceData = {
        unit_amount: Math.round(parseFloat(product.price) * 100), // Convert to cents
        currency: 'eur', // or product.currency || 'eur'
        product: product.stripe_product_id,
        recurring: {
          interval: product.metadata?.billing_interval || 'month', // week, month, year
        },
      };
      console.log("💰 Creating Stripe Price:", priceData);
      
      const stripePrice = await stripe.prices.create(priceData);
      
      console.log("✅ Stripe Price Created:");
      console.log("📦 Price Data:", {
        id: stripePrice.id,
        unit_amount: stripePrice.unit_amount,
        currency: stripePrice.currency,
        recurring: stripePrice.recurring,
        product: stripePrice.product,
      });

      // Save price to database
      await Price.create({
        stripe_price_id: stripePrice.id,
        product_id: product.id,
        unit_amount_cents: Math.round(parseFloat(product.price) * 100),
        currency: 'eur',
        interval: product.metadata?.billing_interval || 'month',
        active: true,
      });
      
      stripePriceId = stripePrice.id;
    }

    // Get coupon if provided
    let couponId = null;
    if (coupon_code) {
      const coupon = await Coupon.findOne({
        where: {
          name: coupon_code.toUpperCase(),
          valid: true,
        },
      });

      if (coupon?.stripe_coupon_id) {
        couponId = coupon.stripe_coupon_id;
        console.log("🎫 Using Stripe Coupon:", couponId);
      } else {
        console.log("⚠️ Coupon code provided but Stripe coupon ID not found:", coupon_code);
      }
    }

    // Build success and cancel URLs
    // Priority: 1) frontend_url from request, 2) FRONTEND_URL env, 3) detect from origin, 4) default
    let baseUrl = frontend_url || process.env.FRONTEND_URL;
    
    if (!baseUrl) {
      // Try to get from request origin (frontend making the request)
      const origin = req.get('origin') || req.get('referer');
      if (origin) {
        try {
          const url = new URL(origin);
          baseUrl = `${url.protocol}//${url.host}`;
        } catch {
          // Fallback to localhost with common React/Vite ports
          baseUrl = 'http://localhost:5173'; // Vite default
        }
      } else {
        // Last resort: use common frontend dev ports
        // Try to detect from common ports
        const host = req.get('host') || '';
        if (host.includes('3001')) {
          baseUrl = 'http://localhost:3001'; // Your backend port suggests frontend might be on 3001
        } else {
          baseUrl = 'http://localhost:5173'; // Vite default, or 3000 for Create React App
        }
      }
    }
    
    // Ensure no trailing slash and remove any path
    baseUrl = baseUrl.replace(/\/$/, '');
    try {
      const url = new URL(baseUrl);
      baseUrl = `${url.protocol}//${url.host}`; // Remove any path
    } catch {
      // If invalid URL, keep as is
    }
    
    const successUrl = `${baseUrl}/parent/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/parent/billing/subscription`;

    // Create Stripe Checkout Session
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: `parent_${parent_id}_product_${product_id}`,
      metadata: (() => {
        // Parse product metadata
        let meta = product.metadata;
        if (typeof meta === 'string') {
          try {
            meta = JSON.parse(meta);
          } catch (e) {
            meta = {};
          }
        }
        if (!meta || typeof meta !== 'object') {
          meta = {};
        }
        
        // Build metadata object with all product fields
        return {
          parent_id: parent_id.toString(),
          product_id: product_id.toString(),
          billing_interval: meta.billing_interval || null,
          child_count: meta.child_count?.toString() || null,
          sort_order: meta.sort_order?.toString() || null,
          is_best_value: meta.is_best_value ? 'true' : 'false',
          product_name: product.name || null,
          product_price: product.price?.toString() || null,
          trial_period_days: product.trial_period_days?.toString() || null,
        };
      })(),
      subscription_data: {
        metadata: (() => {
          // Parse product metadata
          let meta = product.metadata;
          if (typeof meta === 'string') {
            try {
              meta = JSON.parse(meta);
            } catch (e) {
              meta = {};
            }
          }
          if (!meta || typeof meta !== 'object') {
            meta = {};
          }
          
          // Build metadata object with all product fields
          return {
            parent_id: parent_id.toString(),
            product_id: product_id.toString(),
            billing_interval: meta.billing_interval || null,
            child_count: meta.child_count?.toString() || null,
            sort_order: meta.sort_order?.toString() || null,
            is_best_value: meta.is_best_value ? 'true' : 'false',
            product_name: product.name || null,
            product_price: product.price?.toString() || null,
            trial_period_days: product.trial_period_days?.toString() || null,
          };
        })(),
      },
    };

    // Add coupon if valid
    if (couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
    }

    // Add trial period if product has one
    if (product.trial_period_days > 0) {
      sessionParams.subscription_data.trial_period_days = product.trial_period_days;
      console.log("🎁 Adding trial period:", product.trial_period_days, "days");
    }

    console.log("📤 Creating Stripe Checkout Session with params:", {
      mode: sessionParams.mode,
      line_items_count: sessionParams.line_items.length,
      metadata: sessionParams.metadata,
      subscription_data: sessionParams.subscription_data,
      discounts: sessionParams.discounts ? "Yes" : "No",
      success_url: sessionParams.success_url,
      cancel_url: sessionParams.cancel_url,
    });

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    // Retrieve line items separately (they're not automatically expanded)
    let lineItemsData = [];
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product']
      });
      lineItemsData = lineItems.data.map(item => ({
        id: item.id,
        price_id: item.price?.id,
        product_id: item.price?.product?.id,
        product_name: item.price?.product?.name,
        amount: item.amount_total,
        currency: item.currency,
        quantity: item.quantity,
        description: item.description,
      }));
    } catch (lineItemsError) {
      console.warn("⚠️ Could not retrieve line items (this is normal for new sessions):", lineItemsError.message);
    }
    
    console.log("✅ Stripe Checkout Session Created:");
    console.log("📦 Session ID:", session.id);
    console.log("🔗 Checkout URL:", session.url);
    console.log("💰 Session Data:", JSON.stringify({
      id: session.id,
      mode: session.mode,
      payment_status: session.payment_status,
      subscription: session.subscription,
      customer: session.customer,
      metadata: session.metadata,
      client_reference_id: session.client_reference_id,
      line_items: lineItemsData,
      line_items_count: lineItemsData.length,
      success_url: session.success_url,
      cancel_url: session.cancel_url,
      created: new Date(session.created * 1000).toISOString(),
    }, null, 2));

    // Save checkout session data to database
    try {
      // Store full session data including line items
      const sessionDataToStore = {
        id: session.id,
        mode: session.mode,
        payment_status: session.payment_status,
        status: session.status,
        subscription: session.subscription,
        customer: session.customer,
        customer_email: session.customer_email,
        metadata: session.metadata,
        client_reference_id: session.client_reference_id,
        line_items: lineItemsData,
        payment_method_types: session.payment_method_types,
        currency: session.currency,
        amount_total: session.amount_total,
        amount_subtotal: session.amount_subtotal,
        total_details: session.total_details,
        subscription_data: session.subscription_data,
        success_url: session.success_url,
        cancel_url: session.cancel_url,
        created: new Date(session.created * 1000).toISOString(),
        url: session.url,
      };

      // Create or update subscription record with checkout session data
      // Use stripe_subscription_id field to store session ID for now (will be updated when subscription is created)
      // Or create a separate record to track the checkout session
      const existingPending = await Subscription.findOne({
        where: {
          parent_id: parent_id,
          plan_id: product_id.toString(),
          status: 'incomplete',
        },
        order: [['created_at', 'DESC']]
      });

      if (existingPending && !existingPending.stripe_subscription_id) {
        // Update existing incomplete subscription with session data
        await Subscription.update(
          {
            raw: sessionDataToStore,
            updated_at: new Date(),
          },
          {
            where: { id: existingPending.id },
          }
        );
        console.log(`✅ Updated pending subscription ${existingPending.id} with checkout session data`);
      } else {
        // Create new record to track checkout session
        await Subscription.create({
          parent_id: parent_id,
          plan_id: product_id.toString(),
          stripe_subscription_id: `session_${session.id}`, // Prefix to distinguish from real subscription IDs
          status: 'incomplete',
          raw: sessionDataToStore,
          created_by: 'checkout_session',
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`✅ Saved checkout session data to database for parent ${parent_id}, product ${product_id}`);
      }
    } catch (dbError) {
      // Log error but don't fail the request - session is already created in Stripe
      console.error("⚠️ Error saving checkout session to database:", dbError.message);
      console.error("Session ID:", session.id, "will still be available from Stripe");
    }

    // Return Stripe session details (from Stripe, not DB)
    res.status(200).json({
      sessionId: session.id,
      checkoutUrl: session.url,
      session: {
        id: session.id,
        mode: session.mode,
        payment_status: session.payment_status,
        status: session.status,
        customer: session.customer,
        customer_email: session.customer_email,
        subscription: session.subscription,
        metadata: session.metadata,
        client_reference_id: session.client_reference_id,
        line_items: lineItemsData,
        payment_method_types: session.payment_method_types,
        currency: session.currency,
        amount_total: session.amount_total,
        amount_subtotal: session.amount_subtotal,
        total_details: session.total_details,
        subscription_data: session.subscription_data,
        created: new Date(session.created * 1000).toISOString(),
      }
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      message: "Failed to create checkout session",
      error: error.message,
    });
  }
};

/**
 * Handle Stripe webhook events
 */
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET is not set in environment variables");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log(`🔔 Webhook received: ${event.type}`);
    console.log("📦 Webhook Event Data:", {
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode,
      data: {
        object_id: event.data?.object?.id,
        object_type: event.data?.object?.object,
        metadata: event.data?.object?.metadata,
      },
    });
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        console.log("📦 Processing checkout.session.completed");
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        console.log("📦 Processing customer.subscription.created");
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.updated':
        console.log("🔄 Processing customer.subscription.updated");
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        console.log("🗑️ Processing customer.subscription.deleted");
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        console.log("💰 Processing invoice.paid");
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        console.log("❌ Processing invoice.payment_failed");
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("❌ Error handling webhook:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(session) {
  try {
    console.log("🔔 Processing checkout.session.completed:", {
      sessionId: session.id,
      subscriptionId: session.subscription,
      metadata: session.metadata,
    });

    // Try to get metadata from session or subscription
    let parentId = parseInt(session.metadata?.parent_id);
    let productId = parseInt(session.metadata?.product_id);

    // If metadata is not in session, try to get from subscription
    if (!parentId || !productId) {
      if (session.subscription) {
        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
        parentId = parseInt(stripeSubscription.metadata?.parent_id || session.metadata?.parent_id);
        productId = parseInt(stripeSubscription.metadata?.product_id || session.metadata?.product_id);
      }
    }

    if (!parentId || !productId) {
      console.error("❌ Missing parent_id or product_id in session metadata:", {
        sessionMetadata: session.metadata,
        parentId,
        productId,
      });
      return;
    }

    // Get subscription from Stripe
    const subscriptionId = session.subscription;
    if (!subscriptionId) {
      console.error("❌ No subscription ID in checkout session");
      return;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    console.log("📦 Stripe Subscription Retrieved:");
    console.log("🆔 Subscription ID:", stripeSubscription.id);
    console.log("📊 Subscription Data:", JSON.stringify({
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      customer: stripeSubscription.customer,
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000).toISOString() : null,
      trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
      metadata: stripeSubscription.metadata,
      items: stripeSubscription.items?.data?.map(item => ({
        id: item.id,
        price_id: item.price.id,
        price_amount: item.price.unit_amount,
        currency: item.price.currency,
        quantity: item.quantity,
        product: item.price.product,
      })) || [],
      created: new Date(stripeSubscription.created * 1000).toISOString(),
    }, null, 2));

    // First, check if there's a pending checkout session record (with session_ prefix)
    const sessionPrefix = `session_${session.id}`;
    let existingSession = await Subscription.findOne({
      where: { stripe_subscription_id: sessionPrefix },
    });
    
    // Also try to find by parent_id and product_id if not found by session prefix
    if (!existingSession && parentId && productId) {
      existingSession = await Subscription.findOne({
        where: {
          parent_id: parentId,
          plan_id: productId.toString(),
          status: 'incomplete',
        },
        order: [['created_at', 'DESC']],
      });
      
      // If found, check if it has a session_ prefix or if we should update it
      if (existingSession && existingSession.stripe_subscription_id?.startsWith('session_')) {
        // This is the matching incomplete subscription
        console.log(`✅ Found incomplete subscription by parent_id and product_id: ${existingSession.id}`);
      } else if (existingSession) {
        // If it has a real subscription ID already, don't use it
        existingSession = null;
      }
    }

    // Also check for existing subscription with real subscription ID
    const existingSubscription = await Subscription.findOne({
      where: { stripe_subscription_id: subscriptionId },
    });

    // Normalize status to match database ENUM
    // CRITICAL: If payment is successful, always set to active or trialing (never incomplete)
    let normalizedStatus;
    
    if (session.payment_status === 'paid') {
      // Payment was successful - subscription must be active or trialing
      if (stripeSubscription.status === 'trialing' || stripeSubscription.trial_end) {
        normalizedStatus = 'trialing';
      } else {
        normalizedStatus = 'active';
      }
      console.log(`✅ Payment successful - forcing status to: ${normalizedStatus} (was: ${stripeSubscription.status})`);
    } else {
      // Payment not yet successful - use Stripe status
      normalizedStatus = stripeSubscription.status === 'trialing' ? 'trialing' :
                            stripeSubscription.status === 'active' ? 'active' :
                            stripeSubscription.status === 'past_due' ? 'past_due' :
                            stripeSubscription.status === 'canceled' ? 'canceled' :
                            stripeSubscription.status === 'incomplete' ? 'incomplete' :
                            stripeSubscription.status === 'incomplete_expired' ? 'incomplete_expired' :
                            stripeSubscription.status === 'unpaid' ? 'unpaid' : 'active';
    }
    
    // Double-check: If payment is paid but status is still incomplete, force to active
    if (session.payment_status === 'paid' && (normalizedStatus === 'incomplete' || normalizedStatus === 'incomplete_expired')) {
      normalizedStatus = stripeSubscription.status === 'trialing' ? 'trialing' : 'active';
      console.log(`⚠️ Payment successful but subscription status was incomplete, forcing to: ${normalizedStatus}`);
    }

    // Prepare raw data with both checkout session and subscription data
    // Include all metadata from Stripe subscription to preserve all product columns
    const rawData = {
      checkout_session: {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        customer: session.customer,
        customer_email: session.customer_email,
        metadata: session.metadata, // Contains all product metadata (billing_interval, child_count, etc.)
        subscription_data: session.subscription_data,
        created: new Date(session.created * 1000).toISOString(),
      },
      subscription: {
        ...stripeSubscription, // Full Stripe subscription object with all metadata
        metadata: stripeSubscription.metadata || session.metadata, // Preserve all metadata fields
      },
    };

    if (existingSession) {
      // Update the pending checkout session record with real subscription data
      await Subscription.update(
        {
          parent_id: parentId,
          plan_id: productId.toString(),
          stripe_subscription_id: subscriptionId, // Replace session_ prefix with real subscription ID
          status: normalizedStatus,
          current_period_end: new Date(stripeSubscription.current_period_end * 1000),
          raw: rawData, // Store both session and subscription data
          updated_at: new Date(),
        },
        {
          where: { id: existingSession.id },
        }
      );
      console.log(`✅ Updated checkout session record ${existingSession.id} with subscription data for parent ${parentId}, product ${productId}, status: ${normalizedStatus}`);
    } else if (existingSubscription) {
      // Update existing subscription (if it was created another way)
      await Subscription.update(
        {
          parent_id: parentId,
          plan_id: productId.toString(),
          status: normalizedStatus,
          current_period_end: new Date(stripeSubscription.current_period_end * 1000),
          raw: rawData, // Store both session and subscription data
          updated_at: new Date(),
        },
        {
          where: { stripe_subscription_id: subscriptionId },
        }
      );
      console.log(`✅ Subscription updated for parent ${parentId}, product ${productId}, status: ${normalizedStatus}`);
    } else {
      // Create new subscription (if no checkout session record exists)
      await Subscription.create({
        parent_id: parentId,
        stripe_subscription_id: subscriptionId,
        plan_id: productId.toString(),
        status: normalizedStatus,
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        raw: rawData, // Store both session and subscription data
        created_by: 'stripe_webhook',
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✅ Subscription created for parent ${parentId}, product ${productId}, status: ${normalizedStatus}`);
    }
  } catch (error) {
    console.error("❌ Error handling checkout completed:", error);
    console.error("Error stack:", error.stack);
    throw error; // Re-throw to let webhook handler know it failed
  }
}

/**
 * Handle subscription created/updated events
 */
async function handleSubscriptionUpdate(stripeSubscription) {
  try {
    console.log("🔄 Processing subscription update:", {
      subscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      metadata: stripeSubscription.metadata,
    });

    const parentId = parseInt(stripeSubscription.metadata?.parent_id);
    const productId = parseInt(stripeSubscription.metadata?.product_id);

    if (!parentId) {
      console.error("❌ Missing parent_id in subscription metadata");
      return;
    }

    // Normalize status to match database ENUM
    const normalizedStatus = stripeSubscription.status === 'trialing' ? 'trialing' :
                              stripeSubscription.status === 'active' ? 'active' :
                              stripeSubscription.status === 'past_due' ? 'past_due' :
                              stripeSubscription.status === 'canceled' ? 'canceled' :
                              stripeSubscription.status === 'incomplete' ? 'incomplete' :
                              stripeSubscription.status === 'incomplete_expired' ? 'incomplete_expired' :
                              stripeSubscription.status === 'unpaid' ? 'unpaid' : 'active';

    // Check if subscription exists
    const existing = await Subscription.findOne({
      where: { stripe_subscription_id: stripeSubscription.id },
    });

    if (existing) {
      // Update existing subscription
      await Subscription.update(
        {
          parent_id: parentId,
          plan_id: productId ? productId.toString() : existing.plan_id,
          status: normalizedStatus,
          current_period_end: new Date(stripeSubscription.current_period_end * 1000),
          raw: {
            subscription: stripeSubscription, // Full subscription object with all metadata
            metadata: stripeSubscription.metadata, // Explicitly preserve metadata
          },
          updated_at: new Date(),
        },
        {
          where: {
            stripe_subscription_id: stripeSubscription.id,
          },
        }
      );
      console.log(`✅ Subscription ${stripeSubscription.id} updated for parent ${parentId}, status: ${normalizedStatus}`);
    } else {
      // Create new subscription if it doesn't exist
      await Subscription.create({
        parent_id: parentId,
        stripe_subscription_id: stripeSubscription.id,
        plan_id: productId ? productId.toString() : null,
        status: normalizedStatus,
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        raw: {
          subscription: stripeSubscription, // Full subscription object with all metadata
          metadata: stripeSubscription.metadata, // Explicitly preserve metadata
        },
        created_by: 'stripe_webhook',
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✅ Subscription ${stripeSubscription.id} created for parent ${parentId}, status: ${normalizedStatus}`);
    }
  } catch (error) {
    console.error("❌ Error handling subscription update:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(stripeSubscription) {
  try {
    console.log("🗑️ Processing subscription deletion:", {
      subscriptionId: stripeSubscription.id,
    });

    await Subscription.update(
      {
        status: 'canceled',
        raw: stripeSubscription,
      },
      {
        where: {
          stripe_subscription_id: stripeSubscription.id,
        },
      }
    );

    console.log(`✅ Subscription ${stripeSubscription.id} marked as canceled`);
  } catch (error) {
    console.error("❌ Error handling subscription deletion:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Handle invoice.paid event
 */
async function handleInvoicePaid(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    const subscription = await Subscription.findOne({
      where: { stripe_subscription_id: subscriptionId },
    });

    if (!subscription) {
      console.error(`Subscription not found for invoice: ${subscriptionId}`);
      return;
    }

    // Create or update invoice in database
    await Invoice.upsert(
      {
        parent_id: subscription.parent_id,
        stripe_invoice_id: invoice.id,
        status: invoice.status === 'paid' ? 'Paid' : 'Open',
        total_cents: invoice.amount_paid || invoice.total,
        currency: invoice.currency || 'eur',
        lines: invoice.lines?.data || [],
        created_at: new Date(invoice.created * 1000),
      },
      {
        where: {
          stripe_invoice_id: invoice.id,
        },
      }
    );

    console.log(`✅ Invoice ${invoice.id} recorded for subscription ${subscriptionId}`);
  } catch (error) {
    console.error("Error handling invoice paid:", error);
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    const subscription = await Subscription.findOne({
      where: { stripe_subscription_id: subscriptionId },
    });

    if (!subscription) return;

    // Update invoice status
    await Invoice.update(
      {
        status: 'Failed',
      },
      {
        where: {
          stripe_invoice_id: invoice.id,
        },
      }
    );

    // Update subscription status if needed
    await Subscription.update(
      {
        status: 'past_due',
      },
      {
        where: {
          stripe_subscription_id: subscriptionId,
        },
      }
    );

    console.log(`⚠️ Invoice ${invoice.id} payment failed for subscription ${subscriptionId}`);
  } catch (error) {
    console.error("Error handling invoice payment failed:", error);
  }
}

/**
 * Get checkout session status
 */
exports.getCheckoutSession = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    // Retrieve full session details from Stripe (not DB)
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription', 'customer', 'line_items']
    });

    // If payment is successful and we have a subscription, sync it immediately
    if (session.payment_status === 'paid' && session.subscription) {
      try {
        const parentId = parseInt(session.metadata?.parent_id);
        const productId = parseInt(session.metadata?.product_id);
        
        if (parentId && productId) {
          // Find incomplete subscription by session prefix or parent/product
          const sessionPrefix = `session_${session.id}`;
          let subscription = await Subscription.findOne({
            where: { stripe_subscription_id: sessionPrefix },
          });
          
          if (!subscription) {
            subscription = await Subscription.findOne({
              where: {
                parent_id: parentId,
                plan_id: productId.toString(),
                status: 'incomplete',
              },
              order: [['created_at', 'DESC']],
            });
          }
          
          // If found and it's still incomplete, sync it now
          if (subscription && subscription.status === 'incomplete') {
            const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
            
            // CRITICAL: If payment is successful, always set to active or trialing (never incomplete)
            let normalizedStatus;
            if (session.payment_status === 'paid') {
              // Payment was successful - subscription must be active or trialing
              if (stripeSubscription.status === 'trialing' || stripeSubscription.trial_end) {
                normalizedStatus = 'trialing';
              } else {
                normalizedStatus = 'active';
              }
              console.log(`✅ Payment successful - forcing status to: ${normalizedStatus} (was: ${stripeSubscription.status})`);
            } else {
              // Payment not yet successful - use Stripe status
              normalizedStatus = stripeSubscription.status === 'trialing' ? 'trialing' :
                                  stripeSubscription.status === 'active' ? 'active' :
                                  stripeSubscription.status === 'past_due' ? 'past_due' :
                                  stripeSubscription.status === 'canceled' ? 'canceled' :
                                  stripeSubscription.status === 'incomplete' ? 'incomplete' :
                                  stripeSubscription.status === 'incomplete_expired' ? 'incomplete_expired' :
                                  stripeSubscription.status === 'unpaid' ? 'unpaid' : 'active';
            }
            
            // Double-check: If payment is paid but status is still incomplete, force to active
            if (session.payment_status === 'paid' && (normalizedStatus === 'incomplete' || normalizedStatus === 'incomplete_expired')) {
              normalizedStatus = stripeSubscription.status === 'trialing' ? 'trialing' : 'active';
              console.log(`⚠️ Payment successful but subscription status was incomplete, forcing to: ${normalizedStatus}`);
            }
            
            const rawData = subscription.raw || {};
            rawData.checkout_session = {
              id: session.id,
              payment_status: session.payment_status,
              status: session.status,
              customer: session.customer,
              customer_email: session.customer_email,
              metadata: session.metadata,
              created: new Date(session.created * 1000).toISOString(),
            };
            rawData.subscription = stripeSubscription;
            
            await Subscription.update(
              {
                stripe_subscription_id: session.subscription,
                status: normalizedStatus,
                current_period_end: new Date(stripeSubscription.current_period_end * 1000),
                raw: rawData,
                updated_at: new Date(),
              },
              {
                where: { id: subscription.id },
              }
            );
            
            console.log(`✅ Auto-synced subscription ${subscription.id} on checkout session verification, status: ${normalizedStatus}`);
          }
        }
      } catch (syncError) {
        // Log but don't fail - webhook will handle it
        console.warn("⚠️ Failed to auto-sync subscription on session verification:", syncError.message);
      }
    }

    // Get line items separately if not expanded
    let lineItemsData = [];
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session_id, {
        expand: ['data.price.product']
      });
      lineItemsData = lineItems.data.map(item => ({
        id: item.id,
        price_id: item.price?.id,
        product_id: item.price?.product?.id,
        product_name: item.price?.product?.name,
        amount: item.amount_total,
        currency: item.currency,
        quantity: item.quantity,
        description: item.description,
      }));
    } catch (lineItemsError) {
      console.warn("⚠️ Could not retrieve line items:", lineItemsError.message);
    }

    // Return full Stripe session details (from Stripe, not DB)
    res.status(200).json({
      sessionId: session.id,
      status: session.payment_status,
      subscriptionId: session.subscription,
      customer: session.customer,
      session: {
        id: session.id,
        mode: session.mode,
        payment_status: session.payment_status,
        status: session.status,
        customer: session.customer,
        customer_email: session.customer_email,
        subscription: session.subscription,
        metadata: session.metadata,
        client_reference_id: session.client_reference_id,
        line_items: lineItemsData,
        payment_method_types: session.payment_method_types,
        currency: session.currency,
        amount_total: session.amount_total,
        amount_subtotal: session.amount_subtotal,
        total_details: session.total_details,
        subscription_data: session.subscription_data,
        created: new Date(session.created * 1000).toISOString(),
      }
    });
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    res.status(500).json({
      message: "Failed to retrieve checkout session",
      error: error.message,
    });
  }
};

/**
 * Sync subscription status from Stripe (update DB with latest Stripe status)
 */
exports.syncSubscriptionFromStripe = async (req, res) => {
  try {
    let { subscription_id } = req.query;
    const { id } = req.params; // Database subscription ID

    // Find subscription in database
    let subscription = null;
    if (id) {
      subscription = await Subscription.findByPk(id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found in database" });
      }
      subscription_id = subscription.stripe_subscription_id;
    } else if (subscription_id) {
      subscription = await Subscription.findOne({
        where: { stripe_subscription_id: subscription_id },
      });
    } else {
      return res.status(400).json({ message: "Subscription ID or database ID is required" });
    }

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found in database" });
    }

    if (!subscription_id || !subscription_id.startsWith('sub_')) {
      return res.status(400).json({ message: "Invalid Stripe subscription ID. Subscription may not have been completed yet." });
    }

    // Retrieve latest subscription data from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription_id, {
      expand: ['customer', 'items.data.price.product', 'latest_invoice']
    });

    // Normalize status - if subscription exists and is not explicitly incomplete, prefer active
    // Check if there's a latest invoice that was paid
    let normalizedStatus;
    
    // If subscription has a latest invoice and it's paid, or subscription is active/trialing, use that
    if (stripeSubscription.latest_invoice) {
      const latestInvoice = typeof stripeSubscription.latest_invoice === 'string' 
        ? await stripe.invoices.retrieve(stripeSubscription.latest_invoice)
        : stripeSubscription.latest_invoice;
      
      // If invoice is paid, subscription should be active or trialing (never incomplete)
      if (latestInvoice.paid) {
        // Payment successful - force to active or trialing
        if (stripeSubscription.status === 'trialing' || stripeSubscription.trial_end) {
          normalizedStatus = 'trialing';
        } else {
          normalizedStatus = 'active';
        }
        console.log(`✅ Invoice paid - forcing status to: ${normalizedStatus} (Stripe status was: ${stripeSubscription.status})`);
      } else {
        normalizedStatus = stripeSubscription.status === 'trialing' ? 'trialing' :
                          stripeSubscription.status === 'active' ? 'active' :
                          stripeSubscription.status === 'past_due' ? 'past_due' :
                          stripeSubscription.status === 'canceled' ? 'canceled' :
                          stripeSubscription.status === 'incomplete' ? 'incomplete' :
                          stripeSubscription.status === 'incomplete_expired' ? 'incomplete_expired' :
                          stripeSubscription.status === 'unpaid' ? 'unpaid' : 'active';
      }
    } else {
      // No invoice yet - check subscription status directly
      // If subscription is incomplete but has items, it might be in transition - prefer active
      if (stripeSubscription.status === 'incomplete' && stripeSubscription.items?.data?.length > 0) {
        normalizedStatus = 'active';
        console.log(`✅ Subscription has items but status is incomplete - forcing to active`);
      } else {
        normalizedStatus = stripeSubscription.status === 'trialing' ? 'trialing' :
                          stripeSubscription.status === 'active' ? 'active' :
                          stripeSubscription.status === 'past_due' ? 'past_due' :
                          stripeSubscription.status === 'canceled' ? 'canceled' :
                          stripeSubscription.status === 'incomplete' ? 'incomplete' :
                          stripeSubscription.status === 'incomplete_expired' ? 'incomplete_expired' :
                          stripeSubscription.status === 'unpaid' ? 'unpaid' : 'active';
      }
    }

    // Update raw data - preserve all metadata
    const rawData = subscription.raw || {};
    rawData.subscription = stripeSubscription; // Full Stripe subscription object
    rawData.metadata = stripeSubscription.metadata || rawData.metadata; // Preserve all metadata fields

    // Update subscription in database
    await Subscription.update(
      {
        status: normalizedStatus,
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        raw: rawData,
        updated_at: new Date(),
      },
      {
        where: { id: subscription.id },
      }
    );

    console.log(`✅ Synced subscription ${subscription.id} from Stripe, status: ${normalizedStatus}`);

    res.status(200).json({
      message: "Subscription synced successfully",
      subscription: {
        id: subscription.id,
        status: normalizedStatus,
        stripe_subscription_id: subscription_id,
      }
    });
  } catch (error) {
    console.error("Error syncing subscription from Stripe:", error);
    res.status(500).json({
      message: "Failed to sync subscription from Stripe",
      error: error.message,
    });
  }
};

/**
 * Get subscription details from Stripe (not from DB)
 */
exports.getSubscriptionFromStripe = async (req, res) => {
  try {
    const { subscription_id } = req.query;

    if (!subscription_id) {
      return res.status(400).json({ message: "Subscription ID is required" });
    }

    // Retrieve subscription details directly from Stripe (not from DB)
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription_id, {
      expand: ['customer', 'items.data.price.product', 'latest_invoice']
    });

    console.log("📦 Retrieving Subscription from Stripe:");
    console.log("🆔 Subscription ID:", stripeSubscription.id);
    console.log("📊 Subscription Data:", JSON.stringify({
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      customer: stripeSubscription.customer,
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000).toISOString() : null,
      trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
      metadata: stripeSubscription.metadata,
      items: stripeSubscription.items?.data?.map(item => ({
        id: item.id,
        price_id: item.price.id,
        price_amount: item.price.unit_amount,
        currency: item.price.currency,
        quantity: item.quantity,
        product: item.price.product,
      })) || [],
      created: new Date(stripeSubscription.created * 1000).toISOString(),
    }, null, 2));

    // Return full Stripe subscription details (from Stripe, not DB)
    res.status(200).json({
      subscription: {
        id: stripeSubscription.id,
        object: stripeSubscription.object,
        status: stripeSubscription.status,
        customer: stripeSubscription.customer,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
        trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000).toISOString() : null,
        trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
        metadata: stripeSubscription.metadata,
        items: stripeSubscription.items?.data?.map(item => ({
          id: item.id,
          price: {
            id: item.price.id,
            unit_amount: item.price.unit_amount,
            currency: item.price.currency,
            recurring: item.price.recurring,
            product: item.price.product,
          },
          quantity: item.quantity,
        })) || [],
        currency: stripeSubscription.currency,
        latest_invoice: stripeSubscription.latest_invoice,
        created: new Date(stripeSubscription.created * 1000).toISOString(),
      }
    });
  } catch (error) {
    console.error("Error retrieving subscription from Stripe:", error);
    res.status(500).json({
      message: "Failed to retrieve subscription from Stripe",
      error: error.message,
    });
  }
};

/**
 * Upgrade subscription to a new product
 */
exports.upgradeSubscription = async (req, res) => {
  try {
    const { subscription_id, new_product_id, coupon_code } = req.body;

    if (!subscription_id || !new_product_id) {
      return res.status(400).json({ 
        message: "Subscription ID and New Product ID are required" 
      });
    }

    // Get existing subscription from database
    const existingSubscription = await Subscription.findByPk(subscription_id, {
      include: [
        {
          model: Product,
          as: 'product'
        }
      ]
    });

    if (!existingSubscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Check if subscription is active or trialing
    const status = String(existingSubscription.status || "").toLowerCase();
    if (status !== "active" && status !== "trialing") {
      return res.status(400).json({ 
        message: "Only active or trialing subscriptions can be upgraded" 
      });
    }

    // Get new product
    const newProduct = await Product.findByPk(new_product_id);
    if (!newProduct) {
      return res.status(404).json({ message: "New product not found" });
    }

    // Check if it's the same product
    if (String(existingSubscription.plan_id) === String(new_product_id)) {
      return res.status(400).json({ 
        message: "You already have a subscription for this product" 
      });
    }

    // Get Stripe subscription ID
    const stripeSubscriptionId = existingSubscription.stripe_subscription_id;
    if (!stripeSubscriptionId || !stripeSubscriptionId.startsWith('sub_')) {
      return res.status(400).json({ 
        message: "Invalid Stripe subscription ID" 
      });
    }

    // Retrieve Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items.data.price.product']
    });

    console.log("🔄 Upgrading subscription:", {
      subscription_id: subscription_id,
      stripe_subscription_id: stripeSubscriptionId,
      current_product: existingSubscription.plan_id,
      new_product: new_product_id
    });

    // Get or create Stripe price for new product
    let newStripePriceId;
    
    // First, try to find existing price in our database
    const existingPrice = await Price.findOne({
      where: { product_id: newProduct.id, active: true },
      order: [['created_at', 'DESC']]
    });

    if (existingPrice?.stripe_price_id) {
      newStripePriceId = existingPrice.stripe_price_id;
      console.log("✅ Using existing Stripe Price:", newStripePriceId);
    } else {
      // Parse product metadata
      let newProductMeta = newProduct.metadata;
      if (typeof newProductMeta === 'string') {
        try {
          newProductMeta = JSON.parse(newProductMeta);
        } catch (e) {
          newProductMeta = {};
        }
      }
      if (!newProductMeta || typeof newProductMeta !== 'object') {
        newProductMeta = {};
      }
      
      // Create a new Stripe price if none exists
      const priceData = {
        unit_amount: Math.round(parseFloat(newProduct.price) * 100),
        currency: 'eur',
        product: newProduct.stripe_product_id,
        recurring: {
          interval: newProductMeta.billing_interval || 'month',
        },
      };
      
      const stripePrice = await stripe.prices.create(priceData);
      newStripePriceId = stripePrice.id;
      console.log("✅ Created new Stripe Price:", newStripePriceId);

      // Save price to database
      await Price.create({
        product_id: newProduct.id,
        stripe_price_id: newStripePriceId,
        amount: newProduct.price,
        currency: 'eur',
        active: true,
        created_at: new Date(),
      });
    }

    // Get current subscription item
    const currentItem = stripeSubscription.items.data[0];
    if (!currentItem) {
      return res.status(400).json({ message: "No subscription items found" });
    }

    // Prepare metadata with all product fields for the upgraded subscription
    const upgradeMetadata = {
      parent_id: existingSubscription.parent_id.toString(),
      product_id: new_product_id.toString(),
      billing_interval: newProductMeta.billing_interval || null,
      child_count: newProductMeta.child_count?.toString() || null,
      sort_order: newProductMeta.sort_order?.toString() || null,
      is_best_value: newProductMeta.is_best_value ? 'true' : 'false',
      product_name: newProduct.name || null,
      product_price: newProduct.price?.toString() || null,
      trial_period_days: newProduct.trial_period_days?.toString() || null,
    };
    
    // Prepare update data
    const updateData = {
      items: [{
        id: currentItem.id,
        price: newStripePriceId,
      }],
      proration_behavior: 'always_invoice', // Charge prorated amount immediately
      metadata: upgradeMetadata, // Include all product metadata in the subscription
    };

    // Apply coupon if provided
    if (coupon_code) {
      const coupon = await Coupon.findOne({
        where: { name: coupon_code.toUpperCase(), valid: true }
      });
      
      if (coupon && coupon.stripe_coupon_id) {
        updateData.coupon = coupon.stripe_coupon_id;
        console.log("✅ Applying coupon:", coupon.stripe_coupon_id);
      }
    }

    // Update subscription in Stripe
    const updatedStripeSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      updateData
    );

    console.log("✅ Subscription upgraded in Stripe:", {
      subscription_id: updatedStripeSubscription.id,
      status: updatedStripeSubscription.status
    });

    // Update subscription in database
    const normalizedStatus = updatedStripeSubscription.status === 'trialing' ? 'trialing' :
                            updatedStripeSubscription.status === 'active' ? 'active' :
                            updatedStripeSubscription.status === 'past_due' ? 'past_due' :
                            updatedStripeSubscription.status === 'canceled' ? 'canceled' :
                            updatedStripeSubscription.status === 'incomplete' ? 'incomplete' :
                            updatedStripeSubscription.status === 'incomplete_expired' ? 'incomplete_expired' :
                            updatedStripeSubscription.status === 'unpaid' ? 'unpaid' : 'active';

    const rawData = existingSubscription.raw || {};
    rawData.subscription = updatedStripeSubscription; // Full subscription object with all metadata
    rawData.metadata = updatedStripeSubscription.metadata || rawData.metadata; // Preserve all metadata fields
    rawData.upgrade = {
      previous_product_id: existingSubscription.plan_id,
      new_product_id: new_product_id,
      upgraded_at: new Date().toISOString(),
    };

    await Subscription.update(
      {
        plan_id: new_product_id.toString(),
        status: normalizedStatus,
        current_period_end: new Date(updatedStripeSubscription.current_period_end * 1000),
        raw: rawData,
        updated_at: new Date(),
      },
      {
        where: { id: subscription_id },
      }
    );

    console.log("✅ Subscription upgraded in database");

    res.status(200).json({
      success: true,
      message: "Subscription upgraded successfully",
      subscription: {
        id: subscription_id,
        status: normalizedStatus,
        plan_id: new_product_id,
      }
    });

  } catch (error) {
    console.error("Error upgrading subscription:", error);
    res.status(500).json({
      message: "Failed to upgrade subscription",
      error: error.message,
    });
  }
};

