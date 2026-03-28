You are building a mock grocery purchasing feature for a Meals Planner MCP app. 
The feature simulates an AI agent that prepares a cart on a mock Carrefour website 
and completes the purchase only after explicit user confirmation.

---

## CONTEXT

This is a Next.js app with:
- Supabase for persistence (tables: users, meal_plans, meals)
- A weekly meal plan already generated and stored
- An existing MCP server architecture
- Claude (Anthropic API) as the LLM orchestrator

---

## WHAT YOU ARE BUILDING

### 1. Mock Carrefour Website (`/mock-carrefour`)

Create a standalone Next.js page that simulates a Carrefour grocery website. It must include:

- A header with the Carrefour logo (use a placeholder SVG with red/blue colors)
- A product catalogue of at least 20 items across categories:
  - Produce (fruit & vegetables)
  - Proteins (meat, fish, eggs)
  - Dairy
  - Pantry (pasta, rice, olive oil, canned goods)
- Each product has: name, price (€), unit (kg/piece/pack), category, image placeholder
- A cart sidebar showing: items, quantities, subtotal, total
- A "Confirm Purchase" button (green, prominent) that triggers the purchase flow
- A "Cancel" button that clears the cart
- The page must be reachable at `/mock-carrefour` and accept cart state via URL 
  params or localStorage

### 2. MCP Tool: `prepare_carrefour_cart`

Create a new MCP tool that:

Input:
{
  items: [
    { name: string, quantity: string, category: string }
  ],
  user_id: string
}

Logic:
- Match each item from the meal plan shopping list against the mock catalogue
  (fuzzy match by name/category is fine)
- Build a cart object with matched products, quantities, and prices
- Calculate subtotal and total (add a flat €3.99 delivery fee)
- Save the pending cart to Supabase table `grocery_orders` with status: "pending"
- Return a cart summary and a redirect URL to `/mock-carrefour?order_id=XXX`

Output:
{
  order_id: string,
  cart: [{ product_name, quantity, unit_price, line_total }],
  subtotal: number,
  delivery_fee: 3.99,
  total: number,
  carrefour_url: string,   // "/mock-carrefour?order_id=XXX"
  items_not_found: string[] // items that had no catalogue match
}

### 3. MCP Tool: `confirm_carrefour_purchase`

Create a second MCP tool that fires ONLY after explicit user confirmation:

Input:
{
  order_id: string,
  user_id: string
}

Logic:
- Retrieve the pending cart from Supabase by order_id
- Validate status is still "pending"
- Update the order status to "confirmed" in Supabase
- Generate a mock order confirmation with:
  - order_id
  - estimated delivery: next business day, 10:00–12:00 slot
  - items list
  - total charged

Output:
{
  order_id: string,
  status: "confirmed",
  estimated_delivery: string,
  total_charged: number,
  confirmation_message: string
}

### 4. Supabase Table: `grocery_orders`

Create this table:

grocery_orders:
  id              uuid primary key default gen_random_uuid()
  user_id         uuid references users(id)
  meal_plan_id    uuid references meal_plans(id)
  status          text  -- "pending" | "confirmed" | "cancelled"
  cart_items      jsonb -- array of { product_name, quantity, unit_price, line_total }
  subtotal        numeric
  delivery_fee    numeric default 3.99
  total           numeric
  created_at      timestamptz default now()
  confirmed_at    timestamptz

### 5. Chat Flow Integration

Wire the full flow into the existing chat interface:

Step 1 — User triggers purchase:
  User types: "Buy the groceries for this week"
  → LLM calls generate_shopping_list (existing tool)
  → LLM calls prepare_carrefour_cart (new tool)
  → LLM responds in chat:
    "I've prepared your cart on Carrefour. Here's a summary:
     • Chicken breast 500g — €4.20
     • Broccoli 2x — €1.80
     • [...]
     Total: €38.49 (incl. €3.99 delivery)
     👉 [Review your cart on Carrefour] (link to /mock-carrefour?order_id=XXX)
     Shall I confirm the purchase?"

Step 2 — User confirms:
  User types: "Yes, confirm" (or clicks a confirm button in the chat UI)
  → LLM calls confirm_carrefour_purchase
  → LLM responds:
    "✅ Order confirmed! Your groceries will be delivered tomorrow 
     between 10:00 and 12:00. Order ID: ORD-XXXX. Total charged: €38.49"
  → Supabase order status updated to "confirmed"

Step 3 — On the mock Carrefour page:
  → Page loads cart from Supabase by order_id
  → User can review items
  → "Confirm Purchase" button calls confirm_carrefour_purchase directly
  → Page shows order confirmation screen after purchase

### 6. UI Requirements for Mock Carrefour Page

- Must look like a real (but clearly mock) e-commerce page
- Add a visible banner: "🛒 DEMO MODE — This is a simulated Carrefour store"
- Cart items populated automatically from the order_id param
- "Confirm Purchase" button must show a loading state while the MCP tool runs
- After confirmation: show a full-screen success state with order details
- Use Carrefour brand colors: primary red #E63329, secondary blue #003D8F

### 7. Safety & UX Rules

- NEVER auto-confirm the purchase — always require explicit user action
- The confirm button must show the total before firing the tool
- Add a confirmation modal: "You are about to spend €XX.XX. Confirm?"
- The chat interface must not call confirm_carrefour_purchase unless the user 
  has explicitly said "yes", "confirm", "proceed", or clicked the confirm button
- If the user says "cancel" at any point, update order status to "cancelled" 
  in Supabase and clear the cart UI

---

## FILE STRUCTURE

/app
  /mock-carrefour
    page.tsx              ← mock storefront
    components/
      ProductCard.tsx
      CartSidebar.tsx
      ConfirmModal.tsx
      OrderSuccess.tsx
/mcp-server
  tools/
    prepare_carrefour_cart.ts
    confirm_carrefour_purchase.ts
  data/
    catalogue.ts          ← 20+ mock products with prices
/lib
  supabase/
    grocery_orders.ts     ← DB helpers for the new table

---

## MOCK CATALOGUE (seed data)

Include at least these items in catalogue.ts:

Produce: tomatoes, onions, garlic, broccoli, spinach, bananas, apples, lemons
Proteins: chicken breast, ground beef, salmon fillet, eggs (6-pack), canned tuna
Dairy: whole milk, Greek yogurt, mozzarella, butter, parmesan
Pantry: spaghetti, penne, basmati rice, olive oil, canned tomatoes, chickpeas, 
        oats, wholegrain bread

Each item: { id, name, category, price_eur, unit, stock: true }

---

## SUCCESS CRITERIA

The feature is complete when:
1. Chat flow works end-to-end: meal plan → shopping list → cart prepared → 
   user confirms → order confirmed
2. /mock-carrefour page loads the cart correctly from order_id
3. Supabase grocery_orders table is updated at each step
4. Purchase NEVER fires without explicit user confirmation
5. The demo banner is visible at all times on the mock storefront