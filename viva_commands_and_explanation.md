# Viva Presentation Guide & MongoDB Shell Commands

This document contains the exact MongoDB queries used across the application. During your 30-45 minute viva session, you can refer to or copy-paste these commands into the MongoDB shell (`mongosh`) or MongoDB Atlas Data Explorer.

---

## 1. Feature 1: Product Catalog & Full-Text Search

### Concept to Explain:
"In traditional relational databases, searching for text across multiple columns requires slow `LIKE '%query%'` operations that scan every row. In MongoDB, we created a single **Text Index** on multiple fields (`name`, `description`, `metal_type`, `gemstone`). This allows MongoDB to tokenize words and perform high-speed full-text search with ranking."

### Commands:

**1. Create the Text Index (already done during seeding):**
```javascript
db.products.createIndex({ 
  name: "text", 
  description: "text", 
  metal_type: "text", 
  gemstone: "text" 
})
```

**2. Search for any jewelry item containing "Diamond" or "Gold":**
```javascript
db.products.find(
  { $text: { $search: "Diamond Gold" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

**3. Filter products by category reference:**
```javascript
// Replace with any valid Category ObjectId
db.products.find({ 
  category_id: ObjectId("64f1a2b3c4d5e6f7a8b9c001") 
})
```

---

## 2. Feature 2: Customer Wishlist (Array Operations)

### Concept to Explain:
"Instead of creating a junction table with foreign keys like in SQL (e.g. `Customer_Wishlists`), we embedded an array of product ObjectIds directly inside each customer document. We use `$addToSet` to add items without duplicates and `$pull` to remove items atomically."

### Commands:

**1. Add a product to a customer's wishlist ($addToSet prevents duplicates):**
```javascript
db.customers.updateOne(
  { email: "sarah.j@example.com" },
  { $addToSet: { wishlist: ObjectId("REPLACE_WITH_PRODUCT_ID") } }
)
```

**2. Remove a product from a customer's wishlist ($pull):**
```javascript
db.customers.updateOne(
  { email: "sarah.j@example.com" },
  { $pull: { wishlist: ObjectId("REPLACE_WITH_PRODUCT_ID") } }
)
```

**3. Fetch all product documents currently in a customer's wishlist ($in operator):**
```javascript
// Step 1: Find the customer's wishlist array
var customer = db.customers.findOne({ email: "sarah.j@example.com" });

// Step 2: Query products whose _id is inside that array
db.products.find({ _id: { $in: customer.wishlist } })
```

---

## 3. Feature 3: Orders & Atomic Stock Reduction

### Concept to Explain:
"When an order is placed, we solve two critical business problems:
1. **The Price Snapshot Problem:** We embed the product name and purchase price inside the order document at that exact moment. If an admin increases product prices next month, historical receipts remain unchanged.
2. **Atomic Inventory Update:** We use MongoDB's `$inc` operator with a negative number to decrement stock safely without concurrency issues."

### Commands:

**1. Atomic Stock Decrement:**
```javascript
db.products.updateOne(
  { _id: ObjectId("REPLACE_WITH_PRODUCT_ID") },
  { $inc: { stock_quantity: -1 } }
)
```

**2. Insert an Order with embedded item snapshots:**
```javascript
db.orders.insertOne({
  customer_id: ObjectId("REPLACE_WITH_CUSTOMER_ID"),
  status: "Processing",
  items: [
    {
      product_id: ObjectId("REPLACE_WITH_PRODUCT_ID"),
      name: "18K Gold Solitaire Diamond Ring",
      quantity: 1,
      price_at_purchase: 1250.00
    }
  ],
  subtotal: 1250.00,
  tax: 100.00,
  total_price: 1350.00,
  order_date: new Date()
})
```

---

## 4. Feature 4: Product Reviews & Rating Aggregation

### Concept to Explain:
"Reviews are stored in a dedicated collection to prevent product documents from exceeding the 16MB document limit. Rather than saving a static average rating that requires constant manual updates, we run a real-time MongoDB Aggregation Pipeline using `$match` and `$group` with the `$avg` and `$sum` accumulator operators."

### Commands:

**1. Calculate average rating and total review count for a product:**
```javascript
db.reviews.aggregate([
  { 
    $match: { product_id: ObjectId("REPLACE_WITH_PRODUCT_ID") } 
  },
  {
    $group: {
      _id: "$product_id",
      avgRating: { $avg: "$rating" },
      reviewCount: { $sum: 1 }
    }
  }
])
```

**2. Insert a new customer review:**
```javascript
db.reviews.insertOne({
  product_id: ObjectId("REPLACE_WITH_PRODUCT_ID"),
  customer_id: ObjectId("REPLACE_WITH_CUSTOMER_ID"),
  customer_name: "Sarah Jenkins",
  rating: 5,
  comment: "Exceptional diamond clarity and prompt shipping.",
  review_date: new Date()
})
```

---

## 5. Feature 5: Admin Analytics & Category Summary

### Concept to Explain:
"In the admin panel, we provide business intelligence without relational tables. We run a multi-stage aggregation pipeline:
1. `$group` products by their `category_id`, calculating total product varieties, average price, and total stock.
2. `$lookup` performs a left outer join to the `categories` collection to retrieve the human-readable category name.
3. `$unwind` flattens the joined array so it can be cleanly displayed in a dashboard table."

### Commands:

**Execute Category Inventory Aggregation:**
```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$category_id",
      totalProducts: { $sum: 1 },
      avgPrice: { $avg: "$price" },
      totalStock: { $sum: "$stock_quantity" }
    }
  },
  {
    $lookup: {
      from: "categories",
      localField: "_id",
      foreignField: "_id",
      as: "categoryInfo"
    }
  },
  {
    $unwind: "$categoryInfo"
  },
  {
    $sort: { "categoryInfo.display_order": 1 }
  }
])
```

---

## 6. Feature 6: Store Revenue & Order Volume Analytics

### Concept to Explain:
"In Decision Analytics, multi-metric financial reporting is a core requirement. We run an aggregation pipeline on the `orders` collection to compute total revenue, order count, and average order value (AOV) grouped by order status."

### Commands:

**Calculate Store Revenue & Average Order Value:**
```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$status",
      totalRevenue: { $sum: "$total_price" },
      orderCount: { $sum: 1 },
      averageOrderValue: { $avg: "$total_price" }
    }
  },
  {
    $sort: { totalRevenue: -1 }
  }
])
```

---

## 7. Feature 7: Administrative CRUD & Integrity Operations

### Concept to Explain:
"MongoDB does not enforce foreign keys or cascading deletes automatically. In our application, we handle referential integrity in application logic:
1. **Referential Integrity Check:** Before deleting a category, we count active products referencing its `_id` (`countDocuments`). If products exist, deletion is blocked.
2. **Cascade Cleanups:** When an admin removes a jewelry piece, we execute `deleteOne()` on products, `$pull` the ID from all customer wishlists, and `deleteMany()` on orphaned reviews."

### Commands:

**1. Update Product Price and Stock Quantity ($set):**
```javascript
db.products.updateOne(
  { _id: ObjectId("REPLACE_WITH_PRODUCT_ID") },
  { $set: { price: 1295.00, stock_quantity: 15 } }
)
```

**2. Cascade Clean-up: Pull deleted product from all customer wishlists ($pull):**
```javascript
db.customers.updateMany(
  {},
  { $pull: { wishlist: ObjectId("REPLACE_WITH_PRODUCT_ID") } }
)
```

**3. Cascade Clean-up: Delete all associated product reviews (deleteMany):**
```javascript
db.reviews.deleteMany({ product_id: ObjectId("REPLACE_WITH_PRODUCT_ID") })
```

**4. Update Order Fulfillment Status ($set):**
```javascript
db.orders.updateOne(
  { _id: ObjectId("REPLACE_WITH_ORDER_ID") },
  { $set: { status: "Shipped" } }
)
```

---

## Quick Viva FAQ Cheatsheet

**Q: Why choose MongoDB over MySQL or PostgreSQL for this jewelry store?**
* **A:** Jewelry products have non-uniform attributes (rings have finger sizes, necklaces have chain lengths, earrings have backing types). In SQL, this requires complex EAV (Entity-Attribute-Value) tables or many nullable columns. In MongoDB, our polymorphic document schema accommodates varying specifications naturally without schema migrations.

**Q: Why didn't you embed reviews inside the product document?**
* **A:** While embedding reviews is possible, popular products might accumulate thousands of reviews over time. This would bloat the product document, risk hitting MongoDB's 16MB document size limit, and unnecessarily slow down catalog browsing. Referencing reviews in a dedicated collection keeps catalog queries lightweight.

**Q: Why did you embed wishlist items inside the customer document?**
* **A:** A typical customer's wishlist rarely exceeds a few dozen items. Storing an array of Product ObjectIds inside the customer document enables fast single-document reads without joining tables.

**Q: How do you prevent stock from going below zero during concurrent checkouts?**
* **A:** We include a condition on the update query `{ stock_quantity: { $gte: cartItem.quantity } }` alongside the atomic decrement `{ $inc: { stock_quantity: -cartItem.quantity } }`. If two customers attempt to purchase the last piece simultaneously, MongoDB's atomic write lock ensures only one update succeeds, while the second receives `modifiedCount === 0` and is cleanly rejected.

