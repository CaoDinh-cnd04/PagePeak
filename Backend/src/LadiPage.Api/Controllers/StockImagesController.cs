using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text.Json;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/stock-images")]
public class StockImagesController(AppDbContext db, IHttpClientFactory httpFactory, IConfiguration config) : ControllerBase
{
    /// <summary>Lấy ảnh mẫu từ DB (thay thế STOCK_IMAGES hardcode trong ImagePickerPanel.tsx)</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] string? category)
    {
        var query = db.StockImages.Where(x => x.IsActive).AsQueryable();

        if (!string.IsNullOrEmpty(category))
            query = query.Where(x => x.Category == category);

        var images = await query
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                url = x.Url,
                x.Name,
                x.Category,
                w = x.Width,
                h = x.Height,
                author = x.Author,
                source = x.Source,
            })
            .ToListAsync();

        return Ok(images);
    }

    /// <summary>
    /// Tìm kiếm ảnh từ Pexels API (miễn phí) — proxy qua backend để bảo vệ API key.
    /// Cần cấu hình Pexels:ApiKey trong appsettings.json.
    /// Nếu không có key, fallback về DB images.
    /// </summary>
    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> Search([FromQuery] string q = "business", [FromQuery] int page = 1, [FromQuery] int perPage = 20)
    {
        var apiKey = config["Pexels:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            // Fallback về DB nếu chưa cấu hình Pexels key
            return await GetAll(null);
        }

        try
        {
            var client = httpFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(apiKey);
            var url = $"https://api.pexels.com/v1/search?query={Uri.EscapeDataString(q)}&page={page}&per_page={Math.Min(perPage, 80)}";
            var res = await client.GetAsync(url);
            if (!res.IsSuccessStatusCode)
                return await GetAll(null);

            var json = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var photos = doc.RootElement.GetProperty("photos");

            var result = photos.EnumerateArray().Select(p => new
            {
                url = p.GetProperty("src").GetProperty("large").GetString(),
                name = p.GetProperty("alt").GetString() ?? "Pexels Photo",
                category = q,
                w = p.GetProperty("width").GetInt32(),
                h = p.GetProperty("height").GetInt32(),
                author = p.GetProperty("photographer").GetString(),
                source = "pexels",
            }).ToList();

            return Ok(result);
        }
        catch
        {
            return await GetAll(null);
        }
    }

    /// <summary>Lấy danh sách categories của ảnh mẫu</summary>
    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategories()
    {
        var cats = await db.StockImages
            .Where(x => x.IsActive)
            .GroupBy(x => x.Category)
            .Select(g => new { id = g.Key, label = g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(cats);
    }
}
