using Microsoft.EntityFrameworkCore;
using Phonebook.Api.Data;
using Phonebook.Api.Infrastructure;
using Phonebook.Api.Models;
using AutoMapper;

namespace Phonebook.Api.Services;

// ============================================================
//  سرویس احراز هویت: لاگین، تغییر رمز (اجباری/اختیاری)، ویرایش پروفایل
// ============================================================
public class AuthService(AppDbContext db, PasswordHasher hasher, JwtTokenService jwt, IMapper mapper)
{
    /// <summary>ورود کاربر و صدور توکن JWT</summary>
    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var username = request.Username.Trim().ToLowerInvariant();
        var user = await db.Users
            .Include(u => u.Contacts)
            .FirstOrDefaultAsync(u => u.Username.ToLower() == username)
            ?? throw new UnauthorizedAccessException("نام کاربری یا رمز عبور اشتباه است.");

        if (!hasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("نام کاربری یا رمز عبور اشتباه است.");

        return new LoginResponse(jwt.GenerateToken(user), mapper.Map<UserDto>(user));
    }

    /// <summary>
    /// تغییر رمز عبور — هم برای «تغییر رمز اجباری ادمین در اولین ورود»
    /// و هم برای تغییر رمز اختیاری هر کاربر استفاده می‌شود.
    /// </summary>
    public async Task<LoginResponse> ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await db.Users.Include(u => u.Contacts).FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new UnauthorizedAccessException("نشست شما منقضی شده است.");

        if (!hasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new InvalidOperationException("رمز عبور فعلی اشتباه است.");

        user.PasswordHash = hasher.Hash(request.NewPassword);
        user.IsPasswordChanged = true;   // ← فلگ تغییر رمز فعال می‌شود

        await db.SaveChangesAsync();

        // توکن جدید صادر می‌شود چون Claim مربوط به IsPasswordChanged تغییر کرده است
        return new LoginResponse(jwt.GenerateToken(user), mapper.Map<UserDto>(user));
    }

    /// <summary>ویرایش پروفایل (نام کاربری) توسط خود کاربر</summary>
    public async Task<LoginResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await db.Users.Include(u => u.Contacts).FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new UnauthorizedAccessException("کاربر یافت نشد.");

        var username = request.Username.Trim();
        if (await db.Users.AnyAsync(u => u.Id != userId && u.Username.ToLower() == username.ToLower()))
            throw new InvalidOperationException("این نام کاربری قبلاً استفاده شده است.");

        user.Username = username;
        await db.SaveChangesAsync();

        return new LoginResponse(jwt.GenerateToken(user), mapper.Map<UserDto>(user));
    }
}
