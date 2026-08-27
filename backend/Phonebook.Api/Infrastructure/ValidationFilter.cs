using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Phonebook.Api.Models;

namespace Phonebook.Api.Infrastructure;

// ============================================================
//  فیلتر سراسری اعتبارسنجی:
//  به‌جای تکرار کد اعتبارسنجی در هر Action، این فیلتر به‌صورت خودکار
//  برای هر پارامتر Action یک IValidator متناسب از DI پیدا و اجرا می‌کند.
// ============================================================
public class FluentValidationFilter(IServiceProvider serviceProvider) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null) continue;

            // ساخت نوع IValidator<T> به ازای نوع آرگومان ورودی
            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            if (serviceProvider.GetService(validatorType) is not IValidator validator) continue;

            // به‌دلیل Contravariance در IValidator<in T> این تبدیل امن است
            var result = await ((IValidator<object>)validator)
                .ValidateAsync(new ValidationContext<object>(argument));

            if (!result.IsValid)
            {
                // برگرداندن اولین پیام خطای فارسی به کلاینت
                var message = string.Join(" ", result.Errors.Select(e => e.ErrorMessage));
                context.Result = new BadRequestObjectResult(new ApiErrorResponse(message));
                return;
            }
        }

        await next();
    }
}

/// <summary>
/// Middleware سراسری مدیریت خطا — خطاهای پیش‌بینی‌نشده را به پاسخ JSON تمیز تبدیل می‌کند
/// و خطای 403 (عدم دسترسی) از طرف Policyهای RBAC را با پیام فارسی برمی‌گرداند.
/// </summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (InvalidOperationException ex)
        {
            // خطاهای تجاری (مثل تکراری بودن نام کاربری) که از سرویس‌ها پرتاب می‌شوند
            logger.LogWarning(ex, "Business rule violation");
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new ApiErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new ApiErrorResponse("خطای داخلی سرور رخ داد."));
        }
    }
}
