-- Two staff roles: accountant (accounting, suppliers; reads orders and stock) and customer service.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPPORT';
