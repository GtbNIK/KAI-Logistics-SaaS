-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'SALES', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PlanKey" AS ENUM ('BASE', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAGO_MOVIL', 'ZELLE', 'EFECTIVO_USD', 'TRANSFERENCIA', 'TRANSFERENCIA_INTERNACIONAL', 'BINANCE_USDT', 'OTRO');

-- CreateEnum
CREATE TYPE "UserRoleLegacy" AS ENUM ('ADMIN', 'SALES');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('DOOR_TO_DOOR', 'FCL_20', 'FCL_40', 'FCL_40HC', 'LCL', 'AIR', 'WAREHOUSE', 'CUSTOMS', 'OTHER');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "DeliveryNoteStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'AT_ORIGIN_WAREHOUSE', 'AT_ORIGIN_PORT', 'ON_VESSEL', 'AT_DESTINATION_PORT', 'CUSTOMS_CLEARANCE', 'ARRIVED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "RateRegion" AS ENUM ('CHINA', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ALARM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SWITCH_TENANT', 'ACTIVATE_TENANT', 'SUSPEND_TENANT', 'REGISTER_PAYMENT', 'EXTEND_TRIAL');

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" "PlanKey" NOT NULL,
    "name" TEXT NOT NULL,
    "priceUsd" DECIMAL(10,2) NOT NULL,
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxDocumentsMonth" INTEGER NOT NULL DEFAULT 200,
    "maxShipmentsActive" INTEGER NOT NULL DEFAULT 80,
    "whiteLabelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "multiCurrencyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rif" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "planId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "position" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedByUserId" TEXT,
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextPaymentDueAt" TIMESTAMP(3),
    "previousPlanId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amountUsd" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Mi Empresa',
    "rif" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1E40AF',
    "secondaryColor" TEXT NOT NULL DEFAULT '#F59E0B',
    "headerText" TEXT,
    "footerText" TEXT,
    "quoteBgUrl" TEXT,
    "noticeBgUrl" TEXT,
    "deliveryNoteBgUrl" TEXT,
    "receiptBgUrl" TEXT,
    "rateBgUrl" TEXT,
    "paymentInfo" TEXT DEFAULT 'Banco Ejemplo
Cuenta: 0102-0000-00-0000000000
Titular: Razon Social Ejemplo C.A.
RIF: J-00000000-0',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "superAdminId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Port" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Port_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "D2DItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "D2DItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SvcProvider" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SvcProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rifOrId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "referencePoint" TEXT NOT NULL,
    "clientDetails" TEXT,
    "deactivationNote" TEXT,
    "creditBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ally" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rifOrId" TEXT,
    "contactInfo" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ally_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "allyId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "zoneId" TEXT,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "salePrice" DECIMAL(10,2) NOT NULL,
    "originPort" TEXT,
    "destinationPort" TEXT,
    "shippingLine" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "region" "RateRegion" NOT NULL DEFAULT 'CHINA',
    "allyId" TEXT NOT NULL,
    "countryId" TEXT,
    "originPortIds" TEXT[],
    "destinationPortIds" TEXT[],
    "cost20ft" DECIMAL(10,2) NOT NULL,
    "cost40ft" DECIMAL(10,2) NOT NULL,
    "bankFee" DECIMAL(10,2),
    "profitYaho" DECIMAL(10,2),
    "profitIS" DECIMAL(10,2),
    "sale20HC" DECIMAL(10,2) NOT NULL,
    "sale40HC" DECIMAL(10,2) NOT NULL,
    "shippingLineId" TEXT,
    "freeDays" INTEGER NOT NULL DEFAULT 21,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "showNotesToClient" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "allyId" TEXT,
    "zoneId" TEXT,
    "originPort" TEXT,
    "destinationPort" TEXT,
    "shippingLineId" TEXT,
    "airLineId" TEXT,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DeliveryNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "warehouseNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quoteId" TEXT,
    "deliveredTo" TEXT,
    "contactPhone" TEXT,
    "deliveryAddress" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryNoteItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryNoteId" TEXT NOT NULL,
    "d2dItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "weight" DECIMAL(10,2),
    "cbm" DECIMAL(10,3),

    CONSTRAINT "DeliveryNoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentNotice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteId" TEXT,
    "clientId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentNoticeItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentNoticeId" TEXT NOT NULL,
    "serviceId" TEXT,
    "allyId" TEXT,
    "zoneId" TEXT,
    "shippingLineId" TEXT,
    "airLineId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PaymentNoticeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "paymentNoticeId" TEXT,
    "type" TEXT NOT NULL,
    "blNumber" TEXT,
    "whNumber" TEXT,
    "bookingNumber" TEXT,
    "shippingLineId" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "currentLocation" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "tracking" TEXT,
    "pVol" DECIMAL(10,2),
    "pMax" DECIMAL(10,2),
    "value" DECIMAL(10,2),
    "dimensions" TEXT,
    "clientId" TEXT,
    "clientName" TEXT,
    "vendedorId" TEXT,
    "airLineId" TEXT,
    "originPort" TEXT,
    "destPort" TEXT,
    "etd" TIMESTAMP(3),
    "eta" TIMESTAMP(3),
    "transitTime" INTEGER,
    "aliadoId" TEXT,
    "weight" DECIMAL(10,2),
    "quantity" INTEGER,
    "cbm" DECIMAL(10,2),
    "cst" TEXT,
    "consolidadoManual" TEXT,
    "transportType" TEXT,
    "d2dEta" TIMESTAMP(3),
    "deliveryPlace" TEXT,
    "d2dTransitTime" INTEGER,
    "d2dAliadoId" TEXT,
    "consolidadoNumber" TEXT,
    "arrivalPort" TEXT,
    "consolidadoTransitTime" INTEGER,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentContainer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "containerType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentContainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "D2DShipmentItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "d2dItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "D2DShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receivable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "paymentNoticeId" TEXT,
    "clientId" TEXT NOT NULL,
    "manualNotes" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "invoiceNr" TEXT,
    "allyId" TEXT,
    "svcProviderId" TEXT,
    "employeeUserId" TEXT,
    "description" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "relatedOperationId" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayableTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayableTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "overpaymentApplied" DECIMAL(10,2),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receiptNumber" INTEGER NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "reference" TEXT,
    "issuedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "targetUserId" TEXT,
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_trialEndsAt_idx" ON "Tenant"("trialEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "Membership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_periodStart_periodEnd_idx" ON "Payment"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Payment_confirmedAt_idx" ON "Payment"("confirmedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_tenantId_key" ON "CompanySettings"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_superAdminId_idx" ON "AuditLog"("superAdminId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "Service_tenantId_idx" ON "Service"("tenantId");

-- CreateIndex
CREATE INDEX "Service_type_idx" ON "Service"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Service_tenantId_code_key" ON "Service"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Zone_tenantId_idx" ON "Zone"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_tenantId_internalCode_key" ON "Zone"("tenantId", "internalCode");

-- CreateIndex
CREATE INDEX "Port_tenantId_idx" ON "Port"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Port_tenantId_code_key" ON "Port"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Country_tenantId_idx" ON "Country"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_tenantId_name_key" ON "Country"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ShippingLine_tenantId_idx" ON "ShippingLine"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingLine_tenantId_name_key" ON "ShippingLine"("tenantId", "name");

-- CreateIndex
CREATE INDEX "AirLine_tenantId_idx" ON "AirLine"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AirLine_tenantId_name_key" ON "AirLine"("tenantId", "name");

-- CreateIndex
CREATE INDEX "D2DItem_tenantId_idx" ON "D2DItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "D2DItem_tenantId_description_key" ON "D2DItem"("tenantId", "description");

-- CreateIndex
CREATE INDEX "SvcProvider_tenantId_idx" ON "SvcProvider"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProvider_tenantId_name_key" ON "SvcProvider"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");

-- CreateIndex
CREATE INDEX "Client_deletedAt_idx" ON "Client"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_internalCode_key" ON "Client"("tenantId", "internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_rifOrId_key" ON "Client"("tenantId", "rifOrId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_phone_key" ON "Client"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Ally_tenantId_idx" ON "Ally"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Ally_tenantId_internalCode_key" ON "Ally"("tenantId", "internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Ally_tenantId_rifOrId_key" ON "Ally"("tenantId", "rifOrId");

-- CreateIndex
CREATE INDEX "ServiceRate_tenantId_idx" ON "ServiceRate"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRate_tenantId_allyId_serviceId_zoneId_key" ON "ServiceRate"("tenantId", "allyId", "serviceId", "zoneId");

-- CreateIndex
CREATE INDEX "Rate_tenantId_region_deletedAt_idx" ON "Rate"("tenantId", "region", "deletedAt");

-- CreateIndex
CREATE INDEX "Rate_tenantId_allyId_idx" ON "Rate"("tenantId", "allyId");

-- CreateIndex
CREATE INDEX "Rate_tenantId_countryId_idx" ON "Rate"("tenantId", "countryId");

-- CreateIndex
CREATE INDEX "Rate_tenantId_isActive_idx" ON "Rate"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Rate_tenantId_validFrom_idx" ON "Rate"("tenantId", "validFrom");

-- CreateIndex
CREATE INDEX "Rate_tenantId_validUntil_idx" ON "Rate"("tenantId", "validUntil");

-- CreateIndex
CREATE INDEX "Quote_tenantId_idx" ON "Quote"("tenantId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_status_idx" ON "Quote"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Quote_tenantId_createdAt_idx" ON "Quote"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_tenantId_number_key" ON "Quote"("tenantId", "number");

-- CreateIndex
CREATE INDEX "QuoteItem_tenantId_idx" ON "QuoteItem"("tenantId");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE INDEX "DeliveryNote_tenantId_idx" ON "DeliveryNote"("tenantId");

-- CreateIndex
CREATE INDEX "DeliveryNote_tenantId_deletedAt_idx" ON "DeliveryNote"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNote_tenantId_number_key" ON "DeliveryNote"("tenantId", "number");

-- CreateIndex
CREATE INDEX "DeliveryNoteItem_tenantId_idx" ON "DeliveryNoteItem"("tenantId");

-- CreateIndex
CREATE INDEX "DeliveryNoteItem_deliveryNoteId_idx" ON "DeliveryNoteItem"("deliveryNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentNotice_quoteId_key" ON "PaymentNotice"("quoteId");

-- CreateIndex
CREATE INDEX "PaymentNotice_tenantId_idx" ON "PaymentNotice"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentNotice_tenantId_createdAt_idx" ON "PaymentNotice"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentNotice_tenantId_number_key" ON "PaymentNotice"("tenantId", "number");

-- CreateIndex
CREATE INDEX "PaymentNoticeItem_tenantId_idx" ON "PaymentNoticeItem"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentNoticeItem_paymentNoticeId_idx" ON "PaymentNoticeItem"("paymentNoticeId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_paymentNoticeId_key" ON "Shipment"("paymentNoticeId");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_idx" ON "Shipment"("tenantId");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_status_idx" ON "Shipment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_eta_idx" ON "Shipment"("tenantId", "eta");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_deletedAt_idx" ON "Shipment"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_tenantId_number_key" ON "Shipment"("tenantId", "number");

-- CreateIndex
CREATE INDEX "ShipmentContainer_tenantId_idx" ON "ShipmentContainer"("tenantId");

-- CreateIndex
CREATE INDEX "ShipmentContainer_shipmentId_idx" ON "ShipmentContainer"("shipmentId");

-- CreateIndex
CREATE INDEX "D2DShipmentItem_tenantId_idx" ON "D2DShipmentItem"("tenantId");

-- CreateIndex
CREATE INDEX "D2DShipmentItem_shipmentId_idx" ON "D2DShipmentItem"("shipmentId");

-- CreateIndex
CREATE INDEX "D2DShipmentItem_d2dItemId_idx" ON "D2DShipmentItem"("d2dItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Receivable_paymentNoticeId_key" ON "Receivable"("paymentNoticeId");

-- CreateIndex
CREATE INDEX "Receivable_tenantId_idx" ON "Receivable"("tenantId");

-- CreateIndex
CREATE INDEX "Receivable_tenantId_status_idx" ON "Receivable"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Receivable_tenantId_deletedAt_idx" ON "Receivable"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Receivable_tenantId_number_key" ON "Receivable"("tenantId", "number");

-- CreateIndex
CREATE INDEX "Payable_tenantId_idx" ON "Payable"("tenantId");

-- CreateIndex
CREATE INDEX "Payable_tenantId_status_idx" ON "Payable"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Payable_tenantId_dueDate_idx" ON "Payable"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "Payable_tenantId_deletedAt_idx" ON "Payable"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payable_tenantId_number_key" ON "Payable"("tenantId", "number");

-- CreateIndex
CREATE INDEX "PayableTransaction_tenantId_idx" ON "PayableTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "PayableTransaction_payableId_idx" ON "PayableTransaction"("payableId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_tenantId_idx" ON "PaymentTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_receivableId_idx" ON "PaymentTransaction"("receivableId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_paymentTransactionId_key" ON "PaymentReceipt"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_tenantId_idx" ON "PaymentReceipt"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_tenantId_receiptNumber_key" ON "PaymentReceipt"("tenantId", "receiptNumber");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_isRead_idx" ON "Notification"("tenantId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_tenantId_targetUserId_idx" ON "Notification"("tenantId", "targetUserId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "SuperAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "SuperAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRate" ADD CONSTRAINT "ServiceRate_allyId_fkey" FOREIGN KEY ("allyId") REFERENCES "Ally"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRate" ADD CONSTRAINT "ServiceRate_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRate" ADD CONSTRAINT "ServiceRate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_allyId_fkey" FOREIGN KEY ("allyId") REFERENCES "Ally"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_shippingLineId_fkey" FOREIGN KEY ("shippingLineId") REFERENCES "ShippingLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_allyId_fkey" FOREIGN KEY ("allyId") REFERENCES "Ally"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_shippingLineId_fkey" FOREIGN KEY ("shippingLineId") REFERENCES "ShippingLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_airLineId_fkey" FOREIGN KEY ("airLineId") REFERENCES "AirLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteItem" ADD CONSTRAINT "DeliveryNoteItem_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteItem" ADD CONSTRAINT "DeliveryNoteItem_d2dItemId_fkey" FOREIGN KEY ("d2dItemId") REFERENCES "D2DItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNotice" ADD CONSTRAINT "PaymentNotice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNotice" ADD CONSTRAINT "PaymentNotice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_paymentNoticeId_fkey" FOREIGN KEY ("paymentNoticeId") REFERENCES "PaymentNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_allyId_fkey" FOREIGN KEY ("allyId") REFERENCES "Ally"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_shippingLineId_fkey" FOREIGN KEY ("shippingLineId") REFERENCES "ShippingLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_airLineId_fkey" FOREIGN KEY ("airLineId") REFERENCES "AirLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_paymentNoticeId_fkey" FOREIGN KEY ("paymentNoticeId") REFERENCES "PaymentNotice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_shippingLineId_fkey" FOREIGN KEY ("shippingLineId") REFERENCES "ShippingLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_airLineId_fkey" FOREIGN KEY ("airLineId") REFERENCES "AirLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_aliadoId_fkey" FOREIGN KEY ("aliadoId") REFERENCES "Ally"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_d2dAliadoId_fkey" FOREIGN KEY ("d2dAliadoId") REFERENCES "Ally"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentContainer" ADD CONSTRAINT "ShipmentContainer_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DShipmentItem" ADD CONSTRAINT "D2DShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DShipmentItem" ADD CONSTRAINT "D2DShipmentItem_d2dItemId_fkey" FOREIGN KEY ("d2dItemId") REFERENCES "D2DItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_paymentNoticeId_fkey" FOREIGN KEY ("paymentNoticeId") REFERENCES "PaymentNotice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_allyId_fkey" FOREIGN KEY ("allyId") REFERENCES "Ally"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_svcProviderId_fkey" FOREIGN KEY ("svcProviderId") REFERENCES "SvcProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableTransaction" ADD CONSTRAINT "PayableTransaction_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "Payable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
