# Deployment Status & Quick Reference

## ✅ Environment Variables Set

### Backoffice (restaurant-backoffice.netlify.app)
- `POCKETBASE_URL`: http://18.218.140.182:8090
- `NEXT_PUBLIC_POCKETBASE_URL`: http://18.218.140.182:8090
- `PB_ADMIN_EMAIL`: mainaksaha0807@gmail.com
- `PB_ADMIN_PASSWORD`: 8104760831

### Customer Web (restaurant-customer-web.netlify.app)
- `POCKETBASE_URL`: http://18.218.140.182:8090
- `NEXT_PUBLIC_POCKETBASE_URL`: http://18.218.140.182:8090
- `PB_ADMIN_EMAIL`: mainaksaha0807@gmail.com
- `PB_ADMIN_PASSWORD`: 8104760831

## 🚀 AWS EC2 PocketBase

- **Public IP**: 18.218.140.182
- **PocketBase URL**: http://18.218.140.182:8090
- **Admin UI**: http://18.218.140.182:8090/_/
- **Status**: ✅ Running

## 📋 Next Steps

1. **Redeploy to Production** (to apply environment variables):
   ```bash
   # Backoffice
   cd apps/backoffice
   netlify deploy --build --prod
   
   # Customer Web
   cd apps/customer-web
   netlify deploy --build --prod
   ```

2. **Configure AWS Security Group**:
   - Allow port 8090 (HTTP) from anywhere (0.0.0.0/0)
   - Or restrict to Netlify IPs for better security

3. **Access PocketBase Admin**:
   - Go to: http://18.218.140.182:8090/_/
   - Create admin account if not already created
   - Set up collections and seed data

4. **Test the Apps**:
   - Backoffice: https://restaurant-backoffice.netlify.app
   - Customer Web: https://restaurant-customer-web.netlify.app

## 🔧 Troubleshooting

### If login fails:
- Check PocketBase is accessible: http://18.218.140.182:8090/api/health
- Verify environment variables are set in Netlify dashboard
- Check Netlify function logs for errors
- Ensure Security Group allows port 8090

### If API calls fail:
- Check CORS settings in PocketBase
- Verify the PocketBase URL is correct
- Check browser console for errors

