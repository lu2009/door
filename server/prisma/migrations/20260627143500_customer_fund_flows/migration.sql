-- CreateTable
CREATE TABLE "customer_fund_flows" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "database_name" VARCHAR(50) NOT NULL DEFAULT 'smartdoor',
    "client_id" INTEGER,
    "client_code" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(200),
    "payment_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "flow_type" VARCHAR(50) NOT NULL DEFAULT '预付款',
    "payment_date" DATE,
    "payment_method" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "customer_fund_flows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_fund_flows_database_name_client_code_idx" ON "customer_fund_flows"("database_name", "client_code");

-- CreateIndex
CREATE INDEX "customer_fund_flows_payment_id_idx" ON "customer_fund_flows"("payment_id");

-- AddForeignKey
ALTER TABLE "customer_fund_flows" ADD CONSTRAINT "customer_fund_flows_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing customer balances so historical prepaid balances can appear in statements.
INSERT INTO "customer_fund_flows" (
    "database_name",
    "client_id",
    "client_code",
    "customer_name",
    "amount",
    "flow_type",
    "payment_date",
    "payment_method",
    "notes",
    "updated_at"
)
SELECT
    "database_name",
    "client_id",
    "client_code",
    "customer_name",
    "prepaid_balance",
    '余额初始化',
    CURRENT_DATE,
    NULL,
    '历史未分配余额',
    CURRENT_TIMESTAMP
FROM "customer_balances"
WHERE COALESCE("prepaid_balance", 0) <> 0;
