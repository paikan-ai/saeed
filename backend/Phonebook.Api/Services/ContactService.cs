using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Phonebook.Api.Data;
using Phonebook.Api.Models;

namespace Phonebook.Api.Services;

// ============================================================
//  سرویس مخاطبین — همه‌ی کوئری‌ها با OwnerId فیلتر می‌شوند
//  تا هر کاربر فقط مخاطبین خودش را ببیند و مدیریت کند.
// ============================================================
public class ContactService(AppDbContext db, IMapper mapper)
{
    /// <summary>
    /// لیست مخاطبینِ کاربر جاری + جستجوی پیشرفته:
    /// جستجو هم‌زمان در «نام مخاطب» و «شماره تلفن» با LINQ انجام می‌شود
    /// و EF Core آن را به LIKE در SQL Server ترجمه می‌کند.
    /// </summary>
    public async Task<List<ContactDto>> ListAsync(int ownerId, string? search)
    {
        IQueryable<Contact> query = db.Contacts
            .AsNoTracking()
            .Include(c => c.Phones)
            .Where(c => c.OwnerId == ownerId);      // ← جداسازی داده‌ی هر کاربر

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            // جستجوی هم‌زمان در نام و شماره‌ها (One-to-Many)
            query = query.Where(c =>
                c.Name.Contains(term) ||
                c.Phones.Any(p => p.PhoneNumber.Contains(term)));
        }

        var contacts = await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return mapper.Map<List<ContactDto>>(contacts);
    }

    /// <summary>افزودن مخاطب جدید با N شماره تلفن</summary>
    public async Task<ContactDto> CreateAsync(int ownerId, ContactRequest request)
    {
        var contact = new Contact
        {
            Name = request.Name.Trim(),
            OwnerId = ownerId,
            Phones = request.Phones
                .Select(p => new ContactPhone { PhoneNumber = p.PhoneNumber.Trim(), PhoneType = p.PhoneType })
                .ToList()
        };

        db.Contacts.Add(contact);
        await db.SaveChangesAsync();

        return mapper.Map<ContactDto>(contact);
    }

    /// <summary>
    /// ویرایش مخاطب — فقط توسط صاحب مخاطب.
    /// شماره‌ها به‌صورت کامل جایگزین می‌شوند (حذف قبلی‌ها + ثبت جدیدها).
    /// </summary>
    public async Task<ContactDto> UpdateAsync(int contactId, int ownerId, ContactRequest request)
    {
        var contact = await db.Contacts
            .Include(c => c.Phones)
            .FirstOrDefaultAsync(c => c.Id == contactId && c.OwnerId == ownerId)
            ?? throw new InvalidOperationException("مخاطب یافت نشد یا شما صاحب آن نیستید.");

        contact.Name = request.Name.Trim();

        db.ContactPhones.RemoveRange(contact.Phones);
        contact.Phones = request.Phones
            .Select(p => new ContactPhone { PhoneNumber = p.PhoneNumber.Trim(), PhoneType = p.PhoneType })
            .ToList();

        await db.SaveChangesAsync();
        return mapper.Map<ContactDto>(contact);
    }

    /// <summary>حذف مخاطب — فقط توسط صاحب مخاطب (شماره‌ها هم Cascade حذف می‌شوند)</summary>
    public async Task DeleteAsync(int contactId, int ownerId)
    {
        var contact = await db.Contacts.FirstOrDefaultAsync(c => c.Id == contactId && c.OwnerId == ownerId)
            ?? throw new InvalidOperationException("مخاطب یافت نشد یا شما صاحب آن نیستید.");

        db.Contacts.Remove(contact);
        await db.SaveChangesAsync();
    }
}
