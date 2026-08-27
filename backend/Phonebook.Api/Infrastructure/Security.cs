using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Phonebook.Api.Data;

namespace Phonebook.Api.Infrastructure;

// ============================================================
//  ابزارهای امنیتی: هش رمز عبور + صدور توکن JWT + نام Claimها
// ============================================================

/// <summary>
/// هش‌کننده‌ی رمز عبور بر پایه PBKDF2-SHA256 (استاندارد OWASP).
/// قالب ذخیره:  iterations.saltBase64.hashBase64
/// </summary>
public class PasswordHasher
{
    private const int Iterations = 100_000;
    private const int SaltSize = 16;
    private const int HashSize = 32;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);
        return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public bool Verify(string password, string stored)
    {
        var parts = stored.Split('.');
        if (parts.Length != 3) return false;

        var iterations = int.Parse(parts[0]);
        var salt = Convert.FromBase64String(parts[1]);
        var expected = Convert.FromBase64String(parts[2]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);

        // مقایسه با زمان ثابت برای جلوگیری از Timing Attack
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}

/// <summary>نام Claimهای سفارشی سطوح دسترسی داخل توکن JWT</summary>
public static class Perm
{
    public const string Create   = "perm.contact.create";
    public const string Edit     = "perm.contact.edit";
    public const string Delete   = "perm.contact.delete";
    public const string ViewOnly = "perm.contact.viewonly";
}

/// <summary>نام Policyهای مورد استفاده در Attributeهای کنترلر</summary>
public static class Pol
{
    public const string ContactCreate = "ContactCreate";
    public const string ContactEdit   = "ContactEdit";
    public const string ContactDelete = "ContactDelete";
}

/// <summary>
/// سرویس صدور توکن JWT — Claimهای سطوح دسترسی همین‌جا داخل توکن قرار می‌گیرند
/// تا در Middleware احراز هویت/مجوز سمت سرور بررسی شوند.
/// </summary>
public class JwtTokenService(IConfiguration config)
{
    private readonly SymmetricSecurityKey _key =
        new(Encoding.UTF8.GetBytes(config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key تنظیم نشده است")));

    public string GenerateToken(User user)
    {
        var hours = double.TryParse(config["Jwt:ExpirationHours"], out var h) ? h : 8;

        // ادمین همیشه همه‌ی دسترسی‌ها را دارد
        var isadmin = user.Role == Role.Admin;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("IsPasswordChanged", user.IsPasswordChanged.ToString().ToLower()),
            // Claimهای سطوح دسترسی (RBAC)
            new(Perm.Create,   (isadmin || user.CanCreate).ToString().ToLower()),
            new(Perm.Edit,     (isadmin || user.CanEdit).ToString().ToLower()),
            new(Perm.Delete,   (isadmin || user.CanDelete).ToString().ToLower()),
            new(Perm.ViewOnly, (!isadmin && user.CanViewOnly).ToString().ToLower()),
        };

        var token = new JwtSecurityToken(
            issuer:   config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims:   claims,
            expires:  DateTime.UtcNow.AddHours(hours),
            signingCredentials: new SigningCredentials(_key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

/// <summary>درخواست مجوز سفارشی برای Policyهای RBAC</summary>
public class PermissionRequirement(string permission) : Microsoft.AspNetCore.Authorization.IAuthorizationRequirement
{
    public string Permission { get; } = permission;
}

/// <summary>
/// Handler بررسی مجوز — قلب RBAC سمت سرور:
///  - ادمین → همیشه مجاز
///  - کاربر ViewOnly → همیشه غیرمجاز برای عملیات تغییردهنده
///  - در غیر این صورت مقدار Claim متناظر داخل توکن ملاک است
/// </summary>
public class PermissionHandler : Microsoft.AspNetCore.Authorization.AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        Microsoft.AspNetCore.Authorization.AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var user = context.User;

        if (user.IsInRole(nameof(Role.Admin)))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        var viewOnly = user.FindFirst(Perm.ViewOnly)?.Value;
        if (viewOnly == "true")
            return Task.CompletedTask; // فقط مشاهده — هیچ عملیات تغییردهنده‌ای مجاز نیست

        if (user.FindFirst(requirement.Permission)?.Value == "true")
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}

/// <summary>کمک‌کننده‌ی خواندن اطلاعات کاربر از ClaimsPrincipal</summary>
public static class ClaimsExtensions
{
    public static int GetUserId(this ClaimsPrincipal principal) =>
        int.Parse(principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? "0");

    public static string GetUsername(this ClaimsPrincipal principal) =>
        principal.FindFirst(JwtRegisteredClaimNames.UniqueName)?.Value
        ?? principal.FindFirst(ClaimTypes.Name)?.Value
        ?? string.Empty;
}
