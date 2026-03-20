using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/fonts")]
[AllowAnonymous]
public class FontController : ControllerBase
{
    [HttpGet]
    public IActionResult GetFonts()
    {
        var fonts = new[]
        {
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
        };
        return Ok(fonts);
    }
}
