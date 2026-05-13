
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

async def test_configuration():
    print("📋 Testing configuration...")
    try:
        from app.core.config import settings
        assert settings.ENVIRONMENT in ["development", "production"], "❌ Invalid ENVIRONMENT"
        assert settings.PORT > 0, "❌ Invalid PORT"
        assert settings.JWT_SECRET != "your-secret-key-change-me", "⚠️  WARNING: Using default JWT_SECRET"
        print("✅ Configuration loaded successfully")
        return True
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        return False

async def test_database_config():
    print("\n📊 Testing database configuration...")
    try:
        from app.core.config import settings
        assert "mongodb" in settings.MONGODB_URI.lower(), "❌ Invalid MongoDB URI"
        assert settings.MONGODB_URI != "mongodb+srv://user:pass@cluster.mongodb.net/?appName=name", \
            "⚠️  WARNING: Using default MONGODB_URI - configure .env file"
        print("✅ Database configuration valid")
        return True
    except Exception as e:
        print(f"❌ Database configuration error: {e}")
        return False

async def test_security():
    print("\n🔐 Testing security configuration...")
    try:
        from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
        
        password = "test_password_123"
        hashed = hash_password(password)
        assert verify_password(password, hashed), "❌ Password verification failed"
        
        test_data = {"userId": "123", "email": "test@example.com", "role": "candidate"}
        token = create_access_token(test_data)
        decoded = decode_access_token(token)
        assert decoded is not None, "❌ Token decoding failed"
        assert decoded["userId"] == "123", "❌ Token payload mismatch"
        
        print("✅ Security functions working correctly")
        return True
    except Exception as e:
        print(f"❌ Security error: {e}")
        return False

async def test_imports():
    print("\n📦 Testing imports...")
    try:
        from app.routes import auth, users, jobs, applications, payments, admin
        from app.services.auth_service import AuthService
        from app.services.job_service import JobService
        from app.services.payment_service import PaymentService
        from app.services.application_service import ApplicationService
        from app.services.admin_service import AdminService
        from app.middleware.dependencies import get_current_user
        
        print("✅ All imports successful")
        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

async def main():
    print("=" * 60)
    print("🧪 FastAPI Backend Configuration & Import Tests")
    print("=" * 60)
    
    results = []
    
    results.append(("Configuration", await test_configuration()))
    results.append(("Database", await test_database_config()))
    results.append(("Security", await test_security()))
    results.append(("Imports", await test_imports()))
    
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{name:20} {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Backend is ready to run.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please fix configuration before running.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
