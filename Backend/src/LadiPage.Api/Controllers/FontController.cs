using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace LadiPage.Api.Controllers;

/// <summary>
/// FontController — Proxy Bunny Fonts API (miễn phí, không cần API key, GDPR-friendly).
/// Fallback về danh sách tĩnh nếu API ngoài không khả dụng.
/// Endpoint: GET /api/fonts
/// </summary>
[ApiController]
[Route("api/fonts")]
[AllowAnonymous]
public class FontController(IHttpClientFactory httpFactory, ILogger<FontController> logger) : ControllerBase
{
    // Fallback nếu Bunny Fonts API không khả dụng
    private static readonly string[] FallbackFonts =
    [
        "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Nunito",
        "Raleway", "Ubuntu", "Playfair Display", "Merriweather", "Source Sans 3",
        "Oswald", "Noto Sans", "PT Sans", "Roboto Condensed", "Roboto Slab",
        "Quicksand", "Work Sans", "Mulish", "Barlow", "DM Sans", "Rubik",
        "Manrope", "Karla", "Josefin Sans", "Libre Baskerville", "Space Grotesk",
        "Cabin", "Arimo", "Overpass", "Assistant", "Bitter", "Crimson Text",
        "Exo 2", "Fira Sans", "Heebo", "Inconsolata", "Kanit", "Lexend",
        "Libre Franklin", "Maven Pro", "Mukta", "Noto Serif", "Outfit",
        "Plus Jakarta Sans", "Prompt", "Public Sans", "Red Hat Display",
        "Signika", "Titillium Web", "Varela Round", "Yanone Kaffeesatz",
        "Abel", "Archivo", "Asap", "Bebas Neue", "Catamaran", "Comfortaa",
        "Cormorant Garamond", "Dancing Script", "EB Garamond", "Figtree",
        "Geologica", "Great Vibes", "Hind", "IBM Plex Sans", "Inter Tight",
        "Jost", "Kalam", "Lilita One", "Lobster", "Lora", "Nanum Gothic",
        "Nunito Sans", "Pacifico", "Patrick Hand", "Philosopher", "PT Serif",
        "Righteous", "Roboto Mono", "Saira", "Satisfy", "Sora", "Space Mono",
        "Spectral", "Teko", "Ubuntu Mono", "Urbanist", "Vollkorn", "Yantramanav",
        "Zilla Slab", "Abril Fatface", "Alegreya", "Amatic SC", "Archivo Narrow",
        "Barlow Condensed", "Be Vietnam Pro", "Cairo", "Chakra Petch",
        "Cinzel", "Courgette", "Domine", "Dosis", "Encode Sans",
        "Fira Code", "Fredoka", "Gloria Hallelujah", "Gudea",
    ];

    [HttpGet]
    [ResponseCache(Duration = 3600)]
    public async Task<IActionResult> GetFonts([FromQuery] int limit = 200)
    {
        try
        {
            // Bunny Fonts API — miễn phí, không cần auth, GDPR-friendly
            // https://fonts.bunny.net/api/fonts — trả về object: { "family-name": { styles: [...] } }
            var client = httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            client.DefaultRequestHeaders.Add("User-Agent", "LadiPage/1.0");

            var res = await client.GetAsync("https://fonts.bunny.net/api/fonts");
            if (res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);

                // Bunny Fonts trả về object: keys là font family names
                var fontNames = doc.RootElement.EnumerateObject()
                    .Select(p => ToTitleCase(p.Name.Replace("-", " ")))
                    .OrderBy(f => f)
                    .Take(limit)
                    .ToArray();

                if (fontNames.Length > 0)
                    return Ok(fontNames);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Bunny Fonts API không khả dụng, dùng fallback list");
        }

        return Ok(FallbackFonts.Take(limit).ToArray());
    }

    private static string ToTitleCase(string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        return string.Join(" ", s.Split(' ')
            .Select(w => w.Length > 0 ? char.ToUpper(w[0]) + w[1..].ToLower() : w));
    }
}
