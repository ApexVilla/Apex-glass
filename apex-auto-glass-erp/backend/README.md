# Apex Glass ERP - PHP Backend

This is the PHP backend service for the Apex Glass ERP, designed to handle heavy data processing and reporting.

## Requirements
- PHP 8.2 or higher
- Composer
- PostgreSQL Database (Supabase)

## Setup

1. **Install Dependencies**
   ```bash
   composer install
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and fill in your database credentials:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```ini
   DB_HOST=db.project.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASS=your_password_here
   ```

3. **Run the Server**
   You can use the built-in PHP server for development:
   ```bash
   php -S localhost:8000 -t public
   ```

## API Endpoints

### Inventory Report
`GET /api/inventory/report`

**Parameters:**
- `companyId` (required): UUID of the company
- `startDate` (optional): YYYY-MM-DD (default: first day of current month)
- `endDate` (optional): YYYY-MM-DD (default: today)
- `movementType` (optional): Filter by type (e.g., 'saida_venda', 'entrada_compra')
- `productId` (optional): Filter by specific product UUID

**Example:**
```
http://localhost:8000/api/inventory/report?companyId=123&startDate=2023-01-01&endDate=2023-01-31
```
