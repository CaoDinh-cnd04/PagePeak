using MediatR;

namespace LadiPage.Application.Features.Templates;

public record GetTemplatesQuery(
    string? Category = null,
    string? Search = null,
    string? DesignType = null,
    bool? FeaturedOnly = null
) : IRequest<IReadOnlyList<TemplateDto>>;
