namespace Phonebook.Api.Data;

// ============================================================
//  موجودیت‌های دامنه (Domain Entities) — دفترچه تلفن چندکاربره
// ============================================================

/// <summary>نقش کاربر در سیستم</summary>
public enum Role
{
    User = 0,
    Admin = 1
}

/// <summary>نوع شماره تلفن</summary>
public enum PhoneType
{
    Mobile = 0,
    Home = 1,
    Work = 2
}

/// <summary>
/// کاربر سیستم — هر کاربر فقط مخاطبین خودش را می‌بیند.
/// ستون‌های CanXxx سطح دسترسی (RBAC) کاربر روی مخاطبین‌اش را تعیین می‌کنند
/// و هنگام صدور توکن JWT به‌صورت Claim داخل توکن قرار می‌گیرند.
/// </summary>
public class User
{
    public int Id { get; set; }

    /// <summary>نام کاربری یکتا</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>هش رمز عبور (PBKDF2-SHA256) — هرگز رمز خام ذخیره نمی‌شود</summary>
    public string PasswordHash { get; set; } = string.Empty;

    public Role Role { get; set; } = Role.User;

    /// <summary>
    /// فلگ «تغییر رمز اجباری» — برای ادمین اولیه false است تا پس از اولین لاگین
    /// مجبور به تغییر رمز شود؛ بعد از تغییر رمز، true می‌شود.
    /// </summary>
    public bool IsPasswordChanged { get; set; }

    // ---------- سطوح دسترسی (RBAC) ----------
    public bool CanCreate { get; set; } = true;
    public bool CanEdit { get; set; } = true;
    public bool CanDelete { get; set; } = true;

    /// <summary>اگر true باشد، کاربر فقط می‌تواند ببیند؛ حتی اگر تیک‌های دیگر روشن باشد.</summary>
    public bool CanViewOnly { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // رابطه یک‌به‌چند: هر کاربر N مخاطب دارد
    public ICollection<Contact> Contacts { get; set; } = new List<Contact>();
}

/// <summary>مخاطب — متعلق به یک کاربر خاص (OwnerId)</summary>
public class Contact
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>کلید خارجی به صاحب مخاطب — مبنای جداسازی داده‌ی هر کاربر</summary>
    public int OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // رابطه یک‌به‌چند: هر مخاطب N شماره تلفن دارد
    public ICollection<ContactPhone> Phones { get; set; } = new List<ContactPhone>();
}

/// <summary>شماره تلفنِ یک مخاطب</summary>
public class ContactPhone
{
    public int Id { get; set; }

    public int ContactId { get; set; }
    public Contact Contact { get; set; } = null!;

    public string PhoneNumber { get; set; } = string.Empty;
    public PhoneType PhoneType { get; set; } = PhoneType.Mobile;
}
