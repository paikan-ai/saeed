using FluentValidation;
using Phonebook.Api.Models;

namespace Phonebook.Api.Validation;

// ============================================================
//  اعتبارسنجی ورودی‌ها با FluentValidation — پیام‌ها به فارسی
//  این Validatorها به‌صورت خودکار توسط FluentValidationFilter
//  قبل از اجرای هر Action کنترلر اجرا می‌شوند.
// ============================================================

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Username).NotEmpty().WithMessage("نام کاربری الزامی است.");
        RuleFor(x => x.Password).NotEmpty().WithMessage("رمز عبور الزامی است.");
    }
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("رمز عبور فعلی الزامی است.");
        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("رمز عبور جدید الزامی است.")
            .MinimumLength(4).WithMessage("رمز عبور جدید باید حداقل ۴ کاراکتر باشد.")
            .NotEqual(x => x.CurrentPassword).WithMessage("رمز جدید نمی‌تواند با رمز فعلی یکسان باشد.");
    }
}

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("نام کاربری الزامی است.")
            .MinimumLength(3).WithMessage("نام کاربری باید حداقل ۳ کاراکتر باشد.")
            .MaximumLength(50).WithMessage("نام کاربری بیش از حد طولانی است.")
            .Matches("^[a-zA-Z0-9_.-]+$").WithMessage("نام کاربری فقط می‌تواند شامل حروف انگلیسی، عدد، نقطه، خط تیره و آندرلاین باشد.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("رمز عبور الزامی است.")
            .MinimumLength(4).WithMessage("رمز عبور باید حداقل ۴ کاراکتر باشد.");

        RuleFor(x => x).Must(x => !(x.CanViewOnly && (x.CanCreate || x.CanEdit || x.CanDelete)))
            .WithMessage("حالت «فقط مشاهده» با دسترسی‌های ایجاد/ویرایش/حذف هم‌زمان قابل انتخاب نیست.");
    }
}

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("نام کاربری الزامی است.")
            .MinimumLength(3).WithMessage("نام کاربری باید حداقل ۳ کاراکتر باشد.")
            .MaximumLength(50).WithMessage("نام کاربری بیش از حد طولانی است.");

        When(x => !string.IsNullOrEmpty(x.NewPassword), () =>
        {
            RuleFor(x => x.NewPassword!)
                .MinimumLength(4).WithMessage("رمز عبور جدید باید حداقل ۴ کاراکتر باشد.");
        });

        RuleFor(x => x).Must(x => !(x.CanViewOnly && (x.CanCreate || x.CanEdit || x.CanDelete)))
            .WithMessage("حالت «فقط مشاهده» با دسترسی‌های ایجاد/ویرایش/حذف هم‌زمان قابل انتخاب نیست.");
    }
}

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("نام کاربری الزامی است.")
            .MinimumLength(3).WithMessage("نام کاربری باید حداقل ۳ کاراکتر باشد.");
    }
}

public class ContactRequestValidator : AbstractValidator<ContactRequest>
{
    public ContactRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("نام مخاطب الزامی است.")
            .MinimumLength(2).WithMessage("نام مخاطب باید حداقل ۲ کاراکتر باشد.")
            .MaximumLength(100).WithMessage("نام مخاطب بیش از حد طولانی است.");

        // هر مخاطب باید حداقل یک شماره تلفن داشته باشد
        RuleFor(x => x.Phones)
            .NotEmpty().WithMessage("حداقل یک شماره تلفن الزامی است.");

        RuleForEach(x => x.Phones).SetValidator(new PhoneRequestValidator());
    }
}

public class PhoneRequestValidator : AbstractValidator<PhoneRequest>
{
    public PhoneRequestValidator()
    {
        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("شماره تلفن الزامی است.")
            .Matches(@"^[0-9+\-\s]{5,20}$").WithMessage("شماره تلفن معتبر نیست (فقط رقم و علائم + - مجاز است).");
    }
}
