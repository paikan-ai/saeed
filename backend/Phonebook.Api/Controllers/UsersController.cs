using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Phonebook.Api.Infrastructure;
using Phonebook.Api.Models;
using Phonebook.Api.Services;

namespace Phonebook.Api.Controllers;

// ============================================================
//  API مدیریت کاربران — فقط ادمین
//  (Authorize با Roles="Admin" یعنی فقط توکن‌هایی که Claim نقش آن‌ها Admin است)
// ============================================================
[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController(UserService userService) : ControllerBase
{
    /// <summary>لیست همه‌ی کاربران</summary>
    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> List() =>
        Ok(await userService.ListAsync());

    /// <summary>آمار کلی سیستم برای داشبورد ادمین</summary>
    [HttpGet("stats")]
    public async Task<ActionResult<StatsDto>> Stats() =>
        Ok(await userService.GetStatsAsync());

    /// <summary>ایجاد کاربر جدید + تعیین سطوح دسترسی</summary>
    [HttpPost]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest request)
    {
        try
        {
            var user = await userService.CreateAsync(request);
            return CreatedAtAction(nameof(List), new { id = user.Id }, user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiErrorResponse(ex.Message));
        }
    }

    /// <summary>ویرایش کاربر (نام کاربری، نقش، دسترسی‌ها، ریست رمز)</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(int id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            return Ok(await userService.UpdateAsync(id, request, User.GetUserId()));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiErrorResponse(ex.Message));
        }
    }

    /// <summary>حذف کاربر و همه‌ی مخاطبینش</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await userService.DeleteAsync(id, User.GetUserId());
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiErrorResponse(ex.Message));
        }
    }
}
