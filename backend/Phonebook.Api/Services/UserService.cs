using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Phonebook.Api.Data;
using Phonebook.Api.Infrastructure;
using Phonebook.Api.Models;

namespace Phonebook.Api.Services;

// ============================================================
//  سرویس مدیریت کاربران — فقط ادمین (در کنترلر با Roles="Admin" محافظت شده)
// ============================================================
public class UserService(AppDbContext db, PasswordHasher hasher, IMapper mapper)
{
    /// <summary>لیست همه‌ی کاربران به همراه تعداد مخاطبین</summary>
    public async Task<List<UserDto>> ListAsync() =>
        await db.Users
            .Include(u => u.Contacts)
            .OrderBy(u => u.Id)
            .Select(u => mapper.Map<UserDto>(u))   // نگاشت در حافظه انجام می‌شود
            .ToListAsync();

    /// <summary>آمار کلی برای داشبورد ادمین</summary>
    public async Task<StatsDto> GetStatsAsync()
    {
        var users = await db.Users.Include(u => u.Contacts).ThenInclude(c => c.Phones).ToListAsync();

        var allPhones = users.SelectMany(u => u.Contacts).SelectMany(c => c.Phones).ToList();

        return new StatsDto(
            TotalUsers: users.Count,
            TotalContacts: users.Sum(u => u.Contacts.Count),
            TotalPhones: allPhones.Count,
            MobileCount: allPhones.Count(p => p.PhoneType == PhoneType.Mobile),
            HomeCount: allPhones.Count(p => p.PhoneType == PhoneType.Home),
            WorkCount: allPhones.Count(p => p.PhoneType == PhoneType.Work),
            Users: users.Select(u => new UserStatDto(u.Id, u.Username, u.Role, u.Contacts.Count, u.CreatedAt))
                        .OrderByDescending(u => u.ContactCount)
                        .ToList()
        );
    }

    /// <summary>ایجاد کاربر جدید توسط ادمین</summary>
    public async Task<UserDto> CreateAsync(CreateUserRequest request)
    {
        var username = request.Username.Trim();
        if (await db.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower()))
            throw new InvalidOperationException("این نام کاربری قبلاً استفاده شده است.");

        var user = new User
        {
            Username = username,
            PasswordHash = hasher.Hash(request.Password),
            Role = request.Role,
            IsPasswordChanged = true,    // کاربران ساخته‌شده توسط ادمین نیازی به تغییر رمز اجباری ندارند
            CanCreate = request.CanCreate && !request.CanViewOnly,
            CanEdit = request.CanEdit && !request.CanViewOnly,
            CanDelete = request.CanDelete && !request.CanViewOnly,
            CanViewOnly = request.CanViewOnly
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return mapper.Map<UserDto>(user);
    }

    /// <summary>ویرایش کاربر (نام کاربری، نقش، دسترسی‌ها و در صورت نیاز ریست رمز)</summary>
    public async Task<UserDto> UpdateAsync(int id, UpdateUserRequest request, int currentAdminId)
    {
        var user = await db.Users.FindAsync(id)
            ?? throw new InvalidOperationException("کاربر یافت نشد.");

        // ادمین نمی‌تواند نقش خودش را تغییر دهد (جلوگیری از قفل شدن سیستم)
        if (id == currentAdminId && request.Role != Role.Admin)
            throw new InvalidOperationException("شما نمی‌توانید نقش خودتان را از مدیر تغییر دهید.");

        var username = request.Username.Trim();
        if (await db.Users.AnyAsync(u => u.Id != id && u.Username.ToLower() == username.ToLower()))
            throw new InvalidOperationException("این نام کاربری قبلاً استفاده شده است.");

        user.Username = username;
        user.Role = request.Role;
        user.CanCreate = request.CanCreate && !request.CanViewOnly;
        user.CanEdit = request.CanEdit && !request.CanViewOnly;
        user.CanDelete = request.CanDelete && !request.CanViewOnly;
        user.CanViewOnly = request.CanViewOnly;

        // ریست رمز عبور فقط در صورت ارسال رمز جدید
        if (!string.IsNullOrEmpty(request.NewPassword))
            user.PasswordHash = hasher.Hash(request.NewPassword);

        await db.SaveChangesAsync();
        return mapper.Map<UserDto>(user);
    }

    /// <summary>حذف کاربر به همراه همه‌ی مخاطبینش (Cascade)</summary>
    public async Task DeleteAsync(int id, int currentAdminId)
    {
        if (id == currentAdminId)
            throw new InvalidOperationException("شما نمی‌توانید حساب خودتان را حذف کنید.");

        var user = await db.Users.FindAsync(id)
            ?? throw new InvalidOperationException("کاربر یافت نشد.");

        db.Users.Remove(user);
        await db.SaveChangesAsync();
    }
}
