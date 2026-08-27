using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Phonebook.Api.Infrastructure;
using Phonebook.Api.Models;
using Phonebook.Api.Services;

namespace Phonebook.Api.Controllers;

// ============================================================
//  API احراز هویت: لاگین، تغییر رمز، ویرایش پروفایل
// ============================================================
[ApiController]
[Route("api/auth")]
public class AuthController(AuthService authService) : ControllerBase
{
    /// <summary>ورود و دریافت توکن JWT</summary>
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            return Ok(await authService.LoginAsync(request));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ApiErrorResponse(ex.Message));
        }
    }

    /// <summary>تغییر رمز عبور (اجباری برای ادمین در اولین ورود / اختیاری برای همه)</summary>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<ActionResult<LoginResponse>> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.GetUserId();
        try
        {
            return Ok(await authService.ChangePasswordAsync(userId, request));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiErrorResponse(ex.Message));
        }
    }

    /// <summary>ویرایش پروفایل (نام کاربری) توسط خود کاربر</summary>
    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<LoginResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.GetUserId();
        try
        {
            return Ok(await authService.UpdateProfileAsync(userId, request));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiErrorResponse(ex.Message));
        }
    }
}
