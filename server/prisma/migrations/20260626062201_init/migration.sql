-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL DEFAULT '昊艺门窗',
    "company_name" VARCHAR(100) NOT NULL DEFAULT '昊艺门窗',
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "is_default_pw" INTEGER NOT NULL DEFAULT 1,
    "sync_enabled" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "login_date" DATE,
    "attempts_left" INTEGER NOT NULL DEFAULT 80,
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "trial_limit" INTEGER NOT NULL DEFAULT 80,
    "custom_direction_names" TEXT,
    "procedures_data" TEXT,
    "column_settings" TEXT,
    "mutil_user" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "client_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(200),
    "address" TEXT,
    "phone" VARCHAR(50),
    "contact_person" VARCHAR(100),
    "logistics_provider" VARCHAR(200),
    "logistics_phone" VARCHAR(50),
    "delivery_phone" VARCHAR(50),
    "household_registration" VARCHAR(200),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "client_id" INTEGER,
    "order_no" VARCHAR(100) NOT NULL,
    "customer_name" VARCHAR(200),
    "brand" VARCHAR(200),
    "order_date" DATE,
    "delivery_date" DATE,
    "status" VARCHAR(50) DEFAULT 'pending',
    "total_amount" DECIMAL(12,2) DEFAULT 0,
    "paid_amount" DECIMAL(12,2) DEFAULT 0,
    "unpaid_amount" DECIMAL(12,2) DEFAULT 0,
    "door_type" VARCHAR(50),
    "door_count" INTEGER DEFAULT 1,
    "door_specs" TEXT,
    "operator_name" VARCHAR(100) DEFAULT '',
    "salesperson" VARCHAR(100) DEFAULT '',
    "formula_data" TEXT,
    "notes" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "name" VARCHAR(100) NOT NULL,
    "order_index" INTEGER DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_records" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "order_id" INTEGER NOT NULL,
    "order_no" VARCHAR(100),
    "customer_name" VARCHAR(200),
    "procedure_name" VARCHAR(100) NOT NULL,
    "procedure_status" VARCHAR(50) DEFAULT 'pending',
    "completed_at" TIMESTAMP(3),
    "operator_name" VARCHAR(100),
    "notes" TEXT,

    CONSTRAINT "progress_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_orders" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "order_id" INTEGER,
    "order_no" VARCHAR(100),
    "customer_name" VARCHAR(200),
    "allocated_amount" DECIMAL(12,2) DEFAULT 0,
    "unpaid_amount" DECIMAL(12,2) DEFAULT 0,
    "order_adjust_total" DECIMAL(12,2) DEFAULT 0,
    "month_tag" VARCHAR(20),
    "status_text" VARCHAR(50),

    CONSTRAINT "finance_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "order_id" INTEGER,
    "finance_order_id" INTEGER,
    "amount" DECIMAL(12,2) DEFAULT 0,
    "payment_date" DATE,
    "payment_method" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_balances" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "client_id" INTEGER,
    "client_code" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(200),
    "prepaid_balance" DECIMAL(12,2) DEFAULT 0,
    "total_topup" DECIMAL(12,2) DEFAULT 0,
    "total_spent" DECIMAL(12,2) DEFAULT 0,

    CONSTRAINT "customer_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_adjustments" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "client_code" VARCHAR(50),
    "customer_name" VARCHAR(200),
    "adjust_amount" DECIMAL(12,2) NOT NULL,
    "adjust_type" VARCHAR(50) DEFAULT '人工调整',
    "notes" TEXT,

    CONSTRAINT "customer_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_adjustments" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "order_no" VARCHAR(100),
    "order_number" VARCHAR(100),
    "adjust_amount" DECIMAL(12,2) NOT NULL,
    "adjust_type" VARCHAR(50) DEFAULT '订单调整',
    "notes" TEXT,

    CONSTRAINT "order_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_formulas" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "material_size" VARCHAR(200) NOT NULL,
    "formula_id" VARCHAR(100) NOT NULL,
    "formula_type" VARCHAR(50) NOT NULL,
    "line_type" TEXT,
    "track_type" TEXT,
    "square" TEXT,
    "formula_data" TEXT,

    CONSTRAINT "material_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "add_prices" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "name" VARCHAR(200),
    "price" DECIMAL(12,2) DEFAULT 0,
    "unit" VARCHAR(50),
    "remark" TEXT,
    "lockway" VARCHAR(100),
    "direction" VARCHAR(50),

    CONSTRAINT "add_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "glass_holes" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "name" VARCHAR(200),
    "config" TEXT,

    CONSTRAINT "glass_holes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" VARCHAR(100) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "series" VARCHAR(100),
    "image_blob" BYTEA,
    "image_url" VARCHAR(500),

    CONSTRAINT "images_pkey" PRIMARY KEY ("id","database_name")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "name" VARCHAR(200),
    "template_type" VARCHAR(50),
    "content" TEXT,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scanners" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "name" VARCHAR(200),
    "scanner_type" VARCHAR(50),
    "config" TEXT,

    CONSTRAINT "scanners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlinks" (
    "id" VARCHAR(50) NOT NULL,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortlinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "update_info" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "message" TEXT,
    "version" VARCHAR(50),

    CONSTRAINT "update_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "ds" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'success',
    "ip" VARCHAR(50),
    "detail" TEXT,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "clients_brand_idx" ON "clients"("brand");

-- CreateIndex
CREATE INDEX "clients_contact_person_idx" ON "clients"("contact_person");

-- CreateIndex
CREATE UNIQUE INDEX "clients_database_name_client_code_key" ON "clients"("database_name", "client_code");

-- CreateIndex
CREATE INDEX "orders_customer_name_idx" ON "orders"("customer_name");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_database_name_order_no_key" ON "orders"("database_name", "order_no");

-- CreateIndex
CREATE UNIQUE INDEX "procedures_database_name_name_key" ON "procedures"("database_name", "name");

-- CreateIndex
CREATE INDEX "progress_records_order_no_idx" ON "progress_records"("order_no");

-- CreateIndex
CREATE INDEX "progress_records_procedure_name_idx" ON "progress_records"("procedure_name");

-- CreateIndex
CREATE UNIQUE INDEX "progress_records_database_name_order_id_procedure_name_key" ON "progress_records"("database_name", "order_id", "procedure_name");

-- CreateIndex
CREATE INDEX "finance_orders_customer_name_idx" ON "finance_orders"("customer_name");

-- CreateIndex
CREATE INDEX "finance_orders_unpaid_amount_idx" ON "finance_orders"("unpaid_amount");

-- CreateIndex
CREATE UNIQUE INDEX "finance_orders_database_name_order_no_key" ON "finance_orders"("database_name", "order_no");

-- CreateIndex
CREATE INDEX "payments_database_name_idx" ON "payments"("database_name");

-- CreateIndex
CREATE UNIQUE INDEX "customer_balances_database_name_client_code_key" ON "customer_balances"("database_name", "client_code");

-- CreateIndex
CREATE INDEX "customer_adjustments_database_name_idx" ON "customer_adjustments"("database_name");

-- CreateIndex
CREATE INDEX "order_adjustments_database_name_order_no_idx" ON "order_adjustments"("database_name", "order_no");

-- CreateIndex
CREATE INDEX "material_formulas_formula_id_idx" ON "material_formulas"("formula_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_formulas_database_name_formula_id_key" ON "material_formulas"("database_name", "formula_id");

-- CreateIndex
CREATE UNIQUE INDEX "glass_holes_database_name_name_key" ON "glass_holes"("database_name", "name");

-- CreateIndex
CREATE INDEX "images_database_name_idx" ON "images"("database_name");

-- CreateIndex
CREATE UNIQUE INDEX "templates_database_name_name_template_type_key" ON "templates"("database_name", "name", "template_type");

-- CreateIndex
CREATE UNIQUE INDEX "scanners_database_name_name_key" ON "scanners"("database_name", "name");

-- CreateIndex
CREATE INDEX "settings_key_idx" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "settings_database_name_key_key" ON "settings"("database_name", "key");

-- CreateIndex
CREATE INDEX "admin_audit_logs_username_idx" ON "admin_audit_logs"("username");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_ds_idx" ON "admin_audit_logs"("ds");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_orders" ADD CONSTRAINT "finance_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_finance_order_id_fkey" FOREIGN KEY ("finance_order_id") REFERENCES "finance_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_balances" ADD CONSTRAINT "customer_balances_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
