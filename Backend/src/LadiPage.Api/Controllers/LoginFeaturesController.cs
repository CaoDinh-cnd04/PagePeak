using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/login-features")]
public class LoginFeaturesController(AppDbContext db) : ControllerBase
{
    /// <summary>Lấy danh sách slide tính năng cho trang đăng nhập (từ DB thay vì hardcode)</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var slides = await db.LoginFeatureSlides
            .Where(x => x.IsActive)
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                id = x.SlideId,
                x.Title,
                x.Description,
                x.Icon,
            })
            .ToListAsync();

        return Ok(slides);
    }
}
