using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Phonebook.Api.Infrastructure;
using Phonebook.Api.Models;
using Phonebook.Api.Services;

namespace Phonebook.Api.Controllers;

// ============================================================
//  API مخاطبین — هر کاربر فقط مخاطبین خودش را می‌بیند.
//  مجوزهای RBAC از طریق Policy روی هر Action چک می‌شوند؛
//  Policyها در Middleware احراز هویت، Claimهای داخل توکن JWT را بررسی می‌کنند.
// ============================================================
[ApiController]
[Route("api/contacts")]
[Authorize]
public class ContactsController(ContactService contactService) : ControllerBase
{
    /// <summary>لیست مخاطبین خودم + جستجو در نام و شماره (Query: ?search=...)</summary>
    [HttpGet]
    public async Task<ActionResult<List<ContactDto>>> List([FromQuery] string? search) =>
        Ok(await contactService.ListAsync(User.GetUserId(), search));

    /// <summary>افزودن مخاطب — نیازمند مجوز CanCreate</summary>
    [HttpPost]
    [Authorize(Policy = Pol.ContactCreate)]
    public async Task<ActionResult<ContactDto>> Create([FromBody] ContactRequest request)
    {
        var contact = await contactService.CreateAsync(User.GetUserId(), request);
        return CreatedAtAction(nameof(List), new { id = contact.Id }, contact);
    }

    /// <summary>ویرایش مخاطب — نیازمند مجوز CanEdit + مالکیت مخاطب</summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = Pol.ContactEdit)]
    public async Task<ActionResult<ContactDto>> Update(int id, [FromBody] ContactRequest request)
    {
        try
        {
            return Ok(await contactService.UpdateAsync(id, User.GetUserId(), request));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiErrorResponse(ex.Message));
        }
    }

    /// <summary>حذف مخاطب — نیازمند مجوز CanDelete + مالکیت مخاطب</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = Pol.ContactDelete)]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await contactService.DeleteAsync(id, User.GetUserId());
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiErrorResponse(ex.Message));
        }
    }
}
