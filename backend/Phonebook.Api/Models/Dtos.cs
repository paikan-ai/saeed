using Phonebook.Api.Data;

namespace Phonebook.Api.Models;

// ============================================================
//  DTOها — قرارداد ارتباط بین API و کلاینت (React)
// ============================================================

// ---------- احراز هویت ----------

public record LoginRequest(string Username, string Password);

public record LoginResponse(string Token, UserDto User);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

// ---------- کاربران ----------

public record PermissionDto(bool CanCreate, bool CanEdit, bool CanDelete, bool CanViewOnly);

public record CreateUserRequest(
    string Username,
    string Password,
    Role Role,
    bool CanCreate, bool CanEdit, bool CanDelete, bool CanViewOnly);

public record UpdateUserRequest(
    string Username,
    string? NewPassword,      // اختیاری — فقط در صورت ارسال، رمز ریست می‌شود
    Role Role,
    bool CanCreate, bool CanEdit, bool CanDelete, bool CanViewOnly);

public record UserDto(
    int Id,
    string Username,
    Role Role,
    bool IsPasswordChanged,
    PermissionDto Permissions,
    int ContactCount,
    DateTime CreatedAt);

public record UpdateProfileRequest(string Username);

// ---------- آمار (داشبورد ادمین) ----------

public record UserStatDto(int Id, string Username, Role Role, int ContactCount, DateTime CreatedAt);

public record StatsDto(
    int TotalUsers,
    int TotalContacts,
    int TotalPhones,
    int MobileCount, int HomeCount, int WorkCount,
    List<UserStatDto> Users);

// ---------- مخاطبین ----------

public record PhoneDto(int Id, string PhoneNumber, PhoneType PhoneType);

public record PhoneRequest(string PhoneNumber, PhoneType PhoneType);

public record ContactRequest(string Name, List<PhoneRequest> Phones);

public record ContactDto(int Id, string Name, DateTime CreatedAt, List<PhoneDto> Phones);

// ---------- خطا ----------

public record ApiErrorResponse(string Message);
