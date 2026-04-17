using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/sample-videos")]
public class SampleVideosController(AppDbContext db) : ControllerBase
{
    /// <summary>Lấy danh sách video mẫu cho Video Picker Panel (từ DB thay vì hardcode)</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] string? source)
    {
        var query = db.SampleVideos.Where(x => x.IsActive).AsQueryable();

        if (!string.IsNullOrEmpty(source))
            query = query.Where(x => x.Source == source);

        var videos = await query
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                x.Name,
                url = x.Url,
                embedUrl = x.EmbedUrl,
                thumbnailUrl = x.ThumbnailUrl,
                x.Source,
            })
            .ToListAsync();

        return Ok(videos);
    }
}
