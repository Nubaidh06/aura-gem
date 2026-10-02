# Corporate Data Solution: Fine Jewelry E-Commerce Platform

**Project Title:** Aura & Gem Fine Jewelers
**Subject:** Decision Analytics (Level 5)
**Document:** Technical Coursework Report
**Database:** MongoDB Atlas (Document Store NoSQL)
**Application Stack:** Node.js, Express, EJS, Native MongoDB Driver, BcryptJS

---

## Table of Contents

1. [Introduction and Business Problem](#1-introduction-and-business-problem)
2. [Characteristics of NoSQL and MongoDB](#2-characteristics-of-nosql-and-mongodb)
3. [Real-World Applications of Document Stores](#3-real-world-applications-of-document-stores)
4. [System Architecture and Data Modeling](#4-system-architecture-and-data-modeling)
5. [Technical Implementation and Database Queries](#5-technical-implementation-and-database-queries)
6. [Evaluation: Strengths and Limitations](#6-evaluation-strengths-and-limitations)
7. [Conclusion and Future Recommendations](#7-conclusion-and-future-recommendations)
8. [References](#8-references)

* [Appendix A: System Setup and Execution Guide](#appendix-a-system-setup-and-execution-guide)
* [Appendix B: User Interface Walkthrough](#appendix-b-user-interface-walkthrough)
* [Appendix C: MongoDB Shell & Query Reference Guide](#appendix-c-mongodb-shell--query-reference-guide)
* [Appendix D: MongoDB Compass Schema Verification & Visual Evidence](#appendix-d-mongodb-compass-schema-verification--visual-evidence)

---

## 1. Introduction and Business Problem

### 1.1 Business Scenario

Aura & Gem is an online fine jewelry boutique selling luxury handcrafted pieces across four main categories: rings, necklaces, bracelets, and earrings. Each category requires unique physical and gemological specifications:

* **Rings:** Finger sizes (e.g., 5 to 9), metal purity (18K Gold, Platinum), and diamond certifications (GIA).
* **Necklaces:** Adjustable chain lengths (e.g., 16-18 inches), gemstone dimensions, and setting styles.
* **Bracelets:** Wrist lengths, link structures, clasp types, and total carat weights.
* **Earrings:** Backing mechanisms (screw back, friction post) and drop profiles.

Customers require these specific details to make informed luxury purchases online.

### 1.2 Limitations of Relational Databases (SQL)

Traditional relational databases (such as MySQL or PostgreSQL) store data in fixed tabular structures. When applied to high-variety jewelry catalogs, SQL introduces two major problems:

1. **Empty (NULL) Columns:** Storing all jewelry in one table results in dozens of empty columns. For example, a necklace will have a blank `ring_size`. This wastes storage and creates messy tables.
2. **Slow Table Joins:** Alternatively, splitting attributes into multiple normalized tables (e.g., products, attributes, values) requires complex multi-table joins for every product page view. As traffic increases, these joins degrade read speeds.

Furthermore, SQL table-level or row-level locking during peak sales events creates bottlenecks when multiple customers update wishlists or place orders simultaneously.

The table below contrasts the limitations of a relational database against the architectural solutions provided by our MongoDB document model for the fine jewelry domain:

| Architectural Dimension | Traditional Relational (SQL) Design | Aura & Gem Document (MongoDB) Design | Operational & Business Benefit |
| :--- | :--- | :--- | :--- |
| **Product Specifications** | Single table with dozens of empty NULL columns, or complex EAV (Entity-Attribute-Value) pattern with multiple joined tables. | Single `products` collection where each piece embeds a flexible `attributes` sub-document containing only relevant properties. | Zero wasted storage; new jewelry categories can be introduced immediately without schema migrations. |
| **Customer Accounts & Address** | Separate normalized tables (`customers`, `addresses`) requiring join queries upon customer login. | Embedded `delivery_address` sub-document stored directly within the customer document. | Complete profile and shipping data loads in a single high-speed read operation upon sign-in. |
| **Customer Wishlist** | Relational junction table (`customer_wishlists`) requiring many-to-many joins across tables. | Embedded array of `ObjectId` references directly inside the customer document. | Atomic array operators (`$addToSet`, `$pull`) enable instant, join-free updates without table locks. |
| **Order Receipts & History** | Normalized schema joining `orders`, `order_items`, and `products` tables. | Embedded array of order item snapshots capturing price, title, and quantity at checkout time. | Guarantees immutable historical receipts even if catalog prices or titles change later. |
| **Role-Based Access Control** | Separate user roles and permissions tables requiring multi-table lookup queries. | Direct `role` attribute (`"admin"` vs `"customer"`) stored in document, evaluated by Express route guards. | Low-latency authorization separating customer shopping from administrative management controls. |

### 1.3 The Proposed NoSQL Solution

To overcome these limitations, Aura & Gem was built using **MongoDB**, a document-oriented NoSQL database. MongoDB stores each product as a self-contained BSON document, allowing varied attributes to sit naturally inside an embedded sub-document.

Built on Node.js and Express, the application delivers:

* **Flexible Catalog:** All jewelry categories coexist in one collection without empty columns.
* **Full-Text Search:** A compound text index enables fast multi-attribute product searches.
* **Embedded Wishlists:** Customers update their wishlist in real time using atomic array operators.
* **Secure Authentication:** User accounts use 10-round salted bcrypt hashing for safe credential storage.
* **Safe Order Processing:** Order documents store price snapshots at checkout, while stock decreases safely on the server using the atomic `$inc` operator.
* **Live Analytics:** MongoDB aggregation pipelines calculate live product review ratings and admin category inventory statistics.

---

## 2. Characteristics of NoSQL and MongoDB

### 2.1 The Four Families of NoSQL Databases

| NoSQL Family                                  | Data Model                      | Key Strengths                                        | Common Use Cases                                        |
| :-------------------------------------------- | :------------------------------ | :--------------------------------------------------- | :------------------------------------------------------ |
| **Document Store (e.g., MongoDB)**      | JSON/BSON documents             | Flexible schema, nested arrays/objects, rich queries | Product catalogs, customer profiles, content management |
| **Key-Value Store (e.g., Redis)**       | Key and value pairs             | Sub-millisecond read/write speeds                    | Session storage, caching, shopping carts                |
| **Wide-Column Store (e.g., Cassandra)** | Dynamic column families         | Massive write speeds across distributed nodes        | Sensor data, time-series logging                        |
| **Graph Database (e.g., Neo4j)**        | Nodes and edges (relationships) | Fast traversal of interconnected data                | Social networks, fraud detection                        |

**Why Document Stores Fit E-Commerce:** Retail items are naturally hierarchical. Products have nested specifications, customer accounts have delivery addresses and wishlists, and orders have lists of purchased items. Storing each complete record in a single document eliminates complex joins and matches how application code works.

### 2.2 The Document Model and BSON Format

MongoDB stores data as BSON (Binary JSON), extending normal JSON with native types:

* `ObjectId`: Globally unique 12-byte identifiers generated automatically for each document.
* `ISODate`: 64-bit integer storing millisecond timestamps for orders and reviews.
* `Number`: Supports integers and decimals for exact pricing and inventory calculations.

Because documents store data in objects and arrays, application code works directly with native data structures without object-relational mapping overhead.

### 2.3 Flexible and Dynamic Schemas

MongoDB collections do not enforce rigid table schemas:

* All products share standard fields like `name`, `price`, and `stock_quantity`.
* Category-specific properties sit inside an `attributes` sub-document (e.g., `sizes_available` for rings, `chain_length` for necklaces).
* New jewelry categories can be introduced immediately without running database migrations or taking the store offline.

### 2.4 Scalability: Horizontal vs. Vertical

* **Vertical Scaling (SQL):** Upgrading a single server with more CPU and RAM. This approach quickly reaches hardware limits and becomes expensive.
* **Horizontal Scaling (MongoDB):** MongoDB partitions data across multiple affordable server nodes (sharding) using a shard key. As traffic or catalog size expands, additional servers are added without code changes.

### 2.5 High Availability with Replica Sets

MongoDB uses **Replica Sets** (a primary node with secondary backups):

* All write operations are recorded on the primary node.
* Secondary nodes replicate data in real time.
* If the primary node fails, secondary nodes automatically elect a new primary within seconds, ensuring zero downtime.

### 2.6 Document-Level Locking

MongoDB uses the WiredTiger engine, which locks only the specific document being modified. Multiple shoppers can browse items, update wishlists, and complete purchases at the same time without locking other users out.

---

## 3. Real-World Applications of Document Stores

1. **E-Commerce Catalogs (e.g., eBay, OTTO):** Managing millions of products across diverse categories. Storing different specifications in documents provides fast browsing and simple catalog expansions.
2. **Customer Profiles:** Aggregating contact information, delivery addresses, and saved wishlists in one user document allows single-read retrieval upon login.
3. **Order Receipts and Price Snapshots:** Capturing item prices and names directly inside an order document at the moment of checkout guarantees that past receipts remain permanently accurate.
4. **Live Operational Analytics:** Calculating customer review scores and category inventory summaries directly from live data using built-in aggregation pipelines.

---

## 4. System Architecture and Data Modeling

### 4.1 Embedding vs. Referencing Decision Matrix

| Relationship | Design Pattern | Justification |
| :--- | :--- | :--- |
| **Category to Products** | Referencing (`category_id` in products) | One-to-Many. Embedding all products inside a category would risk hitting the 16MB document limit and make inventory updates difficult. |
| **Product to Specifications** | Embedding (`attributes` sub-document) | One-to-One. Artisan details (ring sizes, gold purity, chain length) are unique to the piece, always read together, and bounded in size. |
| **Customer to Address** | Embedding (`delivery_address` sub-document) | One-to-One. Shipping addresses are always read alongside the customer profile. Co-locating eliminates join overhead. |
| **Customer to Wishlist** | Embedding (Array of `ObjectId` references) | Finite One-to-Many. A personal wishlist rarely exceeds 50 items. Embedding IDs allows single-read loading and atomic updates via `$addToSet` and `$pull`. |
| **User Account & Roles** | Direct Attribute (`role` in customer document) | Determines Role-Based Access Control (`"admin"` vs `"customer"`) for instant server-side authorization without role-table joins. |
| **Product to Reviews** | Referencing (`product_id` in reviews collection) | Unbounded One-to-Many. Popular items can accumulate hundreds of reviews. Referencing prevents document bloat. |
| **Order to Order Items** | Embedding (Snapshot sub-documents in `orders.items`) | Business Rule. Order receipts must permanently preserve the purchase price, piece title, and quantity even if catalog prices change later. |

In summary, the schema adheres strictly to standard MongoDB design principles: data that is bounded in size, unique to a single parent entity, and accessed together is embedded. Data that is shared across multiple records, independent in lifecycle, or unbounded in potential growth is referenced.

### 4.2 Database Relationship Diagram

```
[ Categories ] (1) ──references── (*) [ Products ]
                                         │  (1)
                                    references
                                         │  (*)
                                    [ Reviews ]

[ Customers ] ──embeds──> { delivery_address, wishlist: [ObjectId] }
     │ (1)
references
     │ (*)
[ Orders ] ──embeds──> [ { product_id, name, price_at_purchase, quantity } ]
```

### 4.3 Database Collection Schemas

```json
// 1. categories
{
  "_id": "ObjectId('64f1a2b3c4d5e6f7a8b9c001')",
  "name": "Rings",
  "description": "Handcrafted engagement, wedding, and fashion rings.",
  "display_order": 1
}

// 2. products
{
  "_id": "ObjectId('64f1a2b3c4d5e6f7a8b9c002')",
  "name": "18K Gold Solitaire Diamond Ring",
  "category_id": "ObjectId('64f1a2b3c4d5e6f7a8b9c001')",
  "price": 1250.00,
  "metal_type": "Yellow Gold",
  "gemstone": "Diamond",
  "stock_quantity": 12,
  "image_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e",
  "attributes": { "sizes_available": [5, 6, 7, 8], "weight_grams": 3.8, "certification": "GIA" }
}

// 3. customers
{
  "_id": "ObjectId('64f1a2b3c4d5e6f7a8b9c003')",
  "name": "Sarah Jenkins",
  "email": "sarah.j@example.com",
  "password_hash": "$2a$10$7vM8j9K...hashed_password",
  "delivery_address": { "street": "742 Evergreen Terr", "city": "Springfield", "state": "OR", "zip": "97477" },
  "wishlist": [ "ObjectId('64f1a2b3c4d5e6f7a8b9c002')" ]
}

// 4. reviews
{
  "_id": "ObjectId('64f1a2b3c4d5e6f7a8b9c004')",
  "product_id": "ObjectId('64f1a2b3c4d5e6f7a8b9c002')",
  "customer_name": "Sarah Jenkins",
  "rating": 5,
  "comment": "Immaculate gold finish. She loved it!",
  "review_date": "ISODate('2024-02-18T14:20:00Z')"
}

// 5. orders
{
  "_id": "ObjectId('64f1a2b3c4d5e6f7a8b9c005')",
  "customer_id": "ObjectId('64f1a2b3c4d5e6f7a8b9c003')",
  "items": [ { "product_id": "ObjectId('64f1a2b3c4d5e6f7a8b9c002')", "name": "18K Gold Solitaire Ring", "quantity": 1, "price_at_purchase": 1250.00 } ],
  "subtotal": 1250.00,
  "tax": 100.00,
  "total_price": 1350.00,
  "status": "Completed"
}
```

---

## 5. Technical Implementation and Database Queries

### 5.1 Full-Text Product Search

A compound text index enables search across names, descriptions, metals, and gemstones:

```javascript
// Define index across product text attributes
await db.collection('products').createIndex({ 
  name: 'text', description: 'text', metal_type: 'text', gemstone: 'text' 
});

// Execute keyword search
const filter = req.query.search ? { $text: { $search: req.query.search } } : {};
const products = await db.collection('products').find(filter).toArray();
```

### 5.2 Customer Wishlist Management (Array Operators)

Instead of using join tables, customer wishlists update in-place using atomic array operators:

```javascript
// Add to wishlist ($addToSet prevents duplicates)
await db.collection('customers').updateOne(
  { _id: new ObjectId(customerId) },
  { $addToSet: { wishlist: new ObjectId(productId) } }
);

// Remove from wishlist ($pull removes matching ID)
await db.collection('customers').updateOne(
  { _id: new ObjectId(customerId) },
  { $pull: { wishlist: new ObjectId(productId) } }
);
```

### 5.3 Order Checkout and Atomic Stock Reduction

During checkout, the system verifies the user session, snapshots item prices, and decrements stock atomically using `$inc`:

```javascript
// 1. Session verification guard
const customerId = req.session.currentCustomerId;
if (!customerId) return res.redirect('/login');

// 2. Snapshot price and atomically decrease stock
for (const item of cart) {
  const product = await db.collection('products').findOne({ _id: new ObjectId(item.productId) });
  orderItems.push({ product_id: product._id, name: product.name, price_at_purchase: product.price, quantity: item.quantity });
  
  await db.collection('products').updateOne(
    { _id: product._id },
    { $inc: { stock_quantity: -item.quantity } }
  );
}

// 3. Insert complete order document
await db.collection('orders').insertOne({ customer_id: new ObjectId(customerId), items: orderItems, total_price: totalPrice, status: 'Completed', order_date: new Date() });
```

### 5.4 Customer Registration and Password Hashing

Passwords are salted and hashed using `bcrypt` (10 rounds) before insertion into MongoDB:

```javascript
// Registration: hash password and insert document
const password_hash = await bcrypt.hash(req.body.password, 10);
await db.collection('customers').insertOne({ name: req.body.name, email: req.body.email.toLowerCase(), password_hash, delivery_address: req.body.address, wishlist: [] });

// Login: find customer and verify hash
const customer = await db.collection('customers').findOne({ email: req.body.email.toLowerCase() });
if (customer && await bcrypt.compare(req.body.password, customer.password_hash)) {
  req.session.currentCustomerId = customer._id.toString();
}
```

### 5.5 Advanced Aggregation Pipelines (Analytics)

#### Pipeline 1: Live Product Star Rating

Calculates the average rating directly from the `reviews` collection:

```javascript
const ratingPipeline = [
  { $match: { product_id: new ObjectId(productId) } },
  { $group: { _id: '$product_id', avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
];
const result = await db.collection('reviews').aggregate(ratingPipeline).toArray();
```

#### Pipeline 2: Admin Category Inventory Intelligence

Groups products by category, joins category names, and calculates totals:

```javascript
const adminPipeline = [
  { $group: { _id: '$category_id', totalProducts: { $sum: 1 }, avgPrice: { $avg: '$price' }, totalStock: { $sum: '$stock_quantity' } } },
  { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
  { $unwind: '$category' },
  { $sort: { 'category.display_order': 1 } }
];
const categoryStats = await db.collection('products').aggregate(adminPipeline).toArray();
```

### 5.6 System Verification and Structured Test Cases

To verify system functionality, data consistency, and role-based access control, a structured test suite was executed against the running application and verified directly within MongoDB Compass. All 15 functional test cases succeeded with expected outputs:

| Test ID | Module | Test Scenario / Action | Expected Outcome | Actual Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T01** | Authentication | Admin sign-in via `/admin/login` | Redirects to `/admin` with Authenticated Administrator badge | Granted dashboard access; admin header visible | Pass |
| **T02** | Authentication | Customer sign-in via `/login` | Redirects to personal customer profile | Granted customer account access | Pass |
| **T03** | Access Control | Customer visits `/admin` directly | Access denied with HTTP 403 Forbidden page | 403 Forbidden page rendered | Pass |
| **T04** | Security (IDOR) | Customer A enters Customer B's profile URL | Redirects Customer A safely back to own profile | Safely redirected; profile data isolated | Pass |
| **T05** | Product Catalog | Search keyword (e.g. 'Emerald') | Returns matching pieces using compound text index | Matching pieces returned accurately | Pass |
| **T06** | Product Catalog | Category filter selection | Queries products by `category_id` reference | Filtered pieces displayed in catalog view | Pass |
| **T07** | Wishlist | Customer clicks 'Save to Wishlist' | Appends product ID using `$addToSet` without duplicates | Product saved to profile wishlist | Pass |
| **T08** | Wishlist | Customer clicks 'Remove' on account page | Pulls product ID from wishlist array using `$pull` | Item removed from wishlist | Pass |
| **T09** | Wishlist | Guest visitor views product page | Displays 'Sign In to Save to Wishlist' link | Link displayed; redirects to `/login` | Pass |
| **T10** | Inventory Control | Order quantity exceeds available stock | Halts checkout with alert; prevents negative stock | Checkout blocked; alert shown on cart | Pass |
| **T11** | Checkout | Customer places valid order | Atomic stock reduction via `$inc` and order document created | Stock decremented; order receipt created | Pass |
| **T12** | Admin Management | Admin adds new jewelry piece | Inserts new product document with dynamic attributes | Piece published to catalog immediately | Pass |
| **T13** | Admin Management | Admin deletes catalog listing | Permanently deletes product, pulls from wishlists, removes reviews | Product purged and references cleaned | Pass |
| **T14** | Data Integrity | Admin attempts deleting category with pieces | Blocks deletion; alerts that active pieces exist | Deletion blocked; alert displayed | Pass |
| **T15** | Analytics | Customer submits product review | Aggregation pipeline averages review ratings live | Live rating and review count displayed | Pass |

---

## 6. Evaluation: Strengths and Limitations

### 6.1 Strengths

* **Schema Flexibility:** New jewelry categories can be introduced immediately without altering database tables.
* **Fast Read Performance:** Embedding wishlists and addresses inside the customer document eliminates multi-table joins.
* **Atomic Safety:** The `$inc` operator safely updates inventory on the server, avoiding race conditions.
* **Built-in Analytics:** Aggregation pipelines generate real-time ratings and inventory metrics from live operational data.

### 6.2 Limitations, Trade-offs, and Critical Reflection

* **16MB Document Cap:** Handled by referencing reviews and orders instead of embedding them indefinitely.
* **Application-Enforced Referential Integrity:** Unlike relational database management systems that support native foreign key constraints and automated cascade deletes, MongoDB delegates referential integrity to the application layer. In Aura & Gem, data consistency (such as cascading the removal of deleted jewelry pieces from customer wishlists, preventing category deletion when pieces remain assigned, and preventing customer IDOR vulnerabilities) is explicitly enforced in Node.js service logic.
* **Trade-off of Denormalization (Price Snapshots):** Duplicating product names and prices inside order documents consumes slightly more storage, but guarantees permanent historical receipt accuracy even when catalog prices or piece titles change.
* **Index Memory Requirements:** Only necessary search and reference fields are indexed, keeping the RAM footprint low.
* **Local Database Environment vs. Cloud Latency:** Migrating from cloud-hosted MongoDB Atlas to local MongoDB Community connected via MongoDB Compass significantly enhanced system responsiveness by eliminating network round-trip latency and avoiding regional ISP connection blocking. Compass provided immediate visual verification of document schema structures, text indexes, and aggregation stages during testing.

---

## 7. Conclusion and Future Recommendations

The Aura & Gem platform demonstrates how document-oriented NoSQL databases solve the challenges of modern luxury e-commerce:

* Flexible BSON documents accommodate varied jewelry specifications without empty table columns.
* Strategic embedding ensures rapid reading for user profiles and carts while referencing prevents document bloat.
* Native operators (`$inc`, `$addToSet`) and aggregation pipelines deliver safe transactions and live business analytics.

**Future Recommendations:**

1. **Redis Caching:** Cache product catalog queries to lower database load during high-traffic promotional sales.
2. **Automated Backups:** Implement automated snapshot policies in MongoDB Atlas for point-in-time disaster recovery.
3. **CDN Integration:** Host jewelry images on a Content Delivery Network to speed up global page loads.

---

## 8. References

* Chodorow, K. (2013). *MongoDB: The Definitive Guide*. 2nd ed. Sebastopol: O'Reilly Media.
* Dayley, B. (2014). *NoSQL with MongoDB in 24 Hours*. Indianapolis: Sams Publishing.
* Fowler, M. and Sadalage, P. (2012). *NoSQL Distilled: A Brief Guide to Polyglot Persistence*. Upper Saddle River: Addison-Wesley.
* Harrison, G. (2015). *Next Generation Databases: NoSQL, NewSQL, and Big Data*. New York: Apress.
* MongoDB Documentation (2024). *Data Model Design: Embedded vs Referenced Documents*. Available at: https://www.mongodb.com/docs/manual/core/data-model-design/

---

## Appendix A: System Setup and Execution Guide

### Setup Commands

```bash
npm install     # 1. Install dependencies
node seed.js    # 2. Seed database collections, text indexes, and test accounts
node app.js     # 3. Start application at http://localhost:3000
```

### Pre-Configured Test Accounts

| Name                    | Email                   | Password        | Account Details                                |
| :---------------------- | :---------------------- | :-------------- | :--------------------------------------------- |
| **Sarah Jenkins** | `sarah.j@example.com` | `password123` | Existing wishlist items and order history.     |
| **Michael Chen**  | `m.chen@example.com`  | `password123` | Verified product reviews and shipping address. |

*Quick-Fill Feature:* On the `/login` page, clicking "Fill Sarah" or "Fill Michael" populates credentials instantly.

---

## Appendix B: User Interface Walkthrough

The following figures illustrate the primary user journeys and administrative workflows of the Aura & Gem web application:

* **Figure B.1: Fine Jewelry Boutique Catalog:** Browse luxury pieces by category tabs (Rings, Necklaces, Bracelets, Earrings) with live keyword search and sorting.
* **Figure B.2: Product Detail Page & Review Aggregation:** Dynamic view showing product specifications, inventory status, customer reviews, and aggregated average star ratings.
* **Figure B.3: Shopping Bag & Real-Time Checkout:** Order calculation with itemized line items, estimated tax, and server-side stock validation preventing inventory conflicts.
* **Figure B.4: Customer Account Dashboard:** Client portal displaying saved contact details, interactive address management, and persistent wishlist items.
* **Figure B.5: Administrator Operations Dashboard:** Management console featuring Category Inventory Intelligence statistics, live customer orders feed, and catalog management controls.

---

## Appendix C: MongoDB Shell & Query Reference Guide

The following queries represent the core database operations of the Aura & Gem fine jewelry platform. They can be executed directly within the interactive MongoDB shell (`mongosh`) or the embedded terminal within MongoDB Compass to verify and demonstrate system capabilities during the viva examination.

### C.1 Read Operations

| Operation Objective | Target Collection | MongoDB Shell Query | Operational Explanation |
| :--- | :--- | :--- | :--- |
| **Verify Active Collections** | Database Scope | `show collections` | Lists all five provisioned collections in `jewelry_db`. |
| **Full-Text Keyword Search** | `products` | `db.products.find({ $text: { $search: "Diamond Gold" } }, { score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } })` | Executes tokenized search against the compound text index, sorted by relevance score. |
| **Category Filter** | `products` | `db.products.find({ category_id: ObjectId("REPLACE_WITH_CAT_ID") })` | Filters items referencing a specific category identifier without joining tables. |
| **Secure Account Lookup** | `customers` | `db.customers.findOne({ email: "sarah.j@example.com" }, { password_hash: 0 })` | Retrieves customer profile while excluding the hashed password from the result projection. |
| **Batch Wishlist Retrieval** | `products` | `db.products.find({ _id: { $in: [ObjectId("..."), ObjectId("...")] } })` | Queries full product documents referenced in a customer's embedded wishlist array. |
| **Customer Order History** | `orders` | `db.orders.find({ customer_id: ObjectId("...") }).sort({ order_date: -1 })` | Retrieves chronological transactions placed by a specific patron. |
| **Low-Stock Inventory Alert** | `products` | `db.products.find({ stock_quantity: { $lte: 5 } }, { name: 1, stock_quantity: 1, price: 1 })` | Projective query identifying pieces at risk of inventory depletion. |

### C.2 Create, Update, and Delete Operations

| Operation Objective | Target Collection | MongoDB Shell / Driver Command | Operational Explanation |
| :--- | :--- | :--- | :--- |
| **Insert Product Listing** | `products` | `db.products.insertOne({ name: "Platinum Solitaire Band", category_id: ObjectId("..."), price: 1100.00, metal_type: "Platinum", gemstone: "Diamond", stock_quantity: 8, attributes: { sizes_available: [5, 6, 7], weight_grams: 3.5 }, created_at: new Date() })` | Inserts a new piece embedding unique ring sizes and weight specifications. |
| **Atomic Stock Decrement** | `products` | `db.products.updateOne({ _id: ObjectId("..."), stock_quantity: { $gte: 1 } }, { $inc: { stock_quantity: -1 } })` | Atomically reduces inventory by 1, enforcing concurrency safety against negative stock. |
| **Add to Wishlist** | `customers` | `db.customers.updateOne({ _id: ObjectId("...") }, { $addToSet: { wishlist: ObjectId("...") } })` | Appends product ID to embedded wishlist array only if not already present. |
| **Remove from Wishlist** | `customers` | `db.customers.updateOne({ _id: ObjectId("...") }, { $pull: { wishlist: ObjectId("...") } })` | Pulls matching product ID from the embedded wishlist array. |
| **Update Delivery Address** | `customers` | `db.customers.updateOne({ _id: ObjectId("...") }, { $set: { "delivery_address.street": "99 Regent St", "delivery_address.city": "London", phone: "+44 7700 900999" } })` | Modifies embedded address and contact attributes in place. |
| **Update Order Status** | `orders` | `db.orders.updateOne({ _id: ObjectId("...") }, { $set: { status: "Shipped" } })` | Updates order fulfillment progress without altering receipt snapshots. |
| **Referential Integrity Check** | `products` | `db.products.countDocuments({ category_id: ObjectId("...") })` | Counts dependent pieces prior to category deletion to prevent orphaned documents. |
| **Cascade Listing Removal** | Multi-Collection | `db.products.deleteOne({ _id: ObjectId("...") })`<br>`db.customers.updateMany({}, { $pull: { wishlist: ObjectId("...") } })`<br>`db.reviews.deleteMany({ product_id: ObjectId("...") })` | Purges product document and cascades cleanup across wishlists and reviews. |

### C.3 Advanced Decision Analytics Aggregation Pipelines

| Analytical Objective | Source Collection | Aggregation Pipeline Stages | Business Intelligence Value |
| :--- | :--- | :--- | :--- |
| **Dynamic Product Rating** | `reviews` | `db.reviews.aggregate([`<br>`  { $match: { product_id: ObjectId("...") } },`<br>`  { $group: { _id: "$product_id", avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }`<br>`])` | Generates live customer rating without storing denormalized static counters. |
| **Category Stock & Price Intelligence** | `products` | `db.products.aggregate([`<br>`  { $group: { _id: "$category_id", totalProducts: { $sum: 1 }, avgPrice: { $avg: "$price" }, totalStock: { $sum: "$stock_quantity" } } },`<br>`  { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },`<br>`  { $unwind: "$category" },`<br>`  { $sort: { "category.display_order": 1 } }`<br>`])` | Computes catalog breadth, inventory depth, and average price per category for executive decision-making. |
| **Order Feed with Customer Join** | `orders` | `db.orders.aggregate([`<br>`  { $sort: { order_date: -1 } },`<br>`  { $limit: 10 },`<br>`  { $lookup: { from: "customers", localField: "customer_id", foreignField: "_id", as: "customer" } },`<br>`  { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } }`<br>`])` | Joins live customer accounts to recent transactions for management fulfillment feeds. |
| **Sales Revenue Analytics by Status** | `orders` | `db.orders.aggregate([`<br>`  { $group: { _id: "$status", totalRevenue: { $sum: "$total_price" }, orderCount: { $sum: 1 }, avgOrderValue: { $avg: "$total_price" } } },`<br>`  { $sort: { totalRevenue: -1 } }`<br>`])` | Summarizes financial revenue, order volumes, and average basket sizes for corporate accounting. |

---

## Appendix D: MongoDB Compass Schema Verification & Visual Evidence

This appendix provides visual verification of the database architecture and collection states as inspected directly within MongoDB Compass connected to the local instance (`mongodb://127.0.0.1:27017/jewelry_db`).

### Figure D.1: MongoDB Compass Database Overview (jewelry_db)
> **[ Screenshot Placeholder: Compass Navigation Pane ]**  
> *Instructions: Insert a screen capture of the MongoDB Compass navigation sidebar showing the active connection to `localhost:27017` and the `jewelry_db` database with its five provisioned collections: `categories`, `customers`, `orders`, `products`, and `reviews`.*  
> **Caption:** *Figure D.1: MongoDB Compass overview verifying the five operational collections within the jewelry_db database.*

---

### Figure D.2: Polymorphic Document Structure (products Collection)
> **[ Screenshot Placeholder: Product Document with Embedded Attributes ]**  
> *Instructions: Insert a screen capture of an expanded product document in Compass (e.g. 18K Gold Solitaire Ring) displaying the embedded `attributes` subdocument containing `sizes_available`, `weight_grams`, and `certification`.*  
> **Caption:** *Figure D.2: Document from the products collection illustrating schema flexibility through embedded polymorphic attributes.*

---

### Figure D.3: Customer Document with Embedded Address & Wishlist References
> **[ Screenshot Placeholder: Customer Document View ]**  
> *Instructions: Insert a screen capture of a customer document (e.g. Sarah Jenkins) in Compass highlighting the embedded `delivery_address` subdocument and the `wishlist` array of `ObjectId` references.*  
> **Caption:** *Figure D.3: Customer account document demonstrating embedded address subdocuments and referenced product wishlist arrays.*

---

### Figure D.4: Historical Order Transaction with Price Snapshots
> **[ Screenshot Placeholder: Orders Document View ]**  
> *Instructions: Insert a screen capture of an order document in Compass showing the embedded `items` array with `price_at_purchase` and `quantity` fields.*  
> **Caption:** *Figure D.4: Transaction document from the orders collection demonstrating historical price locking against subsequent catalog price changes.*

---

### Figure D.5: Physical Compound Text Index
> **[ Screenshot Placeholder: Indexes Tab in Compass ]**  
> *Instructions: Insert a screen capture of the Indexes tab for the `products` collection in Compass, showing the compound text index configured across `name`, `description`, `metal_type`, and `gemstone`.*  
> **Caption:** *Figure D.5: MongoDB Compass Indexes tab confirming physical creation of the compound full-text search index.*

