using Microsoft.EntityFrameworkCore;
using Phonebook.Api.Infrastructure;

namespace Phonebook.Api.Data;

// ============================================================
//  DbContext — پیکربندی Code-First برای SQL Server + Seed اولیه
// ============================================================
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<ContactPhone> ContactPhones => Set<ContactPhone>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // ---------- جدول Users ----------
        builder.Entity<User>(e =>
        {
            e.ToTable("Users");
            e.HasIndex(u => u.Username).IsUnique();          // نام کاربری یکتا
            e.Property(u => u.Username).HasMaxLength(50).IsRequired();
            e.Property(u => u.PasswordHash).HasMaxLength(500).IsRequired();
        });

        // ---------- جدول Contacts ----------
        builder.Entity<Contact>(e =>
        {
            e.ToTable("Contacts");
            e.Property(c => c.Name).HasMaxLength(100).IsRequired();

            // هر کاربر فقط مخاطبین خودش را دارد؛ با حذف کاربر، مخاطبینش هم حذف می‌شود
            e.HasOne(c => c.Owner)
             .WithMany(u => u.Contacts)
             .HasForeignKey(c => c.OwnerId)
             .OnDelete(DeleteBehavior.Cascade);

            // ایندکس برای جستجوی سریع‌تر روی نام
            e.HasIndex(c => c.Name);
        });

        // ---------- جدول ContactPhones ----------
        builder.Entity<ContactPhone>(e =>
        {
            e.ToTable("ContactPhones");
            e.Property(p => p.PhoneNumber).HasMaxLength(20).IsRequired();

            // رابطه چندبه‌یک به Contact + حذف آبشاری شماره‌ها همراه مخاطب
            e.HasOne(p => p.Contact)
             .WithMany(c => c.Phones)
             .HasForeignKey(p => p.ContactId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(p => p.PhoneNumber);
        });
    }

    /// <summary>
    /// Seed اولیه دیتابیس — فقط یک بار (وقتی جدول Users خالی است) اجرا می‌شود:
    ///  ۱) اکانت admin با رمز «123» و IsPasswordChanged=false (تغییر رمز اجباری پس از اولین لاگین)
    ///  ۲) دو کاربر نمونه برای تست سریع (sara با دسترسی کامل، reza فقط مشاهده)
    /// </summary>
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync()) return;

        var hasher = new PasswordHasher();

        // ---------- ادمین پیش‌فرض ----------
        var admin = new User
        {
            Username = "admin",
            PasswordHash = hasher.Hash("123"),   // رمز اولیه: 123
            Role = Role.Admin,
            IsPasswordChanged = false,           // ← اجبار به تغییر رمز در اولین ورود
            CanCreate = true, CanEdit = true, CanDelete = true, CanViewOnly = false
        };

        // ---------- کاربر نمونه با دسترسی کامل ----------
        var sara = new User
        {
            Username = "sara",
            PasswordHash = hasher.Hash("1234"),
            Role = Role.User,
            IsPasswordChanged = true,
            CanCreate = true, CanEdit = true, CanDelete = true, CanViewOnly = false
        };

        // ---------- کاربر نمونه «فقط مشاهده» ----------
        var reza = new User
        {
            Username = "reza",
            PasswordHash = hasher.Hash("1234"),
            Role = Role.User,
            IsPasswordChanged = true,
            CanCreate = false, CanEdit = false, CanDelete = false, CanViewOnly = true
        };

        db.Users.AddRange(admin, sara, reza);
        await db.SaveChangesAsync(); // ذخیره تا Idها تولید شوند

        // ---------- مخاطبین نمونه برای sara ----------
        var samples = new (string Name, string Phone, PhoneType Type)[]
        {
            ("مریم رضایی",     "09121234567", PhoneType.Mobile),
            ("علی محمدی",      "09351112233", PhoneType.Mobile),
            ("حسین کریمی",     "02188776655", PhoneType.Work),
            ("نگار صادقی",     "09198887766", PhoneType.Mobile),
            ("دفتر مرکزی",     "02144332211", PhoneType.Work),
            ("خانه پدربزرگ",   "02633445566", PhoneType.Home),
        };

        foreach (var (name, phone, type) in samples)
            db.Contacts.Add(new Contact
            {
                Name = name,
                OwnerId = sara.Id,
                Phones = { new ContactPhone { PhoneNumber = phone, PhoneType = type } }
            });

        // چند مخاطب برای reza (جهت مشاهده در حالت ViewOnly)
        db.Contacts.AddRange(
            new Contact { Name = "امیر تهرانی", OwnerId = reza.Id, Phones = { new ContactPhone { PhoneNumber = "09121112244", PhoneType = PhoneType.Mobile } } },
            new Contact { Name = "لیلا حاتمی",  OwnerId = reza.Id, Phones = { new ContactPhone { PhoneNumber = "02188112233", PhoneType = PhoneType.Work } } }
        );

        await db.SaveChangesAsync();
    }
}
