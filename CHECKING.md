# Description
Build a small full-stack application that allows users to find packaged food products by entering a product title or search term.

# Product
Product information must be retrieved from Open Food Facts through the backend and presented in a clean, responsive interface.

# Application
The application must support English, Dutch, German, and French through a manual language selector, with both the interface and product information shown in the selected language where possible.

# Product info 
Everyone can view basic information such as the product name, brand, and image, but detailed nutritional values should only be available when the demo user has an active Stripe subscription.

# Demo criteria
The assignment should demonstrate how you structure a complete full-stack feature, including external integrations an internationalization. 

# Docs
Document important technical decisions and simplifications.

# Required Stack

Frontend    |   Backend
TypeScript  |   TypeScript
Next.js     |   Express
React       |   Prisma
Tailwind CSS|   MySQL

Open Food Facts API
Stripe subscriptions API (in test mode)

Requirements
• Search for products by title or search term and handle missing or incomplete data.
• Support English, Dutch, German, and French through a language selector.
• Show the interface and product information in the selected language where possible.
• Use one demo user and store recent searches in MySQL.
• Create a monthly subscription using Stripe Checkout.
• Process Stripe webhooks and enforce subscription access in the backend.
• Add several meaningful automated tests.
• Keep secrets in environment variables.

Deliverables
Submit a Git repository containing:
• Source code
• Prisma migration
• .env.example
• Automated tests
• A README with setup instructions, technical decisions, internationalization approach, and known limitations.