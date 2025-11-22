#!/bin/bash
# Script to update PocketBase database on AWS
# Usage: ./update-db-aws.sh [script-name]

# AWS PocketBase Configuration
export AWS_POCKETBASE_URL="${AWS_POCKETBASE_URL:-http://18.218.140.182:8090}"
export PB_ADMIN_EMAIL="${PB_ADMIN_EMAIL:-mainaksaha0807@gmail.com}"
export PB_ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-8104760831}"

# Script to run (default: show available scripts)
SCRIPT_NAME=${1:-"help"}

echo "🔧 PocketBase Database Update Script for AWS"
echo "=============================================="
echo "AWS URL: $AWS_POCKETBASE_URL"
echo "Admin Email: $PB_ADMIN_EMAIL"
echo ""

if [ "$SCRIPT_NAME" = "help" ] || [ "$SCRIPT_NAME" = "" ]; then
    echo "Available database update scripts:"
    echo ""
    echo "  Cleanup Scripts:"
    echo "    ./update-db-aws.sh cleanup-duplicate-locations"
    echo "    ./update-db-aws.sh cleanup-duplicate-locations-migrate"
    echo "    ./update-db-aws.sh cleanup-duplicate-menu"
    echo "    ./update-db-aws.sh cleanup-duplicate-tables"
    echo ""
    echo "  Check Scripts (read-only):"
    echo "    ./update-db-aws.sh check-duplicate-menu"
    echo "    ./update-db-aws.sh check-duplicate-tables"
    echo ""
    echo "  Migration Scripts:"
    echo "    ./update-db-aws.sh migrate-availability"
    echo "    ./update-db-aws.sh add-availability-field"
    echo ""
    echo "Usage:"
    echo "  ./update-db-aws.sh <script-name>"
    echo ""
    echo "Or set environment variables:"
    echo "  export AWS_POCKETBASE_URL='http://your-aws-ip:8090'"
    echo "  export PB_ADMIN_EMAIL='your-email@example.com'"
    echo "  export PB_ADMIN_PASSWORD='your-password'"
    echo "  ./update-db-aws.sh <script-name>"
    exit 0
fi

# Map script names to actual script files
case "$SCRIPT_NAME" in
    "cleanup-duplicate-locations")
        SCRIPT_FILE="pocketbase/scripts/cleanup-duplicate-locations.js"
        ;;
    "cleanup-duplicate-locations-migrate")
        SCRIPT_FILE="pocketbase/scripts/cleanup-duplicate-locations-migrate.js"
        ;;
    "cleanup-duplicate-menu")
        SCRIPT_FILE="pocketbase/scripts/cleanup-duplicate-menu-items.js"
        ;;
    "cleanup-duplicate-tables")
        SCRIPT_FILE="pocketbase/scripts/cleanup-duplicate-tables.js"
        ;;
    "check-duplicate-menu")
        SCRIPT_FILE="pocketbase/scripts/check-duplicate-menu-items.js"
        ;;
    "check-duplicate-tables")
        SCRIPT_FILE="pocketbase/scripts/check-duplicate-tables.js"
        ;;
    "migrate-availability")
        SCRIPT_FILE="pocketbase/scripts/migrate-availability-field.js"
        ;;
    "add-availability-field")
        SCRIPT_FILE="pocketbase/scripts/add-availability-field-to-schema.js"
        ;;
    *)
        echo "❌ Unknown script: $SCRIPT_NAME"
        echo "Run './update-db-aws.sh help' to see available scripts"
        exit 1
        ;;
esac

# Check if script file exists
if [ ! -f "$SCRIPT_FILE" ]; then
    echo "❌ Script file not found: $SCRIPT_FILE"
    exit 1
fi

echo "📋 Running script: $SCRIPT_FILE"
echo ""

# Run the script
node "$SCRIPT_FILE"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Script completed successfully!"
else
    echo ""
    echo "❌ Script failed with exit code: $EXIT_CODE"
    exit $EXIT_CODE
fi

