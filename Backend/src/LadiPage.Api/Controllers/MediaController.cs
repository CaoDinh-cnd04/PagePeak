using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/media")]
[Authorize]
public class MediaController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public MediaController(IAppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpPost("upload")]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> Upload(CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        if (!Request.HasFormContentType) return BadRequest(new { error = "Form content required" });
        var form = await Request.ReadFormAsync(ct);
        var file = form.Files.GetFile("file");
        if (file == null || file.Length == 0) return BadRequest(new { error = "No file uploaded" });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "video/mp4", "video/webm" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new { error = $"File type '{file.ContentType}' not allowed" });
        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { error = "File too large (max 10MB)" });

        var uploadsDir = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", userId.ToString());
        Directory.CreateDirectory(uploadsDir);
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext)) ext = ".png";
        var fileName = $"{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream, ct);

        var wsId = form.ContainsKey("workspaceId") && long.TryParse(form["workspaceId"], out var wid) ? (long?)wid : null;
        var folder = form.ContainsKey("folder") ? form["folder"].ToString() : null;

        var media = new LadiPage.Domain.Entities.Media
        {
            UserId = userId,
            WorkspaceId = wsId,
            FileName = fileName,
            OriginalName = file.FileName,
            ContentType = file.ContentType,
            FileSize = file.Length,
            Url = $"/uploads/{userId}/{fileName}",
            Folder = folder,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Medias.Add(media);
        await _db.SaveChangesAsync(ct);

        return Ok(new { media.Id, media.FileName, media.OriginalName, media.ContentType, media.FileSize, media.Width, media.Height, media.Url, media.Folder, media.CreatedAt });
    }

    [HttpGet]
    public async Task<IActionResult> GetMedia([FromQuery] string? folder, [FromQuery] int page = 1, [FromQuery] int pageSize = 40, CancellationToken ct = default)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var query = _db.Medias.Where(m => m.UserId == userId);
        if (!string.IsNullOrEmpty(folder)) query = query.Where(m => m.Folder == folder);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(m => new { m.Id, m.FileName, m.OriginalName, m.ContentType, m.FileSize, m.Width, m.Height, m.Url, m.ThumbnailUrl, m.AltText, m.Folder, m.CreatedAt })
            .ToListAsync(ct);
        return Ok(new { total, page, pageSize, items });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var media = await _db.Medias.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId, ct);
        if (media == null) return NotFound();

        var filePath = Path.Combine(_env.ContentRootPath, "wwwroot", media.Url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);

        _db.Medias.Remove(media);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
