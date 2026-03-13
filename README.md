# WHO Health Commodity Order Management System (HCOMS)

A comprehensive full-stack web application for managing health commodity orders across WHO African regional country offices, laboratory teams, and operations support & logistics (OSL) teams.


## 🌟 Key Features

### 🔐 Authentication & Security

- **WHO Email Validation**: Only @who.int email addresses are allowed
- **JWT-based Authentication**: Secure token-based authentication
- **Session Management**: Track active sessions across devices
- **Login Monitoring**: Track login attempts, detect suspicious activity
- **Account Lockout**: Auto-lock after 5 failed login attempts (15 min)
- **Password Security**: Bcrypt hashing with strength requirements
- **Password Reset**: Admin-initiated password reset with email notifications

### 👥 Role-Based Access Control

| Role | Capabilities |
|------|-------------|
| **Country Office** | Create orders, view own country's orders, browse catalog |
| **Laboratory Team** | Review all country orders, validate commodities, forward/reject |
| **OSL Team** | Approve orders, manage inventory, fulfill orders, create shipments, procurement |
| **Super Admin** | Full system access, user management, activity monitoring |

### 📋 Order Management

- **Order Workflow**: Submit → Lab Review → Forward to OSL → Approve → Fulfill → Ship
- **PATEO Integration**: Required payment authorization for all orders
- **Intervention Types**: Database-driven intervention type selection
- **Priority Levels**: Low, Medium, High urgency
- **Shipping Details**: Capture delivery contact, address, preferred shipping method
- **Status Tracking**: Real-time order status updates
- **Order Modifications**: Track all quantity changes with audit trail
- **Item Management**: Add/remove/modify items during review process

### 🏭 Multi-Warehouse Inventory

- **Dual Warehouse Support**: Nairobi (NBO) and Dakar (DKR) regional hubs
- **Stock per Warehouse**: Track inventory levels by location
- **Smart Auto-Fulfill**: Automatically fulfill from closest warehouse
- **Split Fulfillment**: Fulfill orders from multiple warehouses
- **Manual Fulfillment**: Select specific warehouse and quantity
- **Low Stock Alerts**: Automatic threshold warnings

### 📦 Shipment Management

- **Per-Warehouse Shipments**: Create separate shipments for each fulfilling warehouse
- **Delivery Period**: Estimated arrival date range (from/to)
- **Tracking Information**: Carrier, tracking number, shipping documents
- **Status Updates**: Pending → Shipped → In Transit → Delivered
- **Contact Details**: Pre-populate from order shipping information

### 🏢 OSL Operations Center
Complete operations management with four main sections:

#### 📊 Dashboard

- Procurement overview (POs, pending, in-transit, total value)
- Warehouse status (stock levels, product counts, low stock warnings)
- Low stock alerts with commodity and warehouse details
- 30-day movement summary (inbound/outbound/transfer/adjustment)

#### 📤 Outbound Management

- View all outgoing shipments
- Filter by status and warehouse
- Update shipment status
- Track deliveries

#### 📦 Inventory Management

- Record stock movements (Inbound, Outbound, Transfer, Adjustment, Return)
- Complete audit trail with performer and timestamp
- Transfer stock between warehouses
- Filter by warehouse and movement type

#### 🛒 Procurement Management

- **Supplier Management**: Add/manage suppliers with contact info, lead times
- **Purchase Orders**: Create POs with multiple line items
- **PO Workflow**: Draft → Submitted → Confirmed → Shipped → Received
- **Goods Receipt**: Mark items as received (partial or full)
- **Stock Updates**: Automatic inventory updates on receipt

### 📊 Dashboard Analytics
Role-specific dashboard with interactive charts:

- **Weekly Orders & Shipments Trend**: Line chart with configurable time range (4-24 weeks)
- **Orders by Status**: Pie chart showing status distribution
- **Orders by Priority**: Bar chart with color-coded priority levels
- **Top Commodities by Order Volume**: Bar chart showing most ordered items (role-filtered)
- **Top Countries by Order Volume**: Horizontal bar chart (hidden for Country Office)
- **OSL Turnaround Time**: Processing speed distribution with average calculation
- **Dashboard Filters**: Filter all charts by country, status, priority, warehouse, and date range

### 📥 Data Export

- **CSV Export**: Download filtered order data as CSV from the Orders view
- **All Roles**: Export available to Country Office, Lab Team, OSL Team, and Super Admin
- **Smart Filtering**: Exports respect all active search/filter criteria
- **Columns**: Order ID, Country, PATEO Ref, Priority, Status, Warehouse, Split, Items, Intervention Type, Created By, Lab Reviewed By, OSL Approved By, Created Date, Updated Date

### 💬 Order Messaging

- **In-Order Chat**: Real-time messaging within each order
- **Message Badges**: Unread message count indicators on orders
- **Cross-Role Communication**: All stakeholders can communicate on an order

### ⚙️ Super Admin Features

- **User Management**: Create, edit, activate/deactivate, delete users
- **Password Reset**: Reset user passwords with email notification
- **Profile Settings**: Update personal information, change password
- **Activity Logs**: Monitor all system activities
- **Login History**: View login attempts and security events
- **Order Deletion**: Clear orders by country/status/date or clear all orders
- **Warehouse Management**: Create and manage warehouse locations

### 🌍 Additional Features

- **54 African Countries**: Database-driven country list by region
- **Category Management**: Dynamic commodity categories
- **Commodity Details**: Storage requirements, shelf life, manufacturer info
- **Email Notifications**: Account creation, password reset, deletion, role changes, shipment, receipt confirmation
- **Order Receipt Validation**: Country Office confirms received quantities
- **Print with WHO Branding**: Print order details with WHO logo and watermark
- **Advanced Filtering**: Search, filter tabs, and advanced filters with multiple criteria
- **Pagination**: Configurable items per page (10/25/50/100) with smart navigation
- **Loading States**: Reusable loading indicators throughout the application

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite, CSS3 |
| **Backend** | Node.js 18+, Express 5 |
| **Database** | PostgreSQL 12+ (Azure compatible) |
| **Authentication** | JWT, bcrypt |
| **Email** | Nodemailer |
| **Security** | Helmet, CORS, rate limiting |

## 📁 Project Structure

```
hcoms-app/
├── public/
│   └── hcoms-logo.svg          # Application logo
├── server/                      # Backend API
│   ├── config/
│   │   └── database.js          # PostgreSQL connection
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── adminController.js   # Admin operations
│   │   ├── commodityController.js
│   │   ├── orderController.js
│   │   └── oslController.js     # OSL operations
│   ├── middleware/
│   │   └── auth.js              # JWT & role verification
│   ├── models/
│   │   ├── User.js
│   │   ├── Order.js
│   │   ├── Commodity.js
│   │   ├── Warehouse.js
│   │   ├── Country.js
│   │   ├── Supplier.js
│   │   ├── PurchaseOrder.js
│   │   ├── StockMovement.js
│   │   ├── LoginLog.js
│   │   └── Session.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── commodities.js
│   │   ├── orders.js
│   │   ├── countries.js
│   │   ├── chat.js
│   │   ├── warehouses.js
│   │   └── osl.js
│   ├── migrations/               # Database migrations
│   ├── services/
│   │   └── emailService.js      # Email notifications
│   ├── schema.sql               # Database schema
│   └── index.js                 # Server entry point
├── src/                         # Frontend React app
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── Header.jsx
│   │   ├── LoginScreen.jsx
│   │   ├── OrdersView.jsx
│   │   ├── CatalogView.jsx
│   │   ├── InventoryView.jsx
│   │   ├── AdminView.jsx
│   │   ├── OSLOperations.jsx
│   │   ├── ProfileSettings.jsx
│   │   ├── Loading.jsx
│   │   ├── StatCard.jsx
│   │   └── modals/
│   │       ├── NewOrderModal.jsx
│   │       ├── OrderDetailModal.jsx
│   │       ├── AddCommodityModal.jsx
│   │       └── ClearOrdersModal.jsx
│   ├── services/
│   │   └── api.js               # API client
│   ├── styles/                  # Component CSS
│   ├── constants/
│   ├── utils/
│   │   ├── helpers.js           # Formatting & display utilities
│   │   └── exportHelpers.js     # CSV export functionality
│   └── App.jsx
├── docs/
│   ├── HCOMS-Diagrams.html      # System documentation
│   └── diagrams/                # Mermaid diagram files
├── .env.example                 # Environment template
└── package.json
```

## 🚀 Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 12+ (local or Azure)
- npm or yarn
- SMTP server (optional, for email notifications)

### 1. Clone & Install Dependencies

```bash
cd hcoms-app
npm install
cd server && npm install && cd ..
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database Configuration (Azure PostgreSQL)
DB_HOST=your-server.postgres.database.azure.com
DB_PORT=5432
DB_NAME=hcoms_db
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=true

# JWT Configuration
JWT_SECRET=your-secure-random-string-at-least-32-chars
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# Allowed Email Domain
ALLOWED_EMAIL_DOMAIN=who.int

# Email Configuration (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
EMAIL_FROM=noreply@who.int
```

### 3. Setup Database

#### Option A: Auto-initialize (Recommended)
The server automatically creates tables on first run.

#### Option B: Manual Setup
```bash
psql -h your-server.postgres.database.azure.com -U your_username -d hcoms_db -f server/schema.sql
```

#### Option C: Run Migrations (Existing Database)
```bash
psql -h your-server -U your_username -d hcoms_db -f server/migrations/migration-osl-operations.sql
```

### 4. Start Development Server

```bash
npm run dev
```

This starts both:

- Backend API at http://localhost:5000
- Frontend at http://localhost:5173

### 5. Production Build

```bash
npm run build
npm start
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/change-password` | Change password |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get orders (role-filtered) |
| GET | `/api/orders/:id` | Get order details with items |
| POST | `/api/orders` | Create order |
| POST | `/api/orders/:id/forward` | Forward to OSL (Lab) |
| POST | `/api/orders/:id/reject` | Reject order |
| POST | `/api/orders/:id/approve` | Approve order (OSL) |
| POST | `/api/orders/:id/fulfill` | Fulfill order items |
| POST | `/api/orders/:id/smart-fulfill` | Auto-fulfill from closest warehouse |
| POST | `/api/orders/:id/split-fulfill` | Split fulfill from multiple warehouses |
| POST | `/api/orders/:id/shipments` | Create shipment |
| GET | `/api/orders/:id/modifications` | Get modification history |

### Commodities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/commodities` | Get all commodities (paginated) |
| POST | `/api/commodities` | Add commodity |
| PUT | `/api/commodities/:id` | Update commodity |
| PATCH | `/api/commodities/:id/stock` | Update stock |
| GET | `/api/commodities/categories` | Get categories |
| POST | `/api/commodities/categories` | Create category |

### Countries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/countries` | Get all countries |
| GET | `/api/countries/regions` | Get regions |

### Chat / Messaging
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/:orderId/messages` | Get messages for an order |
| POST | `/api/chat/:orderId/messages` | Send message on an order |
| POST | `/api/chat/message-counts` | Get unread counts (batch) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Get all users (paginated) |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| POST | `/api/admin/users/:id/reset-password` | Reset user password |
| GET | `/api/admin/activity-logs` | Get activity logs |
| PUT | `/api/admin/profile` | Update own profile |
| GET | `/api/admin/orders/preview-deletion` | Preview orders for deletion |
| POST | `/api/admin/orders/clear` | Delete orders by filters |

### Warehouses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warehouses` | Get all warehouses |
| POST | `/api/warehouses` | Create warehouse |
| PUT | `/api/warehouses/:id` | Update warehouse |
| PATCH | `/api/warehouses/:id/toggle` | Activate/deactivate warehouse |

### OSL Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/osl/dashboard` | Get dashboard statistics |
| GET | `/api/osl/suppliers` | Get suppliers |
| POST | `/api/osl/suppliers` | Create supplier |
| GET | `/api/osl/purchase-orders` | Get purchase orders |
| POST | `/api/osl/purchase-orders` | Create purchase order |
| PUT | `/api/osl/purchase-orders/:id/status` | Update PO status |
| POST | `/api/osl/purchase-orders/:id/receive` | Receive PO items |
| GET | `/api/osl/stock-movements` | Get stock movements |
| POST | `/api/osl/stock-movements` | Record stock movement |
| GET | `/api/osl/outbound` | Get outbound shipments |

## 👤 Test Accounts

Default password for all test accounts: `Password123`

| Email | Role | Country |
|-------|------|---------|
| admin.nigeria@who.int | Country Office | Nigeria |
| admin.kenya@who.int | Country Office | Kenya |
| admin.ghana@who.int | Country Office | Ghana |
| lab.reviewer@who.int | Laboratory Team | - |
| osl.admin@who.int | OSL Team | - |

**Note**: Create a Super Admin user by updating the role directly in the database:
```sql
UPDATE users SET role = 'Super Admin' WHERE email = 'your-email@who.int';
```

## 🔒 Security Features

1. **Email Domain Validation**: Only @who.int emails accepted
2. **Password Requirements**: Min 8 chars, uppercase, lowercase, number
3. **Account Lockout**: 5 failed attempts = 15 min lock
4. **JWT Tokens**: Secure, time-limited authentication
5. **Session Tracking**: Monitor active logins
6. **Login Logging**: Full audit trail of all attempts
7. **Role-Based Access**: Strict permission enforcement
8. **Activity Logging**: Track all system modifications
9. **SSL/TLS**: Required for database connections

## 📊 Database Schema

### Core Tables

- `users` - User accounts with roles and authentication
- `orders` - Order headers with status and workflow
- `order_items` - Order line items with fulfillment tracking
- `commodities` - Product catalog with details
- `categories` - Commodity categories
- `warehouses` - Regional warehouse locations
- `warehouse_inventory` - Stock levels per warehouse
- `countries` - 54 African countries by region

### Fulfillment & Shipping

- `order_item_fulfillments` - Per-warehouse fulfillment records
- `shipments` - Shipment headers with tracking
- `shipment_items` - Items in each shipment

### Procurement

- `suppliers` - Vendor master data
- `purchase_orders` - PO headers
- `purchase_order_items` - PO line items
- `stock_receipts` - Goods receipt records
- `stock_receipt_items` - Receipt line items
- `stock_movements` - Stock movement audit trail
- `stock_alerts` - Low stock and expiry alerts

### Communication & Feedback

- `order_messages` - In-order chat messages
- `order_feedback` - Order feedback records
- `packaging_checklists` - Packaging verification records

### Audit & Security

- `login_logs` - Login attempt history
- `sessions` - Active user sessions
- `activity_logs` - System activity audit
- `order_modification_logs` - Order change history

## 📖 Documentation

System documentation with diagrams is available at:

- `docs/HCOMS-Diagrams.html` - Interactive diagrams (open in browser)
- Database Model (ERD)
- Actor Activity Diagram
- Order Flow Diagram
- System Architecture Diagram

## 🤝 Contributing

This is an internal WHO application. For questions or issues, contact the HCOMS development team.

## 📄 License

Proprietary - WHO Internal Use Only

---

**HCOMS** - Health Commodity Order Management System  
World Health Organization - African Regional Office
