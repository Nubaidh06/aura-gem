# Aura & Gem - Artisanal Fine Jewelry Platform

A modern e-commerce web application built for fine jewelry retail, powered by Node.js, Express, EJS, and MongoDB.

## Features
- **Polymorphic Product Catalog:** Multi-category jewelry listings (Rings, Necklaces, Bracelets, Earrings) with flexible embedded specifications (sizes, chain lengths, gemstone certificates).
- **Compound Full-Text Search:** Text index search across product names, descriptions, metals, and gemstones with relevance scoring.
- **Client Account & Wishlist:** Customer authentication using 10-round bcrypt password hashing, dynamic wishlist management with atomic `$addToSet` and `$pull` operators, and delivery address management.
- **Shopping Bag & Atomic Inventory:** Stock pre-validation, immutable price snapshotting during checkout, and concurrency-safe stock reduction using `$inc`.
- **Product Reviews & Aggregation:** Real-time star ratings and review counts calculated dynamically using MongoDB Aggregation Pipelines.
- **Administrator Dashboard:** Role-based management portal featuring category inventory intelligence, live order tracking, category management with referential integrity checks, and product CRUD operations with automated cascading cleanups.

## Technology Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Native MongoDB Node.js Driver v6.x)
- **Templating:** EJS (Embedded JavaScript)
- **Styling:** Vanilla CSS3
- **Security:** BcryptJS password hashing, express-session

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Community Server running on `localhost:27017`

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Nubaidh06/aura-gem.git
   cd aura-gem
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file or use the provided defaults:
   ```env
   PORT=3000
   MONGO_URI=mongodb://127.0.0.1:27017/jewelry_db
   ```

4. **Seed Database Collections:**
   ```bash
   node seed.js
   ```

5. **Start Application:**
   ```bash
   node app.js
   ```

6. **Open in Browser:**
   Visit `http://localhost:3000`
