using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/proxy-image")]
[AllowAnonymous]
public class ProxyController : ControllerBase
{
    private readonly IHttpClientFactory _httpFactory;

    public ProxyController(IHttpClientFactory httpFactory) => _httpFactory = httpFactory;

    [HttpGet]
    public async Task<IActionResult> ProxyImage([FromQuery] string? url, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(url)) return BadRequest(new { error = "Missing url parameter" });
        try
        {
            var decoded = Uri.UnescapeDataString(url);
            _ = new Uri(decoded);
            using var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            client.DefaultRequestHeaders.Add("Accept", "image/*,*/*;q=0.8");
            var resp = await client.GetAsync(decoded, ct);
            if (!resp.IsSuccessStatusCode) return StatusCode(502, new { error = $"Upstream returned {resp.StatusCode}" });
            var contentType = resp.Content.Headers.ContentType?.ToString() ?? "image/png";
            var bytes = await resp.Content.ReadAsByteArrayAsync(ct);
            return File(bytes, contentType, enableRangeProcessing: false);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
