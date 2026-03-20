using LadiPage.Application.Features.Templates;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/templates")]
[Authorize]
public class TemplateController : ControllerBase
{
    private readonly IMediator _mediator;

    public TemplateController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetTemplates([FromQuery] string? category, [FromQuery] string? search, [FromQuery] string? designType, [FromQuery] bool? featured, CancellationToken ct)
    {
        var list = await _mediator.Send(new GetTemplatesQuery(category, search, designType, featured), ct);
        return Ok(list);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var all = await _mediator.Send(new GetTemplatesQuery(), ct);
        var cats = all.Select(t => t.Category).Distinct().OrderBy(c => c).ToList();
        return Ok(cats);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var tpl = await _mediator.Send(new GetTemplateByIdQuery(id), ct);
        return tpl == null ? NotFound() : Ok(tpl);
    }
}
