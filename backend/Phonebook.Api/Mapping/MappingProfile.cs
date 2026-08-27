using AutoMapper;
using Phonebook.Api.Data;
using Phonebook.Api.Models;

namespace Phonebook.Api.Mapping;

// ============================================================
//  پروفایل AutoMapper — نگاشت Entity ↔ DTO
// ============================================================
public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // ---------- کاربران ----------
        CreateMap<User, UserDto>()
            .ForMember(d => d.Permissions, o => o.MapFrom(s =>
                new PermissionDto(s.CanCreate, s.CanEdit, s.CanDelete, s.CanViewOnly)))
            // تعداد مخاطبین هر کاربر (برای نمایش در داشبورد ادمین)
            .ForMember(d => d.ContactCount, o => o.MapFrom(s => s.Contacts.Count));

        // ---------- مخاطبین ----------
        CreateMap<Contact, ContactDto>()
            // مرتب‌سازی شماره‌ها: موبایل، خانه، کار
            .ForMember(d => d.Phones, o => o.MapFrom(s => s.Phones.OrderBy(p => p.PhoneType).ToList()));

        CreateMap<ContactPhone, PhoneDto>();
    }
}
